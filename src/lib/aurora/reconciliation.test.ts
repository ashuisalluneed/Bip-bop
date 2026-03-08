import {
  type EventEnvelope,
  parseEventEnvelope,
} from "~/lib/aurora/event-envelope";
import { reconcileEventPair } from "~/lib/aurora/reconciliation";
import {
  compareClocks,
  createClock,
  mergeClocks,
  tickClock,
} from "~/lib/aurora/vector-clock";

const buildEvent = (overrides: Partial<EventEnvelope>): EventEnvelope =>
  parseEventEnvelope({
    id: "5bde7257-b6eb-489b-a950-23ed38632fe4",
    conversationId: "conversation-1",
    senderId: "user-1",
    createdAt: 1700000000,
    vectorClock: { "device-a": 1 },
    payload: {
      body: "hello",
      mentions: [],
    },
    deliveryState: "sent",
    encrypted: true,
    ...overrides,
  });

describe("vector clock", () => {
  it("ticks and merges clocks", () => {
    const a = tickClock(createClock("device-a"), "device-a");
    const b = tickClock(createClock("device-b"), "device-b");

    expect(mergeClocks(a, b)).toEqual({ "device-a": 1, "device-b": 1 });
  });

  it("detects concurrent clocks", () => {
    const left = { "device-a": 2, "device-b": 0 };
    const right = { "device-a": 1, "device-b": 1 };

    expect(compareClocks(left, right)).toBe("concurrent");
  });
});

describe("reconcileEventPair", () => {
  it("chooses newer causal event", () => {
    const left = buildEvent({ vectorClock: { a: 2, b: 1 }, id: "f63b16f6-a0d8-4674-a786-31326faf7f98" });
    const right = buildEvent({ vectorClock: { a: 1, b: 1 }, id: "69144f57-5e51-43e7-b7cb-f9f4f1f91311" });

    const outcome = reconcileEventPair(left, right);

    expect(outcome.relation).toBe("after");
    expect(outcome.winner.id).toBe(left.id);
  });

  it("uses deterministic tie-break during concurrency", () => {
    const left = buildEvent({
      id: "f63b16f6-a0d8-4674-a786-31326faf7f98",
      vectorClock: { a: 2, b: 0 },
      createdAt: 100,
    });
    const right = buildEvent({
      id: "69144f57-5e51-43e7-b7cb-f9f4f1f91311",
      vectorClock: { a: 1, b: 1 },
      createdAt: 200,
    });

    const outcome = reconcileEventPair(left, right);

    expect(outcome.relation).toBe("concurrent");
    expect(outcome.winner.id).toBe(right.id);
    expect(outcome.mergedClock).toEqual({ a: 2, b: 1 });
  });

  it("is deterministic for equal vector clocks regardless of input order", () => {
    const left = buildEvent({
      id: "0f3b16f6-a0d8-4674-a786-31326faf7f98",
      vectorClock: { a: 2, b: 1 },
      createdAt: 100,
    });
    const right = buildEvent({
      id: "9f144f57-5e51-43e7-b7cb-f9f4f1f91311",
      vectorClock: { a: 2, b: 1 },
      createdAt: 200,
    });

    const forward = reconcileEventPair(left, right);
    const reverse = reconcileEventPair(right, left);

    expect(forward.relation).toBe("equal");
    expect(reverse.relation).toBe("equal");
    expect(forward.winner.id).toBe(right.id);
    expect(reverse.winner.id).toBe(right.id);
  });
});
