import { compileCraneTimeline, initialFrame } from '../src/lib/craneCompiler.ts';
import { DEFAULT_CODE, runUserCode } from '../src/lib/runUserCode.ts';

const arr = [5, 4, 3, 2, 1];
const r = runUserCode(DEFAULT_CODE, arr);
const frames = [initialFrame(arr), ...compileCraneTimeline(arr, r.api.events)];

for (let i = 0; i < frames.length; i++) {
  const f = frames[i];
  if (!['place', 'lower', 'restack', 'hoist', 'raise'].includes(f.op.type)) continue;
  if (f.op.type === 'raise' || f.op.type === 'lower') {
    // only near first put
  }
}

const firstPut = frames.findIndex((f) => f.op.type === 'place');
const window = frames.slice(Math.max(0, firstPut - 8), firstPut + 8);
console.log(
  window.map((f, idx) => ({
    i: Math.max(0, firstPut - 8) + idx,
    type: f.op.type,
    detail: 'hand' in f.op ? f.op.hand : 'clawHand' in f.op ? f.op.clawHand : '',
    lowered: f.craneLowered,
    releasing: f.releasing,
    hands: f.hands.map((h) => (h ? h.value : null)),
  })),
);
