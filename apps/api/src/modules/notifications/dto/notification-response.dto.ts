import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NOTIFICATION_TYPES, type NotificationType } from 'shared';

export class NotificationResponseDto {
	@ApiProperty({ format: 'uuid' })
	id!: string;

	@ApiProperty({ format: 'uuid' })
	taskId!: string;

	@ApiProperty({ enum: NOTIFICATION_TYPES })
	type!: NotificationType;

	@ApiProperty()
	title!: string;

	@ApiProperty()
	message!: string;

	@ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
	readAt!: Date | null;

	@ApiProperty({ type: String, format: 'date-time' })
	createdAt!: Date;
}
