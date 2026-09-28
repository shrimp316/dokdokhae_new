'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './PasswordInput.module.css';

// 모바일에서 비밀번호 오타를 확인할 수 있게 보기 토글을 둔다. 보기 상태는 저장하지 않아 다시 열면 항상 가려져 있다.
export default function PasswordInput({ style, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.wrap} style={{ marginBottom: style?.marginBottom ?? 10 }}>
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
        className={styles.toggleBtn}
      >
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </div>
  );
}
