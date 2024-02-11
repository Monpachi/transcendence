import {
  ApiBearerAuth,
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Channel } from './../types/schema';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChannelService } from './channel.service';
import {
  ChannelCreationData,
  ChannelDataWithoutPassword,
  MessageWithSenderInfo,
} from 'src/types/channelsSchema';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@ApiTags('channels')
@ApiBearerAuth()
@Controller('channels')
export class UserController {
  constructor(private readonly channelService: ChannelService) {}

  //
  //
  // !!! TOREWRITE
  /*
  @ApiOperation({ summary: 'Get all messages of a channel' })
  @ApiParam({
    name: 'channelId',
    description: 'Id of the channel',
    type: 'number',
  })
  @ApiOkResponse({
    description: 'Messages of the channel',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          channelId: {
            type: 'number',
          },
          content: {
            type: 'string | null',
          },
          createdAt: {
            type: 'Generated<Timestamp>',
          },
          messageId: {
            type: 'Generated<number>',
          },
          sender: {
            type: 'object',
            properties: {
              senderId: {
                type: 'number',
              },
              isOwner: {
                type: 'boolean',
              },
              isAdmin: {
                type: 'boolean',
              },
              isBanned: {
                type: 'boolean',
              },
              isMuted: {
                type: 'boolean',
              },
              avatarUrl: {
                type: 'string | null',
              },
              username: {
                type: 'string',
              },
            },
          },
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiNotFoundResponse({
    description: 'Data not found in db | User is not a member of the channel',
  })
  @Get(':channelId/messages')
  getMessages(
    @Param('channelId') channelId: number,
    @Request() req,
  ): Promise<MessageWithSenderInfo[]> {
    console.log('GET: Recieved channelId:', channelId);
    return this.channelService.getChannelMessages(req.user.id, channelId);
  }*/

  //
  //
  //
  @ApiOperation({
    summary: 'Get all channels where the user in member and not banned',
  })
  @ApiOkResponse({
    description: 'Channels found',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          channelOwner: {
            type: 'number',
          },
          createdAt: {
            type: 'Generated<Timestamp>',
          },
          id: {
            type: 'Generated<number>',
          },
          isPublic: {
            type: 'Generated<boolean>',
          },
          name: {
            type: 'string',
          },
          photoUrl: {
            type: 'string | null',
          },
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiNotFoundResponse({ description: 'Data not found in db' })
  @Get()
  async getAllChannelsOfTheUser(
    @Request() req,
  ): Promise<ChannelDataWithoutPassword[]> {
    console.log('GET: Recieved all channels of the user: ', req.user.id);
    return this.channelService.getAllChannelsOfTheUser(req.user.id);
  }

  //
  //
  //
  @ApiOperation({ summary: 'Create a new channel' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiUnprocessableEntityResponse({
    description: 'Data not found in db | not inserted in db',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isPublic: {
          type: 'boolean',
        },
        name: {
          type: 'string',
        },
        password: {
          type: 'string | null',
        },
        photoUrl: {
          type: 'string | null',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Channels found',
    schema: {
      type: 'object',
      properties: {
        channelOwner: {
          type: 'number',
        },
        createdAt: {
          type: 'Generated<Timestamp>',
        },
        id: {
          type: 'Generated<number>',
        },
        isPublic: {
          type: 'Generated<boolean>', // !!! not generated
        },
        name: {
          type: 'string',
        },
        photoUrl: {
          type: 'string | null',
        },
      },
    },
  })
  @Post()
  createChannel(
    @Body() channel: ChannelCreationData,
    @Request() req,
  ): Promise<ChannelDataWithoutPassword> {
    console.log('POST: Recieved name:', channel.name);
    return this.channelService.createChannel(channel, req.user.id);
  }

  //
  //
  //
  @ApiOperation({ summary: 'Get a channel' })
  @ApiParam({
    name: 'channelId',
    description: 'Id of the channel',
    type: 'number',
  })
  @ApiOkResponse({
    description: 'Channel found',
    schema: {
      type: 'object',
      properties: {
        channelOwner: {
          type: 'number',
        },
        createdAt: {
          type: 'Generated<Timestamp>',
        },
        id: {
          type: 'Generated<number>',
        },
        isPublic: {
          type: 'Generated<boolean>', // !!! not generated
        },
        name: {
          type: 'string',
        },
        photoUrl: {
          type: 'string | null',
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiNotFoundResponse({ description: 'Channel not found' })
  @Get(':channelId')
  async getChannel(
    @Param('channelId') channelId: number,
    @Request() req,
  ): Promise<ChannelDataWithoutPassword> {
    console.log('GET: Recieved channelId:', channelId);
    return this.channelService.getChannel(channelId, req.user.id);
  }

  //
  //
  //
  @ApiOperation({ summary: 'Update a channel' })
  @ApiParam({
    name: 'channelId',
    description: 'Id of the channel',
    type: 'number',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        channelOwner: {
          type: 'number',
        },
        createdAt: {
          type: 'Generated<Timestamp>',
        },
        id: {
          type: 'Generated<number>',
        },
        isPublic: {
          type: 'Generated<boolean>',
        },
        name: {
          type: 'string',
        },
        password: {
          type: 'string | null',
        },
        photoUrl: {
          type: 'string | null',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Channel updated' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiUnprocessableEntityResponse({
    description: 'Invalid data | Same password',
  })
  @Put(':channelId')
  updateChannel(
    @Param('channelId') channelId: number,
    @Body() channel: Channel,
    @Request() req,
  ): Promise<string> {
    console.log('PUT: Recieved id:', channelId);
    return this.channelService.updateChannel(channelId, channel, req.user.id);
  }

  //
  //
  //
  @ApiOperation({ summary: 'Delete a channel' })
  @ApiParam({
    name: 'channelId',
    description: 'Id of the channel',
    type: 'number',
  })
  @ApiOkResponse({ description: 'Channel deleted' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @ApiUnauthorizedResponse({ description: 'Only the owner can delete channel' })
  @Delete(':channelId')
  deleteChannel(@Param('channelId') channelId: number, @Request() req) {
    console.log('DELETE: Received channelId:', channelId);
    return this.channelService.deleteChannel(channelId, req.user.id);
  }
}
