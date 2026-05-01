import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { authAPI } from "@/services/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get("oobCode") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isFirebase = isFirebaseConfigured && oobCode;

  useEffect(() => {
    if (!oobCode) setError("Invalid or missing reset link. Please request a new one from the forgot password page.");
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSyncNote(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      if (isFirebase && auth) {
        // Get the account email for this reset code (needed to sync DB password immediately)
        const email = await verifyPasswordResetCode(auth, oobCode);
        await confirmPasswordReset(auth, oobCode, password);

        // Immediately sync the new password hash to our DB (best effort).
        // This keeps MySQL `users.password` aligned with Firebase after a reset.
        try {
          const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "";
          if (!apiKey) throw new Error("Firebase API key is missing.");

          // Use Firebase REST login to get an ID token without changing Firebase Auth state in the app.
          // This avoids race conditions with AuthContext's onAuthStateChanged sync.
          const fbRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password, returnSecureToken: true }),
            }
          );
          const fbJson = await fbRes.json().catch(() => ({} as any));
          if (!fbRes.ok) {
            const msg = fbJson?.error?.message || fbJson?.message || `HTTP ${fbRes.status}`;
            throw new Error(msg);
          }
          const idToken = fbJson?.idToken;
          if (!idToken || typeof idToken !== "string") throw new Error("Failed to obtain Firebase ID token.");
          await authAPI.firebaseToken(idToken, undefined, password);
        } catch (syncErr: any) {
          console.warn("Password reset succeeded but DB sync failed:", syncErr?.message || syncErr);
          setSyncNote("Password reset succeeded, but server password sync failed. Please login once to complete the sync.");
        }

        setSuccess(true);
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card rounded-xl border border-border shadow-elevated max-w-md w-full p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Password Reset Successful!</h2>
          <p className="text-muted-foreground mb-6">You can now log in with your new password.</p>
          {syncNote && (
            <p className="text-xs text-muted-foreground mb-4">{syncNote}</p>
          )}
          <Button onClick={() => navigate("/login")} className="w-full">
            Go to Login
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">LMS Pro</span>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">Reset your password</h1>
          <p className="text-muted-foreground mb-8">Enter your new password below</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {isFirebase ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 h-11 bg-card"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 h-11 bg-card"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">Request a new reset link from the forgot password page.</p>
              <Button asChild className="w-full">
                <Link to="/forgot-password">Forgot Password</Link>
              </Button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-accent hover:underline font-medium">
              Back to Login
            </Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative z-10 text-center max-w-lg"
        >
          <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-primary-foreground/10 backdrop-blur flex items-center justify-center">
            <Lock className="w-14 h-14 text-primary-foreground" />
          </div>
          <h2 className="text-4xl font-bold text-primary-foreground mb-4">Secure Your Account</h2>
          <p className="text-lg text-primary-foreground/80">
            Choose a strong password to keep your learning progress safe.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
