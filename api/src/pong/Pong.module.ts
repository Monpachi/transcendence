import { Module, forwardRef } from '@nestjs/common';
import { GameRequestsService } from 'src/gameRequests/GameRequests.service';
import { PongGateway } from './Pong.gateway';
import { GamesModule } from 'src/games/Games.module';
import { WsAuthGuard } from 'src/auth/ws-auth.guard';
import { PlayersService } from './players/players.service';
import { UsersStatusModule } from 'src/usersStatusGateway/UsersStatus.module';

@Module({
  imports: [forwardRef(() => GamesModule), UsersStatusModule],
  providers: [PongGateway, GameRequestsService, WsAuthGuard, PlayersService],
  exports: [PongGateway],
})
export class PongGameModule {}
