'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, doc, getDoc, collectionGroup, updateDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { stripHtml } from '@/lib/searchUtils';
import { NotebookPen, CornerDownRight } from 'lucide-react';
import PasswordInput from '@/components/PasswordInput';

const COMMENT_PREVIEW_LEN = 60;

export default function MyPage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [myPosts, setMyPosts] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState('');
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    setNickname(profile?.nickname || '');
  }, [profile?.nickname]);

  useEffect(() => {
    if (!user) return;
    loadMyData();
  }, [user]);

  async function loadMyData() {
    setLoading(true);
    // 내 게시글
    const postSnap = await getDocs(query(collection(db, 'board'), where('uid', '==', user.uid), orderBy('createdAt', 'desc')));
    setMyPosts(postSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    // 내 댓글 (collectionGroup)
    try {
      const commentSnap = await getDocs(query(collectionGroup(db, 'comments'), where('uid', '==', user.uid), orderBy('createdAt', 'desc')));
      const comments = await Promise.all(commentSnap.docs.map(async d => {
        const parentRef = d.ref.parent.parent; // e.g. board/{id}, reviews/{id}, featuredPassages/{id}
        const parentCol = parentRef.parent.id; // 'board' | 'reviews' | 'featuredPassages'
        const postId = parentRef.id;
        let postTitle = '';
        try {
          const postSnap = await getDoc(parentRef);
          if (postSnap.exists()) postTitle = postSnap.data().title || '';
        } catch (e) { console.error('내 댓글 부모글 로딩 실패', e); }
        return { id: d.id, postId, postTitle, parentCol, ...d.data() };
      }));
      setMyComments(comments);
    } catch (e) {
      console.error('내 댓글 로딩 실패', e);
    }

    setLoading(false);
  }

  function commentLink(c) {
    if (c.parentCol === 'reviews') return `/reviews#${c.postId}`;
    if (c.parentCol === 'featuredPassages') return `/featured/${c.postId}`;
    return `/board/${c.postId}`;
  }

  const formatDate = (ts) => ts?.toDate ? `${ts.toDate().getMonth()+1}/${ts.toDate().getDate()}` : '';

  async function saveNickname(e) {
    e.preventDefault();
    const nextNickname = nickname.trim();
    setNicknameMessage('');
    if (!nextNickname) return setNicknameMessage('닉네임을 입력해주세요.');
    if (nextNickname.length > 12) return setNicknameMessage('닉네임은 12자 이하로 입력해주세요.');
    if (nextNickname === profile?.nickname) return setNicknameMessage('변경된 내용이 없습니다.');
    setNicknameSaving(true);
    try {
      const duplicate = await getDocs(query(collection(db, 'users'), where('nickname', '==', nextNickname)));
      if (duplicate.docs.some((item) => item.id !== user.uid)) {
        setNicknameMessage('이미 사용 중인 닉네임이에요.');
        return;
      }
      await updateDoc(doc(db, 'users', user.uid), { nickname: nextNickname });
      await refreshProfile(user.uid);
      setNicknameMessage('닉네임이 변경되었습니다.');
    } catch (error) {
      console.error('닉네임 변경 실패', error);
      setNicknameMessage('닉네임 변경에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setNicknameSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPasswordMessage('');
    if (!passwords.current || !passwords.next || !passwords.confirm) return setPasswordMessage('모든 비밀번호를 입력해주세요.');
    if (passwords.next.length < 6) return setPasswordMessage('새 비밀번호는 6자 이상이어야 합니다.');
    if (passwords.next !== passwords.confirm) return setPasswordMessage('새 비밀번호가 일치하지 않습니다.');
    if (!user?.email) return setPasswordMessage('이메일 로그인 계정만 비밀번호를 변경할 수 있습니다.');
    setPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwords.current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordMessage('비밀번호가 변경되었습니다.');
    } catch (error) {
      console.error('비밀번호 변경 실패', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') setPasswordMessage('현재 비밀번호가 올바르지 않습니다.');
      else if (error.code === 'auth/weak-password') setPasswordMessage('새 비밀번호가 너무 약합니다.');
      else if (error.code === 'auth/requires-recent-login') setPasswordMessage('보안을 위해 다시 로그인한 후 시도해주세요.');
      else setPasswordMessage('비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setPasswordSaving(false);
    }
  }

  function PasswordField({ name, label }) {
    return (
      <label style={{ display: 'block', marginBottom: 10 }}>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 5 }}>{label}</span>
        <PasswordInput
          value={passwords[name]}
          onChange={(e) => setPasswords((prev) => ({ ...prev, [name]: e.target.value }))}
          autoComplete={name === 'current' ? 'current-password' : 'new-password'}
          style={{ width: '100%', padding: '10px 11px', border: '1px solid var(--line)', borderRadius: 7, background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
        />
      </label>
    );
  }

  if (!user) return (
    <div>
      <div className="section-title">마이페이지</div>
      <div className="card" style={{ padding: 30, textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', marginBottom: 12 }}>로그인이 필요해요.</p>
        <button onClick={() => router.push('/login')} className="btn-primary" style={{ maxWidth: 200, margin: '0 auto' }}>로그인 / 가입</button>
      </div>
    </div>
  );

  return (
    <div>
      {/* 프로필 */}
      <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
          {profile?.nickname?.slice(0, 1)}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{profile?.nickname}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user.email}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>계정 설정</div>
        <form onSubmit={saveNickname} style={{ marginBottom: 22 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 5 }}>닉네임</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={12} style={{ flex: '1 1 auto', minWidth: 0, width: 0, padding: '10px 11px', border: '1px solid var(--line)', borderRadius: 7, background: 'var(--surface)', color: 'var(--text)' }} />
            <button type="submit" disabled={nicknameSaving} className="btn-primary" style={{ flex: '0 0 auto', width: 'auto', maxWidth: 'none', whiteSpace: 'nowrap' }}>{nicknameSaving ? '저장 중…' : '닉네임 저장'}</button>
          </div>
          {nicknameMessage && <div style={{ fontSize: 12, color: nicknameMessage.includes('변경되었습니다') ? 'var(--accent)' : 'var(--danger, #c44)', marginTop: 7 }}>{nicknameMessage}</div>}
        </form>
        <form onSubmit={changePassword}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>비밀번호 변경</div>
          <PasswordField name="current" label="현재 비밀번호" />
          <PasswordField name="next" label="새 비밀번호" />
          <PasswordField name="confirm" label="새 비밀번호 확인" />
          <button type="submit" disabled={passwordSaving} className="btn-primary">{passwordSaving ? '변경 중…' : '비밀번호 변경'}</button>
          {passwordMessage && <div style={{ fontSize: 12, color: passwordMessage.includes('변경되었습니다') ? 'var(--accent)' : 'var(--danger, #c44)', marginTop: 7 }}>{passwordMessage}</div>}
        </form>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', border: '1.5px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
        {[['posts', `내 게시글 (${myPosts.length})`], ['comments', `내 댓글 (${myComments.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ flex: 1, padding: '10px', border: 'none', background: tab === key ? 'var(--accent)' : 'none', color: tab === key ? '#fff' : 'var(--muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty-msg">로딩 중…</p>
      ) : tab === 'posts' ? (
        myPosts.length === 0 ? (
          <p className="empty-msg">작성한 게시글이 없어요.</p>
        ) : (
          myPosts.map(p => (
            <Link key={p.id} href={`/board/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div className="post-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {p.prefix && <span style={{ fontSize: 11, background: 'var(--accent)', color: '#fff', padding: '1px 7px', borderRadius: 10 }}>{p.prefix}</span>}
                  <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{p.title}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(p.createdAt)}</div>
              </div>
            </Link>
          ))
        )
      ) : (
        myComments.length === 0 ? (
          <p className="empty-msg">작성한 댓글이 없어요.</p>
        ) : (
          myComments.map(c => (
            <Link key={c.id} href={commentLink(c)} style={{ textDecoration: 'none', display: 'block' }}>
              <div className="post-card">
                <div style={{ fontSize: 11, color: 'var(--accent2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <NotebookPen size={11} /> {c.postTitle || '게시글'}
                  {c.parentId && <span style={{ marginLeft: 6, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><CornerDownRight size={11} /> 대댓글</span>}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {stripHtml(c.content).slice(0, COMMENT_PREVIEW_LEN)}{stripHtml(c.content).length > COMMENT_PREVIEW_LEN ? '…' : ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(c.createdAt)}</div>
              </div>
            </Link>
          ))
        )
      )}
    </div>
  );
}
