import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ProgressService } from '../services/progress.service';
import {
  ProgressUpdate,
  ImportProgress,
  ExportProgress,
} from '../interfaces/progress.interface';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'], // Frontend URLs
    credentials: true,
  },
  namespace: '/progress',
})
export class ProgressGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ProgressGateway.name);
  private connectedClients = new Map<string, Socket>();

  constructor(private readonly progressService: ProgressService) {
    // Listen to progress events from ProgressService
    this.progressService.on('progress', (update: ProgressUpdate) => {
      this.broadcastProgress(update);
    });

    this.progressService.on('importProgress', (update: ImportProgress) => {
      this.broadcastImportProgress(update);
    });

    this.progressService.on('exportProgress', (update: ExportProgress) => {
      this.broadcastExportProgress(update);
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);

    // Send current active tasks to new client
    const activeTasks = this.progressService.getAllActiveTasks();
    client.emit('activeTasks', activeTasks);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  /**
   * 📊 Subscribe to specific task progress
   */
  @SubscribeMessage('subscribeToTask')
  handleSubscribeToTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string },
  ) {
    this.logger.log(
      `📝 Client ${client.id} subscribed to task: ${data.taskId}`,
    );

    // Join the client to a room for this specific task
    client.join(`task_${data.taskId}`);

    // Send current progress if task exists
    const currentProgress = this.progressService.getProgress(data.taskId);
    if (currentProgress) {
      client.emit('taskProgress', currentProgress);
    }
  }

  /**
   * 📊 Unsubscribe from task progress
   */
  @SubscribeMessage('unsubscribeFromTask')
  handleUnsubscribeFromTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string },
  ) {
    this.logger.log(
      `📝 Client ${client.id} unsubscribed from task: ${data.taskId}`,
    );
    client.leave(`task_${data.taskId}`);
  }

  /**
   * 📋 Get all active tasks
   */
  @SubscribeMessage('getActiveTasks')
  handleGetActiveTasks(@ConnectedSocket() client: Socket) {
    const activeTasks = this.progressService.getAllActiveTasks();
    client.emit('activeTasks', activeTasks);
  }

  /**
   * 📊 Broadcast general progress update
   */
  private broadcastProgress(update: ProgressUpdate) {
    this.server.to(`task_${update.taskId}`).emit('taskProgress', update);
    this.logger.debug(`📡 Broadcasted progress for task: ${update.taskId}`);
  }

  /**
   * 📥 Broadcast import progress
   */
  private broadcastImportProgress(update: ImportProgress) {
    this.server.to(`task_${update.taskId}`).emit('importProgress', update);
    this.server.to(`task_${update.taskId}`).emit('taskProgress', update);

    this.logger.debug(
      `📡 Broadcasted import progress: ${update.ordersProcessed}/${update.ordersTotal}`,
    );
  }

  /**
   * 📤 Broadcast export progress
   */
  private broadcastExportProgress(update: ExportProgress) {
    this.server.to(`task_${update.taskId}`).emit('exportProgress', update);
    this.server.to(`task_${update.taskId}`).emit('taskProgress', update);

    this.logger.debug(
      `📡 Broadcasted export progress: ${update.ordersExported}/${update.ordersTotal}`,
    );
  }

  /**
   * 🚨 Broadcast error to specific task subscribers
   */
  broadcastTaskError(taskId: string, error: string) {
    this.server.to(`task_${taskId}`).emit('taskError', {
      taskId,
      error,
      timestamp: new Date(),
    });
  }

  /**
   * ✅ Broadcast task completion
   */
  broadcastTaskComplete(taskId: string, result: any) {
    this.server.to(`task_${taskId}`).emit('taskComplete', {
      taskId,
      result,
      timestamp: new Date(),
    });
  }

  /**
   * 📊 Broadcast system statistics
   */
  broadcastSystemStats(stats: any) {
    this.server.emit('systemStats', stats);
  }
}
