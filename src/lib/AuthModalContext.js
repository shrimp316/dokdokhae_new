'use client';
import { createContext, useContext, useState } from 'react';

const AuthModalContext = createContext(null);

export function AuthModalProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('login');

  const openModal = (m = 'login') => { setMode(m); setOpen(true); };
  const closeModal = () => setOpen(false);

  return (
    <AuthModalContext.Provider value={{ open, mode, openModal, closeModal }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export const useAuthModal = () => useContext(AuthModalContext);
