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

// ── Get the currently active role (persisted in DB, falls back to primary) ────
// This is the role that drives dashboard routing and sidebar rendering.
export const getActiveRole = (dbUser) => {
  if (!dbUser) return 'user';
  const roles = Array.isArray(dbUser.roles) ? dbUser.roles : ['user'];
  // If activeRole is set and still valid, use it; otherwise fall back to primary
  if (dbUser.activeRole && roles.includes(dbUser.activeRole)) {
    return dbUser.activeRole;
  }
  return getPrimaryRole(dbUser);
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
  const [dbUser,  setDbUser]  = useState(null);   // MongoDB user (has .roles array + .activeRole)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
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

  // ── Switch the user's active role ────────────────────────────────────────────
  // Calls the backend, validates ownership server-side, then refreshes dbUser.
  // Returns { success, user } or throws on error.
  const switchActiveRole = async (newRole) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('Not authenticated');

    const token = await firebaseUser.getIdToken();
    const res = await fetch(`${API_BASE}/users/change-active-role`, {
      method:  'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ activeRole: newRole }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to switch role');

    // Refresh local state from the updated DB doc
    setDbUser(data.user);
    return data;
  };

  // Call this immediately after login to get the primary role for navigation
  const getRoleFromDb = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return 'user';
    try {
      const mongoUser = await fetchDbUser(firebaseUser);
      setDbUser(mongoUser);
      return getActiveRole(mongoUser);
    } catch {
      return 'user';
    }
  };

  // Derived: the current active role string (reactive to dbUser changes)
  const activeRole = getActiveRole(dbUser);

  return (
    <AuthContext.Provider value={{
      user, dbUser, loading, activeRole,
      login, loginWithGoogle, register, logout, refreshDbUser, getRoleFromDb,
      switchActiveRole,
      getPrimaryRole: () => getPrimaryRole(dbUser),
      getActiveRole:  () => getActiveRole(dbUser),
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
