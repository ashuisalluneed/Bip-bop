import type { EventEnvelope } from "~/lib/aurora/event-envelope";
import {
  compareClocks,
  mergeClocks,
  type VectorClock,
} from "~/lib/aurora/vector-clock";

const tieBreak = (left: EventEnvelope, right: EventEnvelope): EventEnvelope => {
  if (left.createdAt !== right.createdAt) {
    return left.createdAt > right.createdAt ? left : right;
  }

  return left.id > right.id ? left : right;
};

export type ReconciliationOutcome = {
  winner: EventEnvelope;
  mergedClock: VectorClock;
  relation: ReturnType<typeof compareClocks>;
};

export const reconcileEventPair = (
  left: EventEnvelope,
  right: EventEnvelope,
): ReconciliationOutcome => {
  const relation = compareClocks(left.vectorClock, right.vectorClock);

  if (relation === "after") {
    return {
      winner: left,
      mergedClock: mergeClocks(left.vectorClock, right.vectorClock),
      relation,
    };
  }

  if (relation === "equal") {
    return {
      winner: tieBreak(left, right),
      mergedClock: mergeClocks(left.vectorClock, right.vectorClock),
      relation,
    };
  }

  if (relation === "before") {
    return {
      winner: right,
      mergedClock: mergeClocks(left.vectorClock, right.vectorClock),
      relation,
    };
  }

  return {
    winner: tieBreak(left, right),
    mergedClock: mergeClocks(left.vectorClock, right.vectorClock),
    relation,
  };
};
