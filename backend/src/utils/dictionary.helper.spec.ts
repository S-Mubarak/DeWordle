import {
  DictionaryHelper,
  EnrichedWord,
  DictionaryApiResponse,
} from './dictionary.helper';
import axios from 'axios';
import { Logger } from '@nestjs/common';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Logger
jest.mock('@nestjs/common', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('DictionaryHelper', () => {
  let dictionaryHelper: DictionaryHelper;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    dictionaryHelper = new DictionaryHelper();
    mockLogger = new Logger() as jest.Mocked<Logger>;
  });

  describe('enrichWordWithMetadata', () => {
    const mockWordId = 'test-uuid';
    const mockWord = 'crane';

    it('should successfully enrich a word with complete metadata', async () => {
      const mockApiResponse: DictionaryApiResponse = {
        word: 'crane',
        phonetics: [{ text: '/kreɪn/' }],
        meanings: [
          {
            partOfSpeech: 'noun',
            definitions: [
              {
                definition: 'A large bird with a long neck and legs',
                example: 'The crane stood in the shallow water',
              },
            ],
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: [mockApiResponse],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result).toEqual({
        id: mockWordId,
        word: mockWord,
        definition: 'A large bird with a long neck and legs',
        example: 'The crane stood in the shallow water',
        partOfSpeech: 'noun',
        phonetics: '/kreɪn/',
        isEnriched: true,
      });
    });

    it('should return basic word when API returns no data', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result).toEqual({
        id: mockWordId,
        word: mockWord,
        isEnriched: false,
      });
    });

    it('should return basic word when API request fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result).toEqual({
        id: mockWordId,
        word: mockWord,
        isEnriched: false,
      });
    });

    it('should handle partial metadata gracefully', async () => {
      const mockApiResponse: DictionaryApiResponse = {
        word: 'crane',
        meanings: [
          {
            partOfSpeech: 'noun',
            definitions: [
              {
                definition: 'A large bird with a long neck and legs',
                // No example provided
              },
            ],
          },
        ],
        // No phonetics provided
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: [mockApiResponse],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result).toEqual({
        id: mockWordId,
        word: mockWord,
        definition: 'A large bird with a long neck and legs',
        partOfSpeech: 'noun',
        isEnriched: true,
        // example and phonetics should be undefined
      });
    });

    it('should handle 404 errors (word not found)', async () => {
      const mockError = {
        response: { status: 404 },
        isAxiosError: true,
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(mockError);

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result).toEqual({
        id: mockWordId,
        word: mockWord,
        isEnriched: false,
      });
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Should not retry on 404
    });

    it('should retry on rate limiting (429) with exponential backoff', async () => {
      const mockRateLimitError = {
        response: {
          status: 429,
          headers: { 'retry-after': '2' },
        },
        isAxiosError: true,
      };

      const mockApiResponse: DictionaryApiResponse = {
        word: 'crane',
        meanings: [
          {
            partOfSpeech: 'noun',
            definitions: [{ definition: 'A large bird' }],
          },
        ],
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get
        .mockRejectedValueOnce(mockRateLimitError)
        .mockResolvedValueOnce({
          data: [mockApiResponse],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });

      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      const result = await dictionaryHelper.enrichWordWithMetadata(
        mockWord,
        mockWordId,
      );

      expect(result.isEnriched).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // Initial call + 1 retry
    });

  describe('in-memory caching layer', () => {
    const mockApiResponse: DictionaryApiResponse = {
      word: 'crane',
      phonetics: [{ text: '/kreɪn/' }],
      meanings: [
        {
          partOfSpeech: 'noun',
          definitions: [{ definition: 'A large bird' }],
        },
      ],
    };

    const respondOnce = () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: [mockApiResponse],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
    };

    it('cache hit returns word data without making outgoing HTTP requests', async () => {
      respondOnce();

      const first = await dictionaryHelper.enrichWordWithMetadata(
        'crane',
        'uuid-1',
      );
      expect(first.isEnriched).toBe(true);

      const callsAfterFirst = mockedAxios.get.mock.calls.length;

      const second = await dictionaryHelper.enrichWordWithMetadata(
        'crane',
        'uuid-2',
      );

      expect(second.isEnriched).toBe(true);
      expect(second.definition).toBe('A large bird');
      expect(mockedAxios.get.mock.calls.length).toBe(callsAfterFirst);
      expect(dictionaryHelper.isCached('crane')).toBe(true);
    });

    it('cache miss triggers HTTP fetch and populates the cache entry', async () => {
      expect(dictionaryHelper.isCached('crane')).toBe(false);
      respondOnce();

      const result = await dictionaryHelper.enrichWordWithMetadata(
        'crane',
        'uuid-1',
      );

      expect(result.isEnriched).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(dictionaryHelper.isCached('crane')).toBe(true);
      expect(dictionaryHelper.getCacheSize()).toBe(1);
    });

    it('cache is per-instance and keyed by word', async () => {
      respondOnce();
      await dictionaryHelper.enrichWordWithMetadata('crane', 'uuid-1');

      // A different word misses the cache and triggers a fetch.
      mockedAxios.get.mockResolvedValueOnce({
        data: [{ ...mockApiResponse, word: 'stork' }],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      const other = await dictionaryHelper.enrichWordWithMetadata(
        'stork',
        'uuid-2',
      );
      expect(other.isEnriched).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(dictionaryHelper.getCacheSize()).toBe(2);
    });

    it('evicts the least-recently-used entry when capacity is reached', async () => {
      const small = new DictionaryHelper(2);
      const respond = (word: string) =>
        mockedAxios.get.mockResolvedValueOnce({
          data: [{ ...mockApiResponse, word }],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });

      respond('alpha');
      respond('bravo');
      respond('charlie');

      await small.enrichWordWithMetadata('alpha', '1');
      await small.enrichWordWithMetadata('bravo', '2');
      expect(small.getCacheSize()).toBe(2);

      await small.enrichWordWithMetadata('charlie', '3');
      expect(small.getCacheSize()).toBe(2);
      expect(small.isCached('alpha')).toBe(false); // evicted (LRU)
      expect(small.isCached('bravo')).toBe(true);
      expect(small.isCached('charlie')).toBe(true);
    });

    it('recently accessed entries survive eviction (LRU refresh)', async () => {
      const small = new DictionaryHelper(2);
      const respond = (word: string) =>
        mockedAxios.get.mockResolvedValueOnce({
          data: [{ ...mockApiResponse, word }],
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        });

      respond('alpha');
      respond('bravo');
      respond('charlie');

      await small.enrichWordWithMetadata('alpha', '1');
      await small.enrichWordWithMetadata('bravo', '2');

      // Touch alpha so bravo becomes the least-recently-used.
      await small.enrichWordWithMetadata('alpha', '1');

      await small.enrichWordWithMetadata('charlie', '3');
      expect(small.isCached('alpha')).toBe(true);
      expect(small.isCached('bravo')).toBe(false);
    });
  });

  describe('enrichWordWithMetadata (HTTP behavior)', () => {
    it('should respect maximum retry attempts', async () => {
      const mockError = {
        response: { status: 500 },
        isAxiosError: true,
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(mockError);

      // Mock setTimeout to avoid actual delays in tests
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return {} as NodeJS.Timeout;
      });

      const result = await dictionaryHelper.enrichWordWithMetadata(
        'blizzard',
        mockWordId,
      );

      expect(result.isEnriched).toBe(false);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Initial call + 2 retries (max 3 attempts)
    });
  });
});
});
