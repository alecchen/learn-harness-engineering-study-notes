interface ImportPanelProps {
  onImport: () => void;
  busy: boolean;
}

export function ImportPanel({ onImport, busy }: ImportPanelProps) {
  return (
    <button className="btn btn-primary import-btn" onClick={onImport} disabled={busy}>
      + Import Document
    </button>
  );
}
