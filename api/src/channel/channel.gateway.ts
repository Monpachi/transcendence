import { FriendsService } from './../friends/friends.service';
import { ConnectedUsersService } from './../connectedUsers/connectedUsers.service';
import { ChannelService } from './channel.service';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  ActionOnUser,
  BlockUser,
  ChannelMessageContent,
  ConnectToChannel,
  MuteUser,
  QuitChannel,
} from 'src/types/channelsSchema';
import { UseGuards } from '@nestjs/common';
import { WsAuthGuard } from 'src/auth/ws-auth.guard';

@WebSocketGateway(
  /*5050, */ {
    namespace: 'channel',
    cors: {
      origin: '*',
    },
  },
)
@UseGuards(WsAuthGuard)
export class ChannelGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private channelService: ChannelService,
    private readonly wsGuard: WsAuthGuard,
    private readonly connectedUsersService: ConnectedUsersService,
    private readonly friendsService: FriendsService,
  ) {}

  @WebSocketServer() server: Server;

  //
  //
  //
  afterInit(socket: Socket) {
    socket.use((client, next) => {
      try {
        const payload: { id: number } = this.wsGuard.validateToken(
          client as any,
        );
        (client as any as Socket).data = payload;
        next();
      } catch (error) {
        console.error(error);
        next(new Error('not authorized'));
      }
    });
  }

  //
  //
  //
  handleConnection(socket: Socket) {
    console.log(`Client connected: ${socket.id}`);
  }

  //
  //
  //
  @SubscribeMessage('joinchannel')
  async handleJoinChannel(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ConnectToChannel,
  ): Promise<void> {
    try {
      await this.channelService.userExists(payload.userId);
    } catch (error) {
      console.error(error);
      throw new WsException('User do not exist');
    }

    try {
      await this.channelService.channelExists(payload.channelId);
    } catch (error) {
      console.error(error);
      throw new WsException('Channel do not exist');
    }

    try {
      await this.channelService.userIsBanned(payload.userId, payload.channelId);
    } catch (error) {
      console.error(error);
      throw new WsException('User is banned');
    }

    try {
      if (
        payload.userId !== payload.channelOwner &&
        payload.isPublic === false
      ) {
        await this.friendsService.isFriend(
          // !!! to test
          payload.userId,
          payload.channelOwner,
        );
      }
    } catch (error) {
      console.error(error);
      throw new WsException(
        'Users are not friends, impossible to join a private or protected channel',
      );
    }

    try {
      if (payload.password !== null) {
        await this.channelService.verifyPassword(
          payload.channelId,
          payload.password,
        );
      }
    } catch (error) {
      console.error(error);
      throw new WsException('Invalid password');
    }

    if (!payload.channelId) {
      console.error('No channel id provided');
      throw new WsException('No channel id provided');
    }

    try {
      try {
        this.channelService.joinChannel(payload.userId, payload.channelId);
      } catch (error) {
        console.error(error);
        throw new WsException('Could not join channel');
      }

      socket.join(String(payload.channelId));
      this.connectedUsersService.addUser(payload.userId, socket);
      console.log(
        `Client socket ${socket.id}, joined channel: ${payload.channelId}`,
      );
    } catch (error) {
      console.error(error);
      this.connectedUsersService.removeUserWithUserId(payload.userId);
      throw new WsException('Could not join channel');
    }
  }

  //
  //
  //
  @SubscribeMessage('createChannelMessage')
  async handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ChannelMessageContent,
  ): Promise<void> {
    try {
      this.connectedUsersService.verifyConnection(socket);
    } catch (error) {
      console.error(error);
      throw new WsException('User did not join channel room');
    }

    try {
      await this.channelService.userIsBanned(
        payload.senderId,
        payload.channelId,
      );
    } catch (error) {
      socket.leave(String(payload.channelId));
      this.connectedUsersService.removeUserWithSocketId(socket.id);
      console.error(error);
      throw new WsException(`User is banned from channel ${payload.channelId}`);
    }

    // Do not disconnect the muted user, just don't send the message
    try {
      await this.channelService.userIsMuted(payload);
    } catch (error) {
      console.error(error);
      throw new WsException('User is muted');
    }

    try {
      this.server
        .to(String(payload.channelId))
        .emit('createChannelMessage', payload);
    } catch (error) {
      socket.disconnect();
      this.connectedUsersService.removeUserWithSocketId(socket.id);
      console.error(error);
      throw new WsException('Could not send message');
    }

    try {
      this.channelService.createMessage(payload);
    } catch (error) {
      socket.leave(String(payload.channelId));
      this.connectedUsersService.removeUserWithSocketId(socket.id);
      console.error(error);
      throw new WsException('Internal server error');
    }
  }

  //
  //
  //
  @SubscribeMessage('leavechannel')
  async handleLeaveChannel(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ConnectToChannel,
  ): Promise<void> {
    try {
      this.connectedUsersService.verifyConnection(socket);
    } catch (error) {
      console.error(error);
      throw new WsException('User did not join channel room');
    }

    try {
      await this.channelService.userExists(payload.userId);
      await this.channelService.channelExists(payload.channelId);
    } catch (error) {
      socket.disconnect();
      this.connectedUsersService.removeUserWithSocketId(socket.id);
      console.error(error);
      throw new WsException('User or channel does not exist');
    }

    if (!payload.channelId) {
      console.error('No channel id provided');
      throw new WsException('No channel id provided');
    }

    try {
      socket.leave(String(payload.channelId));
      this.connectedUsersService.removeUserWithSocketId(socket.id);
      console.log(
        `Client socket ${socket.id}, left channel: ${payload.channelId}`,
      );
    } catch (error) {
      socket.disconnect();
      console.error(error);
      throw new WsException('Could not leave channel');
    }
  }

  //
  //
  //
  // !!! tested
  @SubscribeMessage('quitChannel')
  async handleQuitChannel(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: QuitChannel,
  ): Promise<void> {
    try {
      this.connectedUsersService.verifyConnection(socket);
    } catch (error) {
      console.error(error);
      throw new WsException('User did not join channel room');
    }

    try {
      await this.channelService.userExists(payload.userId);
      await this.channelService.channelExists(payload.channelId);
    } catch (error) {
      this.connectedUsersService.removeUserWithSocketId(socket.id);
      console.error(error);
      throw new WsException('User or channel does not exist');
    }

    try {
      this.channelService.quitChannel(payload);
      socket.leave(String(payload.channelId));
      this.connectedUsersService.removeUserWithSocketId(socket.id);
      console.log(
        `Client socket ${socket.id}, quit channel: ${payload.channelId}`,
      );
    } catch (error) {
      socket.disconnect();
      console.error(error);
      throw new WsException('Could not quit channel');
    }
  }

  //
  //
  //
  handleDisconnect(@ConnectedSocket() socket: Socket) {
    try {
      socket.disconnect();
      this.connectedUsersService.removeUserWithSocketId(socket.id);
      console.log('Client disconnected');
    } catch (error) {
      console.error(error);
      throw new WsException('Could not disconnect');
    }
  }

  //
  //
  //
  // !!! tested with 2 users
  @SubscribeMessage('banUser')
  async handleBanUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ActionOnUser,
  ) {
    try {
      this.connectedUsersService.verifyConnection(socket);
    } catch (error) {
      console.error(error);
      throw new WsException('User did not join channel room');
    }

    try {
      await this.channelService.banUser(payload);
    } catch (error) {
      console.error(error);
      throw new WsException('Could not ban user');
    }

    try {
      const bannedSocketId = this.connectedUsersService.getSocket(
        payload.targetUserId,
      );

      if (bannedSocketId) {
        bannedSocketId.leave(payload.channelId.toString());
        this.connectedUsersService.removeUserWithSocketId(
          bannedSocketId.id as string,
        );
      }
    } catch (error) {
      console.error(error);
      throw new WsException('Could not leave channel');
    }
  }

  //
  //
  //
  // !!! tested
  @SubscribeMessage('unbanUser')
  async handleUnbanUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ActionOnUser,
  ) {
    try {
      this.connectedUsersService.verifyConnection(socket);
    } catch (error) {
      console.error(error);
      throw new WsException('User did not join channel room');
    }
    try {
      await this.channelService.unbanUser(payload);
    } catch (error) {
      console.error(error);
      throw new WsException('Could not unban user');
    }
  }

  //
  //
  //
  // !!! tested with 2 users
  @SubscribeMessage('kickUser')
  async handleKickUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ActionOnUser,
  ) {
    try {
      this.connectedUsersService.verifyConnection(socket);
    } catch (error) {
      console.error(error);
      throw new WsException('User did not join channel room');
    }

    try {
      // verifie si le user est admin du channel et
      // et si le targetuser n'est pas owner du channel
      // et si adminId != TargetId
      await this.channelService.kickUser(payload);
    } catch (error) {
      console.error(error);
      throw new WsException('Could not kick user');
    }

    try {
      const kickedSocketId = this.connectedUsersService.getSocket(
        payload.targetUserId,
      );

      if (kickedSocketId) {
        kickedSocketId.leave(payload.channelId.toString());
        this.connectedUsersService.removeUserWithSocketId(
          kickedSocketId.id as string,
        );
      }
    } catch (error) {
      console.error(error);
      throw new WsException('Could not leave channel');
    }
  }

  //
  //
  //
  // !!! tested
  @SubscribeMessage('muteUser')
  async handleMuteUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: MuteUser,
  ) {
    try {
      this.connectedUsersService.verifyConnection(socket);
    } catch (error) {
      console.error(error);
      throw new WsException('User did not join channel room');
    }
    try {
      await this.channelService.muteUser(payload);
    } catch (error) {
      console.error(error);
      throw new WsException('Could not mute user');
    }
  }

  //
  //
  //
  // !!! tested
  @SubscribeMessage('unmuteUser')
  async handleUnmute(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: MuteUser,
  ) {
    try {
      this.connectedUsersService.verifyConnection(socket);
    } catch (error) {
      console.error(error);
      throw new WsException('User did not join channel room');
    }
    try {
      await this.channelService.unmuteUser(payload);
    } catch (error) {
      console.error(error);
      throw new WsException('Could not unmute user');
    }
  }

  //
  //
  //
  // !!! tested
  //blocked user can still send messages but the user who blocked cannot see them
  //blocked works for all the channels
  @SubscribeMessage('blockUser')
  async handleBlockUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: BlockUser,
  ) {
    try {
      this.connectedUsersService.verifyConnection(socket);
    } catch (error) {
      console.error(error);
      throw new WsException('User did not join channel room');
    }
    try {
      await this.channelService.blockUser(payload);
    } catch (error) {
      console.error(error);
      throw new WsException('Could not block user');
    }
  }

  //
  //
  //
  // !!! tested
  @SubscribeMessage('unblockUser')
  async hadleUnblockUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: BlockUser,
  ) {
    try {
      this.connectedUsersService.verifyConnection(socket);
    } catch (error) {
      console.error(error);
      throw new WsException('User did not join channel room');
    }
    try {
      await this.channelService.unblockUser(payload);
    } catch (error) {
      console.error(error);
      throw new WsException('Could not unblock user');
    }
  }

  //
  //
  //
  // !!! tested
  @SubscribeMessage('addChannelAdmin')
  async handleAddChannelAdmin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ActionOnUser,
  ) {
    try {
      this.connectedUsersService.verifyConnection(socket);
    } catch (error) {
      console.error(error);
      throw new WsException('User did not join channel room');
    }
    try {
      await this.channelService.addAdministrator(payload);
    } catch (error) {
      console.error(error);
      throw new WsException('Could not add admin');
    }
  }

  //
  //
  //
  // !!! tested
  @SubscribeMessage('removeChannelAdmin')
  async handleRemoveChannelAdmin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ActionOnUser,
  ) {
    try {
      this.connectedUsersService.verifyConnection(socket);
    } catch (error) {
      console.error(error);
      throw new WsException('User did not join channel room');
    }
    try {
      await this.channelService.removeAdministrator(payload);
    } catch (error) {
      console.error(error);
      throw new WsException('Could not remove admin');
    }
  }

  //
  //
  //
  // !!! to finish
  @SubscribeMessage('addToInviteList')
  async handleAddToInviteList(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ActionOnUser,
  ) {
    // try {
    //   this.connectedUsersService.verifyConnection(socket);
    // } catch (error) {
    //   console.error(error);
    //   throw new WsException('User did not join channel room');
    // }
    try {
      await this.channelService.addToInviteList(payload);
    } catch (error) {
      console.error(error);
      throw new WsException('Could not add user to invite list');
    }
  }

  //
  //
  //
  // !!! to finish
  @SubscribeMessage('removeFromInviteList')
  async handleRemoveFromInviteList(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: ActionOnUser,
  ) {
    // try {
    //   this.connectedUsersService.verifyConnection(socket);
    // } catch (error) {
    //   console.error(error);
    //   throw new WsException('User did not join channel room');
    // }
    try {
      await this.channelService.removeFromInviteList(payload);
    } catch (error) {
      console.error(error);
      throw new WsException('Could not remove user from invite list');
    }
  }
}
