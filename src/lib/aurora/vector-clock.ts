export type VectorClock = Record<string, number>;

export type VectorClockComparison =
  | "equal"
  | "before"
  | "after"
  | "concurrent";

export const createClock = (nodeId: string): VectorClock => ({
  [nodeId]: 0,
});

export const tickClock = (clock: VectorClock, nodeId: string): VectorClock => ({
  ...clock,
  [nodeId]: (clock[nodeId] ?? 0) + 1,
});

export const mergeClocks = (
  left: VectorClock,
  right: VectorClock,
): VectorClock => {
  const merged: VectorClock = { ...left };

  for (const [nodeId, rightValue] of Object.entries(right)) {
    merged[nodeId] = Math.max(merged[nodeId] ?? 0, rightValue);
  }

  return merged;
};

export const compareClocks = (
  left: VectorClock,
  right: VectorClock,
): VectorClockComparison => {
  const nodeIds = new Set([...Object.keys(left), ...Object.keys(right)]);

  let leftDominates = false;
  let rightDominates = false;

  for (const nodeId of nodeIds) {
    const leftValue = left[nodeId] ?? 0;
    const rightValue = right[nodeId] ?? 0;

    if (leftValue < rightValue) {
      rightDominates = true;
    } else if (leftValue > rightValue) {
      leftDominates = true;
    }
  }

  if (!leftDominates && !rightDominates) {
    return "equal";
  }

  if (leftDominates && !rightDominates) {
    return "after";
  }

  if (!leftDominates && rightDominates) {
    return "before";
  }

  return "concurrent";
};
