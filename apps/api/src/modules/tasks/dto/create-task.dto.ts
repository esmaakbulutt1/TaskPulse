import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { trim } from '../../../core/http/transforms';

export class CreateTaskDto {
	@ApiProperty({ maxLength: 200 })
	@IsString()
	@MinLength(1)
	@MaxLength(200)
	@Transform(trim)
	title!: string;

	@ApiPropertyOptional({ maxLength: 5000 })
	@IsOptional()
	@IsString()
	@MaxLength(5000)
	@Transform(trim)
	description?: string;

	@ApiProperty({ type: String, format: 'date-time' })
	@IsDateString()
	dueAt!: string;
}
