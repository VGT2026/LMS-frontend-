import { ReactNode, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, BookOpen, Calendar, MessageSquare, Award, BarChart3,
  Settings, HelpCircle, GraduationCap, Bell, Search, ChevronDown, ChevronRight,
  LogOut, User, Users, PlusCircle, FileText, Menu, X, Bot, Wand2, Sparkles, Map
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  icon: ReactNode;
  path: string;
}

interface SearchResult {
  label: string;
  path: string;
  type: string;
  icon: typeof BookOpen;
}

const courseSearchData: SearchResult[] = [
  { label: "Advanced React Patterns", path: "/courses/1", type: "Course", icon: BookOpen },
  { label: "Data Science Fundamentals", path: "/courses/2", type: "Course", icon: BookOpen },
  { label: "UX Design Masterclass", path: "/courses/3", type: "Course", icon: BookOpen },
  { label: "Cloud Architecture", path: "/courses/4", type: "Course", icon: BookOpen },
  { label: "Machine Learning A-Z", path: "/courses/5", type: "Course", icon: BookOpen },
  { label: "Python for Beginners", path: "/courses/6", type: "Course", icon: BookOpen },
];

const pageSearchData: SearchResult[] = [
  { label: "Dashboard", path: "/dashboard", type: "Page", icon: LayoutDashboard },
  { label: "My Courses", path: "/courses/my-enrolled", type: "Page", icon: BookOpen },
  { label: "All Courses", path: "/courses", type: "Page", icon: BookOpen },
  { label: "Calendar", path: "/calendar", type: "Page", icon: Calendar },
  { label: "Messages", path: "/messages", type: "Page", icon: MessageSquare },
  { label: "Grades", path: "/grades", type: "Page", icon: BarChart3 },
  { label: "Certificates", path: "/certificates", type: "Page", icon: Award },
  { label: "Support", path: "/support", type: "Page", icon: HelpCircle },
  { label: "Settings", path: "/settings", type: "Page", icon: Settings },
  { label: "Discussions", path: "/discussions", type: "Page", icon: MessageSquare },
];

interface NavItemWithChildren extends Omit<NavItem, "path"> {
  path?: string;
  children?: { label: string; path: string }[];
}

const studentNavBase: (NavItem | NavItemWithChildren)[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, path: "/dashboard" },
  { label: "Career Roadmap", icon: <Map className="w-5 h-5" />, path: "/roadmap" },
  {
    label: "Courses",
    icon: <BookOpen className="w-5 h-5" />,
    children: [
      { label: "My Courses", path: "/courses/my-enrolled" },
      { label: "All Courses", path: "/courses" },
    ],
  },
  { label: "Assignments", icon: <FileText className="w-5 h-5" />, path: "/assignments" },
  { label: "AI Tutor", icon: <Bot className="w-5 h-5" />, path: "/ai-tutor" },
  { label: "AI Summarizer", icon: <Sparkles className="w-5 h-5" />, path: "/ai-summarizer" },
  { label: "Calendar", icon: <Calendar className="w-5 h-5" />, path: "/calendar" },
  { label: "Messages", icon: <MessageSquare className="w-5 h-5" />, path: "/messages" },
  { label: "Grades", icon: <BarChart3 className="w-5 h-5" />, path: "/grades" },
  { label: "Certificates", icon: <Award className="w-5 h-5" />, path: "/certificates" },
  { label: "Support", icon: <HelpCircle className="w-5 h-5" />, path: "/support" },
];

const studentNav = studentNavBase;

const adminNav: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, path: "/admin" },
  { label: "Courses", icon: <BookOpen className="w-5 h-5" />, path: "/admin/courses" },
  { label: "Users", icon: <Users className="w-5 h-5" />, path: "/admin/users" },
  { label: "Create Course", icon: <PlusCircle className="w-5 h-5" />, path: "/admin/create-course" },
  { label: "Reports", icon: <FileText className="w-5 h-5" />, path: "/admin/reports" },
  { label: "Support", icon: <HelpCircle className="w-5 h-5" />, path: "/support" },
  { label: "Settings", icon: <Settings className="w-5 h-5" />, path: "/settings" },
];

