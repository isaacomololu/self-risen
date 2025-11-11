import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { BaseService, config, logger } from 'src/common';
import { DatabaseProvider } from 'src/database/database.provider';
import { SignUp, ResetPasswordDto, SetUserNameDto, LoginDto, RefreshTokenDto } from './dto';
import { auth } from 'firebase-admin';
import { INotificationService } from 'src/notifications/interfaces/notification.interface';
import { NotificationTypeEnum } from 'src/notifications/enums/notification.enum';

@Injectable()
export class AuthService extends BaseService {
  constructor(
    private prisma: DatabaseProvider,
    private notificationService: INotificationService,
  ) {
    super();
  }

  async signUp(payload: SignUp) {
    const { name, email, password, avatar } = payload;

    // // Verify Firebase is initialized
    // const firebaseApp = auth().app;
    // if (!firebaseApp) {
    //   throw new Error('Firebase Admin SDK is not initialized');
    // }
    // logger.log(`Firebase app name: ${firebaseApp.name}`);
    // logger.log(`Firebase project ID: ${firebaseApp.options.projectId}`);
    // logger.log(`Firebase has credential: ${!!firebaseApp.options.credential}`);
    
    // Try to get access token to verify credential is working
    // try {
    //   if (firebaseApp.options.credential) {
    //     const token = await firebaseApp.options.credential.getAccessToken();
    //     logger.log('✓ Credential is working - got access token');
    //   } else {
    //     logger.error('✗ Firebase app has no credential attached!');
    //   }
    // } catch (err) {
    //   logger.error(`✗ Failed to get access token from Firebase app credential: ${err instanceof Error ? err.message : String(err)}`);
    // }

    let firebaseUser: auth.UserRecord;
    try {
      firebaseUser = await auth().createUser({
        email,
        password,
        displayName: name,
        photoURL: avatar,
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        logger.error(`User with email ${email} already exists`);
        return this.HandleError(
          new ConflictException('User with this email already exists')
        );
      }
      if (error.code === 'auth/invalid-email') {
        logger.error(`Invalid email address: ${email}`);
        return this.HandleError(
          new ConflictException('Invalid email address')
        );
      }
      if (error.code === 'auth/weak-password') {
        logger.error(`Weak password detected for email: ${email}`);
        return this.HandleError(
          new ConflictException('Password is too weak. Please use a password with at least 6 characters.')
        );
      }
      return this.HandleError(error);
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          firebaseId: firebaseUser.uid,
          email,
          name,
          avatar,
          lastLoggedInAt: new Date()
        }
      });

      // Send onboarding welcome notification
      // try {
      //   await this.notificationService.notifyUser({
      //     userId: user.id,
      //     type: NotificationTypeEnum.USER_ONBOARDING_WELCOME,
      //     requestId: `welcome-${user.id}-${Date.now()}`,
      //     metadata: {
      //       userName: name,
      //       appName: 'Self-Risen',
      //       email: email,
      //       currentYear: new Date().getFullYear(),
      //     },
      //   });
      // } catch (notificationError) {
      //   // Log error but don't fail user creation
      //   logger.error(`Failed to send onboarding notification: ${notificationError.message || notificationError}`);
      // }

