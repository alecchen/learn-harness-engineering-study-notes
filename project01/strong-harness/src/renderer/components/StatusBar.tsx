import type { IndexStatus } from '../../shared/types';

interface StatusBarProps {
  status: IndexStatus;
  documentCount: number;
}

export function StatusBar({ status, documentCount }: StatusBarProps) {
  const lastActivity = status.lastActivity
    ? new Date(status.lastActivity).toLocaleTimeString()
    : '-';
  return (
    <footer className="status-bar">
      <span>Status: {status.status}</span>
      <span>Documents: {documentCount}</span>
      <span>
        Indexed: {status.documentsIndexed}/{status.totalDocuments}
      </span>
      <span>Last activity: {lastActivity}</span>
    </footer>
  );
}
