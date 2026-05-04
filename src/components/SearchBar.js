'use client';

export default function SearchBar({ value, onChange, onSubmit, placeholder }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit(value); }}
          placeholder={placeholder}
          style={{ width: '100%', paddingRight: value ? 32 : undefined }}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); onSubmit(''); }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16 }}
            aria-label="검색어 지우기"
          >×</button>
        )}
      </div>
      <button type="button" className="btn-sm btn-outline" onClick={() => onSubmit(value)}>검색</button>
    </div>
  );
}