      return this.Results({ 
        user,
        firebaseId: firebaseUser.uid
      });
    } catch (error) {
      try {
        await auth().deleteUser(firebaseUser.uid);
      } catch (deleteError) {
        logger.error(`Failed to rollback Firebase user ${firebaseUser.uid}: ${deleteError.message || deleteError}`);
      }
      return this.HandleError(error);
    }
  }

  async setUserName(firebaseId: string, payload: SetUserNameDto) {
    const { username } = payload;
    const user = await this.prisma.user.findUnique({
      where: { firebaseId }
    });
    if (!user) {
      return this.HandleError(
        new NotFoundException('User not found')
      );
  }
  const userwithusername = await this.prisma.user.update({
      where: { id: user.id },
      data: { username }
    });
    return this.Results(userwithusername);
  }

  // async login(payload: LoginDto) {
  //   const { email, password } = payload;

  //   const user = await this.prisma.user.findUnique({
  //     where: { email }
  //   });

  //   if (!user) {
  //     return this.HandleError(
  //       new UnauthorizedException('Incorrect Credentials')
  //     );
  //   }

  //   const existingFirebaseUser = await auth().getUserByEmail(email);
  //   if (!existingFirebaseUser) {
  //     return this.HandleError(
  //       new UnauthorizedException('Incorrect Credentials')
  //     );
  //   }
    
  //   const isPasswordValid = await compare(password, user.password);
  //   if (!isPasswordValid) {
  //     return this.HandleError(
  //       new UnauthorizedException('Incorrect Credentials')
  //     );
  //   }
    
  //   await this.prisma.user.update({
  //     where: { id: user.id },
  //     data: { lastLoggedInAt: new Date() }
  //   });

  //   return this.Results({ user });
  // }

  async login(payload: LoginDto) {
    const { email, password } = payload;
    const firebaseWebApiKey = config.FIREBASE_API_KEY;
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        logger.error(`Firebase authentication failed: ${JSON.stringify(data)}`);
        
        if (data.error?.message === 'INVALID_PASSWORD' || data.error?.message === 'EMAIL_NOT_FOUND') {
          return this.HandleError(
            new UnauthorizedException('Invalid email or password')
          );
        }
        
        if (data.error?.message === 'USER_DISABLED') {
          return this.HandleError(
            new UnauthorizedException('User account has been disabled')
          );
        }

        return this.HandleError(
          new UnauthorizedException(data.error?.message || 'Authentication failed')
        );
      }

      // Verify the ID token using Admin SDK
      let verifiedUser: auth.DecodedIdToken;
      try {
        verifiedUser = await auth().verifyIdToken(data.idToken, true);
      } catch (error) {
        logger.error(`Failed to verify ID token: ${error.message || error}`);
        return this.HandleError(
          new UnauthorizedException('Failed to verify authentication token')
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { firebaseId: verifiedUser.uid }
      });

      if (!user) {
        return this.HandleError(
          new UnauthorizedException('User profile not found')
        );
      }

      // Update last logged in time
      await this.prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoggedInAt: new Date() }
      });

      return this.Results({ 
        accessToken: data.idToken,
        refreshToken: data.refreshToken,
      });
    } catch (error) {
      logger.error(`Login2 error: ${error.message || error}`);
      return this.HandleError(
        new UnauthorizedException('Authentication failed. Please try again.')
      );
    }
  }

  async refreshToken(payload: RefreshTokenDto) {
    const { refreshToken } = payload;
    const firebaseWebApiKey = config.FIREBASE_API_KEY;

    try {
      const response = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${firebaseWebApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }).toString(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        logger.error(`Firebase token refresh failed: ${JSON.stringify(data)}`);
        
        if (data.error === 'TOKEN_EXPIRED' || data.error === 'INVALID_REFRESH_TOKEN') {
          return this.HandleError(
            new UnauthorizedException('Refresh token is invalid or expired. Please log in again.')
          );
        }

        return this.HandleError(
          new UnauthorizedException(data.error?.message || 'Token refresh failed')
        );
      }

      let verifiedUser: auth.DecodedIdToken;
      try {
        verifiedUser = await auth().verifyIdToken(data.id_token, true);
      } catch (error) {
        logger.error(`Failed to verify refreshed ID token: ${error.message || error}`);
        return this.HandleError(
          new UnauthorizedException('Failed to verify refreshed authentication token')
        );
      }

      // Find user in database to ensure they still exist
      const user = await this.prisma.user.findUnique({
        where: { firebaseId: verifiedUser.uid }
      });

      if (!user) {
        return this.HandleError(
          new UnauthorizedException('User profile not found')
        );
      }

      return this.Results({
        accessToken: data.id_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      });
    } catch (error) {
      logger.error(`RefreshToken error: ${error.message || error}`);
      return this.HandleError(
        new UnauthorizedException('Token refresh failed. Please try again.')
      );
    }
  }

  async logout(firebaseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseId }
    });
    if (!user) {
      return this.HandleError(
        new UnauthorizedException('User not found')
      );
    }

    await auth().revokeRefreshTokens(firebaseId);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoggedOutAt: new Date() }
    });

    return this.Results(null);
  }

  // async verifyOtp(payload: VerifyOtpDto) {
  //   const { token, name } = payload;

  //   let verifiedUser: auth.DecodedIdToken;
  //   try {
  //     verifiedUser = await auth().verifyIdToken(token, true);
  //   } catch (error) {
  //     if (error.code === 'auth/id-token-expired') {
  //       return this.HandleError(
  //         new UnauthorizedException('Token has expired')
  //       );
  //     }
  //     if (error.code === 'auth/id-token-revoked') {
  //       return this.HandleError(
  //         new UnauthorizedException('Token has been revoked')
  //       );
  //     }
  //     if (error.code === 'auth/argument-error') {
  //       return this.HandleError(
  //         new UnauthorizedException('Invalid token format')
  //       );
  //     }
  //     return this.HandleError(
  //       new UnauthorizedException('Invalid authentication token')
  //     );
  //   }

  //   const user = await this.prisma.user.findUnique({
  //     where: { 
  //       firebaseId: verifiedUser.uid,
  //     }
  //   });
  //   if (!user) {
  //     return this.HandleError(
  //       new UnauthorizedException('User not found')
  //     );
  //   }

  //   await this.prisma.user.update({
  //     where: { id: user.id },
  //     data: { lastLoggedInAt: new Date() }
  //   });
  //   return this.Results(user);
  // }

  // async forgotPassword(payload: SendOtpDto) {
  //   const { phone } = payload;
  //   const firebaseUser = await auth().getUserByPhoneNumber(phone);

  //   const user = await this.prisma.user.findUnique({
  //     where: { phone }
  //   });

  //   if (!user) {
  //     return this.HandleError(
  //       new NotFoundException('User not found')
  //     );
  //   }

  //   return this.Results(user);
  // }

  async resetPassword(payload: ResetPasswordDto) {
    const { newPassword, token } = payload;

    let verifiedUser: auth.DecodedIdToken;
    try {
      verifiedUser = await auth().verifyIdToken(token, true);
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        return this.HandleError(
          new UnauthorizedException('Verification token has expired. Please try again.')
        );
      }
      return this.HandleError(
        new UnauthorizedException('Invalid verification token')
      );
    }
  
    // Verify phone-authenticated token
    if (!verifiedUser.firebase.sign_in_provider || 
        verifiedUser.firebase.sign_in_provider !== 'phone') {
      return this.HandleError(
        new UnauthorizedException('Token must be from phone authentication')
      );
    }

    const firebaseUser = await auth().getUser(verifiedUser.uid);
    if (firebaseUser.phoneNumber !== verifiedUser.phone_number) {
      return this.HandleError(
        new UnauthorizedException('Phone number mismatch')
      );
    }
   
    try {
      await auth().updateUser(verifiedUser.uid, {
        password: newPassword
      });
    } catch (error) {
      return this.HandleError(error);
    }

    const user = await this.prisma.user.findUnique({
      where: { firebaseId: verifiedUser.uid }
    });
    if (!user) {
      return this.HandleError(
        new UnauthorizedException('User not found')
      );
    }

    await auth().revokeRefreshTokens(verifiedUser.uid);

    return this.Results(user);
  }
}
