import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UserLocaleDto {
    @ApiPropertyOptional({
        description: 'BCP 47 locale tag from the device',
        example: 'en-US',
    })
    @IsOptional()
    @IsString()
    locale?: string;

    @ApiPropertyOptional({
        description: 'ISO 3166-1 alpha-2 country code',
        example: 'US',
    })
    @IsOptional()
    @IsString()
    @Length(2, 2, { message: 'countryCode must be a 2-letter ISO code' })
    countryCode?: string;

    @ApiPropertyOptional({
        description: 'City name; timezone is resolved server-side from country + city',
        example: 'Chicago',
    })
    @IsOptional()
    @IsString()
    city?: string;
}
