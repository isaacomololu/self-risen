import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RemoveFcmTokenDto {
  @ApiProperty({
    description: 'FCM device token to remove',
    example: 'eXampleFCMToken123...',
  })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;
}
