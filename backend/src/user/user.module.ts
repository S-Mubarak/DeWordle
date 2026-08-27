import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserStatsRepository } from './user-stats.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { UserGameStats } from '../user-game-stats/entities/user-game-stats.entity';
import { GameSession } from '../game-sessions/entities/game-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserGameStats, GameSession])],
  controllers: [UserController],
  providers: [UserService, UserStatsRepository],
  exports: [UserService, UserStatsRepository],
})
export class UserModule {}
