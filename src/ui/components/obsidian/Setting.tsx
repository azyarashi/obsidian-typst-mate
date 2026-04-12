import { Setting as ObsidianSetting } from 'obsidian';
import { useLayoutEffect, useRef } from 'preact/hooks';
import type { BuilderProps } from '.';

export function Setting({ build, deps = [] }: BuilderProps<ObsidianSetting>) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.empty();
    const setting = new ObsidianSetting(el);
    build(setting);
  }, deps);

  return <div ref={ref} style={{ display: 'contents' }} />;
}
