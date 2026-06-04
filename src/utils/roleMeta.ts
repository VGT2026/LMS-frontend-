import { GraduationCap, BookOpen, Shield } from "lucide-react";
import type { UserRole } from "@/contexts/AuthContext";

export type RoleMeta = {
  label: string;
  description: string;
  icon: typeof Shield;
  badgeClass: string;
};

export const ROLE_META: Record<UserRole, RoleMeta> = {
  student: {
    label: "Student",
    description: "Learning preferences, profile, and notifications for your courses.",
    icon: GraduationCap,
    badgeClass: "bg-primary/10 text-primary",
  },
  instructor: {
    label: "Instructor",
    description: "Teaching profile, password, and alerts for your classes and students.",
    icon: BookOpen,
    badgeClass: "bg-accent/10 text-accent",
  },
  admin: {
    label: "Administrator",
    description: "Platform account settings. User management stays under Admin → Users.",
    icon: Shield,
    badgeClass: "bg-warning/10 text-warning",
  },
  superadmin: {
    label: "Super Admin",
    description: "Platform-wide account settings. Manage tenants and admins from Super Admin.",
    icon: Shield,
    badgeClass: "bg-destructive/10 text-destructive",
  },
};

const FALLBACK: RoleMeta = ROLE_META.student;

/** Safe role badge metadata — never returns undefined (fixes superadmin Settings crash). */
export function getRoleMeta(role: string | undefined | null): RoleMeta {
  if (!role) return FALLBACK;
  const key = String(role).toLowerCase() as UserRole;
  return ROLE_META[key] ?? FALLBACK;
}
