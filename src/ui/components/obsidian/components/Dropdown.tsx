import { DropdownComponent as ObsidianDropdownComponent } from 'obsidian';
import { useLayoutEffect, useRef } from 'preact/hooks';
import type { BuilderProps } from '..';

export function DropdownComponent({ build, deps = [] }: BuilderProps<ObsidianDropdownComponent>) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.empty();
    const dropdown = new ObsidianDropdownComponent(el);
    build(dropdown);
  }, deps);

  return <div ref={ref} style={{ display: 'contents' }} />;
}
