import { useMemo, useState } from 'react';
import { CodePanel } from './components/CodePanel';
import { Controls } from './components/Controls';
import { CraneScene } from './components/CraneScene';
import { Stats } from './components/Stats';
import { usePlayback } from './hooks/usePlayback';
import {
  compileCraneTimeline,
  initialFrame,
  type TimelineFrame,
} from './lib/craneCompiler';
import { DEFAULT_CODE, randomArray, runUserCode } from './lib/runUserCode';

function boot(): { arr: unknown[]; frames: TimelineFrame[] } {
  const arr = randomArray(8);
  return { arr, frames: [initialFrame(arr)] };
}

export default function App() {
  const [size, setSize] = useState(8);
  const [speed, setSpeed] = useState(220);
  const [bootState] = useState(boot);
  const [arr, setArr] = useState<unknown[]>(bootState.arr);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [error, setError] = useState<string | null>(null);
  const [frames, setFrames] = useState<TimelineFrame[]>(bootState.frames);
  const [meta, setMeta] = useState({
    reads: 0,
    grabs: 0,
    puts: 0,
    outOfRange: 0,
  });

  const playback = usePlayback(frames, speed);

  const frame = playback.frame ?? frames[0] ?? initialFrame(arr);
  const preview = useMemo(
    () => (frame?.cells ?? []).map((c) => (c ? c.value : '·')),
    [frame],
  );

  const generate = () => {
    const next = randomArray(size);
    setArr(next);
    setFrames([initialFrame(next)]);
    setMeta({ reads: 0, grabs: 0, puts: 0, outOfRange: 0 });
    setError(null);
  };

  const onSize = (n: number) => {
    setSize(n);
    const next = randomArray(n);
    setArr(next);
    setFrames([initialFrame(next)]);
    setMeta({ reads: 0, grabs: 0, puts: 0, outOfRange: 0 });
    setError(null);
  };

  const run = () => {
    const result = runUserCode(code, arr);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    const compiled = compileCraneTimeline(arr, result.api.events);
    setFrames([initialFrame(arr), ...compiled]);
    setMeta({
      reads: result.api.reads,
      grabs: result.api.grabs,
      puts: result.api.puts,
      outOfRange: result.api.outOfRange,
    });
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◈</span>
          <div>
            <h1>CRANE://SORT</h1>
            <p>cyberpunk array algorithm bay</p>
          </div>
        </div>
        <div className="topbar-meta">
          <span>DARK SOLARIZED</span>
          <span>MAX 24 CELLS</span>
        </div>
      </header>

      <main className="layout">
        <section className="viz-col">
          <CraneScene frame={frame} length={arr.length} speedMs={speed} />
          <Controls
            size={size}
            speed={speed}
            playing={playback.playing}
            index={playback.index}
            total={playback.total}
            onSize={onSize}
            onSpeed={setSpeed}
            onGenerate={generate}
            onRun={run}
            onPlay={playback.play}
            onPause={playback.pause}
            onStepBack={playback.stepBack}
            onStepForward={playback.stepForward}
            onSeek={playback.seek}
          />
        </section>

        <aside className="side-col">
          <CodePanel code={code} onChange={setCode} error={error} />
          <Stats
            reads={frame?.apiReads ?? meta.reads}
            grabs={frame?.apiGrabs ?? meta.grabs}
            puts={frame?.apiPuts ?? meta.puts}
            outOfRange={meta.outOfRange}
            length={arr.length}
            arrayPreview={preview}
          />
        </aside>
      </main>
    </div>
  );
}
