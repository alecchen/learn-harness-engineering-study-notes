import { useState } from 'react';

interface QuestionPanelProps {
  onAsk: (question: string) => void;
  busy: boolean;
}

export function QuestionPanel({ onAsk, busy }: QuestionPanelProps) {
  const [question, setQuestion] = useState('');

  const submit = () => {
    const trimmed = question.trim();
    if (!trimmed || busy) {
      return;
    }
    onAsk(trimmed);
    setQuestion('');
  };

  return (
    <div className="question-panel">
      <input
        className="question-input"
        type="text"
        placeholder="Ask a question about your documents..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            submit();
          }
        }}
        disabled={busy}
      />
      <button
        type="button"
        className="btn btn-primary"
        onClick={submit}
        disabled={busy || !question.trim()}
      >
        Ask
      </button>
    </div>
  );
}
