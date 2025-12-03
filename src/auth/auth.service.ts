import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { BaseService, config, logger } from 'src/common';
import { DatabaseProvider } from 'src/database/database.provider';
import {
  SignUp,
  SetUserNameDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ChangePasswordDto,
  ResetPasswordDto,
  VerifyPasswordResetOtpDto
} from './dto';
import { auth } from 'firebase-admin';
import { INotificationService } from 'src/notifications/interfaces/notification.interface';
import { NotificationTypeEnum } from 'src/notifications/enums/notification.enum';
import { EmailService } from 'src/common/email/email.service';
import { generateOtp, hashOtp, verifyOtp } from './utils/otp.util';

@Injectable()
export class AuthService extends BaseService {
  constructor(
    private prisma: DatabaseProvider,
    private notificationService: INotificationService,
    private emailService: EmailService,
  ) {
    super();
  }

  async signUp(payload: SignUp) {
    const { name, email, password, avatar } = payload;

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
          lastLoggedInAt: new Date()
        }
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

  async forgotPassword(payload: ForgotPasswordDto) {
    const { email } = payload;

    try {
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        return this.Results({
          message: 'If an account with that email exists, a password reset OTP has been sent.'
        });
      }

      let firebaseUser: auth.UserRecord;
      try {
        firebaseUser = await auth().getUserByEmail(email);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          logger.warn(`Firebase user not found for email: ${email}`);
          return this.Results({
            message: 'If an account with that email exists, a password reset OTP has been sent.'
          });
        }
        throw error;
      }

      // Check rate limiting: if an OTP was created for this email within the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentOtp = await this.prisma.passwordResetOtp.findFirst({
        where: {
          email,
          createdAt: {
            gte: fiveMinutesAgo
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (recentOtp) {
        logger.warn(`Password reset OTP requested too soon for email: ${email}`);
        return this.HandleError(
          new ConflictException('Please wait 5 minutes before requesting another OTP.')
        );
      }

      // Generate 4-digit OTP
      const otp = generateOtp();
      const hashedOtp = hashOtp(otp);

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await this.prisma.$transaction([
        this.prisma.passwordResetOtp.updateMany({
          where: {
            email,
            isUsed: false
          },
          data: {
            isUsed: true
          }
        }),
        this.prisma.passwordResetOtp.create({
          data: {
            email,
            otp: hashedOtp,
            expiresAt,
            isUsed: false
          }
        })
      ]);

      // Send OTP via email
      try {
        await this.emailService.sendPasswordResetOtp(email, otp);
        logger.log(`Password reset OTP sent to email: ${email}`);
      } catch (emailError) {
        logger.error(`Failed to send password reset OTP email: ${emailError.message || emailError}`);
        // Mark the OTP as used since user can't receive it
        await this.prisma.passwordResetOtp.updateMany({
          where: {
            email,
            otp: hashedOtp,
            isUsed: false
          },
          data: {
            isUsed: true
          }
        });
        return this.HandleError(
          new ConflictException('Failed to send password reset email. Please try again later.')
        );
      }

      return this.Results(null);
    } catch (error) {
      logger.error(`Forgot password error: ${error.message || error}`);
      // Return generic message even on error for security
      return this.Results({
        message: 'If an account with that email exists, a password reset OTP has been sent.'
      });
    }
  }

