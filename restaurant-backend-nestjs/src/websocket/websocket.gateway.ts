import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';



@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  namespace: 'events',
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WebsocketGateway');
  private connectedClients = new Map<string, { socketId: string; userId?: number; role?: string }>();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.logger.log(`WebSocket server is ready on namespace: /events`);
  }

  handleConnection(client: Socket) {
    this.logger.log(`✅ Client connected: ${client.id}`);
    this.connectedClients.set(client.id, { socketId: client.id });
    this.logger.log(`📊 Total connected clients: ${this.connectedClients.size}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
    this.logger.log(`📊 Total connected clients: ${this.connectedClients.size}`);
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: number; role: string },
  ) {
    this.connectedClients.set(client.id, {
      socketId: client.id,
      userId: data.userId,
      role: data.role,
    });
    this.logger.log(`Client authenticated: ${client.id} - User: ${data.userId} - Role: ${data.role}`);
    return { success: true };
  }

  private dashboardUpdateTimeout: NodeJS.Timeout | null = null;
  private latestDashboardStats: any = null;

  // Emit dashboard stats update to all clients with debouncing
  emitDashboardUpdate(stats: any) {
    this.latestDashboardStats = stats;
    if (!this.dashboardUpdateTimeout) {
      this.dashboardUpdateTimeout = setTimeout(() => {
        if (this.latestDashboardStats) {
          this.server.emit('dashboard:update', this.latestDashboardStats);
          this.logger.log('Dashboard stats broadcasted (debounced)');
        }
        this.dashboardUpdateTimeout = null;
      }, 500); // 500ms debounce
    }
  }

  // Emit new order notification
  emitNewOrder(order: any) {
    const clientCount = this.connectedClients.size;
    this.logger.log(`🔔 EMITTING NEW ORDER EVENT to ${clientCount} clients`);
    this.logger.log(`Order details: ${JSON.stringify(order)}`);
    
    setImmediate(() => {
      this.server.emit('order:new', order);
      this.logger.log(`✅ New order notification sent to all ${clientCount} connected clients (async)`);
    });
  }

  // Emit order status update
  emitOrderStatusUpdate(order: any) {
    const clientCount = this.connectedClients.size;
    this.logger.log(`📋 EMITTING ORDER STATUS UPDATE to ${clientCount} clients`);
    this.logger.log(`Order details: ${JSON.stringify(order)}`);
    
    setImmediate(() => {
      this.server.emit('order:status-update', order);
      this.logger.log(`✅ Order status update sent to all ${clientCount} connected clients (async)`);
    });
  }

  // Emit notification to specific user role
  emitToRole(role: string, event: string, data: any) {
    const roleClients = Array.from(this.connectedClients.values())
      .filter((client) => client.role === role);
    
    roleClients.forEach((client) => {
      this.server.to(client.socketId).emit(event, data);
    });
    
    this.logger.log(`Event ${event} sent to ${roleClients.length} clients with role: ${role}`);
  }
}
