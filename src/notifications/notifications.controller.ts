import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Get,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  RegisterFcmTokenDto,
  RemoveFcmTokenDto,
  SendNotificationDto,
  SendBulkNotificationDto,
} from './dto';
import { BaseController, FirebaseUser } from 'src/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { auth } from 'firebase-admin';
import { FirebaseGuard } from '@alpha018/nestjs-firebase-auth';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController extends BaseController {
  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  @Post('register-token')
  @ApiOperation({ summary: 'Register FCM device token for push notifications' })
  @UseGuards(FirebaseGuard)
  async registerToken(
    @FirebaseUser() user: auth.DecodedIdToken,
    @Body() form: RegisterFcmTokenDto
  ) {
    const result = await this.notificationsService.registerFcmToken(
      user.uid,
      form
    );
    if (result.isError) throw result.error;

    return this.response({
      message: 'FCM token registered',
      data: result.data,
    });
  }

  @Delete('remove-token')
  @ApiOperation({ summary: 'Remove FCM device token' })
  @UseGuards(FirebaseGuard)
  async removeToken(
    @FirebaseUser() user: auth.DecodedIdToken,
    @Body() form: RemoveFcmTokenDto
  ) {
    const result = await this.notificationsService.removeFcmToken(
      user.uid,
      form
    );
    if (result.isError) throw result.error;

    return this.response({
      message: 'FCM token removed',
      data: result.data,
    });
  }

  @Get('my-tokens')
  @ApiOperation({ summary: 'Get all registered FCM tokens for current user' })
  @UseGuards(FirebaseGuard)
  async getMyTokens(@FirebaseUser() user: auth.DecodedIdToken) {
    const result = await this.notificationsService.getUserTokens(user.uid);
    if (result.isError) throw result.error;

    return this.response({
      message: 'Tokens retrieved',
      data: result.data,
    });
  }

  /**
   * @deprecated Use notifyUser() from INotificationService instead
   */
  // @Post('send')
  // @ApiOperation({ summary: 'Send notification to a specific user' })
  // @UseGuards(FirebaseGuard)
  // async sendNotification(@Body() form: SendNotificationDto) {
  //   const result = await this.notificationsService.sendNotification(form);
  //   if (result.isError) throw result.error;

  //   return this.response({
  //     message: 'Notification sent',
  //     data: result.data,
  //   });
  // }

  /**
   * @deprecated Use notifyBulkUsers() from INotificationService instead
   */
  // @Post('send-bulk')
  // @ApiOperation({ summary: 'Send notification to multiple users' })
  // @UseGuards(FirebaseGuard)
  // async sendBulkNotification(@Body() form: SendBulkNotificationDto) {
  //   const result = await this.notificationsService.sendBulkNotification(form);
  //   if (result.isError) throw result.error;

  //   return this.response({
  //     message: 'Bulk notification sent',
  //     data: result.data,
  //   });
  // }
}
