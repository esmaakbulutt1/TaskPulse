import { ApiProperty } from '@nestjs/swagger';

export class UnreadNotificationCountResponseDto {
	@ApiProperty({ example: 3, minimum: 0 })
	count!: number;
}
