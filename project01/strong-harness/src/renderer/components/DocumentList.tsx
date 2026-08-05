import type { DocumentMeta } from '../../shared/types';

interface DocumentListProps {
  documents: DocumentMeta[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DocumentList({ documents, selectedId, onSelect, onDelete }: DocumentListProps) {
  return (
    <div className="document-list">
      <h2 className="sidebar-heading">Documents</h2>
      {documents.length === 0 ? (
        <p className="empty-state">
          No documents yet. Use the Import button to add a .txt or .md file.
        </p>
      ) : (
        <ul>
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                className={`doc-item${doc.id === selectedId ? ' selected' : ''}`}
                onClick={() => onSelect(doc.id)}
              >
                <span className="doc-title">{doc.title}</span>
                <span className="doc-meta">
                  {doc.chunkCount} chunks{doc.indexed ? '' : ' - not indexed'}
                </span>
              </button>
              <button
                type="button"
                className="doc-delete"
                title="Delete document"
                onClick={() => onDelete(doc.id)}
              >
                x
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
