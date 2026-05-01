import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, MessageSquare, FileText, ChevronDown, Send, CheckCircle, BookOpen, Shield, Monitor, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supportAPI } from "@/services/api";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const faqs = [
    { q: "How do I reset my password?", a: "Go to the login page and click 'Forgot Password'. Enter your email and we'll send you a reset link.", icon: Shield },
    { q: "How do I enroll in a new course?", a: "Navigate to the Courses page, browse available courses, and click 'Enroll' on the course you want to join.", icon: BookOpen },
    { q: "Where can I view my grades?", a: "Your grades are available on the Grades page accessible from the sidebar navigation.", icon: FileText },
    { q: "How do I submit an assignment?", a: "Open the Assignments page, click on the assignment, fill in your answers, and click 'Submit Assignment'.", icon: Monitor },
    { q: "Is my data secure?", a: "Yes, we use industry-standard encryption and security practices to protect your data.", icon: Shield },
    { q: "How do I contact my instructor?", a: "Use the Messages page to send a direct message to your instructor.", icon: MessageSquare },
];

const SupportPage = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const role = user?.role;

    const [tickets, setTickets] = useState<
        { id: number; subject: string; category: string; message: string; created_at?: string; user_name?: string; user_email?: string; user_role?: string }[]
    >([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [subject, setSubject] = useState("");
    const [category, setCategory] = useState("");
    const [message, setMessage] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | "student" | "instructor">("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [selectedTicket, setSelectedTicket] = useState<{
        id: number;
        subject: string;
        category: string;
        message: string;
        created_at?: string;
        user_name?: string;
        user_email?: string;
        user_role?: string;
    } | null>(null);

    useEffect(() => {
        let cancelled = false;
        const loadTickets = async () => {
            if (role !== "admin") return;
            setTicketsLoading(true);
            try {
                const res = await supportAPI.listTickets({ limit: 10 });
                if (!cancelled) setTickets(Array.isArray(res) ? res : []);
            } catch {
                if (!cancelled) setTickets([]);
            } finally {
                if (!cancelled) setTicketsLoading(false);
            }
        };
        loadTickets();
        return () => {
            cancelled = true;
        };
    }, [role]);

    const categories = useMemo(() => {
        const set = new Set<string>();
        tickets.forEach((t) => {
            if (t.category) set.add(t.category);
        });
        return ["all", ...Array.from(set)];
    }, [tickets]);

    const filteredTickets = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return tickets.filter((t) => {
            if (roleFilter !== "all" && (t.user_role || "").toLowerCase() !== roleFilter) return false;
            if (categoryFilter !== "all" && (t.category || "").toLowerCase() !== categoryFilter.toLowerCase()) return false;
            if (!q) return true;
            const blob = `${t.user_name || ""} ${t.user_email || ""} ${t.subject || ""} ${t.message || ""}`.toLowerCase();
            return blob.includes(q);
        });
    }, [tickets, roleFilter, categoryFilter, searchQuery]);

    const stats = useMemo(() => {
        const now = Date.now();
        const in24h = tickets.filter((t) => {
            if (!t.created_at) return false;
            const ts = new Date(t.created_at).getTime();
            return !Number.isNaN(ts) && now - ts <= 24 * 60 * 60 * 1000;
        }).length;
        const students = tickets.filter((t) => (t.user_role || "").toLowerCase() === "student").length;
        const instructors = tickets.filter((t) => (t.user_role || "").toLowerCase() === "instructor").length;
        return { total: tickets.length, in24h, students, instructors };
    }, [tickets]);

    const handleSubmit = async () => {
        if (!subject || !category || !message) {
            toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
            return;
        }
        setSubmitting(true);
        try {
            await supportAPI.submitTicket({ subject, category, message });
            setSubmitted(true);
            setSubject("");
            setCategory("");
            setMessage("");
            setTimeout(() => setSubmitted(false), 4000);
            toast({ title: "Ticket submitted", description: "We'll get back to you within 24 hours." });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Could not submit ticket.";
            toast({ title: "Submission failed", description: msg, variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (role === "admin") {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
                    <p className="text-muted-foreground mt-1">Student and instructor submitted tickets (latest first)</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { label: "Total", value: stats.total },
                        { label: "Last 24h", value: stats.in24h },
                        { label: "Students", value: stats.students },
                        { label: "Instructors", value: stats.instructors },
                    ].map((s) => (
                        <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                            <p className="text-xl font-semibold text-foreground mt-1">{s.value}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                    <div className="p-5 border-b border-border flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <h2 className="text-sm font-semibold text-foreground">Recent Tickets</h2>
                    </div>
                    <div className="p-4 border-b border-border bg-muted/20 grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search subject, user, message..."
                                className="pl-9"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as "all" | "student" | "instructor")}>
                            <SelectTrigger><SelectValue placeholder="Filter by role" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All roles</SelectItem>
                                <SelectItem value="student">Students</SelectItem>
                                <SelectItem value="instructor">Instructors</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger><SelectValue placeholder="Filter by category" /></SelectTrigger>
                            <SelectContent>
                                {categories.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c === "all" ? "All categories" : c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="overflow-x-auto">
                        {ticketsLoading ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">Loading tickets...</div>
                        ) : !filteredTickets.length ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">No support tickets yet.</div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-muted/50">
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">When</th>
                                        <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredTickets.map((t) => (
                                        <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <p className="text-sm font-medium text-foreground">{t.user_name || "—"}</p>
                                                <p className="text-xs text-muted-foreground">{t.user_email || ""}</p>
                                                <p className="text-[10px] uppercase text-muted-foreground">{t.user_role || ""}</p>
                                            </td>
                                            <td className="px-5 py-3">
                                                <p className="text-sm font-medium text-foreground line-clamp-2 break-words max-w-[360px]">{t.subject}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1 break-words max-w-[360px]">{t.message}</p>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-muted-foreground">
                                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                                                    {t.category}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">
                                                {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setSelectedTicket(t)}
                                                >
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
                    <DialogContent className="sm:max-w-2xl p-0 overflow-hidden max-h-[85vh]">
                        <DialogHeader>
                            <div className="px-6 pt-5 pb-4 border-b border-border bg-muted/30">
                                <DialogTitle className="text-lg">Support Ticket Details</DialogTitle>
                                {selectedTicket && (
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                                            {selectedTicket.category}
                                        </span>
                                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
                                            {selectedTicket.user_role || "—"}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : "—"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </DialogHeader>
                        {selectedTicket && (
                            <div className="px-6 py-5 space-y-5 text-sm overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-border p-3 bg-card">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">User</p>
                                        <p className="font-medium text-foreground mt-1">{selectedTicket.user_name || "—"}</p>
                                        <p className="text-muted-foreground mt-0.5 break-all">{selectedTicket.user_email || ""}</p>
                                    </div>
                                    <div className="rounded-lg border border-border p-3 bg-card">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Ticket ID</p>
                                        <p className="font-medium text-foreground mt-1">#{selectedTicket.id}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Subject</p>
                                    <p className="font-medium text-foreground break-words mt-1">{selectedTicket.subject}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Message</p>
                                    <div className="mt-1 p-4 rounded-xl border border-border bg-muted/40 text-foreground whitespace-pre-wrap break-words leading-relaxed">
                                        {selectedTicket.message}
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
                <p className="text-muted-foreground mt-1">Find answers or submit a support ticket</p>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Knowledge Base", desc: "Browse articles and tutorials", icon: BookOpen, color: "bg-primary/10 text-primary" },
                    { label: "Live Chat", desc: "Chat with support (9 AM - 6 PM)", icon: MessageSquare, color: "bg-accent/10 text-accent" },
                    { label: "Email Support", desc: "support@lmspro.com", icon: Send, color: "bg-success/10 text-success" },
                ].map(item => (
                    <div key={item.label} className="bg-card rounded-xl p-5 border border-border shadow-card text-center hover:shadow-elevated transition-shadow cursor-pointer">
                        <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mx-auto mb-3`}>
                            <item.icon className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-foreground text-sm">{item.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                ))}
            </div>

            {/* FAQ */}
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                    <h2 className="font-semibold text-foreground flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-primary" /> Frequently Asked Questions
                    </h2>
                </div>
                <div className="divide-y divide-border">
                    {faqs.map((faq, i) => (
                        <div key={i}>
                            <button
                                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                                className="w-full text-left px-6 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                            >
                                <faq.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm font-medium text-foreground flex-1">{faq.q}</span>
                                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedFaq === i ? "rotate-180" : ""}`} />
                            </button>
                            <AnimatePresence>
                                {expandedFaq === i && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                        <p className="px-6 pb-4 pl-[52px] text-sm text-muted-foreground">{faq.a}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>

            {/* Support Ticket */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Submit a Support Ticket
                </h2>
                {role === "admin" ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Admin cannot submit support tickets. View submitted tickets from the Admin Dashboard.
                    </p>
                    {role === "admin" && (
                      <Button asChild variant="outline">
                        <Link to="/admin">Go to Admin Dashboard</Link>
                      </Button>
                    )}
                  </div>
                ) : submitted ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                        <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-7 h-7 text-success" />
                        </div>
                        <p className="font-medium text-foreground">Ticket Submitted!</p>
                        <p className="text-sm text-muted-foreground mt-1">We'll respond within 24 hours.</p>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Subject</Label>
                                <Input placeholder="Brief description..." value={subject} onChange={e => setSubject(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="technical">Technical Issue</SelectItem>
                                        <SelectItem value="billing">Billing</SelectItem>
                                        <SelectItem value="course">Course Content</SelectItem>
                                        <SelectItem value="account">Account</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea placeholder="Describe your issue in detail..." value={message} onChange={e => setMessage(e.target.value)} rows={4} className="bg-muted/50" />
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="gap-1.5"
                            >
                                <Send className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit Ticket"}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default SupportPage;
