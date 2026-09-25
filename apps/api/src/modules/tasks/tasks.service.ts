import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import type { PaginationMeta } from 'shared'; //Sayfalama sonucunun tipini alır.
import { DRIZZLE, type Database } from '../../core/db/drizzle.module';
import { tasks } from '../../core/db/schema';
import type { CreateTaskDto, ListTasksDto, TaskResponseDto, UpdateTaskDto } from './dto';

const taskResponseSelection = {
	id: tasks.id,
	title: tasks.title,
	description: tasks.description,
	dueAt: tasks.dueAt,
	status: tasks.status,
	createdAt: tasks.createdAt,
	updatedAt: tasks.updatedAt,
};

@Injectable()
export class TasksService {
	constructor(@Inject(DRIZZLE) private readonly db: Database) {}

	async list(userId: string, query: ListTasksDto): Promise<{ items: TaskResponseDto[]; meta: PaginationMeta }> {
		const where = and(eq(tasks.userId, userId), eq(tasks.isDeleted, false), ...(query.status ? [eq(tasks.status, query.status)] : []));

		const [items, [totals]] = await Promise.all([
			this.db.select(taskResponseSelection).from(tasks).where(where).orderBy(desc(tasks.createdAt)).limit(query.perPage).offset(query.offset),
			this.db.select({ value: count() }).from(tasks).where(where),
		]);

		const total = totals?.value ?? 0;
		return {
			items,
			meta: {
				total,
				page: query.page,
				perPage: query.perPage,
				totalPages: Math.ceil(total / query.perPage),
			},
		};
	}
	async get(userId: string, id: string): Promise<TaskResponseDto> {
		const [row] = await this.db
			.select(taskResponseSelection)
			.from(tasks)
			.where(and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.isDeleted, false)))
			.limit(1);

		if (!row) throw new NotFoundException('task_not_found');
		return row;
	}

	async create(userId: string, dto: CreateTaskDto): Promise<TaskResponseDto> {
		const [row] = await this.db
			.insert(tasks)
			.values({
				userId,
				title: dto.title,
				description: dto.description ?? null,
				dueAt: new Date(dto.dueAt),
				status: 'pending',
			})
			.returning(taskResponseSelection);
		return row;
	}

	async update(userId: string, id: string, dto: UpdateTaskDto): Promise<TaskResponseDto> {
		const [row] = await this.db
			.update(tasks)
			.set({
				...(dto.title !== undefined ? { title: dto.title } : {}),
				...(dto.description !== undefined ? { description: dto.description } : {}),
				...(dto.dueAt !== undefined ? { dueAt: new Date(dto.dueAt) } : {}),
				...(dto.status !== undefined ? { status: dto.status } : {}),
				updatedAt: new Date(),
			})
			.where(and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.isDeleted, false)))
			.returning(taskResponseSelection);

		if (!row) throw new NotFoundException('task_not_found');
		return row;
	}

	async softDelete(userId: string, id: string): Promise<void> {
		const [deletedTask] = await this.db
			.update(tasks)
			.set({ isDeleted: true, updatedAt: new Date() })
			.where(and(eq(tasks.id, id), eq(tasks.userId, userId), eq(tasks.isDeleted, false)))
			.returning({ id: tasks.id });

		if (!deletedTask) throw new NotFoundException('task_not_found');
	}
}
