'use client';

export default function Alert({
  variant = 'default',
  icon,
  className = '',
  style,
  children,
  role,
  ...rest
}) {
  const variantClass =
    variant === 'warning' ? 'ui-alert--warning'
    : variant === 'info' ? 'ui-alert--info'
    : '';
  const classes = ['ui-alert', variantClass, className].filter(Boolean).join(' ');
  return (
    <div
      role={role || (variant === 'warning' ? 'alert' : 'status')}
      className={classes}
      style={style}
      {...rest}
    >
      {icon ? <span className="ui-alert-icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </div>
  );
}
