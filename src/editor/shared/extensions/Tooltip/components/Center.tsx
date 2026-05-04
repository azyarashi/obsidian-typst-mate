import type { Definition } from '@wasm';
import { formatDefinitionValue } from '@wasm-values';
import { Component, MarkdownRenderer } from 'obsidian';
import { appUtils } from '@/libs';

const separator = '\n\n---\n';
const component = new Component();

// [aaa](file://../)
export function Center(definition?: Definition, sampledValues?: string) {
  const el = document.createElement('div');
  let markdown = '';

  // * value
  const value = definition?.value;
  if (value) markdown += formatDefinitionValue(value);

  // * docs
  if (value && 'docs' in value && value.docs !== '') {
    if (markdown !== '') markdown += separator;

    markdown += value.docs;
  }

  // * sampled values
  if (sampledValues) {
    if (markdown !== '') markdown += separator;

    markdown += `## Sampled Values\n`;
    markdown += `\`\`\`typc\n${sampledValues}\n\`\`\``;
  }

  // * preprocessor
  markdown = markdown.replaceAll('```example', '```typ').replaceAll('```typ', '```typstmate-typ');

  // * render
  MarkdownRenderer.render(appUtils.app, markdown, el, '', component);

  return el;
}
