import {
  MockSorobanRpcProvider,
  MockEventState,
} from './mock-soroban-rpc.provider';
import {
  diagnoseMalformedEvent,
  validateRpcResponseShape,
} from '../../processors/rpc-response.validator';
import { EventNormalizerService } from '../../processors/event-normalizer.service';

describe('MockSorobanRpcProvider (#1222)', () => {
  const provider = new MockSorobanRpcProvider();

  it('supplies a well-formed getEvents response', () => {
    const events = provider.generateEvents(['success', 'success']);
    const response = provider.getEvents(events);

    expect(response.jsonrpc).toBe('2.0');
    expect(validateRpcResponseShape(response)).toHaveLength(2);
    expect(response.result.latestLedger).toBe(102);
  });

  it('returns distinct ids per RPC call', () => {
    const first = provider.getEvents(provider.generateEvents(['success']));
    const second = provider.getEvents(provider.generateEvents(['success']));
    expect(first.id).not.toBe(second.id);
  });

  it('generates success events accepted by the event normalizer', () => {
    const events = provider.generateEvents(['success']);
    const normalizer = new EventNormalizerService();
    const normalized = normalizer.normalize('testnet', events[0]);
    expect(normalizer.isValid(normalized)).toBe(true);
    expect(normalized.topic).toBe('guess_submitted');
  });

  it('generates failed events rejected as malformed by the validator', () => {
    const events = provider.generateEvents(['failed']);
    expect(diagnoseMalformedEvent(events[0], 0)).not.toBeNull();
  });

  it('generates duplicate events sharing txHash and eventIndex', () => {
    const events = provider.generateEvents(['success', 'duplicate']);
    expect(events[1].txHash).toBe(events[0].txHash);
    expect(events[1].eventIndex).toBe(events[0].eventIndex);
  });

  it('supplies a successful getTransaction response', () => {
    const tx = provider.getTransaction('tx-abc-123');
    expect(tx.result?.status).toBe('success');
    expect(tx.result?.hash).toBe('tx-abc-123');
    expect(tx.error).toBeUndefined();
  });

  it('supplies a failed getTransaction response with an error payload', () => {
    const tx = provider.getTransaction('tx-missing', 'failed');
    expect(tx.error?.code).toBe(-32000);
    expect(tx.result).toBeUndefined();
  });

  it('exercises all three event states end-to-end', () => {
    const states: MockEventState[] = ['success', 'failed', 'duplicate'];
    const events = provider.generateEvents(states);

    const valid = events.filter(
      (event, idx) => diagnoseMalformedEvent(event, idx) === null,
    );

    // success passes; failed is malformed; duplicate is structurally valid
    expect(valid).toHaveLength(2);
    expect(valid[0].topic).toBe('guess_submitted');
    expect(valid[1].txHash).toBe(events[0].txHash);
  });
});
