type Props = {
  size: number;
  speed: number;
  playing: boolean;
  index: number;
  total: number;
  onSize: (n: number) => void;
  onSpeed: (n: number) => void;
  onGenerate: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onSeek: (i: number) => void;
};

export function Controls({
  size,
  speed,
  playing,
  index,
  total,
  onSize,
  onSpeed,
  onGenerate,
  onPlay,
  onPause,
  onStepBack,
  onStepForward,
  onSeek,
}: Props) {
  return (
    <div className="controls">
      <div className="controls-row">
        <label className="field">
          <span>ARRAY SIZE</span>
          <input
            type="range"
            min={3}
            max={24}
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
          />
          <em>{size}</em>
        </label>

        <label className="field">
          <span>SPEED</span>
          <input
            type="range"
            min={40}
            max={800}
            step={20}
            value={840 - speed}
            onChange={(e) => onSpeed(840 - Number(e.target.value))}
          />
          <em>{speed}ms</em>
        </label>

        <button type="button" className="btn" onClick={onGenerate}>
          GENERATE
        </button>
      </div>

      <div className="controls-row playback">
        <button type="button" className="btn btn-icon" onClick={onStepBack} title="Previous">
          ⏮
        </button>
        {playing ? (
          <button type="button" className="btn btn-icon btn-accent" onClick={onPause} title="Pause">
            ⏸
          </button>
        ) : (
          <button type="button" className="btn btn-icon btn-accent" onClick={onPlay} title="Play">
            ▶
          </button>
        )}
        <button type="button" className="btn btn-icon" onClick={onStepForward} title="Next">
          ⏭
        </button>

        <label className="field timeline">
          <span>
            FRAME {total ? index + 1 : 0}/{total}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(0, total - 1)}
            value={index}
            disabled={total === 0}
            onChange={(e) => onSeek(Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
