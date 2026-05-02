import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User as FirebaseUser,
} from "firebase/auth";
import { authAPI } from "@/services/api";

export type UserRole = "student" | "instructor" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  preferredCategories?: string[];
  completedCourseIds?: string[];
  targetJobRoleId?: string;
}

const TOKEN_KEY = "lms_token";
const REMEMBER_KEY = "lms_remember";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string; user?: User }>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; message?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
  loading: boolean;
  useFirebaseAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "teachsmart_user";

const getStorage = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) === "1" ? localStorage : sessionStorage;
  } catch {
    return localStorage;
  }
};

const loadUser = (): User | null => {
  try {
    const storage = getStorage();
    let stored = storage.getItem(STORAGE_KEY);
    if (!stored && storage === sessionStorage) stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const parseIds = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') try { return JSON.parse(v).map(String); } catch { return []; }
  return [];
};

const toUser = (u: any): User => ({
  id: String(u.id),
  name: u.name,
  email: u.email,
  role: u.role,
  avatar: u.avatar,
  preferredCategories: Array.isArray(u.preferred_categories) ? u.preferred_categories : parseIds(u.preferred_categories),
  completedCourseIds: parseIds(u.completed_course_ids),
  targetJobRoleId: u.target_job_role_id != null ? String(u.target_job_role_id) : undefined,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => loadUser());
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [authLoading, setAuthLoading] = useState(false);
  const firebaseSyncPromiseRef = useRef<Promise<User | null> | null>(null);
  const lastSyncedFirebaseUidRef = useRef<string | null>(null);
  const lastFirebaseSyncErrorRef = useRef<string | null>(null);
  const pendingFirebaseSyncOverridesRef = useRef<{
    email: string;
    remember?: boolean;
    name?: string;
    password?: string;
    createdAt: number;
  } | null>(null);

  const setAuthStorage = (token: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, "1");
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      localStorage.setItem(REMEMBER_KEY, "0");
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  const syncFirebaseUserToBackend = async (
    firebaseUser: FirebaseUser,
    rememberOverride?: boolean,
    nameOverride?: string,
    passwordOverride?: string
  ): Promise<User | null> => {
    lastFirebaseSyncErrorRef.current = null;
    if (firebaseSyncPromiseRef.current) return firebaseSyncPromiseRef.current;
    if (lastSyncedFirebaseUidRef.current === firebaseUser.uid && user) return user;

    const normalizedEmail = (firebaseUser.email || "").trim().toLowerCase();
    const pending = pendingFirebaseSyncOverridesRef.current;
    const pendingIsFresh =
      !!pending &&
      pending.email === normalizedEmail &&
      Date.now() - pending.createdAt < 2 * 60 * 1000;
    if (pending && !pendingIsFresh) pendingFirebaseSyncOverridesRef.current = null;

    const promise = (async (): Promise<User | null> => {
      try {
        const idToken = await firebaseUser.getIdToken();
        const nameForBackend =
          nameOverride || (pendingIsFresh ? pending?.name : undefined) || firebaseUser.displayName || undefined;
        const passwordForBackend = passwordOverride || (pendingIsFresh ? pending?.password : undefined);
        const res = await authAPI.firebaseToken(idToken, nameForBackend, passwordForBackend);
        const data = res?.data !== undefined ? res.data : res;
        if (data?.token && data?.user) {
          const remember =
            rememberOverride ?? (pendingIsFresh ? pending?.remember : undefined) ?? (localStorage.getItem(REMEMBER_KEY) !== "0");
          setAuthStorage(data.token, remember);
          const userData = toUser(data.user);
          lastSyncedFirebaseUidRef.current = firebaseUser.uid;
          setUser(userData);
          return userData;
        }
        lastFirebaseSyncErrorRef.current = 'Login failed';
        setUser(null);
        return null;
      } catch (err: any) {
        lastFirebaseSyncErrorRef.current = err?.message || 'Login failed';
        setUser(null);
        return null;
      } finally {
        firebaseSyncPromiseRef.current = null;
        if (pendingIsFresh) pendingFirebaseSyncOverridesRef.current = null;
      }
    })();

    firebaseSyncPromiseRef.current = promise;
    return promise;
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await syncFirebaseUserToBackend(firebaseUser);
      } else {
        // Only clear the session if no backend JWT token is present.
        // If a JWT token exists the user authenticated via the backend directly
        // (not Firebase), so Firebase firing null should not log them out.
        const hasJwt =
          localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
        if (!hasJwt) {
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(STORAGE_KEY);
        }
        lastSyncedFirebaseUidRef.current = null;
        pendingFirebaseSyncOverridesRef.current = null;
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> => {
    setAuthLoading(true);
    try {
      if (!currentPassword || !newPassword) {
        return { success: false, message: "Current and new password are required." };
      }
      if (newPassword.length < 6) {
        return { success: false, message: "Password must be at least 6 characters long." };
      }
      if (currentPassword === newPassword) {
        return { success: false, message: "New password must be different from current password." };
      }

      // If Firebase auth is enabled, update Firebase password first (login uses Firebase credentials).
      if (isFirebaseConfigured && auth) {
        const fbUser = auth.currentUser;
        const fbEmail = fbUser?.email;
        if (!fbUser || !fbEmail) {
          // Some sessions (like admin dev login) may not have a Firebase user loaded.
          // In that case, update the backend password instead.
          await authAPI.changePassword(currentPassword, newPassword);
          return { success: true };
        }

        const credential = EmailAuthProvider.credential(fbEmail, currentPassword);
        await reauthenticateWithCredential(fbUser, credential);
        await updatePassword(fbUser, newPassword);

        // Best-effort sync to backend password column (if backend uses it for any flow).
        try {
          await authAPI.changePassword(currentPassword, newPassword);
        } catch {
          // Ignore backend mismatch for Firebase-only accounts (login will still work).
        }

        return { success: true };
      }

      // Fallback: update password in backend for DB/password accounts.
      await authAPI.changePassword(currentPassword, newPassword);
      return { success: true };
    } catch (error: any) {
      const msg = error?.message || "Password update failed.";
      return { success: false, message: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const storage = getStorage();
    if (user) {
      storage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    };
    window.addEventListener('auth:sessionExpired', handleSessionExpired);
    return () => window.removeEventListener('auth:sessionExpired', handleSessionExpired);
  }, []);

  const API_URL = (() => {
    const raw = import.meta.env.VITE_API_URL?.trim();
    if (!raw) return import.meta.env.DEV ? "/api" : "/api";
    const base = raw.replace(/\/$/, "");
    if (base.endsWith("/api")) return base;
    // If it's an origin like "http://localhost:3001", append "/api"
    try {
      const parsed = new URL(base.includes("://") ? base : `http://${base}`);
      if (parsed.pathname && parsed.pathname !== "/") return base;
    } catch {
      // ignore
    }
    return `${base}/api`;
  })();

  const login = async (email: string, password: string, rememberMe = true): Promise<{ success: boolean; message?: string; user?: User }> => {
    setAuthLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success && data.data) {
        setAuthStorage(data.data.token, rememberMe);
        const userData = toUser(data.data.user);
        setUser(userData);
        return { success: true, user: userData };
      }

      // If backend says this user is Firebase-only, fallback to Firebase auth.
      const msg = (data?.message || "").toString();
      if (isFirebaseConfigured && auth && msg.toLowerCase().includes("firebase")) {
        console.log('Attempting Firebase login fallback for:', email);
        pendingFirebaseSyncOverridesRef.current = {
          email: email.trim().toLowerCase(),
          remember: rememberMe,
          password,
          createdAt: Date.now(),
        };
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const synced = await syncFirebaseUserToBackend(cred.user, rememberMe, undefined, password);
        if (synced) return { success: true, user: synced };
        return { success: false, message: lastFirebaseSyncErrorRef.current || "Login failed" };
      }

      console.warn('Login failed:', { status: response.status, data });
      return { success: false, message: data.message || "Invalid credentials" };
    } catch (error: any) {
      const code = error?.code || '';
      const msg = error?.message || code || 'Login failed. Please try again.';

      if (typeof msg === 'string') {
        if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
          return { success: false, message: 'Unauthorized Firebase domain. In Firebase Console → Authentication → Settings, add this site’s domain under Authorized domains.' };
        }
        if (code === 'auth/operation-not-allowed' || msg.includes('auth/operation-not-allowed')) {
          return { success: false, message: 'Firebase Email/Password sign-in is disabled. Enable it in Firebase Console → Authentication.' };
        }
        if (code === 'auth/too-many-requests' || msg.includes('auth/too-many-requests')) {
          return { success: false, message: 'Too many attempts. Please wait and try again later.' };
        }
        if (
          msg.includes('auth/') ||
          msg.includes('user-not-found') ||
          msg.includes('wrong-password') ||
          msg.includes('invalid-credential') ||
          msg.includes('invalid-login-credentials')
        ) {
          return { success: false, message: 'Invalid email or password' };
        }
      }

      return { success: false, message: typeof msg === 'string' ? msg : 'Login failed. Please try again.' };
    } finally {
      pendingFirebaseSyncOverridesRef.current = null;
      setAuthLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, confirmPassword: string): Promise<{ success: boolean; message?: string; user?: User }> => {
    setAuthLoading(true);
    try {
      if (password !== confirmPassword) return { success: false, message: 'Passwords do not match' };
      if (password.length < 6) return { success: false, message: 'Password must be at least 6 characters' };

      const response = await authAPI.register(name, email, password, confirmPassword);
      const data = response?.data ?? response;
      if (response?.success && data?.token && data?.user) {
        setAuthStorage(data.token, true);
        const userData = toUser(data.user);
        setUser(userData);
        return { success: true, user: userData };
      }
      return { success: false, message: response?.message || 'Registration failed' };
    } catch (error: any) {
      const msg = error?.message || 'Registration failed. Please try again.';
      if (typeof msg === 'string') {
        if (msg.includes('auth/email-already-in-use') || msg.includes('User with this email already exists')) {
          return { success: false, message: 'An account with this email already exists' };
        }
        if (msg.includes('auth/unauthorized-domain') || msg.includes('unauthorized-domain')) {
          return { success: false, message: 'Unauthorized Firebase domain. Add your site to Firebase Auth authorized domains.' };
        }
      }
      return { success: false, message: msg };
    } finally {
      pendingFirebaseSyncOverridesRef.current = null;
      setAuthLoading(false);
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; message?: string }> => {
    setAuthLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        await firebaseSendPasswordResetEmail(auth, email.trim());
        return { success: true, message: 'Check your email for the reset link.' };
      }
      return { success: false, message: 'Firebase authentication is not configured.' };
    } catch (error: any) {
      const msg = error?.message || 'Failed to send reset email.';
      if (typeof msg === 'string' && msg.includes('auth/user-not-found')) {
        return { success: true };
      }
      return { success: false, message: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    if (auth) firebaseSignOut(auth).catch(() => {});
  };

  const updateUser = React.useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      try { getStorage().setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      sendPasswordResetEmail,
      changePassword,
      logout,
      updateUser,
      isAuthenticated: !!user,
      loading: loading || authLoading,
      useFirebaseAuth: isFirebaseConfigured,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
