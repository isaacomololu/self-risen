import { IsNotEmpty, IsString, IsNumber, IsDate } from 'class-validator';

export class UploadFileResponseDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  publicUrl: string;

  @IsNotEmpty()
  @IsNumber()
  size: number;

  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @IsNotEmpty()
  @IsDate()
  uploadedAt: Date;
}
