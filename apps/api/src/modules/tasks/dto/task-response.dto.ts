import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TASK_STATUSES, type TaskStatus } from 'shared';

export class TaskResponseDto {
	@ApiProperty({ format: 'uuid' })
	id!: string;

	@ApiProperty()
	title!: string;

	@ApiPropertyOptional({ nullable: true })
	description!: string | null;

	@ApiProperty({ type: String, format: 'date-time' })
	dueAt!: Date;

	@ApiProperty({ enum: TASK_STATUSES })
	status!: TaskStatus;

	@ApiProperty({ type: String, format: 'date-time' })
	createdAt!: Date;

	@ApiProperty({ type: String, format: 'date-time' })
	updatedAt!: Date;
}
//apinin frontede gönderceği veriyi tnımlarr
