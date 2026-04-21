export type TagType = 'b' | 'c' | 'a';

export type Segment =
  | { type: 'text'; content: string }
  | { type: 'b'; content: string }
  | { type: 'code'; content: string }
  | { type: 'a'; content: string; href: string };

// Matches <b>...</b>, <code>...</code>, <a href="...">...</a>
const TAG_REGEXP = /<(b|code|a)(?:\s+href="([^"]*)")?>(.*?)<\/\1>/g;

function createSegment(tag: string, content: string, href?: string): Segment | undefined {
  switch (tag) {
    case 'b':
      return { type: 'b', content };
    case 'code':
      return { type: 'code', content };
    case 'a': {
      if (!href) return undefined;
      return { type: 'a', content, href };
    }
    default:
      return undefined;
  }
}

export function parseMarkup(text: string): Segment[] {
  if (text.length === 0) return [];

  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(TAG_REGEXP)) {
    const matchIndex = match.index;
    const [, tag, href, content] = match;

    if (tag === undefined || content === undefined) continue;

    const segment = createSegment(tag, content, href);

    if (matchIndex > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, matchIndex) });
    }

    // Invalid tags (e.g., <link> without href) fall back to plain text
    segments.push(segment ?? { type: 'text', content });
    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return segments;
}
