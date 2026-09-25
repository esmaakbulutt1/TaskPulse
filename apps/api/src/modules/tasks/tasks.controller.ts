import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../core/http/decorators';
import { ParseUuid } from '../../core/http/pipes';
import type { ServiceResponse } from '../../core/http/types';
import { JwtGuard } from '../auth';
import { CreateTaskDto, ListTasksDto, TaskResponseDto, UpdateTaskDto } from './dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiCookieAuth()
@UseGuards(JwtGuard)
@Controller('tasks')
export class TasksController {
	constructor(private readonly tasksService: TasksService) {}

	@Get()
	@ApiOperation({ summary: 'List own tasks (paginated)' })
	@ApiResponse({ status: 200, type: [TaskResponseDto] })
	async list(@GetUser('id') userId: string, @Query() query: ListTasksDto): Promise<ServiceResponse<TaskResponseDto[]>> {
		const { items, meta } = await this.tasksService.list(userId, query);
		return { message: 'Tasks loaded', data: items, meta };
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a task' })
	@ApiResponse({ status: 200, type: TaskResponseDto })
	@ApiResponse({ status: 404, description: 'task_not_found' })
	async get(@GetUser('id') userId: string, @Param('id', ParseUuid) id: string): Promise<ServiceResponse<TaskResponseDto>> {
		return {
			message: 'Task loaded',
			data: await this.tasksService.get(userId, id),
		};
	}

	@Post()
	@ApiOperation({ summary: 'Create a task' })
	@ApiResponse({ status: 201, type: TaskResponseDto })
	async create(@GetUser('id') userId: string, @Body() dto: CreateTaskDto): Promise<ServiceResponse<TaskResponseDto>> {
		return {
			message: 'Task created',
			data: await this.tasksService.create(userId, dto),
		};
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update a task' })
	@ApiResponse({ status: 200, type: TaskResponseDto })
	@ApiResponse({ status: 404, description: 'task_not_found' })
	async update(@GetUser('id') userId: string, @Param('id', ParseUuid) id: string, @Body() dto: UpdateTaskDto): Promise<ServiceResponse<TaskResponseDto>> {
		return {
			message: 'Task updated',
			data: await this.tasksService.update(userId, id, dto),
		};
	}

	@Delete(':id')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Delete a task (soft delete)' })
	@ApiResponse({ status: 200, description: 'Task deleted' })
	@ApiResponse({ status: 404, description: 'task_not_found' })
	async remove(@GetUser('id') userId: string, @Param('id', ParseUuid) id: string): Promise<ServiceResponse<null>> {
		await this.tasksService.softDelete(userId, id);
		return { message: 'Task deleted', data: null };
	}
}
