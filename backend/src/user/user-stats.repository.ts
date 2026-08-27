import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserGameStats } from '../user-game-stats/entities/user-game-stats.entity';
import { GameSession } from '../game-sessions/entities/game-session.entity';

export interface UserStatsSummary {
  userId: number;
  totalGamesPlayed: number;
  totalWins: number;
  totalPoints: number;
  bestStreak: number;
  winRate: number;
}

export interface UserGameStatRow {
  gameId: number;
  gameSlug: string;
  gameName: string;
  gamesPlayed: number;
  wins: number;
  points: number;
  currentStreak: number;
  longestStreak: number;
}

export interface UserRecentSession {
  sessionId: number;
  gameSlug: string;
  score: number;
  status: string;
  playedAt: Date;
}

/**
 * Type-safe user statistics queries built exclusively with the TypeORM
 * QueryBuilder API (no raw SQL strings).
 */
@Injectable()
export class UserStatsRepository {
  constructor(
    @InjectRepository(UserGameStats)
    private readonly userGameStatsRepo: Repository<UserGameStats>,
    @InjectRepository(GameSession)
    private readonly gameSessionRepo: Repository<GameSession>,
  ) {}

  /**
   * Aggregate statistics for a single user across all games they played.
   */
  async getStatsSummary(userId: number): Promise<UserStatsSummary | null> {
    const row = await this.userGameStatsRepo
      .createQueryBuilder('stats')
      .select('stats.userId', 'userId')
      .addSelect('COALESCE(SUM(stats.totalGamesPlayed), 0)', 'totalGamesPlayed')
      .addSelect('COALESCE(SUM(stats.wins), 0)', 'totalWins')
      .addSelect('COALESCE(SUM(stats.points), 0)', 'totalPoints')
      .addSelect('COALESCE(MAX(stats.longestStreak), 0)', 'bestStreak')
      .where('stats.userId = :userId', { userId })
      .groupBy('stats.userId')
      .getRawOne<{
        userId: number;
        totalGamesPlayed: number;
        totalWins: number;
        totalPoints: number;
        bestStreak: number;
      }>();

    if (!row) return null;

    const totalGamesPlayed = Number(row.totalGamesPlayed ?? 0);
    return {
      userId: Number(row.userId),
      totalGamesPlayed,
      totalWins: Number(row.totalWins ?? 0),
      totalPoints: Number(row.totalPoints ?? 0),
      bestStreak: Number(row.bestStreak ?? 0),
      winRate:
        totalGamesPlayed > 0
          ? Number(row.totalWins ?? 0) / totalGamesPlayed
          : 0,
    };
  }

  /**
   * Per-game statistics for a single user.
   */
  async getStatsByGame(userId: number): Promise<UserGameStatRow[]> {
    return this.userGameStatsRepo
      .createQueryBuilder('stats')
      .innerJoin('stats.game', 'game')
      .select('game.id', 'gameId')
      .addSelect('game.slug', 'gameSlug')
      .addSelect('game.name', 'gameName')
      .addSelect('stats.totalGamesPlayed', 'gamesPlayed')
      .addSelect('stats.wins', 'wins')
      .addSelect('stats.points', 'points')
      .addSelect('stats.currentStreak', 'currentStreak')
      .addSelect('stats.longestStreak', 'longestStreak')
      .where('stats.userId = :userId', { userId })
      .orderBy('stats.totalGamesPlayed', 'DESC')
      .getRawMany<UserGameStatRow>();
  }

  /**
   * Most recent sessions for a user.
   */
  async getRecentSessions(
    userId: number,
    limit = 10,
  ): Promise<UserRecentSession[]> {
    return this.gameSessionRepo
      .createQueryBuilder('session')
      .innerJoin('session.game', 'game')
      .select('session.id', 'sessionId')
      .addSelect('game.slug', 'gameSlug')
      .addSelect('session.score', 'score')
      .addSelect('session.status', 'status')
      .addSelect('session.playedAt', 'playedAt')
      .where('session.userId = :userId', { userId })
      .orderBy('session.playedAt', 'DESC')
      .take(Math.max(1, Math.min(Number(limit), 100)))
      .getRawMany<UserRecentSession>();
  }
}
