export const DEFAULT_CHUNK_SIZE = 500;

export function chunkText(text: string, targetSize = DEFAULT_CHUNK_SIZE): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (current && candidate.length > targetSize) {
      chunks.push(current);
      current = para;
    } else {
      current = candidate;
    }

    while (current.length > targetSize) {
      const cut = current.lastIndexOf(' ', targetSize);
      const boundary = cut > targetSize * 0.5 ? cut : targetSize;
      chunks.push(current.slice(0, boundary).trim());
      current = current.slice(boundary).trim();
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function countWords(text: string): number {
  const matches = text.match(/[A-Za-z0-9'-]+/g);
  return matches ? matches.length : 0;
}
