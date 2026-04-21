import { type InterpolationValues, type TranslationKey, t } from './index';
import { parseMarkup, type Segment } from './markup';

function appendText(parent: Node, text: string): void {
  parent.appendChild(document.createTextNode(text));
}

function appendElement(parent: Node, tag: string, content: string, recursive: boolean): void {
  const el = document.createElement(tag);

  if (recursive) renderMarkup(el, content);
  else el.textContent = content;

  parent.appendChild(el);
}

function appendLink(parent: Node, content: string, href: string, recursive: boolean): void {
  const a = document.createElement('a');
  a.setAttribute('href', href);

  if (recursive) renderMarkup(a, content);
  else a.textContent = content;

  parent.appendChild(a);
}

/**
 * Renders the given text with markup into the parent node.
 */
function renderMarkup(parent: Node, text: string): void {
  for (const segment of parseMarkup(text)) {
    switch (segment.type) {
      case 'text':
        appendText(parent, segment.content);
        break;
      case 'b':
        appendElement(parent, 'b', segment.content, true);
        break;
      case 'code':
        appendElement(parent, 'code', segment.content, false);
        break;
      case 'a':
        appendLink(parent, segment.content, segment.href, true);
        break;
      default: {
        throw new Error(`Unhandled segment type: ${(segment satisfies never as Segment).type}`);
      }
    }
  }
}

/**
 * Returns a DocumentFragment with rich text for the given translation key.
 * Parses `<bold>`, `<code>`, and `<link href="...">` markup in the translation
 * string into the corresponding DOM elements. Supports nested tags like
 * `<code>` inside `<bold>`.
 *
 * Intended for Obsidian's `.setDesc()` which accepts DocumentFragment.
 * setting.setDesc(tFragment('settings.processor.desc'))
 *
 * NOTE: Not unit-tested because it requires a DOM environment.
 * The underlying `t()` and `parseMarkup()` are tested independently.
 */
export function tFragment(key: TranslationKey, options?: InterpolationValues): DocumentFragment {
  const text = t(key, options);
  const fragment = document.createDocumentFragment();

  renderMarkup(fragment, text);

  return fragment;
}
