import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, Eye, EyeOff, ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { motion } from "framer-motion";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleForgotPassword = () => {
    if (!resetEmail) return;
    setResetLoading(true);
    setTimeout(() => {
      setResetLoading(false);
      setResetSent(true);
    }, 1200);
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setResetEmail("");
    setResetSent(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const success = login(email, password, role);
      if (success) {
        navigate(role === "admin" ? "/admin" : role === "instructor" ? "/instructor" : "/dashboard");
      } else {
        setError("Invalid credentials");
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
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

          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground mb-8">Sign in to continue your learning journey</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="role" className="text-foreground font-medium">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="h-11 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10 bg-card"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</Label>
              </div>
              <button type="button" onClick={() => setForgotOpen(true)} className="text-sm text-accent hover:underline font-medium">Forgot password?</button>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-accent hover:underline font-medium">
              Sign up here
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Demo: Enter any email & password with your selected role
          </p>

          {/* Forgot Password Modal */}
          {forgotOpen && (
            <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card rounded-xl border border-border shadow-elevated max-w-sm w-full p-6">
                {resetSent ? (
                  <div className="text-center space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-success" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Check your email</h3>
                    <p className="text-sm text-muted-foreground">We've sent a password reset link to <span className="font-medium text-foreground">{resetEmail}</span></p>
                    <Button onClick={closeForgot} className="w-full">Back to Login</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button onClick={closeForgot} className="text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Reset your password</h3>
                    <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
                    <div className="space-y-2">
                      <Label>Email address</Label>
                      <Input type="email" placeholder="you@example.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="bg-muted/50" />
                    </div>
                    <Button onClick={handleForgotPassword} disabled={!resetEmail || resetLoading} className="w-full">
                      {resetLoading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Right - Illustration */}
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
            <GraduationCap className="w-14 h-14 text-primary-foreground" />
          </div>
          <h2 className="text-4xl font-bold text-primary-foreground mb-4">Learn Without Limits</h2>
          <p className="text-lg text-primary-foreground/80">
            Access world-class courses, track your progress, and earn certificates — all in one enterprise learning platform.
          </p>
          <div className="mt-10 flex justify-center gap-8 text-primary-foreground/70">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-foreground">12K+</div>
              <div className="text-sm">Learners</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-foreground">150+</div>
              <div className="text-sm">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-foreground">95%</div>
              <div className="text-sm">Satisfaction</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
