import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import type { Held, TimelineFrame } from '../lib/craneCompiler';

type Props = {
  frame: TimelineFrame;
  length: number;
  /** Playback step duration — hoist/lower eases across most of it. */
  speedMs?: number;
};

type LaserBox = { left: number; top: number; height: number };

const ARM_RAISED = 16;
const ARM_RAISED_STACK = 8;

function valueHue(value: unknown): string {
  const n = typeof value === 'number' ? value : String(value).length * 17;
  const t = (n * 37) % 100;
  if (t < 20) return 'var(--c-cyan)';
  if (t < 40) return 'var(--c-green)';
  if (t < 60) return 'var(--c-yellow)';
  if (t < 80) return 'var(--c-orange)';
  return 'var(--c-magenta)';
}

function Container({
  value,
  id,
}: {
  value: unknown;
  id: string;
}) {
  return (
    <div
      className="container"
      style={{ '--box': valueHue(value) } as CSSProperties}
      data-id={id}
    >
      <span className="container-stripe" />
      <span className="container-value">{String(value)}</span>
      <span className="container-lock" />
    </div>
  );
}

/**
 * Visual stack under magnet (top → bottom):
 * first grabbed is upper ("queue"), last grabbed hangs at the magnet tip
 * and is released first (LIFO).
 */
function MagnetHead({
  stack,
  hoisting,
  magnetOn,
  scanning,
  emitterRef,
  bayRef,
}: {
  stack: Held[];
  hoisting: boolean;
  magnetOn: boolean;
  scanning: boolean;
  emitterRef: RefObject<HTMLSpanElement | null>;
  bayRef: RefObject<HTMLDivElement | null>;
}) {
  // During hoist before 2nd grab: only stack[0], parked up.
  // With 2: stack[0] upper, stack[1] at tip (released first).
  // With 1: stack[0] at tip.
  const upper =
    hoisting && stack.length === 1
      ? stack[0]
      : stack.length === 2
        ? stack[0]
        : null;
  const lower =
    hoisting && stack.length === 1
      ? null
      : stack.length === 2
        ? stack[1]
        : stack[0] ?? null;

  return (
    <div
      className={`magnet ${magnetOn ? 'is-on' : ''} ${upper ? 'has-upper' : ''} ${lower ? 'has-lower' : ''} ${scanning ? 'is-scanning' : ''}`}
    >
      <div className="magnet-yoke">
        <span />
        <span />
      </div>
      <div className={`magnet-core ${magnetOn ? 'is-on' : ''}`}>
        <i className="magnet-coil" />
        <i className="magnet-coil" />
        <i className="magnet-coil" />
        <b className="magnet-face" />
      </div>

      <div className={`magnet-rack ${upper ? 'has-cargo' : ''}`}>
        {upper && (
          <div className="magnet-item magnet-item-upper">
            <Container value={upper.value} id={upper.id} />
          </div>
        )}
      </div>

      <div className="magnet-bay" ref={bayRef}>
        {lower && (
          <div className="magnet-item magnet-item-lower">
            <Container value={lower.value} id={lower.id} />
          </div>
        )}
      </div>

      <div className={`laser-gun ${scanning ? 'is-firing' : ''}`} aria-hidden>
        <span className="laser-gun-body" />
        <span className="laser-gun-barrel" />
        <span className="laser-gun-lens" ref={emitterRef} />
      </div>
    </div>
  );
}

