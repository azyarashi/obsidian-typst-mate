import { useLayoutEffect, useRef } from 'hono/jsx/dom';
import { ButtonComponent as ObsidianButtonComponent } from 'obsidian';

import type { BuilderProps } from '..';

export function ButtonComponent({ build, deps = [] }: BuilderProps<ObsidianButtonComponent>) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.empty();
    const button = new ObsidianButtonComponent(el);
    build(button);
  }, deps);

  return <div ref={ref} style={{ display: 'contents' }} />;
}
