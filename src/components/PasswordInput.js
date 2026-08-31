'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password field with an accessible show/hide toggle.
 * The value is never persisted and visibility resets when the component unmounts.
 */
export default function PasswordInput({ style, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative', marginBottom: style?.marginBottom ?? 10 }}>
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        style={{ ...style, marginBottom: 0, paddingRight: 42 }}
      />
      <button
        type="button"
        onClick={() => setVisible(current => !current)}
        aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
        title={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
          border: 0,
          background: 'transparent',
          color: 'var(--muted)',
          cursor: 'pointer',
        }}
      >
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </div>
  );
}
