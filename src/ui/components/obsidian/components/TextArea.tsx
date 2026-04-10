import { useLayoutEffect, useRef } from 'hono/jsx';
import { TextAreaComponent as ObsidianTextAreaComponent } from 'obsidian';

import type { BuilderProps } from '..';

export function TextAreaComponent({ build, deps = [] }: BuilderProps<ObsidianTextAreaComponent>) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.empty();
    const textArea = new ObsidianTextAreaComponent(el);
    build(textArea);
  }, deps);

  return <div ref={ref} style={{ display: 'contents' }} />;
}
