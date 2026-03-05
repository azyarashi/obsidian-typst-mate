import type { TOptions } from 'i18next';
import { type InterpolationValues, type TranslationKey, t } from './index';
import { parseMarkup, type Segment } from './markup';

function appendText(fragment: DocumentFragment, text: string): void {
  fragment.appendChild(document.createTextNode(text));
}

function appendElement(fragment: DocumentFragment, tag: string, text: string): void {
  const el = document.createElement(tag);
  el.textContent = text;
  fragment.appendChild(el);
}

function appendLink(fragment: DocumentFragment, text: string, href: string): void {
  const a = document.createElement('a');
  a.textContent = text;
  a.setAttribute('href', href);
  fragment.appendChild(a);
}

/**
 * Returns a DocumentFragment with rich text for the given translation key.
 * Parses `<bold>`, `<code>`, and `<link href="...">` markup in the translation
 * string into the corresponding DOM elements.
 *
 * Intended for Obsidian's `.setDesc()` which accepts DocumentFragment.
 * setting.setDesc(tFragment('settings.processor.desc'))
 *
 * NOTE: Not unit-tested because it requires a DOM environment.
 * The underlying `t()` and `parseMarkup()` are tested independently.
 */
export function tFragment(key: TranslationKey, options?: TOptions<InterpolationValues>): DocumentFragment {
  const text = t(key, options);
  const fragment = document.createDocumentFragment();

  for (const segment of parseMarkup(text)) {
    switch (segment.type) {
      case 'text':
        appendText(fragment, segment.content);
        break;
      case 'bold':
        appendElement(fragment, 'b', segment.content);
        break;
      case 'code':
        appendElement(fragment, 'code', segment.content);
        break;
      case 'link':
        appendLink(fragment, segment.content, segment.href);
        break;
      default: {
        throw new Error(`Unhandled segment type: ${(segment satisfies never as Segment).type}`);
      }
    }
  }

  return fragment;
}
