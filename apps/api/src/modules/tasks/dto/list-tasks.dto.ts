import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TASK_STATUSES, type TaskStatus } from 'shared';
import { PaginationDto } from '../../../core/http/dto';

export class ListTasksDto extends PaginationDto {
	@ApiPropertyOptional({ enum: TASK_STATUSES })
	@IsOptional()
	@IsEnum(TASK_STATUSES)
	status?: TaskStatus;
}
//PaginationDto sayfa bilgileri
