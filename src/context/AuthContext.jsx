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

// ── Priority order for primary role (highest-privilege first) ─────────────────
const ROLE_PRIORITY = ['admin', 'desh_manager', 'desh_reviewer', 'desh_assessor', 'reviewer', 'owner', 'user'];

export const getPrimaryRole = (dbUser) => {
  const roles = Array.isArray(dbUser?.roles) ? dbUser.roles : [dbUser?.role].filter(Boolean);
  for (const p of ROLE_PRIORITY) {
    if (roles.includes(p)) return p;
  }
  return roles[0] || 'user';
};

export const userHasRole = (dbUser, ...rolesToCheck) => {
  const roles = Array.isArray(dbUser?.roles) ? dbUser.roles : [dbUser?.role].filter(Boolean);
  return rolesToCheck.some(r => roles.includes(r));
};

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
  const [user,    setUser]    = useState(null);   // Firebase user
  const [dbUser,  setDbUser]  = useState(null);   // MongoDB user (has .roles array)
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

  // Call this after an admin changes the current user's roles so it takes effect immediately
  const refreshDbUser = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    try {
      await firebaseUser.getIdToken(true);
      const mongoUser = await fetchDbUser(firebaseUser);
      setDbUser(mongoUser);
    } catch { /* silent */ }
  };

  // Call this immediately after login to get the primary role for navigation
  const getRoleFromDb = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return 'user';
    try {
      const mongoUser = await fetchDbUser(firebaseUser);
      setDbUser(mongoUser);
      return getPrimaryRole(mongoUser);
    } catch {
      return 'user';
    }
  };

  return (
    <AuthContext.Provider value={{
      user, dbUser, loading,
      login, loginWithGoogle, register, logout, refreshDbUser, getRoleFromDb,
      getPrimaryRole: () => getPrimaryRole(dbUser),
      userHasRole:    (...roles) => userHasRole(dbUser, ...roles),
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
