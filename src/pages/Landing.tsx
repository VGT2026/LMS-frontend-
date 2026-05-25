import { Link, Navigate } from "react-router-dom";

import { motion } from "framer-motion";

import { useAuth } from "@/contexts/AuthContext";

import { MarketingLayout } from "@/components/marketing/MarketingLayout";

import { MarketingHero } from "@/components/marketing/MarketingHero";

import { MarketingSectionHeader } from "@/components/marketing/MarketingSectionHeader";

import { MarketingCTA } from "@/components/marketing/MarketingCTA";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import {
  GraduationCap,
  BookOpen,
  Shield,
  LayoutDashboard,
  Bot,
  Sparkles,
  Building2,
  ChevronRight,
  ArrowRight,
  Zap,
} from "lucide-react";

import { dashboardSolutions } from "@/data/marketingContent";

const premiumFeatures = [
  {
    icon: BookOpen,
    title: "Structured learning",
    desc: "Courses, modules, and assessments in one flow.",
  },

  {
    icon: Bot,
    title: "AI Tutor",
    desc: "Instant, contextual help while you study.",
  },

  {
    icon: Sparkles,
    title: "AI Summarizer",
    desc: "Turn long readings into review-ready notes.",
  },

  {
    icon: Building2,
    title: "Multi-tenant",
    desc: "Isolated organizations on a single platform.",
  },
];

const stats = [
  { value: "4", label: "Role workspaces" },

  { value: "AI", label: "Built-in study tools" },

  { value: "100%", label: "Tenant isolation" },

  { value: "24/7", label: "Cloud access" },
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
      <MarketingHero
        eyebrow="Enterprise Learning Platform"
        title={
          <>
            Learning infrastructure
            <span className="block mt-1 bg-gradient-to-r from-primary-foreground via-primary-foreground/90 to-accent bg-clip-text text-transparent">
              built for every role
            </span>
          </>
        }
        subtitle="Premium workspaces for students, instructors, organization leaders, and platform operators — with AI tools and tenant isolation included."
        backTo={null}
      >
        <div className="mt-10 flex flex-wrap gap-4">
          <Button
            size="lg"
            asChild
            className="h-12 px-8 bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/30 font-semibold"
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
        </div>
      </MarketingHero>

      {/* Stats strip */}

      <section className="relative -mt-8 z-10 px-4 pb-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-xl p-4 sm:p-6 shadow-elevated"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center px-2 py-2 sm:py-0">
                <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {s.value}
                </p>

                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {s.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature pills in hero area */}

      <section className="px-4 pb-8 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {premiumFeatures.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="group rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-elevated hover:border-accent/30 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                <f.icon className="w-5 h-5 text-accent" />
              </div>

              <p className="font-semibold text-foreground text-sm">{f.title}</p>

              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Solutions grid */}

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <MarketingSectionHeader
            align="center"
            eyebrow="Workspaces"
            title="Four dashboards, one platform"
            description="Each role gets a purpose-built experience. Explore detailed guides for every workspace."
          />

          <div className="grid md:grid-cols-2 gap-6">
            {dashboardSolutions.map((s, i) => {
              const Icon = s.icon;

              return (
                <motion.div
                  key={s.slug}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    to={`/solutions/${s.slug}`}
                    className="group relative block h-full rounded-2xl border border-border bg-card p-8 shadow-card overflow-hidden hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />

                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative">
                      <div
                        className={`inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-5 bg-gradient-to-br ${s.accentClass} border border-border shadow-sm group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-7 h-7 text-primary" />
                      </div>

                      <Badge
                        variant="secondary"
                        className="mb-2 text-[10px] uppercase tracking-wider"
                      >
                        {s.tagline}
                      </Badge>

                      <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {s.role}
                      </h3>

                      <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-3">
                        {s.overview}
                      </p>

                      <span className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-accent group-hover:gap-3 transition-all">
                        Read full guide
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enterprise band */}

      <section className="py-20 px-4 border-y border-border bg-muted/25">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-accent mb-4">
              <Zap className="w-3.5 h-3.5" />
              Enterprise ready
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Isolated organizations, centralized control
            </h2>

            <p className="text-muted-foreground mt-4 leading-relaxed text-lg">
              Run multiple schools or business units on one LMS. Super admins
              provision tenants; organization admins manage only their people
              and courses — with no cross-tenant data exposure.
            </p>

            <Button asChild className="mt-8 gap-2 h-11 px-6 shadow-md">
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
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-6 text-center shadow-card hover:shadow-elevated hover:border-accent/25 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-6 h-6 text-accent" />
                </div>

                <p className="text-sm font-semibold text-foreground">
                  {item.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <MarketingCTA
        variant="outline"
        title="Start your learning journey"
        description="Join learners and educators on a platform designed for clarity, scale, and security."
        primaryLabel="Create account"
        primaryHref="/register"
        secondaryLabel="Sign in"
        secondaryHref="/login"
        footer={
          <p>
            Questions for your organization?{" "}
            <Link
              to="/contact"
              className="text-accent font-semibold hover:underline"
            >
              Contact our team
            </Link>
          </p>
        }
      />
    </MarketingLayout>
  );
};

export default Landing;