  async changePassword(firebaseId: string, payload: ChangePasswordDto) {
    const { oldPassword, newPassword } = payload;

    try {
      // Validate password strength
      if (!this.validatePasswordStrength(newPassword)) {
        return this.HandleError(
          new ConflictException('Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters.')
        );
      }

      // Check if new password is different from old password
      if (oldPassword === newPassword) {
        return this.HandleError(
          new ConflictException('New password must be different from the current password')
        );
      }

      // Find user by firebaseId
      const user = await this.prisma.user.findUnique({
        where: { firebaseId }
      });

      if (!user) {
        return this.HandleError(
          new NotFoundException('User not found')
        );
      }

      // Get Firebase user
      const firebaseUser = await auth().getUser(firebaseId);

      if (!firebaseUser.email) {
        return this.HandleError(
          new UnauthorizedException('User email not found')
        );
      }

      // Verify old password by attempting to sign in with it
      const firebaseWebApiKey = config.FIREBASE_API_KEY;
      const verifyResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: firebaseUser.email,
            password: oldPassword,
            returnSecureToken: true,
          }),
        }
      );

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        if (verifyData.error?.message === 'INVALID_PASSWORD' || verifyData.error?.message === 'EMAIL_NOT_FOUND') {
          return this.HandleError(
            new UnauthorizedException('Current password is incorrect')
          );
        }
        if (verifyData.error?.message === 'USER_DISABLED') {
          return this.HandleError(
            new UnauthorizedException('User account has been disabled')
          );
        }
        return this.HandleError(
          new UnauthorizedException(verifyData.error?.message || 'Failed to verify current password')
        );
      }

      // Old password is correct, now update to new password
      try {
        await auth().updateUser(firebaseId, {
          password: newPassword
        });
      } catch (error) {
        if (error.code === 'auth/weak-password') {
          return this.HandleError(
            new ConflictException('Password is too weak. Please use a password with at least 6 characters.')
          );
        }
        return this.HandleError(error);
      }

      // Revoke all refresh tokens for security
      await auth().revokeRefreshTokens(firebaseId);

      logger.log(`Password changed successfully for user: ${firebaseId}`);
      return this.Results(null);
    } catch (error) {
      logger.error(`Change password error: ${error.message || error}`);
      return this.HandleError(
        new UnauthorizedException('Failed to change password. Please try again.')
      );
    }
  }

  /**
   * Validates password strength
   * @param password - Password to validate
   * @returns true if password meets strength requirements
   */
  private validatePasswordStrength(password: string): boolean {
    // Minimum 8 characters
    if (password.length < 8) {
      return false;
    }

    // Maximum 128 characters (Firebase limit)
    if (password.length > 128) {
      return false;
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(password)) {
      return false;
    }

    // Check for at least one number or special character
    if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return false;
    }

    return true;
  }

  // async resetPassword(payload: ResetPasswordDto) {
  //   const { newPassword, token } = payload;

  //   let verifiedUser: auth.DecodedIdToken;
  //   try {
  //     verifiedUser = await auth().verifyIdToken(token, true);
  //   } catch (error) {
  //     if (error.code === 'auth/id-token-expired') {
  //       return this.HandleError(
  //         new UnauthorizedException('Verification token has expired. Please try again.')
  //       );
  //     }
  //     return this.HandleError(
  //       new UnauthorizedException('Invalid verification token')
  //     );
  //   }

  //   const firebaseUser = await auth().getUser(verifiedUser.uid);

  //   const user = await this.prisma.user.findUnique({
  //     where: { firebaseId: verifiedUser.uid }
  //   });

  //   if (!user) {
  //     return this.HandleError(
  //       new UnauthorizedException('User not found')
  //     );
  //   }

  //   if (firebaseUser.email && user.email !== firebaseUser.email) {
  //     return this.HandleError(
  //       new UnauthorizedException('Email mismatch')
  //     );
  //   }

  //   try {
  //     await auth().updateUser(verifiedUser.uid, {
  //       password: newPassword
  //     });
  //   } catch (error) {
  //     return this.HandleError(error);
  //   }

  //   await auth().revokeRefreshTokens(verifiedUser.uid);

  //   return this.Results(user);
  // }

  async verifyPasswordResetOtp(payload: VerifyPasswordResetOtpDto) {
    const { email, otp } = payload;

    try {
      // Find valid OTP record
      const otpRecord = await this.prisma.passwordResetOtp.findFirst({
        where: {
          email,
          isUsed: false,
          expiresAt: {
            gt: new Date() // Not expired
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!otpRecord) {
        return this.HandleError(
          new UnauthorizedException('Invalid or expired OTP. Please request a new one.')
        );
      }

      // Verify OTP matches
      if (!verifyOtp(otp, otpRecord.otp)) {
        logger.warn(`Invalid OTP provided for email: ${email}`);
        return this.HandleError(
          new UnauthorizedException('Invalid OTP. Please check and try again.')
        );
      }

      // Mark OTP as verified (but not used yet)
      await this.prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { verifiedAt: new Date() }
      });

      return this.Results({
        message: 'OTP verified successfully',
        email: email
      });
    } catch (error) {
      logger.error(`Verify OTP error: ${error.message || error}`);
      return this.HandleError(
        new UnauthorizedException('Failed to verify OTP. Please try again.')
      );
    }
  }

  async resetPassword(payload: ResetPasswordDto) {
    const { email, newPassword } = payload;

    try {
      // Validate password strength
      if (!this.validatePasswordStrength(newPassword)) {
        return this.HandleError(
          new ConflictException('Password must be at least 8 characters long and contain a mix of letters, numbers, and special characters.')
        );
      }

      // Find verified (but not used) OTP record
      const otpRecord = await this.prisma.passwordResetOtp.findFirst({
        where: {
          email,
          isUsed: false,
          verifiedAt: {
            not: null // Must be verified
          },
          expiresAt: {
            gt: new Date() // Not expired
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!otpRecord) {
        return this.HandleError(
          new UnauthorizedException('OTP not verified or expired. Please verify the OTP first.')
        );
      }

      // Find user in database
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        logger.warn(`Password reset attempted for non-existent user: ${email}`);
        return this.HandleError(
          new NotFoundException('User not found')
        );
      }

      // Get Firebase user by email
      let firebaseUser: auth.UserRecord;
      try {
        firebaseUser = await auth().getUserByEmail(email);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          return this.HandleError(
            new NotFoundException('Firebase user not found')
          );
        }
        throw error;
      }

      // Update password using Firebase Admin SDK
      try {
        await auth().updateUser(firebaseUser.uid, {
          password: newPassword
        });
      } catch (error) {
        if (error.code === 'auth/weak-password') {
          return this.HandleError(
            new ConflictException('Password is too weak. Please use a password with at least 6 characters.')
          );
        }
        return this.HandleError(error);
      }

      // Mark OTP as used (single-use enforcement)
      await this.prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { isUsed: true }
      });

      // Revoke all refresh tokens for security
      try {
        await auth().revokeRefreshTokens(firebaseUser.uid);
      } catch (error) {
        logger.error(`Failed to revoke refresh tokens after password reset: ${error.message || error}`);
        // Don't fail the request if token revocation fails
      }

      // Send confirmation email to notify user of password change
      try {
        await this.emailService.sendPasswordResetConfirmation(email, user.name);
      } catch (emailError) {
        logger.error(`Failed to send password reset confirmation email: ${emailError.message || emailError}`);
        // Don't fail the request if email fails
      }

      logger.log(`Password reset successfully for user: ${email}`);
      return this.Results({
        message: 'Password reset successfully',
        email: email
      });
    } catch (error) {
      logger.error(`Reset password error: ${error.message || error}`);
      return this.HandleError(
        new UnauthorizedException('Failed to reset password. Please try again.')
      );
    }
  }
}
