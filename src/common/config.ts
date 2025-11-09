import { plainToInstance } from "class-transformer";
import { IsNotEmpty, IsString, validate } from "class-validator";

class Config {
    @IsNotEmpty()
    @IsString()
    BASE_URL: string;

    @IsNotEmpty()
    @IsString()
    DATABASE_URL: string;

    @IsNotEmpty()
    @IsString()
    JWT_SECRET: string;

    @IsNotEmpty()
    @IsString()
    JWT_EXPIRATION: string;

    @IsNotEmpty()
    PORT: number;

    @IsNotEmpty()
    @IsString()
    NODE_ENV: string;

    // @IsNotEmpty()
    // @IsString()
    // EMAIL_RESET_PASSWORD_URL: string;

    // @IsNotEmpty()
    // @IsString()
    // EMAIL_USER: string;

    // @IsNotEmpty()
    // @IsString()
    // EMAIL_PASSWORD: string;

    // @IsNotEmpty()
    // @IsString()
    // JWT_VERIFICATION_TOKEN_SECRET: string;

    @IsNotEmpty()
    @IsString()
    MAIL_USERNAME: string;

    @IsNotEmpty()
    @IsString()
    MAIL_PASSWORD: string;

    @IsNotEmpty()
    @IsString()
    OAUTH_CLIENTID: string;

    @IsNotEmpty()
    @IsString()
    OAUTH_CLIENT_SECRET: string;

    @IsNotEmpty()
    @IsString()
    OAUTH_REFRESH_TOKEN: string;

    @IsNotEmpty()
    @IsString()
    FRONTEND_URL: string;

    // @IsNotEmpty()
    // @IsString()
    // FIREBASE_CREDENTIALS: string;

    // Redis Configuration
    REDIS_HOST?: string;
    REDIS_PORT?: number;

    // Mailgun Configuration
    MAILGUN_API_KEY?: string;
    MAILGUN_DOMAIN?: string;
    MAILGUN_FROM_EMAIL?: string;

    // Twilio Configuration
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_PHONE_NUMBER?: string;
}

export let config: Config;
// export let config: Config = plainToInstance(Config, { ...process.env });

export const setupConfig = async () => {
    config = plainToInstance(Config, process.env);
    const [error] = await validate(config, { whitelist: true })
    if (error) return error;
}
