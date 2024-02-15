import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Channel, ChannelMessage } from '../types/schema';
import { db } from 'src/database';
import {
  ActionOnUser,
  BlockUser,
  ChannelCreationData,
  ChannelDataWithoutPassword,
  ConnectToChannel,
  MessageWithSenderInfo,
  MuteUser,
} from 'src/types/channelsSchema';
import * as bcrypt from 'bcrypt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ColumnType } from 'kysely';

@Injectable()
export class ChannelService {
  //
  //
  //
  async createMessage(message: ChannelMessage): Promise<void> {
    // User exists in db
    // try {
    //  await this.userExists(userId);
    // } catch (error) {
    //  throw new InternalServerErrorException();
    // }
    try {
      console.log('createMessage');
      await db
        .insertInto('channelMessage')
        .values({
          channelId: message.channelId,
          content: message.content,
          senderId: message.senderId,
        })
        .execute();

      console.log('Msg added');
    } catch (error) {
      console.error('Error creating message:', error);
    }
  }

  //
  //
  //
  async getChannelMessages(
    userId: number,
    channelId: number,
  ): Promise<MessageWithSenderInfo[]> {
    try {
      await this.userExists(userId);
    } catch (error) {
      throw new InternalServerErrorException();
    }

    const isMember = await db
      .selectFrom('channelMember')
      .select('userId')
      .where('userId', '=', userId)
      .where('channelId', '=', channelId)
      .executeTakeFirst();

    if (!isMember) {
      throw new NotFoundException('User is not a member of the channel');
    }

    const messages = await db
      .selectFrom('channelMessage')
      .selectAll()
      .where('channelMessage.channelId', '=', channelId)
      .orderBy('channelMessage.createdAt', 'asc')
      .leftJoin('user', 'channelMessage.senderId', 'user.id')
      .leftJoin(
        'channelAdmin',
        'channelAdmin.channelId',
        'channelMessage.channelId',
      )
      .leftJoin('channel', 'channel.channelOwner', 'channelMessage.senderId')
      .leftJoin('bannedUser', 'bannedUser.bannedId', 'channelMessage.senderId')
      .leftJoin('mutedUser', (join) =>
        join
          .onRef('mutedUser.userId', '=', 'channelMessage.senderId')
          .on('mutedUser.channelId', '=', channelId)
          .on('mutedUser.mutedEnd', '>', new Date()),
      )
      .select([
        'channelMessage.channelId',
        'channelMessage.content',
        'channelMessage.createdAt',
        'channelMessage.id as messageId',
        'channelMessage.senderId',
        'user.avatarUrl',
        'user.username',
        'channelAdmin.userId as isAdmin',
        'bannedUser.bannedId as isBanned',
        'mutedUser.userId as isMuted',
        'mutedUser.mutedEnd',
        'channel.channelOwner',
      ])
      .execute();

    // !!! TODO add this part for each user
    const blockedById = await db
      .selectFrom('blockedUser')
      .select('blockedById')
      .where('blockedId', '=', userId)
      .execute();

    console.log('blockedById:', blockedById);

    // Transform the result as needed
    const result: MessageWithSenderInfo[] = messages.map((message) => ({
      channelId: message.channelId,
      content: message.content,
      createdAt: message.createdAt as Date,
      messageId: message.messageId as number,
      senderId: message.senderId,
      isOwner: message.channelOwner !== null,
      isAdmin: message.isAdmin !== null,
      isBanned: message.isBanned !== null,
      isMuted: message.isMuted !== null,
      mutedEnd: message.mutedEnd,
      avatarUrl: message.avatarUrl,
      username: message.username || 'no username',
      blockedById: blockedById,
    })) as unknown as MessageWithSenderInfo[];

    if (result.length === 0) {
      throw new NotFoundException('No messages found');
    }

    return result as unknown as MessageWithSenderInfo[];
  }

  //
  //
  //
  // !!! TOREWRITE: getmessages
  // async getChannelMessages(
  //   userId: number,
  //   channelId: number,
  // ): Promise<MessageWithSenderInfo[]> {
  //   // User exists in db
  //   try {
  //     await this.userExists(userId);
  //   } catch (error) {
  //     throw new InternalServerErrorException();
  //   }

