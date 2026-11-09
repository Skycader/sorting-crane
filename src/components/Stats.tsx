type Props = {
  reads: number;
  grabs: number;
  puts: number;
  outOfRange: number;
  length: number;
  arrayPreview: unknown[];
};

export function Stats({
  reads,
  grabs,
  puts,
  outOfRange,
  length,
  arrayPreview,
}: Props) {
  return (
    <div className="stats">
      <div className="panel-head">
        <span>TELEMETRY</span>
      </div>
      <dl className="stats-grid stats-grid-5">
        <div>
          <dt>LEN</dt>
          <dd>{length}</dd>
        </div>
        <div>
          <dt>READS</dt>
          <dd>{reads}</dd>
        </div>
        <div>
          <dt>GRABS</dt>
          <dd>{grabs}</dd>
        </div>
        <div>
          <dt>PUTS</dt>
          <dd>{puts}</dd>
        </div>
        <div>
          <dt>OOB</dt>
          <dd className={outOfRange ? 'bad' : ''}>{outOfRange}</dd>
        </div>
      </dl>
      <div className="array-preview">
        <span className="panel-hint">SNAPSHOT</span>
        <code>[{arrayPreview.map(String).join(', ')}]</code>
      </div>
    </div>
  );
}
