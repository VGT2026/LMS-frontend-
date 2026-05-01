import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, LayoutDashboard, Users, BookOpen, GraduationCap, Shield, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authAPI } from "@/services/api";
import type { UserRole } from "@/contexts/AuthContext";

type NotifKey = "email" | "push" | "courseUpdates" | "assignmentReminders" | "discussionReplies";

const roleMeta: Record<
  UserRole,
  { label: string; description: string; icon: typeof Shield; badgeClass: string }
> = {
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
};

function getNotifLabels(role: UserRole | undefined): { key: NotifKey; label: string }[] {
  if (role === "admin") {
    return [
      { key: "email", label: "Email notifications" },
      { key: "push", label: "Push notifications" },
      { key: "courseUpdates", label: "Course & catalog updates" },
      { key: "assignmentReminders", label: "Pending course approvals" },
      { key: "discussionReplies", label: "Support tickets & alerts" },
    ];
  }
  if (role === "instructor") {
    return [
      { key: "email", label: "Email notifications" },
      { key: "push", label: "Push notifications" },
      { key: "courseUpdates", label: "Course & enrollment updates" },
      { key: "assignmentReminders", label: "Submissions & grading reminders" },
      { key: "discussionReplies", label: "Discussions & messages" },
    ];
  }
  return [
    { key: "email", label: "Email notifications" },
    { key: "push", label: "Push notifications" },
    { key: "courseUpdates", label: "Course updates" },
    { key: "assignmentReminders", label: "Assignment reminders" },
    { key: "discussionReplies", label: "Discussion replies" },
  ];
}

const Settings = () => {
  const { user, updateUser, changePassword } = useAuth();
  const { toast } = useToast();
  const role = user?.role;

  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [language, setLanguage] = useState("en");
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>({
    email: true,
    push: true,
    courseUpdates: true,
    assignmentReminders: true,
    discussionReplies: true,
  });

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  const applyProfile = useCallback((u: { name?: string; email?: string }) => {
    if (u.name != null) setName(u.name);
    if (u.email != null) setEmail(u.email);
  }, []);

  // Sync when auth user loads or changes
  useEffect(() => {
    if (user) {
      applyProfile({ name: user.name, email: user.email });
    }
  }, [user, applyProfile]);

  // Load latest profile from API (fixes empty fields for admin/instructor after navigation)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setProfileLoading(true);
        const res = await authAPI.getProfile();
        const data = res?.data ?? res;
        if (!cancelled && data && typeof data === "object") {
          applyProfile({ name: data.name, email: data.email });
          updateUser({
            name: data.name,
            email: data.email,
            preferredCategories: Array.isArray(data.preferred_categories)
              ? data.preferred_categories
              : undefined,
          });
        }
      } catch {
        if (!cancelled && user) applyProfile({ name: user.name, email: user.email });
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyProfile, updateUser, user?.id]);

  const notifItems = useMemo(() => getNotifLabels(role), [role]);
  const meta = role ? roleMeta[role] : roleMeta.student;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast({ title: "Invalid name", description: "Name must be at least 2 characters.", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile({ name: trimmed });
      const data = res?.data ?? res;
      if (data?.name) {
        updateUser({ name: data.name });
        setName(data.name);
      }
      setSaved(true);
      toast({ title: "Settings saved", description: "Your profile has been updated." });
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save profile.";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast({ title: "Missing fields", description: "Please fill in all password fields.", variant: "destructive" });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }
    if (newPwd.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await changePassword(currentPwd, newPwd);
      if (!res.success) {
        toast({ title: "Password update failed", description: res.message || "Could not update password.", variant: "destructive" });
        return;
      }
      toast({ title: "Password updated", description: "Your password has been changed." });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not update password.";
      toast({ title: "Password update failed", description: msg, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleNotif = (key: NotifKey) => {
    setNotifs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      toast({
        title: next[key] ? "Enabled" : "Disabled",
        description: `${key.replace(/([A-Z])/g, " $1").trim()} notifications ${next[key] ? "on" : "off"}.`,
      });
      return next;
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badgeClass}`}>
            <meta.icon className="w-3.5 h-3.5" />
            {meta.label}
          </span>
          <p className="text-sm text-muted-foreground w-full sm:w-auto">{meta.description}</p>
        </div>
      </div>

      {/* Quick links — admin & instructor */}
      {role === "admin" && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin" className="gap-1.5">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/users" className="gap-1.5">
              <Users className="w-4 h-4" /> Users
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/courses" className="gap-1.5">
              <BookOpen className="w-4 h-4" /> Courses
            </Link>
          </Button>
        </div>
      )}
      {role === "instructor" && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/instructor" className="gap-1.5">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/instructor/courses" className="gap-1.5">
              <BookOpen className="w-4 h-4" /> My courses
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/instructor/students" className="gap-1.5">
              <Users className="w-4 h-4" /> Students
            </Link>
          </Button>
        </div>
      )}

      {/* Profile */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-card space-y-4">
        <h2 className="font-semibold text-foreground">Profile</h2>
        {profileLoading ? (
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} readOnly className="bg-muted/50 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Email is tied to your login. Contact support to change it.</p>
            </div>
          </div>
        )}
        <Button onClick={handleSave} disabled={savingProfile || profileLoading} className="gap-1.5">
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4" /> Saved!
            </>
          ) : savingProfile ? (
            "Saving…"
          ) : (
            "Save changes"
          )}
        </Button>
      </div>

      {/* Password */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-card space-y-4">
        <h2 className="font-semibold text-foreground">Change password</h2>
        <p className="text-sm text-muted-foreground">
          {role === "admin" || role === "instructor"
            ? "Use your current LMS password. If you sign in only with Google or another provider, use Forgot password on the login page."
            : "Use your current password to set a new one."}
        </p>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Current password</Label>
            <div className="relative">
              <Input
                type={showCurrentPwd ? "text" : "password"}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showCurrentPwd ? "Hide current password" : "Show current password"}
                onClick={() => setShowCurrentPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <div className="relative">
              <Input
                type={showNewPwd ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showNewPwd ? "Hide new password" : "Show new password"}
                onClick={() => setShowNewPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Confirm new password</Label>
            <div className="relative">
              <Input
                type={showConfirmPwd ? "text" : "password"}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                autoComplete="new-password"
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showConfirmPwd ? "Hide confirm password" : "Show confirm password"}
                onClick={() => setShowConfirmPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={handlePasswordUpdate} disabled={savingPassword}>
          {savingPassword ? "Updating…" : "Update password"}
        </Button>
      </div>

      {/* Notifications */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-card space-y-4">
        <h2 className="font-semibold text-foreground">Notifications</h2>
        <p className="text-xs text-muted-foreground">
          Preferences are stored on this device for now. Email delivery uses your account settings.
        </p>
        {notifItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-1">
            <span className="text-sm text-foreground">{item.label}</span>
            <Switch checked={notifs[item.key]} onCheckedChange={() => toggleNotif(item.key)} />
          </div>
        ))}
      </div>

      {/* Language */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-card space-y-4">
        <h2 className="font-semibold text-foreground">Preferences</h2>
        <div className="space-y-2">
          <Label>Language</Label>
          <Select
            value={language}
            onValueChange={(v) => {
              setLanguage(v);
              toast({
                title: "Language updated",
                description: `Language set to ${v === "en" ? "English" : v === "es" ? "Spanish" : v === "fr" ? "French" : "German"}.`,
              });
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;
