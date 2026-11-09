import Editor from '@monaco-editor/react';

type Props = {
  code: string;
  onChange: (code: string) => void;
  error: string | null;
};

export function CodePanel({ code, onChange, error }: Props) {
  return (
    <div className="code-panel">
      <div className="panel-head">
        <span>USER ALGORITHM</span>
        <span className="panel-hint">export f(api)</span>
      </div>
      <div className="editor-wrap">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          value={code}
          onChange={(v) => onChange(v ?? '')}
          options={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 8 },
          }}
        />
      </div>
      {error && <div className="code-error">{error}</div>}
    </div>
  );
}
