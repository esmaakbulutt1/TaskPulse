import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
	// For JwtGuard: the 'jwt' passport strategy is registered by AuthModule.
	imports: [AuthModule],
	controllers: [TasksController],
	providers: [TasksService],
})
export class TasksModule {}
