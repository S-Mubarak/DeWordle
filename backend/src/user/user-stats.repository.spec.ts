import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  SelectQueryBuilder,
  Repository,
} from 'typeorm';
import { UserStatsRepository, UserStatsSummary } from './user-stats.repository';
import { UserGameStats } from '../user-game-stats/entities/user-game-stats.entity';
import { GameSession } from '../game-sessions/entities/game-session.entity';

type MockQueryBuilder = {
  select: jest.Mock;
  addSelect: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  groupBy: jest.Mock;
  orderBy: jest.Mock;
  take: jest.Mock;
  getRawOne: jest.Mock;
  getRawMany: jest.Mock;
};

function mockQueryBuilder(
  getRawOneResult: unknown,
  getRawManyResult: unknown,
): MockQueryBuilder {
  const qb: MockQueryBuilder = {
    select: jest.fn(),
    addSelect: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    groupBy: jest.fn(),
    orderBy: jest.fn(),
    take: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };
  qb.select.mockReturnValue(qb);
  qb.addSelect.mockReturnValue(qb);
  qb.innerJoin.mockReturnValue(qb);
  qb.where.mockReturnValue(qb);
  qb.groupBy.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.take.mockReturnValue(qb);
  qb.getRawOne.mockResolvedValue(getRawOneResult);
  qb.getRawMany.mockResolvedValue(getRawManyResult);
  return qb;
}

describe('UserStatsRepository', () => {
  let repo: UserStatsRepository;
  let statsRepo: jest.Mocked<Pick<Repository<UserGameStats>, 'createQueryBuilder'>>;
  let sessionRepo: jest.Mocked<Pick<Repository<GameSession>, 'createQueryBuilder'>>;

  beforeEach(async () => {
    statsRepo = {
      createQueryBuilder: jest.fn() as unknown as jest.Mock<
        SelectQueryBuilder<UserGameStats>
      >,
    };
    sessionRepo = {
      createQueryBuilder: jest.fn() as unknown as jest.Mock<
        SelectQueryBuilder<GameSession>
      >,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserStatsRepository,
        { provide: getRepositoryToken(UserGameStats), useValue: statsRepo },
        { provide: getRepositoryToken(GameSession), useValue: sessionRepo },
      ],
    }).compile();

    repo = module.get<UserStatsRepository>(UserStatsRepository);
  });

  it('should be defined', () => {
    expect(repo).toBeDefined();
  });

  describe('getStatsSummary', () => {
    it('should aggregate stats via QueryBuilder and return a typed summary', async () => {
      const raw = {
        userId: 7,
        totalGamesPlayed: '12',
        totalWins: '9',
        totalPoints: '540',
        bestStreak: '5',
      };
      (statsRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder(raw, []),
      );

      const summary = await repo.getStatsSummary(7);

      expect(statsRepo.createQueryBuilder).toHaveBeenCalledWith('stats');
      expect(summary).toEqual<UserStatsSummary>({
        userId: 7,
        totalGamesPlayed: 12,
        totalWins: 9,
        totalPoints: 540,
        bestStreak: 5,
        winRate: 9 / 12,
      });
    });

    it('should return null when no stats exist for the user', async () => {
      (statsRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder(undefined, []),
      );

      const summary = await repo.getStatsSummary(99);
      expect(summary).toBeNull();
    });
  });

  describe('getStatsByGame', () => {
    it('should return per-game stats rows via QueryBuilder', async () => {
      const rows = [
        {
          gameId: 1,
          gameSlug: 'dewordle',
          gameName: 'DeWordle',
          gamesPlayed: 10,
          wins: 7,
          points: 400,
          currentStreak: 2,
          longestStreak: 5,
        },
      ];
      (statsRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder(null, rows),
      );

      const result = await repo.getStatsByGame(7);

      expect(statsRepo.createQueryBuilder).toHaveBeenCalledWith('stats');
      expect(result).toEqual(rows);
    });
  });

  describe('getRecentSessions', () => {
    it('should return recent sessions via QueryBuilder with a bounded limit', async () => {
      const rows = [
        {
          sessionId: 3,
          gameSlug: 'dewordle',
          score: 90,
          status: 'COMPLETED',
          playedAt: new Date('2026-08-20T10:00:00Z'),
        },
      ];
      (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder(null, rows),
      );

      const result = await repo.getRecentSessions(7, 5);

      expect(sessionRepo.createQueryBuilder).toHaveBeenCalledWith('session');
      expect(result).toEqual(rows);
    });

    it('should clamp the limit to the allowed range', async () => {
      const qb = mockQueryBuilder(null, []);
      (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await repo.getRecentSessions(7, 5000);
      expect(qb.take).toHaveBeenCalledWith(100);
    });
  });
});
