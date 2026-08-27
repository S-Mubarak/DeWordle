import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import moment from 'moment-timezone';
import { WordScheduler } from './word.scheduler';
import { Word } from 'src/entities/word.entity';

describe('WordScheduler timezone handling (Issue #1219)', () => {
  let scheduler: WordScheduler;
  let findOneBy: jest.Mock;
  let configGet: jest.Mock;

  const mockManager = () => ({
    findOne: jest.fn().mockResolvedValue({
      id: 'w1',
      word: 'apple',
      isDaily: false,
      createdAt: new Date(),
    }),
    update: jest.fn(),
    save: jest.fn(),
  });

  const buildScheduler = async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        WordScheduler,
        {
          provide: getRepositoryToken(Word),
          useValue: {
            findOneBy: findOneBy,
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (cb: (m: unknown) => Promise<void>) => {
              await cb(mockManager());
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: configGet },
        },
      ],
    }).compile();

    return moduleRef.get(WordScheduler);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    findOneBy = jest.fn().mockResolvedValue(null);
    configGet = jest.fn().mockReturnValue(undefined); // default 'UTC'
    scheduler = await buildScheduler();
  });

  it('stores the puzzle date as a UTC ISO timestamp (midnight UTC)', async () => {
    await scheduler.ensureTodayWord();

    expect(findOneBy).toHaveBeenCalledTimes(1);
    const { dailyDate } = findOneBy.mock.calls[0][0];
    expect(dailyDate).toBeInstanceOf(Date);
    expect(dailyDate.toISOString()).toMatch(/T00:00:00\.000Z$/);
  });

  it('selects the same UTC day regardless of server local time', async () => {
    await scheduler.ensureTodayWord();

    const expected = moment()
      .tz('UTC')
      .startOf('day')
      .format('YYYY-MM-DD');
    const { dailyDate } = findOneBy.mock.calls[0][0];
    expect(moment(dailyDate).utc().format('YYYY-MM-DD')).toBe(expected);
  });

  it('converts a non-UTC schedule timezone to the correct UTC instant', async () => {
    configGet = jest.fn().mockImplementation((key: string) =>
      key === 'DAILY_WORD_TIMEZONE' ? 'America/New_York' : undefined,
    );
    scheduler = await buildScheduler();

    await scheduler.ensureTodayWord();

    const { dailyDate } = findOneBy.mock.calls[0][0];
    const utcDate = moment(dailyDate).utc().format('YYYY-MM-DD');
    const nyDate = moment.tz(dailyDate, 'UTC').tz('America/New_York').format('YYYY-MM-DD');
    // Midnight in New York is the same calendar day in New York, and 5 hours
    // later in UTC — both must refer to the same stored instant.
    expect(nyDate).toBe(moment().tz('America/New_York').format('YYYY-MM-DD'));
    expect(utcDate).toBe(
      moment().tz('America/New_York').startOf('day').utc().format('YYYY-MM-DD'),
    );
  });
});
