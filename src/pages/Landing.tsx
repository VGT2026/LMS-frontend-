import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
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
  Building2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { dashboardSolutions } from "@/data/marketingContent";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

const premiumFeatures = [
  { icon: BookOpen, title: "Structured learning", desc: "Courses, modules, and assessments in one flow." },
  { icon: Bot, title: "AI Tutor", desc: "Instant, contextual help while you study." },
  { icon: Sparkles, title: "AI Summarizer", desc: "Turn long readings into review-ready notes." },
  { icon: Building2, title: "Multi-tenant", desc: "Isolated organizations on a single platform." },
];

function getDashboardPath(role: string | undefined): string {
  if (role === "superadmin") return "/superadmin";
  if (role === "admin") return "/admin";
  if (role === "instructor") return "/instructor";
  return "/dashboard";
}

const Landing = () => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-[420px] h-[420px] rounded-full bg-accent/30 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-primary-foreground/10 blur-[100px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="max-w-3xl"
          >
            <motion.div variants={fadeUp}>
              <Badge className="mb-5 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 px-3 py-1 text-xs tracking-wide">
                Enterprise Learning Platform
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-primary-foreground leading-[1.1] tracking-tight"
            >
              Learning infrastructure
              <span className="block text-primary-foreground/80">built for every role</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 text-lg text-primary-foreground/75 leading-relaxed max-w-xl">
              Premium workspaces for students, instructors, organization leaders, and platform operators — with AI
              tools and tenant isolation included.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-4">
              <Button
                size="lg"
                asChild
                className="h-12 px-8 bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/25 font-semibold"
              >
                <Link to="/register">
                  Start for free
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 px-8 border-primary-foreground/25 text-primary-foreground bg-primary-foreground/5 hover:bg-primary-foreground/10 backdrop-blur"
              >
                <Link to="/login">Sign in</Link>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="mt-16 lg:mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {premiumFeatures.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/5 backdrop-blur-md p-5"
              >
                <f.icon className="w-5 h-5 text-accent mb-3" />
                <p className="font-semibold text-primary-foreground text-sm">{f.title}</p>
                <p className="text-xs text-primary-foreground/60 mt-1">{f.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Solutions grid */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-3">Workspaces</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Four dashboards, one platform
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
              Each role gets a purpose-built experience. Explore detailed guides for every workspace.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {dashboardSolutions.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    to={`/solutions/${s.slug}`}
                    className="group block h-full rounded-2xl border border-border bg-card p-8 shadow-card hover:shadow-elevated hover:border-accent/40 transition-all duration-300"
                  >
                    <div className={`inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-5 bg-gradient-to-br ${s.accentClass} border border-border`}>
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent">{s.tagline}</p>
                    <h3 className="text-xl font-bold text-foreground mt-1 group-hover:text-primary transition-colors">
                      {s.role}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-3">{s.overview}</p>
                    <span className="inline-flex items-center gap-1 mt-6 text-sm font-medium text-accent group-hover:gap-2 transition-all">
                      Read full guide
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust / premium band */}
      <section className="py-20 px-4 border-y border-border bg-muted/20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-3">Enterprise ready</p>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Isolated organizations, centralized control
            </h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Run multiple schools or business units on one LMS. Super admins provision tenants; organization admins
              manage only their people and courses — with no cross-tenant data exposure.
            </p>
            <Button asChild variant="outline" className="mt-6 gap-2">
              <Link to="/solutions/platform">
                Platform workspace guide
                <ChevronRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Shield, label: "Platform governance" },
              { icon: Building2, label: "Per-organization tenants" },
              { icon: LayoutDashboard, label: "Role-based UI" },
              { icon: GraduationCap, label: "Learner-first design" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border bg-card p-5 text-center shadow-card hover:shadow-md transition-shadow"
              >
                <item.icon className="w-6 h-6 text-accent mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl font-bold text-foreground">Start your learning journey</h2>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">
            Join thousands of learners and educators on a platform designed for clarity and scale.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 h-11 px-8">
              <Link to="/register">Create account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 px-8">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </MarketingLayout>
  );
};

export default Landing;
