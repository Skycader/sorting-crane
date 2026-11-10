import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { sortedTarget } from './lib/placementStatus';
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
  /** True when code/array changed since last successful compile. */
  const [dirty, setDirty] = useState(true);
  const [pendingAction, setPendingAction] = useState<'play' | 'step' | null>(
    null,
  );
  const [meta, setMeta] = useState({
    reads: 0,
    grabs: 0,
    puts: 0,
    outOfRange: 0,
  });

  const playback = usePlayback(frames, speed);
  const { play, stepForward, stepBack, pause, seek } = playback;

  const frame = playback.frame ?? frames[0] ?? initialFrame(arr);
  const target = useMemo(() => sortedTarget(arr), [arr]);
  const preview = useMemo(
    () => (frame?.cells ?? []).map((c) => (c ? c.value : '·')),
    [frame],
  );

  const resetArray = (next: unknown[]) => {
    setArr(next);
    setFrames([initialFrame(next)]);
    setMeta({ reads: 0, grabs: 0, puts: 0, outOfRange: 0 });
    setError(null);
    setDirty(true);
    setPendingAction(null);
  };

  const generate = () => resetArray(randomArray(size));

  const onSize = (n: number) => {
    setSize(n);
    resetArray(randomArray(n));
  };

  const onCodeChange = (next: string) => {
    setCode(next);
    setDirty(true);
  };

  const compile = useCallback((): boolean => {
    const result = runUserCode(code, arr);
    if (result.error) {
      setError(result.error);
      setPendingAction(null);
      return false;
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
    setDirty(false);
    return true;
  }, [code, arr]);

  const needsCompile = dirty || frames.length <= 1;

  const onPlay = () => {
    if (playback.playing) return;
    if (needsCompile) {
      if (!compile()) return;
      setPendingAction('play');
      return;
    }
    play();
  };

  const onStepForward = () => {
    if (needsCompile) {
      if (!compile()) return;
      setPendingAction('step');
      return;
    }
    stepForward();
  };

  useEffect(() => {
    if (!pendingAction) return;
    if (dirty || frames.length <= 1) return;
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'play') play();
    else stepForward();
  }, [pendingAction, dirty, frames, play, stepForward]);

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
          <CraneScene
            frame={frame}
            length={arr.length}
            target={target}
            speedMs={speed}
          />
          <Controls
            size={size}
            speed={speed}
            playing={playback.playing}
            index={playback.index}
            total={playback.total}
            onSize={onSize}
            onSpeed={setSpeed}
            onGenerate={generate}
            onPlay={onPlay}
            onPause={pause}
            onStepBack={stepBack}
            onStepForward={onStepForward}
            onSeek={seek}
          />
        </section>

        <aside className="side-col">
          <CodePanel code={code} onChange={onCodeChange} error={error} />
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
