import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface BlockedUser {
  blockedById: number;
  blockedId: number;
  createdAt: Generated<Timestamp>;
}

export interface Channel {
  channelOwner: number;
  createdAt: Generated<Timestamp>;
  id: Generated<number>;
  isPublic: Generated<boolean>;
  name: string | null;
  password: string | null;
  photoUrl: string | null;
}

export interface ChannelAdmin {
  channelId: number;
  userId: number;
}

export interface ChannelMember {
  channelId: number;
  joinedAt: Generated<Timestamp>;
  userId: number;
}

export interface ChannelMessage {
  channelId: number;
  content: string | null;
  createdAt: Generated<Timestamp>;
  id: Generated<number>;
  senderId: number;
}

export interface Conversation {
  createdAt: Generated<Timestamp>;
  id: Generated<number>;
  user1_id: number;
  user2_id: number;
}

export interface DirectMessage {
  content: string | null;
  conversationId: number;
  createdAt: Generated<Timestamp>;
  id: Generated<number>;
  senderId: number;
}

export interface Friend {
  createdAt: Generated<Timestamp>;
  friendId: number;
  userId: number;
}

export interface FriendRequest {
  createdAt: Generated<Timestamp>;
  sourceId: number;
  targetId: number;
}

export interface Game {
  createdAt: Generated<Timestamp>;
  id: Generated<number>;
  isPublic: Generated<boolean>;
  player1_id: number | null;
  player1_score: number | null;
  player2_id: number | null;
  player2_score: number | null;
  winnerId: number | null;
}

export interface MutedUser {
  channelId: number;
  mutedAt: Generated<Timestamp>;
  mutedEnd: Timestamp;
  userId: number;
}

export interface PrivateGameRequest {
  createdAt: Generated<Timestamp>;
  targetId: number;
  userId: number;
}

export interface PublicGameRequest {
  createdAt: Generated<Timestamp>;
  userId: number;
}

export interface User {
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Generated<Timestamp>;
  email: string | null;
  firstname: string | null;
  id: Generated<number>;
  lastname: string | null;
  password: string;
  username: string;
}

export interface DB {
  blockedUser: BlockedUser;
  channel: Channel;
  channelAdmin: ChannelAdmin;
  channelMember: ChannelMember;
  channelMessage: ChannelMessage;
  conversation: Conversation;
  directMessage: DirectMessage;
  friend: Friend;
  friendRequest: FriendRequest;
  game: Game;
  mutedUser: MutedUser;
  privateGameRequest: PrivateGameRequest;
  publicGameRequest: PublicGameRequest;
  user: User;
}