export type TagType = 'bold' | 'code' | 'link';

export type Segment =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'code'; content: string }
  | { type: 'link'; content: string; href: string };

// Matches <bold>...</bold>, <code>...</code>, <link href="...">...</link>
const TAG_REGEXP = /<(bold|code|link)(?:\s+href="([^"]*)")?>(.*?)<\/\1>/g;

function createSegment(tag: string, content: string, href?: string): Segment | undefined {
  switch (tag) {
    case 'bold':
      return { type: 'bold', content };
    case 'code':
      return { type: 'code', content };
    case 'link': {
      if (!href) return undefined;
      return { type: 'link', content, href };
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