  //   const isMember = await db
  //     .selectFrom('channelMember')
  //     .select('userId')
  //     .where('userId', '=', userId)
  //     .where('channelId', '=', channelId)
  //     .executeTakeFirst();

  //   if (!isMember) {
  //     throw new NotFoundException('User is not a member of the channel');
  //   }

  //   // Take messages data
  //   let messages: {
  //     channelId: number;
  //     content: string | null;
  //     createdAt: Date;
  //     id: number;
  //     senderId: number;
  //   }[];
  //   try {
  //     messages = await db
  //       .selectFrom('channelMessage')
  //       .select(['channelId', 'content', 'createdAt', 'id', 'senderId'])
  //       .where('channelId', '=', channelId)
  //       .orderBy('createdAt', 'asc')
  //       .execute();
  //   } catch (error) {
  //     throw new InternalServerErrorException();
  //   }

  //   if (messages.length === 0) {
  //     throw new NotFoundException('No messages found');
  //   }

  //   // Extract unique senderIds from the messages
  //   const uniqueSenderIds = Array.from(
  //     new Set(messages.map((msg) => msg.senderId)),
  //   );

  //   const users: {
  //     [key: number]: {
  //       avatarUrl: string | null;
  //       username: string;
  //       isOwner: boolean;
  //       isAdmin: boolean;
  //       isBanned: boolean;
  //       isMuted: boolean;
  //       mutedEnd: Date | null;
  //     };
  //   } = {};

  //   try {
  //     // Fetch user details for each unique senderId
  //     await Promise.all(
  //       uniqueSenderIds.map(async (senderId) => {
  //         const user = await db
  //           .selectFrom('user')
  //           .select(['avatarUrl', 'username'])
  //           .where('id', '=', senderId)
  //           .executeTakeFirst();

  //         if (user) {
  //           // Additional checks for owner, admin, banned, muted
  //           const isAdmin = await db
  //             .selectFrom('channelAdmin')
  //             .select(['userId'])
  //             .where('userId', '=', senderId)
  //             .where('channelId', '=', channelId)
  //             .execute();

  //           const isOwner = await db
  //             .selectFrom('channel')
  //             .select(['channelOwner'])
  //             .where('channelOwner', '=', senderId)
  //             .execute();

  //           const isBanned = await db
  //             .selectFrom('bannedUser')
  //             .select(['bannedId'])
  //             .where('bannedId', '=', senderId)
  //             .execute();

  //           const isMuted = await db
  //             .selectFrom('mutedUser')
  //             .select(['userId', 'mutedEnd'])
  //             .where('channelId', '=', channelId)
  //             .where('userId', '=', senderId)
  //             .where('mutedEnd', '>', new Date())
  //             .execute();

  //           users[senderId] = {
  //             avatarUrl: user.avatarUrl,
  //             username: user.username,
  //             isOwner: isOwner.length > 0,
  //             isAdmin: isAdmin.length > 0,
  //             isBanned: isBanned.length > 0,
  //             isMuted: isMuted.length > 0,
  //             mutedEnd: isMuted.length > 0 ? isMuted[0].mutedEnd : null,
  //           };
  //         }
  //       }),
  //     );
  //   } catch (error) {
  //     console.error(error);
  //     throw new InternalServerErrorException();
  //   }

  //   return messages.map((message) => ({
  //     channelId: message.channelId,
  //     content: message.content,
  //     createdAt: message.createdAt as unknown as ColumnType<
  //       Date,
  //       string | Date | undefined,
  //       string | Date
  //     >,
  //     messageId: message.id as unknown as ColumnType<
  //       number,
  //       number | undefined,
  //       number
  //     >,
  //     sender: {
  //       senderId: message.senderId,
  //       isOwner: users[message.senderId]?.isOwner || false,
  //       isAdmin: users[message.senderId]?.isAdmin || false,
  //       isBanned: users[message.senderId]?.isBanned || false,
  //       isMuted: users[message.senderId]?.isMuted || false,
  //       mutedEnd: users[message.senderId]?.mutedEnd,
  //       avatarUrl: users[message.senderId]?.avatarUrl,
  //       username: users[message.senderId]?.username || 'no username',
  //     },
  //   })) as unknown as MessageWithSenderInfo[];
  // }

