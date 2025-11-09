import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { EmailModule } from './common/email/email.module';
import { NotificationsModule } from './notifications/notifications.module';
import { config } from './common/config';
import { FirebaseAdminModule } from '@alpha018/nestjs-firebase-auth';
import { ExtractJwt } from 'passport-jwt';
import { loadFirebaseCredentials } from './common/firebase.utils';

@Module({
  imports: [
    ConfigModule.forRoot(),
    FirebaseAdminModule.forRootAsync({
      useFactory: () => ({
        credential: loadFirebaseCredentials(),
        options: {},
        auth: {
          config: {
            extractor: ExtractJwt.fromAuthHeaderAsBearerToken(),
            checkRevoked: true,
            validateRole: true,
          },
        },
      }),
    }),
    AuthModule,
    UserModule,
    DatabaseModule,
    EmailModule,
    NotificationsModule,
    // JwtModule.registerAsync({
    //   useFactory: () => ({
    //     secret: config.JWT_SECRET,
    //     signOptions: { expiresIn: '1h' },
    //   }),
    //   global: true
    // }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
