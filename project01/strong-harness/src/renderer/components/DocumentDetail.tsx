import type { Chunk, DocumentDetail as DocumentDetailType } from '../../shared/types';

interface DocumentDetailProps {
  detail: DocumentDetailType;
  chunks: Chunk[];
}

function formatSize(size: number): string {
  return size >= 1024 ? `${(size / 1024).toFixed(1)} KB` : `${size} B`;
}

export function DocumentDetail({ detail, chunks }: DocumentDetailProps) {
  const { meta, content } = detail;
  return (
    <section className="document-detail">
      <h2>{meta.title}</h2>
      <dl className="meta-grid">
        <div>
          <dt>Filename</dt>
          <dd>{meta.filename}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{formatSize(meta.size)}</dd>
        </div>
        <div>
          <dt>Imported</dt>
          <dd>{new Date(meta.importDate).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Chunks</dt>
          <dd>{chunks.length}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{meta.indexed ? 'Indexed' : 'Not indexed'}</dd>
        </div>
      </dl>
      <h3>Content</h3>
      <pre className="content-preview">{content}</pre>
    </section>
  );
}
