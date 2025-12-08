import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleSignInDto {
  @ApiProperty({ 
    required: true, 
    description: 'Firebase ID token obtained after signing in with Google through Firebase SDK' 
  })
  @IsNotEmpty()
  @IsString()
  idToken: string;
}
