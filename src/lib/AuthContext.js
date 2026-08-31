'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

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

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, anonymousUser, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
