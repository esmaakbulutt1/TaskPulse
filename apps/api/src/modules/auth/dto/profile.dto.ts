import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { trim } from '../../../core/http/transforms';

export class ProfileDto {
	@ApiPropertyOptional({ example: 'Admin', minLength: 2, maxLength: 120 })
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(120)
	@Transform(trim)
	name?: string;

	@ApiPropertyOptional({ example: 'YÄ±lmaz', minLength: 2, maxLength: 120 })
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(120)
	@Transform(trim)
	surname?: string;

	@ApiPropertyOptional({ example: '2000-12-15', format: 'date' })
	@IsOptional()
	@IsDateString({ strict: true })
	bday?: string;
}
