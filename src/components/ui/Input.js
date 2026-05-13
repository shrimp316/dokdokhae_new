'use client';

export default function Input({
  variant = 'outlined',
  icon,
  iconPosition = 'right',
  className = '',
  style,
  ...rest
}) {
  const variantClass =
    variant === 'filled' ? 'ui-input--filled'
    : variant === 'elevated' ? 'ui-input--elevated'
    : '';
  const iconClass = icon ? (iconPosition === 'right' ? 'ui-input--icon-right' : '') : '';
  const inputClasses = ['ui-input', variantClass, iconClass, className].filter(Boolean).join(' ');

  if (!icon) {
    return <input className={inputClasses} style={style} {...rest} />;
  }
  return (
    <span className="ui-input-wrap">
      <input className={inputClasses} style={style} {...rest} />
      <span className="ui-input-icon" aria-hidden="true">{icon}</span>
    </span>
  );
}
