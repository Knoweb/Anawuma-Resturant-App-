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
  private connectedClients = new Map<string, { socketId: string; userId?: number; role?: string; restaurantId?: number }>();

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
    @MessageBody() data: { userId: number; role: string; restaurantId?: number },
  ) {
    this.connectedClients.set(client.id, {
      socketId: client.id,
      userId: data.userId,
      role: data.role,
      restaurantId: data.restaurantId,
    });
    
    if (data.restaurantId) {
      client.join(`restaurant_${data.restaurantId}`);
    }
    
    this.logger.log(`Client authenticated: ${client.id} - User: ${data.userId} - Role: ${data.role} - Restaurant: ${data.restaurantId}`);
    return { success: true };
  }

  private dashboardUpdateTimeout = new Map<number, NodeJS.Timeout>();
  private latestDashboardStats = new Map<number, any>();

  // Emit dashboard stats update with debouncing per restaurant
  emitDashboardUpdate(stats: any, restaurantId: number) {
    this.latestDashboardStats.set(restaurantId, stats);
    if (!this.dashboardUpdateTimeout.has(restaurantId)) {
      const timeout = setTimeout(() => {
        const currentStats = this.latestDashboardStats.get(restaurantId);
        if (currentStats) {
          this.server.to(`restaurant_${restaurantId}`).emit('dashboard:update', currentStats);
          this.logger.log(`Dashboard stats broadcasted to restaurant ${restaurantId} (debounced)`);
        }
        this.dashboardUpdateTimeout.delete(restaurantId);
      }, 500);
      this.dashboardUpdateTimeout.set(restaurantId, timeout);
    }
  }

  // Emit new order notification
  emitNewOrder(order: any) {
    const restaurantId = order.restaurantId;
    if (restaurantId) {
      setImmediate(() => {
        this.server.to(`restaurant_${restaurantId}`).emit('order:new', order);
        this.logger.log(`✅ New order notification sent to restaurant ${restaurantId} (async)`);
      });
    }
  }

  // Emit order status update
  emitOrderStatusUpdate(order: any) {
    const restaurantId = order.restaurantId;
    if (restaurantId) {
      setImmediate(() => {
        this.server.to(`restaurant_${restaurantId}`).emit('order:status-update', order);
        this.logger.log(`✅ Order status update sent to restaurant ${restaurantId} (async)`);
      });
    }
  }

  // Emit notification to specific user role within a restaurant
  emitToRole(role: string, event: string, data: any, restaurantId: number) {
    const roleClients = Array.from(this.connectedClients.values())
      .filter((client) => client.role === role && client.restaurantId === restaurantId);
    
    roleClients.forEach((client) => {
      this.server.to(client.socketId).emit(event, data);
    });
    
    this.logger.log(`Event ${event} sent to ${roleClients.length} clients with role: ${role} in restaurant: ${restaurantId}`);
  }
}
