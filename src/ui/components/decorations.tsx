import type { Child } from 'hono/jsx/dom';

export function Icon({
  icon,
  className,
  title,
  onClick,
}: {
  icon: Child;
  className?: string;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <div className={className} title={title} onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      {icon}
    </div>
  );
}
