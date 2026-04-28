import { State, type Status } from '@/api';

export function getStatusBarTooltip({ status }: { status: Status }) {
  const tooltip =
    status.state === State.Rendering || status.state === State.Error ? (status.message ?? 'Typst Mate') : 'Typst Mate';

  return tooltip;
}
