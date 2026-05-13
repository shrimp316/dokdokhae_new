'use client';

export default function Chip({
  variant = 'default',
  selected = false,
  onClick,
  className = '',
  style,
  children,
  ...rest
}) {
  const variantClass =
    selected || variant === 'primary' ? 'ui-chip--primary' : '';
  const classes = ['ui-chip', variantClass, className].filter(Boolean).join(' ');
  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      data-selected={selected ? 'true' : 'false'}
      onClick={onClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); }
      } : undefined}
      className={classes}
      style={style}
      {...rest}
    >
      {children}
    </span>
  );
}
