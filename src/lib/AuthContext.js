'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { authenticatedFetch } from '@/lib/authenticatedFetch';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [anonymousUser, setAnonymousUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile edits (for example, from My Page) can refresh the cached profile
  // without requiring a full page reload.
  const refreshProfile = async (uid = auth.currentUser?.uid) => {
    if (!uid) {
      setProfile(null);
      return null;
    }
    const snap = await getDoc(doc(db, 'users', uid));
    const nextProfile = snap.exists() ? snap.data() : null;
    setProfile(nextProfile);
    return nextProfile;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u && u.isAnonymous) {
        // 익명 사용자는 user에서 분리 — 기존 회원 전용 페이지 회귀 방지
        setUser(null);
        setProfile(null);
        setAnonymousUser(u);
      } else {
        setAnonymousUser(null);
        setUser(u);
        if (u) {
          await refreshProfile(u.uid);
        } else {
          setProfile(null);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const logout = async () => {
    let tokenRemovalFailed = false;

    try {
      const response = await authenticatedFetch('/api/fcm-token', { method: 'DELETE' });
      if (!response.ok) throw new Error('FCM token removal failed');
    } catch (error) {
      tokenRemovalFailed = true;
      console.error('FCM token removal failed during logout', error);
    }

    await signOut(auth);

    if (tokenRemovalFailed) {
      alert('로그아웃되었지만 이 기기의 알림 해제에 실패했습니다. 브라우저 알림 권한을 해제해주세요.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, anonymousUser, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
