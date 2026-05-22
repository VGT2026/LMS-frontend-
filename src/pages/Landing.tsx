import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  BookOpen,
  Users,
  Shield,
  LayoutDashboard,
  Bot,
  Sparkles,
  FileText,
  Award,
  MessageSquare,
  Calendar,
  BarChart3,
  Wand2,
  Building2,
  ClipboardList,
  Map,
  Menu,
  X,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const portals = [
  {
    role: "Student",
    path: "/dashboard",
    color: "text-accent bg-accent/10",
    icon: GraduationCap,
    description: "Personal learning hub with enrolled courses, career roadmap, and AI study tools.",
    highlights: ["Dashboard & progress", "Courses & exams", "AI Tutor & Summarizer", "Grades & certificates"],
  },
  {
    role: "Instructor",
    path: "/instructor",
    color: "text-primary bg-primary/10",
    icon: Users,
    description: "Teach, grade, and manage your classes with assignments, quizzes, and student insights.",
    highlights: ["My courses", "Assignments & grading", "AI Quiz Generator", "Student roster"],
  },
  {
    role: "Organization Admin",
    path: "/admin",
    color: "text-warning bg-warning/10",
    icon: LayoutDashboard,
    description: "Run your tenant: courses, users, instructors, and reports — isolated to your organization.",
    highlights: ["Admin dashboard", "Course management", "User & instructor admin", "Reports & support"],
  },
  {
    role: "Super Admin",
    path: "/superadmin",
    color: "text-info bg-info/10",
    icon: Shield,
    description: "Platform control: organizations, platform admins, and all students & instructors.",
    highlights: ["Platform metrics", "Organizations", "Platform admins", "Global user directory"],
  },
];

const features = [
  { icon: BookOpen, title: "Course catalog", desc: "Browse, enroll, and complete structured courses with modules and media." },
  { icon: ClipboardList, title: "Assignments & exams", desc: "Submit work, take proctored quizzes, and receive instructor feedback." },
  { icon: Bot, title: "AI Tutor", desc: "Get instant help and explanations tailored to your learning path." },
  { icon: Sparkles, title: "AI Summarizer", desc: "Upload content and generate concise study summaries." },
  { icon: Wand2, title: "AI Quiz Generator", desc: "Instructors create assessments from course material in minutes." },
  { icon: Map, title: "Career roadmap", desc: "Track skills and job-role progress toward your target career." },
  { icon: MessageSquare, title: "Messages & discussions", desc: "Collaborate with peers and instructors in one place." },
  { icon: Calendar, title: "Calendar & deadlines", desc: "Never miss a quiz, assignment, or live session." },
  { icon: BarChart3, title: "Grades & analytics", desc: "Transparent scoring for learners; reports for admins." },
  { icon: Award, title: "Certificates", desc: "Earn and download credentials when you complete courses." },
  { icon: Building2, title: "Multi-tenant orgs", desc: "Each organization gets isolated admins, users, and courses." },
  { icon: FileText, title: "Support tickets", desc: "Built-in help desk for students, instructors, and admins." },
];

function getDashboardPath(role: string | undefined): string {
  if (role === "superadmin") return "/superadmin";
  if (role === "admin") return "/admin";
  if (role === "instructor") return "/instructor";
  return "/dashboard";
}

