import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AuthContext = createContext(null);

async function fetchDbUser(firebaseUser) {
  const token = await firebaseUser.getIdToken();
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user || null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser]     = useState(null);   // Firebase user
  const [dbUser, setDbUser] = useState(null);   // MongoDB user (has .role)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const mongoUser = await fetchDbUser(firebaseUser);
          setDbUser(mongoUser);
        } catch {
          setDbUser(null);
        }
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const loginWithGoogle = () =>
    signInWithPopup(auth, googleProvider);

  const register = (email, password, displayName) =>
    createUserWithEmailAndPassword(auth, email, password).then((cred) => {
      updateProfile(cred.user, { displayName });
      return cred;
    });

  const logout = () => {
    setDbUser(null);
    return signOut(auth);
  };

  // Call this after an admin changes the current user's role so it takes effect
  const refreshDbUser = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    try {
      await firebaseUser.getIdToken(true);
      const mongoUser = await fetchDbUser(firebaseUser);
      setDbUser(mongoUser);
    } catch { /* silent */ }
  };

  // Call this immediately after login to get the role for navigation
  // Also updates the context state so no double-fetch problem
  const getRoleFromDb = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return 'user';
    try {
      const mongoUser = await fetchDbUser(firebaseUser);
      setDbUser(mongoUser);
      return mongoUser?.role || 'user';
    } catch {
      return 'user';
    }
  };

  return (
    <AuthContext.Provider value={{
      user, dbUser, loading,
      login, loginWithGoogle, register, logout, refreshDbUser, getRoleFromDb,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
