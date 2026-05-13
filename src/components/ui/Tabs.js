'use client';

export default function Tabs({
  items = [],
  activeKey,
  onChange,
  className = '',
  style,
  ariaLabel,
}) {
  const classes = ['ui-tabs', className].filter(Boolean).join(' ');
  return (
    <div role="tablist" aria-label={ariaLabel} className={classes} style={style}>
      {items.map((it) => {
        const isActive = it.key === activeKey;
        return (
          <button
            key={it.key}
            role="tab"
            type="button"
            aria-selected={isActive}
            className="ui-tab"
            onClick={() => onChange && onChange(it.key)}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