const instructorNav: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, path: "/instructor" },
  { label: "My Courses", icon: <BookOpen className="w-5 h-5" />, path: "/instructor/courses" },
  { label: "Create Course", icon: <PlusCircle className="w-5 h-5" />, path: "/instructor/create-course" },
  { label: "Students", icon: <Users className="w-5 h-5" />, path: "/instructor/students" },
  { label: "Messages", icon: <MessageSquare className="w-5 h-5" />, path: "/messages" },
  { label: "Assignments", icon: <FileText className="w-5 h-5" />, path: "/instructor/assignments" },
  { label: "AI Quiz Generator", icon: <Wand2 className="w-5 h-5" />, path: "/instructor/ai-quiz" },
  { label: "AI Summarizer", icon: <Sparkles className="w-5 h-5" />, path: "/ai-summarizer" },
  { label: "Discussions", icon: <MessageSquare className="w-5 h-5" />, path: "/instructor/discussions" },
  { label: "Support", icon: <HelpCircle className="w-5 h-5" />, path: "/support" },
  { label: "Settings", icon: <Settings className="w-5 h-5" />, path: "/settings" },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [coursesDropdownOpen, setCoursesDropdownOpen] = useState(false);

  const navItems = user?.role === "admin" ? adminNav : user?.role === "instructor" ? instructorNav : studentNav;
  const isStudent = user?.role === "student";

  const notificationItems = useMemo(() => {
    if (!user) return [];

    if (user.role === "admin") {
      return [
        { text: "New student support ticket submitted", href: "/support" },
        { text: "Review pending course approvals", href: "/admin/courses" },
        { text: "Manage users and roles", href: "/admin/users" },
      ];
    }

    if (user.role === "instructor") {
      return [
        { text: "Pending grading requests need review", href: "/instructor/assignments" },
        { text: "New discussion replies on your courses", href: "/instructor/discussions" },
        { text: "Check upcoming course deadlines", href: "/calendar" },
      ];
    }

    return [
      { text: "New assignment posted in your courses", href: "/assignments" },
      { text: "Quiz deadline tomorrow", href: "/calendar" },
      { text: "Certificates are ready for download", href: "/certificates" },
    ];
  }, [user]);

  const notificationCount = notificationItems.length;

  useEffect(() => {
    if (location.pathname === "/courses" || location.pathname === "/courses/my-enrolled") {
      setCoursesDropdownOpen(true);
    }
  }, [location.pathname]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const all = [...courseSearchData, ...pageSearchData];
    return all.filter(item => item.label.toLowerCase().includes(q)).slice(0, 8);
  }, [searchQuery]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isProctored = location.pathname.startsWith("/assignment/") || location.pathname === "/quiz";

  if (isProctored) {
    return (
      <div className="min-h-screen bg-background">
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen flex-shrink-0 transition-all duration-300 bg-sidebar text-sidebar-foreground lms-scrollbar overflow-y-auto
          ${sidebarOpen ? "w-64" : "w-[70px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {sidebarOpen && <span className="text-lg font-bold text-sidebar-foreground">LMS Pro</span>}
        </div>

        {/* Nav */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const navItem = item as NavItemWithChildren;
            const hasChildren = isStudent && navItem.children && navItem.children.length > 0;
            const active = hasChildren
              ? navItem.children?.some((c) => location.pathname === c.path)
              : location.pathname === navItem.path;

            if (hasChildren) {
              return (
                <div key={navItem.label} className="space-y-0.5">
                  <button
                    onClick={() => setCoursesDropdownOpen((o) => !o)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                      ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}
                    `}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex-shrink-0">{navItem.icon}</span>
                      {sidebarOpen && <span>{navItem.label}</span>}
                    </div>
                    {sidebarOpen && (
                      <ChevronRight
                        className={`w-4 h-4 flex-shrink-0 transition-transform ${coursesDropdownOpen ? "rotate-90" : ""}`}
                      />
                    )}
                  </button>
                  {sidebarOpen && coursesDropdownOpen && (
                    <div className="ml-4 pl-4 border-l border-sidebar-border space-y-0.5">
                      {navItem.children?.map((child) => {
                        const childActive = location.pathname === child.path;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 block
                              ${childActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                              }
                            `}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={navItem.path}
                to={navItem.path!}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }
                `}
              >
                <span className="flex-shrink-0">{navItem.icon}</span>
                {sidebarOpen && <span>{navItem.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:block text-muted-foreground hover:text-foreground transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search courses, topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                onKeyDown={(e) => { if (e.key === "Escape") { setSearchQuery(""); setSearchOpen(false); } }}
                className="h-9 w-64 pl-9 pr-4 rounded-lg bg-muted border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {searchOpen && searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 w-80 mt-1 bg-card rounded-xl border border-border shadow-elevated z-50 p-2 max-h-64 overflow-y-auto">
                  {searchResults.length > 0 ? searchResults.map((r, i) => (
                    <button key={i} onClick={() => { navigate(r.path); setSearchQuery(""); setSearchOpen(false); }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors">
                      <r.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.type}</p>
                      </div>
                    </button>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-3">No results for "{searchQuery}"</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Bell className="w-5 h-5" />
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-12 w-80 bg-card rounded-xl border border-border shadow-elevated p-4"
                  >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-sm">Notifications</h4>
                        <span className="text-xs text-muted-foreground">{notificationCount}</span>
                      </div>

                      {notificationCount === 0 ? (
                        <div className="text-sm text-muted-foreground mt-3">No notifications</div>
                      ) : (
                        <div className="mt-3 space-y-1 max-h-[280px] overflow-y-auto pr-1">
                          {notificationItems.map((n, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setNotifOpen(false);
                                navigate(n.href);
                              }}
                              className="w-full text-left text-sm text-muted-foreground p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                              {n.text}
                            </button>
                          ))}
                        </div>
                      )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <span className="hidden md:inline text-sm font-medium text-foreground">{user?.name}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:inline" />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 top-12 w-56 bg-card rounded-xl border border-border shadow-elevated py-2"
                  >
                    <div className="px-4 py-2 border-b border-border">
                      <p className="font-medium text-foreground text-sm">{user?.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                    </div>
                    <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <Link to="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors w-full">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-h-0 p-4 lg:p-6 overflow-y-auto" onClick={() => { setProfileOpen(false); setNotifOpen(false); }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
