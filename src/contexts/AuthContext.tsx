import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => boolean;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "teachsmart_user";

const mockUsers: Record<UserRole, User> = {
  student: {
    id: "1",
    name: "Alex Johnson",
    email: "alex@lmspro.com",
    role: "student",
    preferredCategories: ["Development", "Cloud"],
    completedCourseIds: ["1"], // Advanced React Patterns
    targetJobRoleId: "jr1" // Full Stack Developer
  },
  instructor: { id: "2", name: "Dr. Sarah Chen", email: "sarah@lmspro.com", role: "instructor" },
  admin: { id: "3", name: "Admin User", email: "admin@lmspro.com", role: "admin" },
};

const loadUser = (): User | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(loadUser);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = (email: string, _password: string, role: UserRole): boolean => {
    if (email && _password) {
      const u = { ...mockUsers[role], email };
      setUser(u);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
