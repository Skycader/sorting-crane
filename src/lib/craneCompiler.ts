import type { ApiEvent } from './api';

export type Held = { value: unknown; id: string };

export type CraneOp =
  | { type: 'move'; index: number }
  | { type: 'lower' }
  | { type: 'raise' }
  | { type: 'hoist' } // lift held #0 into upper rack before 2nd grab
  | { type: 'scan'; index: number; value: unknown }
  | { type: 'grab'; index: number; value: unknown; hand: 0 | 1 }
  | { type: 'place'; index: number; value: unknown; hand: 0 | 1 }
  | { type: 'mark'; label: string };

export type TimelineFrame = {
  op: CraneOp;
  cells: (Held | null)[];
  hands: [Held | null, Held | null];
  craneIndex: number;
  craneLowered: boolean;
  /** Held cargo parked in upper rack (before/while taking 2nd). */
  hoisting: boolean;
  apiReads: number;
  apiGrabs: number;
  apiPuts: number;
  sourceEvent: number;
};

function cellId(index: number, value: unknown, salt: number) {
  return `c-${index}-${String(value)}-${salt}`;
}

/** Map get / grab / put events into crane micro-ops (stepwise travel). */
export function compileCraneTimeline(
  initial: unknown[],
  events: ApiEvent[],
): TimelineFrame[] {
  const cells: (Held | null)[] = initial.map((value, index) => ({
    value,
    id: cellId(index, value, index),
  }));
  const hands: [Held | null, Held | null] = [null, null];
  let craneIndex = 0;
  let craneLowered = false;
  let hoisting = false;
  let reads = 0;
  let grabs = 0;
  let puts = 0;
  const frames: TimelineFrame[] = [];

  const push = (op: CraneOp, sourceEvent: number) => {
    if (op.type === 'move') craneIndex = op.index;
    if (op.type === 'lower') craneLowered = true;
    if (op.type === 'raise') craneLowered = false;
    if (op.type === 'hoist') hoisting = true;
    frames.push({
      op,
      cells: cells.map((c) => (c ? { ...c } : null)),
      hands: [hands[0] ? { ...hands[0] } : null, hands[1] ? { ...hands[1] } : null],
      craneIndex,
      craneLowered,
      hoisting,
      apiReads: reads,
      apiGrabs: grabs,
      apiPuts: puts,
      sourceEvent,
    });
  };

  const raiseArm = (sourceEvent: number) => {
    if (!craneLowered) return;
    push({ type: 'raise' }, sourceEvent);
    push({ type: 'raise' }, sourceEvent);
  };

  const lowerArm = (sourceEvent: number) => {
    if (craneLowered) return;
    push({ type: 'lower' }, sourceEvent);
    push({ type: 'lower' }, sourceEvent);
  };

  /** Travel index-by-index — no teleport jumps. */
  const moveTo = (index: number, sourceEvent: number) => {
    if (craneIndex === index) return;
    raiseArm(sourceEvent);
    const step = index > craneIndex ? 1 : -1;
    while (craneIndex !== index) {
      push({ type: 'move', index: craneIndex + step }, sourceEvent);
    }
  };

  for (let ei = 0; ei < events.length; ei++) {
    const ev = events[ei];

    if (ev.kind === 'get') {
      reads++;
      moveTo(ev.index, ei);
      raiseArm(ei);
      push({ type: 'scan', index: ev.index, value: ev.value }, ei);
      continue;
    }

    if (ev.kind === 'grab') {
      grabs++;
      moveTo(ev.index, ei);

      // If claw already holds #0, hoist it to upper rack before 2nd grab.
      if (ev.hand === 1 && hands[0] && !hands[1]) {
        raiseArm(ei);
        push({ type: 'hoist' }, ei);
        push({ type: 'hoist' }, ei);
      }

      lowerArm(ei);
      const held = cells[ev.index];
      if (!held) {
        push({ type: 'mark', label: `grab fail @${ev.index}` }, ei);
        continue;
      }
      cells[ev.index] = null;
      hands[ev.hand] = held;
      // Both held → normal vertical stack (#1 above, #0 at claw).
      if (hands[0] && hands[1]) hoisting = false;
      push({ type: 'grab', index: ev.index, value: held.value, hand: ev.hand }, ei);
      raiseArm(ei);
      continue;
    }

    // put
    puts++;
    moveTo(ev.index, ei);
    lowerArm(ei);
    const held = hands[ev.hand];
    if (!held) {
      push({ type: 'mark', label: `put fail hand#${ev.hand}` }, ei);
      continue;
    }
    hands[ev.hand] = null;
    cells[ev.index] = held;
    push({ type: 'place', index: ev.index, value: held.value, hand: ev.hand }, ei);
    if (!hands[0] && !hands[1]) hoisting = false;
    // If only #1 remains, it will sit at claw visually (CSS).
    raiseArm(ei);
  }

  return frames;
}

export function initialFrame(arr: unknown[]): TimelineFrame {
  return {
    op: { type: 'mark', label: 'ready' },
    cells: arr.map((value, index) => ({
      value,
      id: cellId(index, value, index),
    })),
    hands: [null, null],
    craneIndex: 0,
    craneLowered: false,
    hoisting: false,
    apiReads: 0,
    apiGrabs: 0,
    apiPuts: 0,
    sourceEvent: -1,
  };
}
