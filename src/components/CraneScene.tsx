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
};

type LaserBox = { left: number; top: number; height: number };

const ARM_RAISED = 22;

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
  dim,
}: {
  value: unknown;
  id: string;
  dim?: boolean;
}) {
  return (
    <div
      className={`container ${dim ? 'is-dim' : ''}`}
      style={{ '--box': valueHue(value) } as CSSProperties}
      data-id={id}
    >
      <span className="container-stripe" />
      <span className="container-value">{String(value)}</span>
      <span className="container-lock" />
    </div>
  );
}

function Claw({
  hands,
  closed,
  hoisting,
  scanning,
  emitterRef,
}: {
  hands: [Held | null, Held | null];
  closed: boolean;
  hoisting: boolean;
  scanning: boolean;
  emitterRef: RefObject<HTMLSpanElement | null>;
}) {
  const count = (hands[0] ? 1 : 0) + (hands[1] ? 1 : 0);
  // Only #1 left → show it at claw. Both → #1 above, #0 at claw.
  const upper = hands[1] && hands[0] ? hands[1] : hoisting && hands[0] ? hands[0] : hands[1];
  const lower =
    hands[1] && hands[0]
      ? hands[0]
      : hoisting
        ? null
        : hands[0] ?? (hands[1] && !hands[0] ? hands[1] : null);

  return (
    <div
      className={`claw ${closed ? 'is-closed' : ''} ${count ? `load-${count}` : 'load-0'} ${hoisting ? 'is-hoisting' : ''}`}
    >
      <div className="claw-carriage">
        <span className="claw-hinge" />
        <span className="claw-hinge" />
      </div>

      <div className={`claw-rack ${upper ? 'has-cargo' : ''}`}>
        {upper && (
          <div className="claw-item claw-item-upper">
            <Container value={upper.value} id={upper.id} />
          </div>
        )}
      </div>

      <div className="claw-arm jaw-l" aria-hidden>
        <span className="claw-vert" />
        <span className="claw-hook" />
        <span className="claw-piston" />
      </div>
      <div className="claw-arm jaw-r" aria-hidden>
        <span className="claw-vert" />
        <span className="claw-hook" />
        <span className="claw-piston" />
      </div>

      <div className="claw-bay">
        {lower && (
          <div className="claw-item claw-item-lower">
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

export function CraneScene({ frame, length }: Props) {
  const slotPct = 100 / Math.max(length, 1);
  const craneLeft = (frame.craneIndex + 0.5) * slotPct;
  const scanning = frame.op.type === 'scan';
  const scanIndex = frame.op.type === 'scan' ? frame.op.index : -1;
  // Closed only while a container sits in the claw grip (lower slot).
  const gripOccupied =
    (!!frame.hands[0] && !frame.hoisting) ||
    (!!frame.hands[0] && !!frame.hands[1]) ||
    (!!frame.hands[1] && !frame.hands[0]);
  const clawClosed = gripOccupied && !scanning;
  const clawBusy =
    frame.op.type === 'grab' ||
    frame.op.type === 'place' ||
    frame.op.type === 'hoist' ||
    frame.craneLowered;

  const sceneRef = useRef<HTMLDivElement>(null);
  const trolleyRef = useRef<HTMLDivElement>(null);
  const emitterRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const [laser, setLaser] = useState<LaserBox | null>(null);
  const [armDrop, setArmDrop] = useState(ARM_RAISED);

  useLayoutEffect(() => {
    const trolley = trolleyRef.current;
    const target = targetRef.current;
    if (!frame.craneLowered || !trolley || !target) {
      setArmDrop(ARM_RAISED);
      return;
    }

    const measure = () => {
      const tr = trolley.getBoundingClientRect();
      const cell = target.getBoundingClientRect();
      const needed = Math.round(cell.top - tr.bottom - 56);
      setArmDrop(Math.max(ARM_RAISED + 8, needed));
    };

    measure();
    const id = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(id);
  }, [
    frame.craneLowered,
    frame.craneIndex,
    frame.op,
    length,
    frame.cells,
    frame.hands,
    frame.hoisting,
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
    <div className="scene" ref={sceneRef}>
      <div className="scene-sky" />
      <div className="scene-grid" />

      <div className="gantry">
        <div className="gantry-rail" />
        <div
          className={`crane ${scanning ? 'is-scanning' : ''} ${clawBusy ? 'is-working' : ''}`}
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

          <div className="crane-cable" />

          <div className="crane-spreader">
            <div className="spreader-beam">
              <em />
              <em />
            </div>
            <Claw
              hands={frame.hands}
              closed={clawClosed}
              hoisting={frame.hoisting}
              scanning={scanning}
              emitterRef={emitterRef}
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
            const isGrabTarget =
              (frame.op.type === 'grab' || frame.op.type === 'place') &&
              frame.op.index === i;
            return (
              <div
                key={i}
                className={`deck-slot ${active ? 'is-active' : ''} ${isScanTarget ? 'is-scan' : ''} ${isGrabTarget ? 'is-grab' : ''}`}
              >
                <div className="deck-index">{i}</div>
                <div
                  className="deck-target"
                  ref={active || isScanTarget ? targetRef : undefined}
                >
                  {cell && <Container value={cell.value} id={cell.id} />}
                  {!cell && <div className="deck-empty">∅</div>}
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
      return `grip${op.hand} ← [${op.index}] (${String(op.value)})`;
    case 'place':
      return `grip${op.hand} → [${op.index}] (${String(op.value)})`;
    case 'hoist':
      return 'stow #0 → upper rack';
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
