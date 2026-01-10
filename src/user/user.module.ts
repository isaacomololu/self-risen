import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { StorageModule, CommonModule } from 'src/common';

@Module({
  imports: [StorageModule, CommonModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule { }
