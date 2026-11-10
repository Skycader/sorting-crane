import type { ApiEvent } from './api';

export type Held = { value: unknown; id: string };

export type CraneOp =
  | { type: 'move'; index: number; from: number; steps: number }
  | { type: 'lower' }
  | { type: 'raise' }
  | { type: 'hoist' } // park first container up before grabbing 2nd
  | { type: 'scan'; index: number; value: unknown }
  | { type: 'grab'; index: number; value: unknown; depth: number }
  | { type: 'place'; index: number; value: unknown; depth: number }
  | { type: 'mark'; label: string };

export type TimelineFrame = {
  op: CraneOp;
  cells: (Held | null)[];
  /** Magnet stack: [first grabbed, …] — last item is released first. */
  stack: Held[];
  craneIndex: number;
  craneLowered: boolean;
  /** First container parked above while picking the second. */
  hoisting: boolean;
  magnetOn: boolean;
  releasing: boolean;
  apiReads: number;
  apiGrabs: number;
  apiPuts: number;
  sourceEvent: number;
};

function cellId(index: number, value: unknown, salt: number) {
  return `c-${index}-${String(value)}-${salt}`;
}

export function compileCraneTimeline(
  initial: unknown[],
  events: ApiEvent[],
): TimelineFrame[] {
  const cells: (Held | null)[] = initial.map((value, index) => ({
    value,
    id: cellId(index, value, index),
  }));
  const stack: Held[] = [];
  let craneIndex = 0;
  let craneLowered = false;
  let hoisting = false;
  let releasing = false;
  let reads = 0;
  let grabs = 0;
  let puts = 0;
  const frames: TimelineFrame[] = [];

  const magnetOn = () => stack.length > 0 || craneLowered || hoisting;

  const push = (op: CraneOp, sourceEvent: number) => {
    if (op.type === 'move') craneIndex = op.index;
    if (op.type === 'lower') craneLowered = true;
    if (op.type === 'raise') craneLowered = false;
    if (op.type === 'hoist') hoisting = true;
    frames.push({
      op,
      cells: cells.map((c) => (c ? { ...c } : null)),
      stack: stack.map((h) => ({ ...h })),
      craneIndex,
      craneLowered,
      hoisting,
      magnetOn: magnetOn(),
      releasing,
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

  const moveTo = (index: number, sourceEvent: number) => {
    if (craneIndex === index) return;
    raiseArm(sourceEvent);
    const from = craneIndex;
    const steps = Math.abs(index - from);
    // One continuous slide; hold frames keep playback time ≈ travel time.
    push({ type: 'move', index, from, steps }, sourceEvent);
    for (let i = 1; i < steps; i++) {
      push({ type: 'move', index, from, steps }, sourceEvent);
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

      // Already holding one → hoist it up before attaching the next below.
      if (stack.length === 1) {
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
      stack.push(held);
      hoisting = false;
      push({ type: 'grab', index: ev.index, value: held.value, depth: stack.length }, ei);
      push({ type: 'grab', index: ev.index, value: held.value, depth: stack.length }, ei);
      raiseArm(ei);
      continue;
    }

    // put — LIFO pop
    puts++;
    moveTo(ev.index, ei);
    lowerArm(ei);

    if (stack.length === 0) {
      push({ type: 'mark', label: `put fail @${ev.index}` }, ei);
      continue;
    }

    push({ type: 'lower' }, ei);

    const held = stack[stack.length - 1];
    cells[ev.index] = held;
    releasing = true;
    push({
      type: 'place',
      index: ev.index,
      value: held.value,
      depth: stack.length,
    }, ei);

    stack.pop();
    releasing = false;
    // Leftover magnet cargo → park up so it doesn't sit on the just-placed box.
    hoisting = stack.length > 0;

    push({
      type: 'place',
      index: ev.index,
      value: held.value,
      depth: stack.length + 1,
    }, ei);
    push({
      type: 'place',
      index: ev.index,
      value: held.value,
      depth: stack.length + 1,
    }, ei);
    raiseArm(ei);
    if (hoisting) {
      hoisting = false;
      push({ type: 'raise' }, ei);
    }
  }

  // Terminal idle — don't freeze on a blinking scan/laser as the last frame.
  const endSrc = events.length ? events.length - 1 : -1;
  raiseArm(endSrc);
  hoisting = false;
  releasing = false;
  push({ type: 'mark', label: 'done' }, endSrc);

  return frames;
}

export function initialFrame(arr: unknown[]): TimelineFrame {
  return {
    op: { type: 'mark', label: 'ready' },
    cells: arr.map((value, index) => ({
      value,
      id: cellId(index, value, index),
    })),
    stack: [],
    craneIndex: 0,
    craneLowered: false,
    hoisting: false,
    magnetOn: false,
    releasing: false,
    apiReads: 0,
    apiGrabs: 0,
    apiPuts: 0,
    sourceEvent: -1,
  };
}
