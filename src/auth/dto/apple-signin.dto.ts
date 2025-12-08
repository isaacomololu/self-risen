import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AppleSignInDto {
  @ApiProperty({ 
    required: true, 
    description: 'Firebase ID token obtained after signing in with Apple through Firebase SDK' 
  })
  @IsNotEmpty()
  @IsString()
  idToken: string;
}