const Landing = () => {
  const { isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">LMS Pro</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <button type="button" onClick={() => scrollTo("features")} className="hover:text-foreground transition-colors">
              Features
            </button>
            <button type="button" onClick={() => scrollTo("portals")} className="hover:text-foreground transition-colors">
              Dashboards
            </button>
            <button type="button" onClick={() => scrollTo("platform")} className="hover:text-foreground transition-colors">
              Platform
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-accent hover:bg-accent/90">
              <Link to="/register">Get started</Link>
            </Button>
          </div>

          <button
            type="button"
            className="md:hidden p-2 text-muted-foreground"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border bg-card px-4 py-4 space-y-3"
            >
              <button type="button" className="block w-full text-left text-sm" onClick={() => scrollTo("features")}>
                Features
              </button>
              <button type="button" className="block w-full text-left text-sm" onClick={() => scrollTo("portals")}>
                Dashboards
              </button>
              <button type="button" className="block w-full text-left text-sm" onClick={() => scrollTo("platform")}>
                Platform
              </button>
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="outline" asChild className="w-full">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild className="w-full bg-accent hover:bg-accent/90">
                  <Link to="/register">Get started</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-primary-foreground blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-20 lg:py-28">
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }}>
            <motion.div variants={fadeUp}>
              <Badge className="mb-4 bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20">
                Enterprise Learning Management System
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold max-w-3xl leading-tight">
              One platform for learners, instructors, and organizations
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 text-lg text-primary-foreground/85 max-w-2xl">
              LMS Pro brings courses, AI-powered study tools, exams, assignments, and multi-tenant admin — with dedicated
              dashboards for every role.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-8">
                <Link to="/register">
                  Start learning free
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
              >
                <Link to="/login">Sign in to your dashboard</Link>
              </Button>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
              {[
                { value: "4", label: "Role dashboards" },
                { value: "AI", label: "Tutor & quizzes" },
                { value: "Multi", label: "Tenant orgs" },
                { value: "24/7", label: "Cloud access" },
              ].map((s) => (
                <div key={s.label} className="text-center sm:text-left">
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-sm text-primary-foreground/70">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-foreground">Everything in one LMS</h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            From enrollment to certification — plus AI tools built into the same app you use every day.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Role dashboards */}
      <section id="portals" className="py-20 px-4 bg-muted/40">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground">Dashboards for every role</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              After sign-in, you land on the right workspace — student, instructor, org admin, or platform super admin.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {portals.map((p, i) => (
              <motion.div
                key={p.role}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-card rounded-xl border border-border p-6 shadow-card"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${p.color}`}>
                    <p.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground">{p.role}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                    <ul className="mt-4 space-y-1.5">
                      {p.highlights.map((h) => (
                        <li key={h} className="flex items-center gap-2 text-sm text-foreground">
                          <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded inline-block">
                      {p.path}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform / multi-tenant */}
      <section id="platform" className="py-20 px-4 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <Badge variant="secondary" className="mb-3">
              Multi-tenant
            </Badge>
            <h2 className="text-3xl font-bold text-foreground">Built for multiple organizations</h2>
            <p className="text-muted-foreground mt-3">
              Super admins create organizations and platform admins. Each org admin only sees their own instructors,
              students, and courses — powered by tenant isolation on the API.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Super Admin: platform dashboard, organizations, platform admins",
                "Org Admin: tenant-scoped courses, users, and reports",
                "Instructors & students belong to one organization",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm text-foreground">
                  <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl border border-border p-6 shadow-card space-y-4"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b border-border pb-3">
              <LayoutDashboard className="w-4 h-4" />
              What you&apos;ll find inside
            </div>
            {[
              { label: "Student dashboard", path: "/dashboard", icon: GraduationCap },
              { label: "Instructor hub", path: "/instructor", icon: Users },
              { label: "Organization admin", path: "/admin", icon: Building2 },
              { label: "Platform super admin", path: "/superadmin", icon: Shield },
            ].map((row) => (
              <div key={row.path} className="flex items-center justify-between gap-3 py-1">
                <div className="flex items-center gap-2">
                  <row.icon className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                </div>
                <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{row.path}</code>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-2xl bg-gradient-primary p-10 sm:p-14 text-center text-primary-foreground shadow-elevated"
        >
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to open your dashboard?</h2>
          <p className="mt-3 text-primary-foreground/85 max-w-lg mx-auto">
            Create a student account or sign in with credentials from your school or organization.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground h-11">
              <Link to="/register">Create account</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-11 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
            >
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">LMS Pro</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <button type="button" onClick={() => scrollTo("features")} className="hover:text-foreground">
              Features
            </button>
            <button type="button" onClick={() => scrollTo("portals")} className="hover:text-foreground">
              Dashboards
            </button>
            <Link to="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-foreground">
              Register
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} LMS Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
