import { ApiProperty } from '@nestjs/swagger';
import { USER_ROLES, type AuthUser, type UserRole } from 'shared';

/**
 * Swagger documentation for the only user shape that leaves the API. It mirrors `AuthUser`
 * from `shared` — the `implements` clause makes the compiler fail if the two drift apart.
 */
export class UserResponseDto implements Omit<AuthUser, 'createdAt' | 'updatedAt'> {
	@ApiProperty({ format: 'uuid' })
	id!: string;

	@ApiProperty({ example: 'admin@example.com' })
	email!: string;

	@ApiProperty({ example: 'Admin' })
	name!: string;

	@ApiProperty({ example: 'Yılmaz', nullable: true })
	surname!: string | null;

	@ApiProperty({ example: '2000-12-15', nullable: true })
	bday!: string | null;

	@ApiProperty({ enum: USER_ROLES, example: 'user' })
	role!: UserRole;

	@ApiProperty({ example: true })
	isActive!: boolean;

	@ApiProperty({ type: String, format: 'date-time' })
	createdAt!: Date;

	@ApiProperty({ type: String, format: 'date-time' })
	updatedAt!: Date;
}

export class SessionResponseDto {
	@ApiProperty({ type: UserResponseDto })
	user!: UserResponseDto;
}
