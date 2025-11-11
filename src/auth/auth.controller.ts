import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  SignUp,
  ResetPasswordDto,
  SetUserNameDto,
  LoginDto,
  RefreshTokenDto
} from './dto';
import { BaseController, AuthGuard, FirebaseUser } from 'src/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { auth } from 'firebase-admin';
import { FirebaseGuard } from '@alpha018/nestjs-firebase-auth';

@ApiTags('Auth')
@Controller('auth')
export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  @Post('signup')
  async signUp(@Body() form: SignUp) {
    const user = await this.authService.signUp(form)

    if (user.isError) throw user.error;

    return this.response({
      message: 'Account Created',
      data: user.data,
    });
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() form: LoginDto) {
    const result = await this.authService.login(form);
    if (result.isError) throw result.error;

    return this.response({
      message: 'Login successful',
      data: result.data,
    });
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refreshToken(@Body() form: RefreshTokenDto) {
    const result = await this.authService.refreshToken(form);
    if (result.isError) throw result.error;

    return this.response({
      message: 'Token refreshed successfully',
      data: result.data,
    });
  }

  @Patch('set-username')
  @ApiBearerAuth('firebase')
  @ApiOperation({ summary: 'Set username for user' })
  @UseGuards(FirebaseGuard)
  async setUserName(
    @FirebaseUser() user: auth.DecodedIdToken, 
    @Body() form: SetUserNameDto
  ) {
    const result = await this.authService.setUserName(user.uid, form);
    if (result.isError) throw result.error;
    return this.response({
      message: 'Username Set',
      data: result.data,
    });
  }

  @Patch('logout')
  @ApiBearerAuth('firebase')
  @ApiOperation({ summary: 'Logout user' })
  @UseGuards(FirebaseGuard)
  async logout(@FirebaseUser() user: auth.DecodedIdToken) {
    const logout = await this.authService.logout(user.uid);
    if (logout.isError) throw logout.error;
    return this.response({
      message: 'Logout Successful',
      data: logout.data,
    });
  }

  @Put('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP verification token' })
  async resetPasswordWithOtp(@Body() form: ResetPasswordDto) {
    const result = await this.authService.resetPassword(form);
    if (result.isError) throw result.error;
    
    return this.response({
      message: 'Password reset successfully',
      data: result.data,
    });
  }
}
