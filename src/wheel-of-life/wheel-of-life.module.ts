import { Module } from '@nestjs/common';
import { WheelOfLifeController } from './wheel-of-life.controller';
import { WheelOfLifeService } from './wheel-of-life.service';

@Module({
    controllers: [WheelOfLifeController],
    providers: [WheelOfLifeService],
    exports: [WheelOfLifeService],
})
export class WheelOfLifeModule { }

