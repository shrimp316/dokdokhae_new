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
      await setDoc(doc(db, 'users', cred.user.uid), {
        nickname: nickname.trim(), email, createdAt: serverTimestamp()
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

  const inputStyle = { marginBottom: 10 };

  return (
    <div style={{ maxWidth: 360, margin: '40px auto' }}>
      <div className="card" style={{ padding: '32px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'var(--accent)', textAlign: 'center', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Library size={22} /> 독독하다
        </h1>

        {/* 탭 */}
        <div style={{ display: 'flex', border: '1.5px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setMsg(''); }}
              style={{ flex: 1, padding: 10, border: 'none', background: mode === m ? 'var(--accent)' : 'none', color: mode === m ? '#fff' : 'var(--muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              {m === 'login' ? '로그인' : '가입'}
            </button>
          ))}
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{error}</p>}
        {msg && <p style={{ color: 'var(--accent2)', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{msg}</p>}

        {mode === 'login' ? (
          <>
            <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <PasswordInput placeholder="비밀번호" value={pw} onChange={e => setPw(e.target.value)} style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <button className="btn-primary" onClick={handleLogin} disabled={loading} style={{ marginBottom: 10 }}>
              {loading ? '로그인 중…' : '로그인'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button onClick={handleReset} style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                비밀번호를 잊으셨나요?
              </button>
            </div>
          </>
        ) : (
          <>
            <input type="text" placeholder="닉네임 (변경 불가, 최대 12자)" value={nickname} onChange={e => setNickname(e.target.value)} maxLength={12} style={inputStyle} />
            <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            <PasswordInput placeholder="비밀번호 (6자 이상)" value={pw} onChange={e => setPw(e.target.value)} style={inputStyle} onKeyDown={e => e.key === 'Enter' && handleSignup()} />
            <button className="btn-primary" onClick={handleSignup} disabled={loading}>
              {loading ? '가입 중…' : '가입하기'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
