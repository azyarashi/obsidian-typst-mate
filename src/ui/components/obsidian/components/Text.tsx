import { useLayoutEffect, useRef } from 'hono/jsx';
import { TextComponent as ObsidianTextComponent } from 'obsidian';

import type { BuilderProps } from '..';

export function TextComponent({ build, deps = [] }: BuilderProps<ObsidianTextComponent>) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.empty();
    const text = new ObsidianTextComponent(el);
    build(text);
  }, deps);

  return <div ref={ref} style={{ display: 'contents' }} />;
}