  //
  //
  //
  async createChannel(
    channel: ChannelCreationData,
    userId: number,
  ): Promise<ChannelDataWithoutPassword> {
    try {
      await this.userExists(userId);
    } catch (error) {
      throw new InternalServerErrorException();
    }

    if (
      channel.password !== null &&
      (channel.isPublic as unknown as boolean) === true
    ) {
      throw new UnprocessableEntityException(
        'A channel with a password must be private',
      );
    } else {
      console.log('channel:', channel);
    }

    if (
      channel.name === null ||
      (channel.name !== null &&
        (channel.name.length < 1 || channel.name.length > 40))
    ) {
      throw new UnprocessableEntityException('Invalid channel name length');
    }

    // Verify if channel name is available
    let nameExists: { name: string | null } | undefined; // !!! remove null, migration
    try {
      nameExists = await db
        .selectFrom('channel')
        .select('name')
        .where('name', '=', channel.name)
        .executeTakeFirst();
    } catch (error) {
      throw new UnprocessableEntityException();
    }
    if (nameExists) {
      throw new UnprocessableEntityException('Channel name already exists');
    }

    const hashedPassword = channel.password
      ? await bcrypt.hash(channel.password, 10)
      : null;

    try {
      await db
        .insertInto('channel')
        .values({
          channelOwner: userId,
          isPublic: channel.isPublic as unknown as boolean,
          name: channel.name,
          password: hashedPassword,
          photoUrl: channel.photoUrl,
        })
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }

    let newChannelId: { id: number } | undefined;
    try {
      newChannelId = await db
        .selectFrom('channel')
        .select('id')
        .where('channelOwner', '=', userId)
        .where('name', '=', channel.name)
        .executeTakeFirstOrThrow();
      console.log('Channel created:', newChannelId);
    } catch (error) {
      throw new InternalServerErrorException();
    }

    try {
      await db
        .insertInto('channelAdmin')
        .values({
          channelId: newChannelId.id,
          userId: userId,
        })
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }

    try {
      await db
        .insertInto('channelMember')
        .values({
          channelId: newChannelId.id,
          userId: userId,
        })
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }

    try {
      const newChannel = await db
        .selectFrom('channel')
        .selectAll()
        .where('channelOwner', '=', userId)
        .where('name', '=', channel.name)
        .executeTakeFirst();
      console.log('newChannel:', newChannel);
      return newChannel as unknown as ChannelDataWithoutPassword;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  //
  async deleteChannel(channelId: number, userId: number): Promise<string> {
    // User exists in db
    try {
      await this.userExists(userId);
    } catch (error) {
      throw new InternalServerErrorException();
    }

    // Verify if the user is the owner of the channel
    let isOwner: { channelOwner: number } | undefined;
    try {
      isOwner = await db
        .selectFrom('channel')
        .select('channelOwner')
        .where('id', '=', channelId)
        .where('channelOwner', '=', userId)
        .executeTakeFirst();
    } catch (error) {
      throw new InternalServerErrorException();
    }

    if (!isOwner || isOwner.channelOwner !== userId || isOwner == undefined)
      throw new UnauthorizedException('Only the owner can delete the channel');

    // Delete the channel, the admins and the users
    try {
      await db.transaction().execute(async (trx) => {
        await trx
          .deleteFrom('channelAdmin')
          .where('channelId', '=', channelId)
          .execute();
        await trx
          .deleteFrom('channelMember')
          .where('channelId', '=', channelId)
          .execute();
        await trx.deleteFrom('channel').where('id', '=', channelId).execute();
      });
    } catch (error) {
      throw new InternalServerErrorException();
    }
    return `Channel ${channelId} deleted`;
  }

  //
  //
  //
  async updateChannel(
    id: number,
    channel: Channel,
    userId: number,
  ): Promise<string> {
    // User exists in db
    try {
      await this.userExists(userId);
    } catch (error) {
      throw new InternalServerErrorException();
    }

    // Verify if channel name is valid
    if (!channel.name || channel.name.length < 1 || channel.name.length > 40) {
      console.error('Channel name should be more from 1 to 40 characters');
      throw new UnprocessableEntityException('Invalid channel name length');
    }

    // Verify if channel name is available
    let nameFound: { name: string | null }[];
    try {
      nameFound = await db
        .selectFrom('channel')
        .select('name')
        .where('name', '=', channel.name)
        .where('id', '!=', id)
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }

    if (!nameFound) {
      throw new UnprocessableEntityException('Channel name already exists');
    }

    // Verify if it is the same photoUrl
    let result: { photoUrl: string | null } | undefined;
    try {
      result = await db
        .selectFrom('channel')
        .select('photoUrl')
        .where('id', '=', id)
        .executeTakeFirst();
    } catch (error) {
      throw new InternalServerErrorException();
    }

    if (result) {
      const url = result.photoUrl;
      if (
        url !== null &&
        channel.photoUrl !== null &&
        url === channel.photoUrl
      ) {
        throw new UnprocessableEntityException(
          'Same as actual or Invalid photoUrl',
        );
      }
    } else {
      console.error('Invalid photo url');
      throw new UnprocessableEntityException('Invalid photoUrl');
    }

    // only chanOwner can change owner or password
    let isOwner: { channelOwner: number } | undefined;
    try {
      isOwner = await db
        .selectFrom('channel')
        .select('channelOwner')
        .where('id', '=', id)
        .where('channelOwner', '=', userId)
        .executeTakeFirst();
    } catch (error) {
      throw new InternalServerErrorException();
    }

    if (isOwner) {
      // !!! to test = check if it is the same password
      if (channel.password != null) {
        try {
          const oldPassword = await db
            .selectFrom('channel')
            .select('password')
            .where('id', '=', id)
            .executeTakeFirst();
          if (oldPassword && oldPassword.password != null) {
            const match = await bcrypt.compare(
              channel.password,
              oldPassword.password,
            );
            if (match) {
              throw new UnprocessableEntityException('Same password');
            }
          }
        } catch (error) {
          throw new InternalServerErrorException();
        }
      }

      try {
        const hashedPassword = channel.password
          ? await bcrypt.hash(channel.password, 10)
          : null;
        await db
          .updateTable('channel')
          .set({
            channelOwner: channel.channelOwner,
            isPublic: Boolean(channel.isPublic), // !!! check, need for the password setting
            name: channel.name,
            password: hashedPassword,
            photoUrl: channel.photoUrl,
          })
          .where('id', '=', id)
          .executeTakeFirst();
      } catch (error) {
        throw new InternalServerErrorException();
      }
      return `Channel ${id} updated`;
    }

    let isAdmin: { userId: number } | undefined;
    try {
      isAdmin = await db
        .selectFrom('channelAdmin')
        .select('userId')
        .where('channelId', '=', id)
        .where('userId', '=', userId)
        .executeTakeFirst();
    } catch (error) {
      throw new InternalServerErrorException();
    }
    if (!isAdmin)
      throw new UnauthorizedException(
        'Only the owner or the admin can update this data',
      );
    else {
      try {
        await db
          .updateTable('channel')
          .set({
            name: channel.name,
            photoUrl: channel.photoUrl,
          })
          .where('id', '=', id)
          .executeTakeFirst();
      } catch (error) {
        throw new InternalServerErrorException();
      }
    }
    return `Channel ${id} updated`;
  }

  //
  //
  //
  async getChannel(
    channelId: number,
    userId: number,
  ): Promise<ChannelDataWithoutPassword> {
    // User exists in db
    try {
      await this.userExists(userId);
    } catch (error) {
      throw new NotFoundException('User not found');
    }

    try {
      await this.channelExists(channelId);
    } catch (error) {
      throw new NotFoundException('Channel not found');
    }

    let channel: ChannelDataWithoutPassword;
    try {
      channel = (await db
        .selectFrom('channel')
        .where('id', '=', channelId)
        .select([
          'channelOwner',
          'createdAt',
          'id',
          'isPublic',
          'name',
          'photoUrl',
        ])
        .executeTakeFirst()) as unknown as ChannelDataWithoutPassword;
    } catch (error) {
      throw new InternalServerErrorException();
    }
    return channel;
  }

  //
  //
  //
  // Channels where user is member and not banned
  async getAllChannelsOfTheUser(
    userId: number,
  ): Promise<ChannelDataWithoutPassword[]> {
    // User exists in db
    try {
      await this.userExists(userId);
    } catch (error) {
      throw new InternalServerErrorException('1');
    }

    // Take user info
    let user: { avatarUrl: string | null; username: string }[];
    try {
      user = await db
        .selectFrom('user')
        .select(['avatarUrl', 'username'])
        .where('id', '=', userId)
        .execute();
    } catch (error) {
      throw new InternalServerErrorException('2');
    }

    if (!user || user.length === 0) {
      throw new NotFoundException('Current user not found.');
    }

    let channels: ChannelDataWithoutPassword[];
    try {
      channels = (await db
        .selectFrom('channel')
        .leftJoin('channelMember', 'channel.id', 'channelMember.channelId')
        // .leftJoin('bannedUser', 'channel.id', 'bannedUser.channelId') !!! do not work
        .select([
          'channel.channelOwner',
          'channel.createdAt',
          'channel.id',
          'channel.isPublic',
          'channel.name',
          'channel.photoUrl',
        ])
        .where('channelMember.userId', '=', userId)
        // .where('bannedUser.bannedId', '!=', userId) // !!! do not work
        .execute()) as unknown as ChannelDataWithoutPassword[];
      console.log('channels:', channels);
    } catch (error) {
      throw new InternalServerErrorException('3');
    }
    if (!channels) {
      throw new NotFoundException('No channels found');
    }
    return channels;
  }

  //
  //
  //
  async channelExists(channelId: number): Promise<void> {
    let channelIdExists: { id: number }[];
    try {
      channelIdExists = await db
        .selectFrom('channel')
        .select('id')
        .where('id', '=', channelId)
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }
    if (!channelIdExists || channelIdExists.length === 0) {
      throw new NotFoundException('Channel not found');
    }
  }

  //
  //
  //
  async userIsBanned(userId: number, channelId: number): Promise<void> {
    let bannedUser: { bannedId: number }[];
    try {
      bannedUser = await db
        .selectFrom('bannedUser')
        .select('bannedId')
        .where('bannedId', '=', userId)
        .where('channelId', '=', channelId)
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }
    if (!bannedUser || bannedUser.length === 0) {
      throw new UnauthorizedException('User is banned');
    }
  }

  //
  //
  //
  async userIsMuted(channelMessage: ChannelMessage): Promise<void> {
    let mutedUser: { userId: number; mutedEnd: Date }[];
    try {
      mutedUser = await db
        .selectFrom('mutedUser')
        .select(['userId', 'mutedEnd'])
        .where('channelId', '=', channelMessage.channelId)
        .where('userId', '=', channelMessage.senderId)
        .where('mutedEnd', '>', new Date())
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }
    if (!mutedUser || mutedUser.length === 0) {
      throw new UnauthorizedException('User is muted');
    }
  }

  //
  //
  //
  async userExists(userId: number): Promise<void> {
    let userIdExists: { id: number }[];
    try {
      userIdExists = await db
        .selectFrom('user')
        .select('id')
        .where('id', '=', userId)
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }
    if (!userIdExists || userIdExists.length === 0) {
      throw new NotFoundException('User not found');
    }
  }

  //
  //
  //
  async userIsAdmin(userId: number, channelId: number): Promise<boolean> {
    try {
      await db
        .selectFrom('channelAdmin')
        .select('userId')
        .where('userId', '=', userId)
        .where('channelId', '=', channelId)
        .executeTakeFirstOrThrow(); // !!! to test

      return true;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  //
  async userIsOwner(userId: number, channelId: number): Promise<boolean> {
    try {
      await db
        .selectFrom('channel')
        .select('channelOwner')
        .where('channelOwner', '=', userId)
        .where('id', '=', channelId)
        .executeTakeFirstOrThrow(); // !!! to test

      return true;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  //
  async banUser(payload: ActionOnUser): Promise<void> {
    if (payload.targetUserId === payload.userId) {
      throw new UnauthorizedException('User cannot ban itself');
    }

    try {
      await this.userIsAdmin(payload.userId, payload.channelId);
    } catch {
      throw new UnauthorizedException('User is not an admin');
    }

    if ((await this.userIsOwner(payload.userId, payload.channelId)) === true)
      throw new UnauthorizedException('User cannot ban the channel owner');
    try {
      await db
        .insertInto('bannedUser')
        .values({
          bannedById: payload.userId,
          bannedId: payload.targetUserId,
          channelId: payload.channelId,
        })
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  //
  async unbanUser(payload: ActionOnUser): Promise<void> {
    if (payload.targetUserId === payload.userId) {
      throw new UnauthorizedException('User cannot unban itself');
    }

    try {
      await this.userIsAdmin(payload.userId, payload.channelId);
    } catch {
      throw new UnauthorizedException('User is not an admin');
    }

    if ((await this.userIsOwner(payload.userId, payload.channelId)) === true)
      throw new UnauthorizedException('User cannot unban the channel owner');

    try {
      await db
        .deleteFrom('bannedUser')
        .where('bannedId', '=', payload.targetUserId)
        .where('channelId', '=', payload.channelId)
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  //
  async muteUser(payload: MuteUser): Promise<void> {
    if (payload.targetUserId === payload.userId) {
      throw new UnauthorizedException('User cannot mute itself');
    }

    try {
      await this.userIsAdmin(payload.userId, payload.channelId);
    } catch {
      throw new UnauthorizedException('User is not an admin');
    }

    if ((await this.userIsOwner(payload.userId, payload.channelId)) === true)
      throw new UnauthorizedException('User cannot mute the channel owner');

    try {
      await db
        .insertInto('mutedUser')
        .values({
          channelId: payload.channelId,
          mutedEnd: payload.muteEnd,
          userId: payload.userId,
        })
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  //
  async unmuteUser(payload: ActionOnUser): Promise<void> {
    if (payload.targetUserId === payload.userId) {
      throw new UnauthorizedException('User cannot unmute itself');
    }

    try {
      await this.userIsAdmin(payload.userId, payload.channelId);
    } catch {
      throw new UnauthorizedException('User is not an admin');
    }

    if ((await this.userIsOwner(payload.userId, payload.channelId)) === true)
      throw new UnauthorizedException('User cannot unmute the channel owner');

    try {
      await db
        .deleteFrom('mutedUser')
        .where('userId', '=', payload.targetUserId)
        .where('channelId', '=', payload.channelId)
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  // !!!  need to implement an autodelete function to clean 'mutedUser'
  //      when the mutedEnd time comes
  // !!! is this the best way to do it ?
  @Cron(CronExpression.EVERY_SECOND) // !!! TODO = need to be sure about his one
  async autoUnmuteUser(): Promise<void> {
    try {
      await db
        .deleteFrom('mutedUser')
        .where('mutedEnd', '<', new Date())
        .execute();

      console.log(`Auto unmute done.`);
    } catch (error) {
      console.error('Auto unmute error', error);
      throw new InternalServerErrorException();
    }
  }

  //
  //
  //
  async blockUser(payload: BlockUser): Promise<void> {
    await db
      .insertInto('blockedUser')
      .values({
        blockedById: payload.userId,
        blockedId: payload.targetUserId,
      })
      .execute();
  }

  //
  //
  //
  async unblockUser(payload: BlockUser): Promise<void> {
    await db
      .deleteFrom('blockedUser')
      .where('blockedById', '=', payload.userId)
      .where('blockedId', '=', payload.targetUserId)
      .execute();
  }

  //
  //
  //
  async addAdministrator(payload: ActionOnUser): Promise<void> {
    try {
      await this.userIsAdmin(payload.userId, payload.channelId);
    } catch {
      throw new UnauthorizedException('User is not an admin');
    }

    try {
      if (
        (await this.userIsAdmin(payload.targetUserId, payload.channelId)) ===
        true
      )
        throw new UnauthorizedException('User is already an admin');
    } catch {
      throw new InternalServerErrorException();
    }

    try {
      await db
        .insertInto('channelAdmin')
        .values({
          channelId: payload.channelId,
          userId: payload.targetUserId,
        })
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  //
  async removeAdministrator(payload: ActionOnUser): Promise<void> {
    try {
      await this.userIsAdmin(payload.userId, payload.channelId);
    } catch {
      throw new UnauthorizedException('User is not an admin');
    }

    try {
      if (
        (await this.userIsAdmin(payload.targetUserId, payload.channelId)) ===
        false
      )
        throw new UnauthorizedException('Target user is not an admin');
    } catch {
      throw new InternalServerErrorException();
    }

    try {
      await db
        .deleteFrom('channelAdmin')
        .where('userId', '=', payload.targetUserId)
        .where('channelId', '=', payload.channelId)
        .execute();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  // !!! to test
  async quitChannel(payload: ConnectToChannel): Promise<void> {
    try {
      await this.userIsOwner(payload.userId, payload.channelId);
    } catch {
      try {
        await this.quitChannelAsAdmin(payload);
      } catch {
        try {
          await this.quitChannelAsMember(payload);
        } catch {
          throw new InternalServerErrorException();
        }
      }
    }
  }

  //
  //
  //
  async isOnlyOneMember(channelId: number): Promise<boolean> {
    try {
      const members = await db
        .selectFrom('channelMember')
        .select('userId')
        .where('channelId', '=', channelId)
        .execute();
      return members.length === 1;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  //
  async hasAdmins(channelId: number): Promise<boolean> {
    try {
      const admins = await db
        .selectFrom('channelAdmin')
        .select('userId')
        .where('channelId', '=', channelId)
        .execute();
      return admins.length > 0;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  //
  async setFirstAdminAsOwner(channelId: number): Promise<void> {
    try {
      const newOwner = await db
        .selectFrom('channelAdmin')
        .select('userId')
        .where('channelId', '=', channelId)
        .executeTakeFirstOrThrow();

      await db
        .updateTable('channel')
        .set({
          channelOwner: newOwner.userId,
        })
        .where('id', '=', channelId)
        .executeTakeFirstOrThrow();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  //
  async setFirstMemberAsOwner(channelId: number): Promise<void> {
    try {
      const newOwner = await db
        .selectFrom('channelMember')
        .select('userId')
        .where('channelId', '=', channelId)
        .executeTakeFirstOrThrow();

      await db
        .updateTable('channel')
        .set({
          channelOwner: newOwner.userId,
        })
        .where('id', '=', channelId)
        .executeTakeFirstOrThrow();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  // !!! to test
  async leaveChannelAsOwner(payload: ConnectToChannel): Promise<void> {
    //if only one member, delete the channel + admin + member + messages
    if (await this.isOnlyOneMember(payload.channelId)) {
      await this.deleteChannel(payload.channelId, payload.userId);
      return;
    }

    //if has other admins, set the first admin as the new owner
    if (await this.hasAdmins(payload.channelId)) {
      await this.setFirstAdminAsOwner(payload.channelId);
      return;
    }

    //if there is no admins, set the first member as the new owner
    await this.setFirstMemberAsOwner(payload.channelId);
  }

  //
  //
  //
  async quitChannelAsAdmin(payload: ConnectToChannel) {
    try {
      await db
        .deleteFrom('channelAdmin')
        .where('channelId', '=', payload.channelId)
        .where('userId', '=', payload.userId)
        .executeTakeFirstOrThrow();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  //
  async quitChannelAsMember(payload: ConnectToChannel) {
    try {
      await db
        .deleteFrom('channelMember')
        .where('channelId', '=', payload.channelId)
        .where('userId', '=', payload.userId)
        .executeTakeFirstOrThrow();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  // !!! needed for private channels later
  async usersAreFriends(userId: number, friendId: number): Promise<boolean> {
    try {
      await db
        .selectFrom('friend')
        .select('userId')
        .where('userId', '=', userId)
        .where('friendId', '=', friendId)
        .executeTakeFirstOrThrow();

      return true;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //
  //
  // !!! to test
  async verifyPassword(userId: number, password: string): Promise<boolean> {
    try {
      const user = await db
        .selectFrom('user')
        .select('password')
        .where('id', '=', userId)
        .executeTakeFirstOrThrow();

      const match = await bcrypt.compare(password, user.password);

      return match;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
