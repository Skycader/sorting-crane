import { Api } from '../src/lib/api.ts';
import { compileCraneTimeline, initialFrame } from '../src/lib/craneCompiler.ts';
import { DEFAULT_CODE, runUserCode } from '../src/lib/runUserCode.ts';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log('OK:', msg);
}

const arr = [5, 4, 3, 2, 1];
const result = runUserCode(DEFAULT_CODE, arr);
assert(!result.error, 'default selection sort runs without error');
assert(
  JSON.stringify(result.api.snapshot) === JSON.stringify([1, 2, 3, 4, 5]),
  'array sorted ascending',
);
assert(result.api.grabs > 0 && result.api.puts > 0, 'has grabs and puts');
assert(result.api.outOfRange === 0, 'no out of range');

const frames = [initialFrame(arr), ...compileCraneTimeline(arr, result.api.events)];
assert(frames.length > 10, 'timeline has frames: ' + frames.length);

let prev = frames[0].craneIndex;
let jumps = 0;
for (const f of frames) {
  if (f.op.type === 'move') {
    if (Math.abs(f.op.index - prev) > 1) jumps++;
    prev = f.op.index;
  } else {
    prev = f.craneIndex;
  }
}
assert(jumps === 0, 'no crane index jumps > 1');

let releasingOk = 0;
let settledOk = 0;
for (const f of frames) {
  if (f.op.type !== 'place') continue;
  if (f.releasing) {
    assert(f.stack.length > 0, 'releasing keeps cargo on magnet stack');
    assert(!!f.cells[f.op.index], 'releasing already wrote deck cell');
    releasingOk++;
  } else if (f.craneLowered) {
    assert(!!f.cells[f.op.index], 'settled place has deck cargo');
    settledOk++;
  }
}
assert(releasingOk > 0, 'has releasing frames: ' + releasingOk);
assert(settledOk > 0, 'has settled place frames: ' + settledOk);

const api = new Api([9, 8, 7]);
api.grab(0); // 9
api.grab(1); // 8 on top of stack (LIFO)
let threw = false;
try {
  api.grab(2);
} catch {
  threw = true;
}
assert(threw, 'third grab rejected');
api.put(0); // places 8
api.put(1); // places 9
assert(
  JSON.stringify(api.snapshot) === JSON.stringify([8, 9, 7]),
  'manual LIFO swap via grab/put',
);

assert(
  frames.some((f) => f.op.type === 'hoist'),
  'timeline includes hoist before 2nd grab',
);
assert(
  frames.some((f) => f.magnetOn && f.stack.length > 0),
  'magnet energizes while holding',
);

console.log('\nALL SMOKE TESTS PASSED');
console.log({
  frames: frames.length,
  reads: result.api.reads,
  grabs: result.api.grabs,
  puts: result.api.puts,
  releasingOk,
  settledOk,
});
