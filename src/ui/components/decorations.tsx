import type { ComponentChildren } from 'preact';

export function Icon({
  icon,
  className,
  title,
  onClick,
}: {
  icon: ComponentChildren;
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