export function CraneScene({ frame, length, speedMs = 220 }: Props) {
  const armMs = Math.max(160, Math.round(speedMs * 0.92));
  const slotPct = 100 / Math.max(length, 1);
  const craneLeft = (frame.craneIndex + 0.5) * slotPct;
  const scanning = frame.op.type === 'scan';
  const scanIndex = frame.op.type === 'scan' ? frame.op.index : -1;

  const busy =
    frame.op.type === 'grab' ||
    frame.op.type === 'place' ||
    frame.op.type === 'hoist' ||
    frame.craneLowered;

  const sceneRef = useRef<HTMLDivElement>(null);
  const trolleyRef = useRef<HTMLDivElement>(null);
  const cableRef = useRef<HTMLDivElement>(null);
  const emitterRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const bayRef = useRef<HTMLDivElement>(null);
  const [laser, setLaser] = useState<LaserBox | null>(null);
  const [armDrop, setArmDrop] = useState(ARM_RAISED);

  const tallStack = frame.hoisting || frame.stack.length >= 2;

  useLayoutEffect(() => {
    if (!frame.craneLowered) {
      // Keep a 2-high stack above the deck when raised.
      setArmDrop(tallStack ? ARM_RAISED_STACK : ARM_RAISED);
      return;
    }

    const trolley = trolleyRef.current;
    const cable = cableRef.current;
    const bay = bayRef.current;
    const target = targetRef.current;
    if (!trolley || !cable || !bay || !target) return;

    // Absolute length from live geometry — never prev+delta (CSS height
    // transition mid-frame would overshoot and bury the magnet).
    const trolleyBottom = trolley.getBoundingClientRect().bottom;
    const cableH = cable.getBoundingClientRect().height;
    const bayTop = bay.getBoundingClientRect().top;
    const belowCable = bayTop - trolleyBottom - cableH;

    // Aim bay at the pad. If the pad already shows cargo AND the magnet
    // still holds something (put leftover), stack above — don't squash.
    let aimTop = target.getBoundingClientRect().top;
    const deckBox = target.querySelector(':scope > .container');
    const heldBox = bay.querySelector('.container');
    if (deckBox && heldBox) {
      const gap = 2;
      aimTop =
        deckBox.getBoundingClientRect().top -
        heldBox.getBoundingClientRect().height -
        gap;
    }

    const needed = Math.round(aimTop - trolleyBottom - belowCable);
    const next = Math.max(8, needed);
    setArmDrop((prev) => (Math.abs(prev - next) > 2 ? next : prev));
  }, [
    frame.craneLowered,
    frame.craneIndex,
    frame.op,
    length,
    frame.cells,
    frame.stack,
    frame.hoisting,
    frame.releasing,
    tallStack,
  ]);

  useLayoutEffect(() => {
    if (!scanning) {
      setLaser(null);
      return;
    }
    const measure = () => {
      const scene = sceneRef.current;
      const emitter = emitterRef.current;
      const target = targetRef.current;
      if (!scene || !emitter || !target) {
        setLaser(null);
        return;
      }
      const sr = scene.getBoundingClientRect();
      const er = emitter.getBoundingClientRect();
      const tr = target.getBoundingClientRect();
      const height = Math.max(0, Math.round(tr.top + tr.height * 0.15 - er.bottom));
      if (height < 4) {
        setLaser(null);
        return;
      }
      setLaser({
        left: Math.round(er.left + er.width / 2 - sr.left),
        top: Math.round(er.bottom - sr.top),
        height,
      });
    };
    measure();
    const id = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(id);
  }, [scanning, scanIndex, frame.craneIndex, armDrop, length, frame.cells]);

  return (
    <div
      className="scene"
      ref={sceneRef}
      style={{ ['--arm-ms' as string]: `${armMs}ms` }}
    >
      <div className="scene-sky" />
      <div className="scene-grid" />

      <div className="gantry">
        <div className="gantry-rail" />
        <div
          className={`crane ${scanning ? 'is-scanning' : ''} ${busy ? 'is-working' : ''}`}
          style={{ left: `${craneLeft}%`, ['--arm' as string]: `${armDrop}px` }}
        >
          <div className="crane-trolley" ref={trolleyRef}>
            <div className="crane-cabin" />
            <div className="crane-winch">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="crane-cable" ref={cableRef} />

          <div className="crane-spreader">
            <div className="spreader-beam">
              <em />
              <em />
            </div>
            <MagnetHead
              stack={frame.stack}
              hoisting={frame.hoisting}
              magnetOn={frame.magnetOn}
              scanning={scanning}
              emitterRef={emitterRef}
              bayRef={bayRef}
            />
          </div>
        </div>
      </div>

      {laser && (
        <div
          className="crane-laser"
          style={{ left: laser.left, top: laser.top, height: laser.height }}
          aria-hidden
        >
          <span className="crane-laser-core" />
          <span className="crane-laser-glow" />
          <span className="crane-laser-spot" />
        </div>
      )}

      <div className="deck">
        <div className="deck-hull" />
        <div className="deck-slots" style={{ ['--n' as string]: length }}>
          {Array.from({ length }, (_, i) => {
            const cell = frame.cells[i];
            const active = frame.craneIndex === i;
            const isScanTarget = scanIndex === i;
            const isWorkTarget =
              (frame.op.type === 'grab' || frame.op.type === 'place') &&
              frame.op.index === i;
            const hideDeckCargo =
              frame.releasing &&
              frame.op.type === 'place' &&
              frame.op.index === i;
            return (
              <div
                key={i}
                className={`deck-slot ${active ? 'is-active' : ''} ${isScanTarget ? 'is-scan' : ''} ${isWorkTarget ? 'is-grab' : ''}`}
              >
                <div className="deck-index">{i}</div>
                <div
                  className="deck-target"
                  ref={active || isScanTarget ? targetRef : undefined}
                >
                  {cell && !hideDeckCargo && (
                    <Container value={cell.value} id={cell.id} />
                  )}
                  {(!cell || hideDeckCargo) && <div className="deck-empty">∅</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="deck-water" />
      </div>

      <div className="op-badge">
        <span className="op-kind">{frame.op.type}</span>
        <span className="op-detail">{describe(frame)}</span>
      </div>
    </div>
  );
}

function describe(frame: TimelineFrame): string {
  const op = frame.op;
  switch (op.type) {
    case 'move':
      return `→ index ${op.index}`;
    case 'scan':
      return `read [${op.index}] = ${String(op.value)}`;
    case 'grab':
      return `stack[${op.depth}] ← [${op.index}] (${String(op.value)})`;
    case 'place':
      return frame.releasing
        ? `release @ [${op.index}] (${String(op.value)})`
        : `stack → [${op.index}] (${String(op.value)})`;
    case 'hoist':
      return 'park #1 up — clear magnet face';
    case 'mark':
      return op.label;
    case 'lower':
      return 'arm down';
    case 'raise':
      return 'arm up';
    default:
      return '';
  }
}
