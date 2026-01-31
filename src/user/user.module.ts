import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { StorageModule, CommonModule } from 'src/common';
import { TextToSpeechService } from 'src/reflection/services/text-to-speech.service';

@Module({
  imports: [StorageModule, CommonModule],
  controllers: [UserController],
  providers: [UserService, TextToSpeechService],
})
export class UserModule { }
