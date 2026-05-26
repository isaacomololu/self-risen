import { ApiProperty } from '@nestjs/swagger';

export class LoopRemindersResponseDto {
    @ApiProperty({ description: 'Whether morning/evening loop reminders are enabled' })
    loopReminderEnabled: boolean;

    @ApiProperty({
        description: 'Morning reminder time in user timezone (HH:mm, 24-hour)',
        nullable: true,
        example: '07:30',
    })
    loopReminderMorning: string | null;

    @ApiProperty({
        description: 'Evening reminder time in user timezone (HH:mm, 24-hour)',
        nullable: true,
        example: '20:00',
    })
    loopReminderEvening: string | null;
}
