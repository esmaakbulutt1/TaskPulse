import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../core/http/decorators';
import { ParseUuid } from '../../core/http/pipes';
import type { ServiceResponse } from '../../core/http/types';
import { JwtGuard } from '../auth';
import { ListNotificationsDto, NotificationResponseDto, UnreadNotificationCountResponseDto } from './dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiCookieAuth()
@UseGuards(JwtGuard)
@Controller('notifications')
export class NotificationsController {
	constructor(private readonly notificationsService: NotificationsService) {}

	@Get()
	@ApiOperation({ summary: 'List own notifications (paginated)' })
	@ApiResponse({ status: 200, type: [NotificationResponseDto] })
	async list(@GetUser('id') userId: string, @Query() query: ListNotificationsDto): Promise<ServiceResponse<NotificationResponseDto[]>> {
		const { items, meta } = await this.notificationsService.list(userId, query);
		return { message: 'Notifications loaded', data: items, meta };
	}

	@Get('unread-count')
	@ApiOperation({ summary: 'Get unread notification count' })
	@ApiResponse({ status: 200, type: UnreadNotificationCountResponseDto })
	async unreadCount(@GetUser('id') userId: string): Promise<ServiceResponse<UnreadNotificationCountResponseDto>> {
		return {
			message: 'Unread notification count loaded',
			data: await this.notificationsService.unreadCount(userId),
		};
	}

	@Patch(':id/read')
	@ApiOperation({ summary: 'Mark one notification as read' })
	@ApiResponse({ status: 200, type: NotificationResponseDto })
	@ApiResponse({ status: 404, description: 'notification_not_found' })
	async markRead(@GetUser('id') userId: string, @Param('id', ParseUuid) id: string): Promise<ServiceResponse<NotificationResponseDto>> {
		return {
			message: 'Notification marked as read',
			data: await this.notificationsService.markRead(userId, id),
		};
	}

	@Patch('read-all')
	@ApiOperation({ summary: 'Mark all notifications as read' })
	@ApiResponse({ status: 200, description: 'Notifications marked as read' })
	async markAllRead(@GetUser('id') userId: string): Promise<ServiceResponse> {
		await this.notificationsService.markAllRead(userId);

		return {
			message: 'Notifications marked as read',
		};
	}
}
