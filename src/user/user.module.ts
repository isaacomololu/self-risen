import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { CloudStorageModule } from 'src/common/storage';

@Module({
  imports: [CloudStorageModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
