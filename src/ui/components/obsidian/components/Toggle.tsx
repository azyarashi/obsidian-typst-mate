import { ToggleComponent as ObsidianToggleComponent } from 'obsidian';
import { useLayoutEffect, useRef } from 'preact/hooks';
import type { BuilderProps } from '..';

export function ToggleComponent({ build, deps = [] }: BuilderProps<ObsidianToggleComponent>) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.empty();
    const toggle = new ObsidianToggleComponent(el);
    build(toggle);
  }, deps);

  return <div ref={ref} style={{ display: 'contents' }} />;
}
