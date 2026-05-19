import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, Matches } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateLoopRemindersDto {
    @ApiProperty({ description: 'Enable morning/evening loop reminders', required: false })
    @IsOptional()
    @IsBoolean()
    loopReminderEnabled?: boolean;

    @ApiProperty({ description: 'Morning reminder time in user timezone (HH:mm)', example: '07:30', required: false })
    @IsOptional()
    @Matches(TIME_PATTERN, { message: 'loopReminderMorning must be HH:mm (24-hour)' })
    loopReminderMorning?: string;

    @ApiProperty({ description: 'Evening reminder time in user timezone (HH:mm)', example: '20:00', required: false })
    @IsOptional()
    @Matches(TIME_PATTERN, { message: 'loopReminderEvening must be HH:mm (24-hour)' })
    loopReminderEvening?: string;
}
