import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'engine.io';
import { Socket } from 'socket.io';

@WebSocketGateway(5050, {
  namespace: 'online',
  cors: {
    origin: '*',
  },
})
export class OnlineGateway {
  @WebSocketServer() server: Server;
  private onlineUsers = new Set<number>();

  handleConnection(client: Socket) {
    const userId = this.extractUserId(client);
    this.onlineUsers.add(userId);
  }

  handleDisconnect(client: Socket) {
    const userId = this.extractUserId(client);
    this.onlineUsers.delete(userId);
  }

  async notifyFriends(userId: number, isOnline: boolean) {
    // const friends = await this.friendService.getFriendsOfUser(userId);
    // const friends = [];
    // friends.forEach((friend) => {
    //   const friendSocketId = this.getSocketIdByUserId(friend.id);
    //   if (friendSocketId) {
    //     this.server
    //       .to(friendSocketId)
    //       .emit('friendStatus', { userId, isOnline });
    //   }
    // });
  }

  isOnline(userId: number) {
    return this.onlineUsers.has(userId);
  }

  private extractUserId(client: Socket): number {
    return Number(client.handshake.query.userId);
  }
}