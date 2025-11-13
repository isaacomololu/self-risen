import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BaseService } from '../base.service';
import { JwtService } from '@nestjs/jwt';
import { DatabaseProvider } from 'src/database/database.provider';
import { config } from '../config';
import { createTransport } from 'nodemailer';
import * as nodemailer from 'nodemailer/lib/mailer';


@Injectable()
export class EmailService extends BaseService {
    private transporter: nodemailer.Transporter;

    constructor() {
        super();
        this.transporter = createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: config.MAIL_USERNAME,
                pass: config.MAIL_PASSWORD,
                clientId: config.OAUTH_CLIENTID,
                clientSecret: config.OAUTH_CLIENT_SECRET,
                refreshToken: config.OAUTH_REFRESH_TOKEN
            }
        });
    }

    async sendPasswordResetEmail(email: string, resetLink: string) {
        const mailOptions = {
            from: 'Self-Risen',
            to: email,
            subject: 'Password Reset',
            html: `<p>Click the link below to reset your password:</p><a href="${resetLink}">${resetLink}</a>`
        }

        await this.transporter.sendMail(mailOptions);
    }

    async sendPasswordResetOtp(email: string, otp: string) {
        const mailOptions = {
            from: 'Self-Risen',
            to: email,
            subject: 'Password Reset OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>You have requested to reset your password. Use the OTP code below to proceed:</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                        <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
                    </div>
                    <p>This OTP will expire in 10 minutes.</p>
                    <p>If you did not request this password reset, please ignore this email.</p>
                    <p>Best regards,<br/>The Self-Risen Team</p>
                </div>
            `
        }

        await this.transporter.sendMail(mailOptions);
    }

    async sendPasswordResetConfirmation(email: string, name: string) {
        const mailOptions = {
            from: 'Self-Risen',
            to: email,
            subject: 'Password Changed Successfully',
            html: `
                <p>Hello ${name},</p>
                <p>Your password has been successfully changed.</p>
                <p>If you did not make this change, please contact support immediately.</p>
                <p>Best regards,<br/>The Self-Risen Team</p>
            `
        }

        await this.transporter.sendMail(mailOptions);
    }
}
