import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TASK_STATUSES, type TaskStatus } from 'shared';
import { trim } from '../../../core/http/transforms';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(OmitType(CreateTaskDto, ['description'] as const)) {
	@ApiPropertyOptional({ maxLength: 5000, nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(5000)
	@Transform(trim)
	description?: string | null;

	@ApiPropertyOptional({ enum: TASK_STATUSES })
	@IsOptional()
	@IsEnum(TASK_STATUSES)
	status?: TaskStatus;
}
//PartialType aldığı tüm değerleri isteğe bağlı yapar
//OmitType geçiçi olarak çıkarırı
