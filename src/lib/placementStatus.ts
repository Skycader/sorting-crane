export type PlacementStatus = 'green' | 'yellow' | 'red';

function cmp(a: unknown, b: unknown): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

/** Ascending sorted target for the initial array. */
export function sortedTarget(values: unknown[]): unknown[] {
  return [...values].sort(cmp);
}

/** True if (left, right) appears as an adjacent pair in the sorted target. */
function isSortedAdjacentPair(
  left: unknown,
  right: unknown,
  target: unknown[],
): boolean {
  for (let i = 0; i < target.length - 1; i++) {
    if (Object.is(target[i], left) && Object.is(target[i + 1], right)) {
      return true;
    }
  }
  // Fallback for primitives that aren't Object.is-identical after copy
  for (let i = 0; i < target.length - 1; i++) {
    if (target[i] === left && target[i + 1] === right) return true;
  }
  return false;
}

/**
 * Pedestal lamp color for the value currently in slot `index`:
 * - green  — final sorted position
 * - yellow — wrong slot, but forms a correct sorted adjacent pair with a neighbor
 * - red    — otherwise misplaced
 */
export function placementStatus(
  cells: (unknown | null | undefined)[],
  target: unknown[],
  index: number,
): PlacementStatus | null {
  const value = cells[index];
  if (value === null || value === undefined) return null;
  if (index >= target.length) return null;

  if (value === target[index]) return 'green';

  const left = index > 0 ? cells[index - 1] : undefined;
  const right = index < cells.length - 1 ? cells[index + 1] : undefined;

  const withLeft =
    left !== null &&
    left !== undefined &&
    isSortedAdjacentPair(left, value, target);
  const withRight =
    right !== null &&
    right !== undefined &&
    isSortedAdjacentPair(value, right, target);

  if (withLeft || withRight) return 'yellow';
  return 'red';
}

export function placementStatuses(
  cells: (unknown | null | undefined)[],
  target: unknown[],
): (PlacementStatus | null)[] {
  return cells.map((_, i) => placementStatus(cells, target, i));
}
