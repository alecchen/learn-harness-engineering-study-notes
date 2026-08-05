import type { QaHistoryEntry, QaResult } from '../../shared/types';

interface QaResponseProps {
  result: QaResult | null;
  history: QaHistoryEntry[];
}

export function QaResponse({ result, history }: QaResponseProps) {
  return (
    <section className="qa-response">
      <h2 className="qa-heading">Q&amp;A</h2>
      {result ? (
        <>
          <div className="answer-card">
            <p className="answer-text">{result.answer}</p>
            <span
              className={`confidence ${result.confidence >= 0.5 ? 'confidence-high' : 'confidence-low'}`}
            >
              Confidence {Math.round(result.confidence * 100)}%
            </span>
          </div>
          {result.citations.length > 0 && (
            <ul className="citations">
              {result.citations.map((citation) => (
                <li key={citation.chunkId}>
                  <span className="citation-title">{citation.docTitle}</span>
                  <span className="citation-excerpt">{citation.excerpt}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="empty-state">
          Ask a question to get an answer grounded in your documents.
        </p>
      )}
      {history.length > 0 && (
        <>
          <h3 className="history-heading">Recent questions</h3>
          <ul className="history">
            {history
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={`${entry.timestamp}-${index}`}>
                  <span className="history-q">{entry.question}</span>
                  <span className="history-a">{entry.answer}</span>
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}
