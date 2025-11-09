import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterFcmTokenDto {
  @ApiProperty({
    description: 'FCM device token',
    example: 'eXampleFCMToken123...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'FCM token is too short' })
  @MaxLength(500, { message: 'FCM token is too long' })
  fcmToken: string;
}
