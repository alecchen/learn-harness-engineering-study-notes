import { describe, it, expect } from 'vitest';
import { chunkText, countWords } from './chunking';

describe('chunkText', () => {
  it('returns an empty array for empty input', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('keeps a short document as a single chunk', () => {
    const chunks = chunkText('Just a short note.');
    expect(chunks).toEqual(['Just a short note.']);
  });

  it('respects paragraph boundaries for long content', () => {
    const paragraphs = Array.from({ length: 10 }, (_, i) => `Paragraph number ${i} with some content.`);
    const text = paragraphs.join('\n\n');
    const chunks = chunkText(text, 100);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(100);
    }
  });

  it('splits a single oversized paragraph into multiple chunks', () => {
    const long = 'word '.repeat(300).trim();
    const chunks = chunkText(long, 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(' ').split(' ')).toHaveLength(300);
  });

  it('drops blank content between paragraphs', () => {
    const chunks = chunkText('First.\n\n\n\nSecond.', 10);
    expect(chunks).toContain('First.');
    expect(chunks).toContain('Second.');
  });
});

describe('countWords', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('hello world again')).toBe(3);
  });

  it('counts zero for empty text', () => {
    expect(countWords('')).toBe(0);
  });
});
