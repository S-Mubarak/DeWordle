import { Logger } from '@nestjs/common';
import axios from 'axios';

export interface EnrichedWord {
  id: string;
  word: string;
  definition?: string;
  example?: string;
  partOfSpeech?: string;
  phonetics?: string;
  isEnriched: boolean;
}

export interface DictionaryApiResponse {
  word: string;
  phonetics?: Array<{
    text?: string;
    audio?: string;
  }>;
  meanings?: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
  }>;
}

export class DictionaryHelper {
  private readonly logger = new Logger(DictionaryHelper.name);
  private readonly baseUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en';
  private readonly timeout = 5000; // 5 seconds
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second

  /** In-memory LRU word cache: keyed by word, bounded by maxCacheSize. */
  private readonly cache = new Map<string, EnrichedWord>();

  constructor(private readonly maxCacheSize = 100) {}

  /**
   * Enriches a word with metadata from the dictionary API
   * @param word - The word to enrich
   * @param wordId - The unique ID for the word
   * @returns Promise<EnrichedWord> - Enriched word object or basic word if enrichment fails
   */
  async enrichWordWithMetadata(
    word: string,
    wordId: string,
  ): Promise<EnrichedWord> {
    const baseWord: EnrichedWord = {
      id: wordId,
      word,
      isEnriched: false,
    };

    // Cache hit: return the cached enrichment without any HTTP call.
    const cached = this.getCached(word);
    if (cached) {
      this.logger.debug(`Cache hit for word: ${word}`);
      return { ...cached };
    }

    try {
      this.logger.log(`Attempting to enrich word: ${word}`);
      const apiResponse = await this.fetchWithRetry(word);

      if (
        !apiResponse ||
        !apiResponse.data ||
        !Array.isArray(apiResponse.data) ||
        apiResponse.data.length === 0
      ) {
        this.logger.warn(
          `No data received from dictionary API for word: ${word}`,
        );
        return baseWord;
      }

      const wordData = apiResponse.data[0] as DictionaryApiResponse;
      const enrichedWord = this.transformApiResponse(wordData, baseWord);

      this.setCached(word, enrichedWord);
      this.logger.log(`Successfully enriched word: ${word}`);
      return enrichedWord;
    } catch (error) {
      this.logger.error(
        `Failed to enrich word '${word}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'No stack trace available',
      );
      return baseWord;
    }
  }

  private async fetchWithRetry(
    word: string,
  ): Promise<{ data: DictionaryApiResponse[] }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.get<DictionaryApiResponse[]>(
          `${this.baseUrl}/${encodeURIComponent(word)}`,
          {
            timeout: this.timeout,
            headers: { 'User-Agent': 'DeWordle-Backend/1.0' },
          },
        );
        return response;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const axiosError = error as {
          response?: { status: number; headers: Record<string, string> };
        };

        if (axiosError.response) {
          const { status } = axiosError.response;
          if (status === 404 || (status >= 400 && status < 500 && status !== 429)) {
            throw error;
          }

          if (status === 429) {
            const retryAfter = axiosError.response.headers['retry-after'];
            const delay = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : this.calculateBackoffDelay(attempt);
            this.logger.warn(
              `Rate limited. Retrying after ${delay}ms (attempt ${attempt}/${this.maxRetries})`,
            );
            await this.sleep(delay);
            continue;
          }
        }

        if (attempt < this.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          this.logger.warn(
            `API request failed, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`,
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error('Unknown error occurred during API request');
  }

  /**
   * Transforms API response to match our enriched word format
   * @param apiData - Raw API response data
   * @param baseWord - Base word object to enrich
   * @returns EnrichedWord - Transformed word object
   */
  private transformApiResponse(
    apiData: DictionaryApiResponse,
    baseWord: EnrichedWord,
  ): EnrichedWord {
    const enriched: EnrichedWord = { ...baseWord, isEnriched: true };

    // Extract phonetics
    if (apiData.phonetics && apiData.phonetics.length > 0) {
      const phoneticWithText = apiData.phonetics.find((p) => p.text);
      if (phoneticWithText?.text) {
        enriched.phonetics = phoneticWithText.text;
      }
    }

    // Extract meanings (definition, example, part of speech)
    if (apiData.meanings && apiData.meanings.length > 0) {
      const primaryMeaning = apiData.meanings[0];

      // Part of speech
      if (primaryMeaning.partOfSpeech) {
        enriched.partOfSpeech = primaryMeaning.partOfSpeech;
      }

      // Definition and example
      if (primaryMeaning.definitions && primaryMeaning.definitions.length > 0) {
        const primaryDefinition = primaryMeaning.definitions[0];

        if (primaryDefinition.definition) {
          enriched.definition = primaryDefinition.definition;
        }

        if (primaryDefinition.example) {
          enriched.example = primaryDefinition.example;
        }
      }
    }

    return enriched;
  }

  /**
   * Returns the cached enrichment for a word, refreshing its LRU
   * position on access. Returns undefined on a miss.
   */
  private getCached(word: string): EnrichedWord | undefined {
    const entry = this.cache.get(word);
    if (!entry) return undefined;
    // Refresh recency: re-insert so the entry is the most-recently-used.
    this.cache.delete(word);
    this.cache.set(word, entry);
    return entry;
  }

  /**
   * Stores an enrichment in the cache, evicting the least-recently-used
   * entry when the cache capacity is reached.
   */
  private setCached(word: string, entry: EnrichedWord): void {
    if (this.cache.has(word)) this.cache.delete(word);
    this.cache.set(word, entry);

    if (this.cache.size > this.maxCacheSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
        this.logger.debug(`Cache evicted word: ${oldest}`);
      }
    }
  }

  /** Current number of entries in the in-memory cache. */
  getCacheSize(): number {
    return this.cache.size;
  }

  /** True when the given word is currently cached. */
  isCached(word: string): boolean {
    return this.cache.has(word);
  }

  /**
   * Calculates exponential backoff delay
   * @param attempt - Current attempt number
   * @returns number - Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number): number {
    return Math.min(this.baseDelay * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
  }

  /**
   * Sleep utility function
   * @param ms - Milliseconds to sleep
   * @returns Promise<void>
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
