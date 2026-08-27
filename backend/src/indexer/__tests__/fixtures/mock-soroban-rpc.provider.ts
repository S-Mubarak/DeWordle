/**
 * Mock Soroban RPC provider for indexer integration testing.
 *
 * Supplies deterministic `getEvents` and `getTransaction` JSON-RPC responses
 * so test suites can run without a live Soroban RPC endpoint.
 */

export type MockEventState = 'success' | 'failed' | 'duplicate';

export interface MockSorobanEvent {
  contractId?: string;
  topic?: string;
  txHash?: string;
  ledger: number;
  eventIndex: number;
  payload: Record<string, unknown>;
}

export interface MockTransactionResponse {
  jsonrpc: '2.0';
  id: number;
  result?: {
    status: 'success' | 'failed';
    ledger: number;
    hash: string;
  };
  error?: { code: number; message: string };
}

export interface MockEventsResponse {
  jsonrpc: '2.0';
  id: number;
  result: {
    events: MockSorobanEvent[];
    latestLedger: number;
  };
}

const DEFAULT_CONTRACT_ID = 'CCOREGAME0000000000000000000000000000000000000000';

function makeEvent(
  overrides: Partial<MockSorobanEvent> = {},
): MockSorobanEvent {
  return {
    contractId: DEFAULT_CONTRACT_ID,
    topic: 'guess_submitted',
    txHash: 'tx-abc-123',
    ledger: 100,
    eventIndex: 0,
    payload: { sessionId: 's-1', isCorrect: true },
    ...overrides,
  };
}

/**
 * Fixture factory for the three event states exercised by the indexer:
 * success, failed (malformed/unparseable), and duplicate (already seen).
 */
export class MockSorobanRpcProvider {
  private readonly baseLedger: number;
  private requestCounter = 0;

  constructor(baseLedger = 100) {
    this.baseLedger = baseLedger;
  }

  /** Builds a well-formed success event. */
  successEvent(overrides: Partial<MockSorobanEvent> = {}): MockSorobanEvent {
    return makeEvent(overrides);
  }

  /** Builds a malformed event (missing required fields) that must be rejected. */
  failedEvent(overrides: Partial<MockSorobanEvent> = {}): MockSorobanEvent {
    const event: MockSorobanEvent = {
      ledger: 0,
      eventIndex: -1,
      payload: { sessionId: 's-failed' },
      ...overrides,
    };
    return event;
  }

  /** Builds an event duplicating a previous fixture (same txHash + eventIndex). */
  duplicateEvent(original: MockSorobanEvent): MockSorobanEvent {
    return {
      ...original,
      txHash: original.txHash,
      eventIndex: original.eventIndex,
    };
  }

  /** Generates a batch of events for the requested states. */
  generateEvents(
    states: MockEventState[],
    baseTxHash = 'tx-batch',
  ): MockSorobanEvent[] {
    const events: MockSorobanEvent[] = [];
    states.forEach((state, idx) => {
      if (state === 'success') {
        events.push(
          this.successEvent({
            txHash: `${baseTxHash}-${idx}`,
            ledger: this.baseLedger + idx,
            eventIndex: idx,
          }),
        );
      } else if (state === 'failed') {
        events.push(
          this.failedEvent({
            txHash: `${baseTxHash}-${idx}`,
            ledger: this.baseLedger + idx,
            eventIndex: idx,
          }),
        );
      } else {
        const first = events[0];
        events.push(
          first
            ? this.duplicateEvent(first)
            : this.successEvent({
                txHash: `${baseTxHash}-${idx}`,
                ledger: this.baseLedger + idx,
                eventIndex: idx,
              }),
        );
      }
    });
    return events;
  }

  /** Mock JSON-RPC `getEvents` response. */
  getEvents(events: MockSorobanEvent[]): MockEventsResponse {
    return {
      jsonrpc: '2.0',
      id: ++this.requestCounter,
      result: {
        events,
        latestLedger: this.baseLedger + events.length,
      },
    };
  }

  /** Mock JSON-RPC `getTransaction` response. */
  getTransaction(
    txHash: string,
    status: 'success' | 'failed' = 'success',
  ): MockTransactionResponse {
    if (status === 'failed') {
      return {
        jsonrpc: '2.0',
        id: ++this.requestCounter,
        error: { code: -32000, message: `Transaction not found: ${txHash}` },
      };
    }
    return {
      jsonrpc: '2.0',
      id: ++this.requestCounter,
      result: {
        status: 'success',
        ledger: this.baseLedger,
        hash: txHash,
      },
    };
  }
}
