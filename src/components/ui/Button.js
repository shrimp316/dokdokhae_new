'use client';

export default function Button({
  variant = 'default',
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  style,
  children,
  ...rest
}) {
  const isDisabled = disabled || variant === 'disabled';
  const classes = ['ui-button', className].filter(Boolean).join(' ');
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={classes}
      style={style}
      {...rest}
    >
      {children}
    </button>
  );
}
