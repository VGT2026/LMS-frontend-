import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { MarketingSectionHeader } from "@/components/marketing/MarketingSectionHeader";
import { MarketingCTA } from "@/components/marketing/MarketingCTA";
import { Badge } from "@/components/ui/badge";
import type { DashboardSolution } from "@/data/marketingContent";
import { dashboardSolutions } from "@/data/marketingContent";
import { ArrowLeft, ArrowRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

interface DashboardDetailPageProps {
  solution: DashboardSolution;
}

export function DashboardDetailPage({ solution }: DashboardDetailPageProps) {
  const Icon = solution.icon;
  const others = dashboardSolutions.filter((s) => s.slug !== solution.slug);

  return (
    <MarketingLayout>
      <section className={`relative overflow-hidden bg-gradient-to-br ${solution.accentClass}`}>
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full bg-accent/30 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[280px] h-[280px] rounded-full bg-primary-foreground/10 blur-[80px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 lg:py-24">
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
            <motion.div variants={fadeUp}>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground mb-8 px-3 py-1.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 backdrop-blur-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-2 mb-5">
              <Badge className="bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20 backdrop-blur-sm">
                {solution.tagline}
              </Badge>
              {solution.highlights.map((h) => (
                <Badge
                  key={h}
                  variant="outline"
                  className="border-primary-foreground/25 text-primary-foreground/90 bg-primary-foreground/5"
                >
                  {h}
                </Badge>
              ))}
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur flex items-center justify-center shrink-0 border border-primary-foreground/20 shadow-lg">
                <Icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground tracking-tight max-w-3xl leading-[1.1]">
                  {solution.headline}
                </h1>
                <p className="mt-4 text-lg text-primary-foreground/85 max-w-2xl leading-relaxed">{solution.overview}</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 max-w-6xl mx-auto">
        <MarketingSectionHeader
          eyebrow="Capabilities"
          title="What's inside this workspace"
          description={`A detailed breakdown of tools and views available after you sign in as a ${solution.role.toLowerCase()}.`}
        />
        <div className="grid md:grid-cols-2 gap-5">
          {solution.capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-card overflow-hidden hover:shadow-elevated hover:border-accent/30 transition-all duration-300"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-accent/5 to-transparent" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform">
                  <cap.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{cap.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{cap.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/25 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <MarketingSectionHeader
            eyebrow="How it works"
            title="Typical journey"
            description="From first sign-in to daily workflows — how teams use this workspace."
          />
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-px bg-gradient-to-b from-accent/60 via-border to-transparent hidden sm:block" />
            <div className="space-y-6">
              {solution.workflow.map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-6 items-start"
                >
                  <div className="relative z-10 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 shrink-0 ring-4 ring-background">
                    {i + 1}
                  </div>
                  <div className="flex-1 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-foreground text-lg">{step.step}</h3>
                    <p className="text-muted-foreground mt-1.5 leading-relaxed">{step.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-6 tracking-tight">Explore other workspaces</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {others.map((s, i) => (
            <motion.div
              key={s.slug}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={`/solutions/${s.slug}`}
                className="group block rounded-2xl border border-border bg-card p-5 hover:border-accent/40 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.accentClass} flex items-center justify-center mb-3 border border-border`}
                >
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="font-semibold text-foreground group-hover:text-accent transition-colors">{s.role}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.tagline}</p>
                <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  View guide
                  <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <MarketingCTA
        title={`Ready to use the ${solution.role} workspace?`}
        description="Sign in with your organization credentials or create a student account to get started."
        primaryLabel="Create free account"
        primaryHref="/register"
        secondaryLabel="Sign in"
        secondaryHref="/login"
        footer={
          <p>
            Need help choosing a workspace?{" "}
            <Link to="/contact" className="underline hover:text-primary-foreground font-medium">
              Contact us
            </Link>
          </p>
        }
      />
    </MarketingLayout>
  );
}
