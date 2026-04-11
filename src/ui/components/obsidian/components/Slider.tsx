import { SliderComponent as ObsidianSliderComponent } from 'obsidian';
import { useLayoutEffect, useRef } from 'preact/hooks';

import type { BuilderProps } from '..';

export function SliderComponent({ build, deps = [] }: BuilderProps<ObsidianSliderComponent>) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.empty();
    const slider = new ObsidianSliderComponent(el);
    build(slider);
  }, deps);

  return <div ref={ref} style={{ display: 'contents' }} />;
}
