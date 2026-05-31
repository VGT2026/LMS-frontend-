import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dashboardSolutions } from "@/data/marketingContent";

const solutionLinks = dashboardSolutions.map((s) => ({
  label: s.role,
  href: `/solutions/${s.slug}`,
  tagline: s.tagline,
  Icon: s.icon,
}));

const navLinkClass = (active: boolean) =>
  active
    ? "text-foreground bg-muted/80 shadow-sm"
    : "text-muted-foreground hover:text-foreground hover:bg-muted/50";

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const isSolutionsSection = location.pathname.startsWith("/solutions");
  const menuOpen = solutionsOpen || mobileOpen;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.4]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />

      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-[0.07]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse, hsl(var(--accent)) 0%, transparent 70%)",
        }}
      />

      <header
        className={cn(
          "sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl transition-colors",
          menuOpen
            ? "bg-card"
            : "bg-card/80 supports-[backdrop-filter]:bg-card/60",
        )}
      >
        <div className="max-w-6xl mx-auto px-4 h-[4.25rem] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md ring-1 ring-primary/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              LMS Pro
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 p-1 rounded-xl bg-muted/40 border border-border/60 overflow-visible">
            <Link
              to="/"
              className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${navLinkClass(isActive("/"))}`}
            >
              Home
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setSolutionsOpen(true)}
              onMouseLeave={() => setSolutionsOpen(false)}
            >
              <button
                type="button"
                aria-expanded={solutionsOpen}
                aria-haspopup="true"
                className={`flex items-center gap-1 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${navLinkClass(isSolutionsSection || solutionsOpen)}`}
              >
                Solutions
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${solutionsOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {solutionsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 pt-2 w-72 z-50"
                  >
                    <div className="rounded-2xl border border-border bg-card shadow-elevated p-2">
                      <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Workspaces
                      </p>

                      {solutionLinks.map(({ href, label, tagline, Icon }) => (
                        <Link
                          key={href}
                          to={href}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/80 transition-colors group"
                        >
                          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                            <Icon className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {label}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {tagline}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              to="/solutions/platform"
              className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${navLinkClass(isActive("/solutions/platform"))}`}
            >
              Enterprise
            </Link>

            <Link
              to="/contact"
              className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${navLinkClass(isActive("/contact"))}`}
            >
              Contact
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="ghost"
              asChild
              className="font-medium text-muted-foreground hover:text-foreground"
            >
              <Link to="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              className="bg-accent hover:bg-accent/90 shadow-md shadow-accent/20 font-semibold px-5"
            >
              <Link to="/register">Get started</Link>
            </Button>
          </div>

          <button
            type="button"
            className="lg:hidden p-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border bg-card px-4 py-4 space-y-1"
            >
              <Link
                to="/"
                className="block py-2.5 text-sm font-medium rounded-lg px-2 hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                Home
              </Link>

              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-3 pb-1 px-2">
                Solutions
              </p>

              {solutionLinks.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  to={href}
                  className="flex items-center gap-2 py-2.5 pl-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="w-4 h-4 text-accent shrink-0" />
                  {label}
                </Link>
              ))}

              <Link
                to="/contact"
                className="block py-2.5 text-sm font-medium rounded-lg px-2 hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                Contact
              </Link>

              <div className="flex flex-col gap-2 pt-4 border-t border-border mt-2">
                <Button variant="outline" asChild className="w-full">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-accent hover:bg-accent/90 font-semibold"
                >
                  <Link to="/register" onClick={() => setMobileOpen(false)}>
                    Get started
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative">{children}</main>

      <footer className="relative mt-auto border-t border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/30 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
                  <GraduationCap className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg text-foreground">
                  LMS Pro
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Enterprise learning with AI, multi-tenant organizations, and
                role-based workspaces.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
                Solutions
              </p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {solutionLinks.map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link
                      to={href}
                      className="hover:text-accent transition-colors inline-flex items-center gap-2"
                    >
                      <Icon className="w-3.5 h-3.5 opacity-70" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
                Product
              </p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link to="/" className="hover:text-accent transition-colors">
                    Features overview
                  </Link>
                </li>
                <li>
                  <Link
                    to="/solutions/platform"
                    className="hover:text-accent transition-colors"
                  >
                    Multi-tenant platform
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="hover:text-accent transition-colors"
                  >
                    Contact us
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
                Account
              </p>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="/login"
                    className="hover:text-accent transition-colors"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="hover:text-accent transition-colors"
                  >
                    Create account
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} LMS Pro. All rights reserved.</p>
            <Link
              to="/contact"
              className="hover:text-accent transition-colors font-medium"
            >
              Get in touch →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
