'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Library } from 'lucide-react';
import PasswordInput from '@/components/PasswordInput';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(''); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      router.push('/');
    } catch {
      setError('이메일 또는 비밀번호가 틀렸어요.');
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    setError(''); setLoading(true);
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); setLoading(false); return; }
    if (pw.length < 6) { setError('비밀번호는 6자 이상이어야 해요.'); setLoading(false); return; }
    try {
      const nicknameSnap = await getDocs(query(collection(db, 'users'), where('nickname', '==', nickname.trim())));
      if (!nicknameSnap.empty) { setError('이미 사용 중인 닉네임이에요.'); setLoading(false); return; }
      const cred = await createUserWithEmailAndPassword(auth, email, pw);
      // users 문서는 누구나 읽을 수 있으므로 이메일 같은 개인정보는 저장하지 않는다.
      // 이메일은 Firebase Auth(user.email)에서 가져온다.
      await setDoc(doc(db, 'users', cred.user.uid), {
        nickname: nickname.trim(), createdAt: serverTimestamp()
      });
      router.push('/');
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') setError('이미 가입된 이메일이에요.');
      else setError('가입 실패: ' + e.message);
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!email) { setError('이메일을 먼저 입력해주세요.'); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg('비밀번호 재설정 메일을 보냈어요.');
    } catch { setError('메일 발송 실패. 이메일을 확인해주세요.'); }
  };

  return (
    <div className={styles.wrap}>
      <div className={`card ${styles.card}`}>
        <h1 className={styles.title}>
          <Library size={22} /> 독독하다
        </h1>

        <div className={styles.tabBar}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setMsg(''); }}
              className={styles.tabBtn} data-active={mode === m || undefined}>
              {m === 'login' ? '로그인' : '가입'}
            </button>
          ))}
        </div>

        {error && <p className={styles.errorText}>{error}</p>}
        {msg && <p className={styles.msgText}>{msg}</p>}

        {mode === 'login' ? (
          <>
            <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} className={styles.field} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <PasswordInput placeholder="비밀번호" value={pw} onChange={e => setPw(e.target.value)} className={styles.field} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <button className={`btn-primary ${styles.loginBtn}`} onClick={handleLogin} disabled={loading}>
              {loading ? '로그인 중…' : '로그인'}
            </button>
            <div className={styles.resetWrap}>
              <button onClick={handleReset} className={styles.resetBtn}>
                비밀번호를 잊으셨나요?
              </button>
            </div>
          </>
        ) : (
          <>
            <input type="text" placeholder="닉네임 (변경 불가, 최대 12자)" value={nickname} onChange={e => setNickname(e.target.value)} maxLength={12} className={styles.field} />
            <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} className={styles.field} />
            <PasswordInput placeholder="비밀번호 (6자 이상)" value={pw} onChange={e => setPw(e.target.value)} className={styles.field} onKeyDown={e => e.key === 'Enter' && handleSignup()} />
            <button className="btn-primary" onClick={handleSignup} disabled={loading}>
              {loading ? '가입 중…' : '가입하기'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
