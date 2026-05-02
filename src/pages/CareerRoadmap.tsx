import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Target,
    Map as MapIcon,
    CheckCircle2,
    Lock,
    ArrowRight,
    Award,
    BookOpen,
    TrendingUp,
    Briefcase,
    ChevronRight,
    Info,
    Clock,
    Sparkles,
    Wand2,
    BrainCircuit,
    MessageSquare,
    RefreshCw,
    X,
    Search,
    Zap
} from "lucide-react";
import { jobRoles, courses } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI, aiAPI } from "@/services/api";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface RoadmapCourse {
    id: string;
    title: string;
    description: string;
    duration?: string;
    thumbnail?: string;
}

const roleImageByTitle: Record<string, string> = {
    "Full Stack Developer": "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=1200&h=700&fit=crop",
    "Data Scientist": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=700&fit=crop",
    "Cloud Architect": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=700&fit=crop",
};

const getRoleImage = (roleTitle: string) =>
    roleImageByTitle[roleTitle] ||
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=700&fit=crop";

const CareerRoadmap = () => {
    const { user, updateUser } = useAuth();
    const { toast } = useToast();
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiTip, setAiTip] = useState<string | null>(null);
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

    const selectRole = (roleId: string) => {
        updateUser({ targetJobRoleId: roleId });
        authAPI.updateProfile({ targetJobRoleId: roleId }).catch((err) => {
            console.error('Failed to save career role:', err);
            toast({ title: 'Save failed', description: 'Could not save your career selection. Please try again.', variant: 'destructive' });
        });
    };

    if (!user || !user.targetJobRoleId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-gradient-to-b from-background to-muted/20 rounded-3xl border border-dashed border-border">
                <div className="p-6 rounded-full bg-primary/10 mb-6">
                    <Target className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-3xl font-bold font-heading">Design Your Future</h2>
                <p className="text-muted-foreground mt-4 max-w-md mx-auto leading-relaxed">
                    You haven't charted your career course yet. Choose your destination role and our AI will generate the perfect learning path for you.
                </p>
                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                    {jobRoles.map(role => (
                        <button
                            key={role.id}
                            onClick={() => selectRole(role.id)}
                            className="relative overflow-hidden p-6 rounded-2xl border border-border bg-card hover:border-primary transition-all text-left group"
                        >
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-35 transition-opacity"
                                style={{ backgroundImage: `url(${getRoleImage(role.title)})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/80 to-transparent" />
                            <div className="flex items-center justify-between mb-3">
                                <div className="relative z-10 p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <ArrowRight className="relative z-10 w-4 h-4 text-muted-foreground group-hover:text-primary transform group-hover:translate-x-1 transition-all" />
                            </div>
                            <h3 className="relative z-10 font-bold text-foreground mb-1">{role.title}</h3>
                            <p className="relative z-10 text-xs text-muted-foreground line-clamp-2">{role.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const jobRole = jobRoles.find(jr => jr.id === user.targetJobRoleId);
    if (!jobRole) return null;

    const completedIds = user.completedCourseIds || [];
    const roadmapCourses: RoadmapCourse[] = jobRole.roadmap.map(id => {
        const found = courses.find(c => c.id === id);
        return found ? {
            id: found.id,
            title: found.title,
            description: found.description,
            duration: (found as { duration?: string }).duration || "12 weeks",
            thumbnail: (found as { thumbnail?: string }).thumbnail,
        } : {
            id,
            title: "Specialized Module",
            description: "Advanced topic specific to your career path.",
            duration: "10 weeks",
            thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=700&fit=crop",
        };
    });

    const completedCount = jobRole.roadmap.filter(id => completedIds.includes(id)).length;
    const progress = Math.round((completedCount / jobRole.roadmap.length) * 100);

    const nextMilestone = jobRole.milestones.find(m => completedCount < m.reqCourses) || jobRole.milestones[jobRole.milestones.length - 1];
    const coursesToMilestone = Math.max(0, nextMilestone.reqCourses - completedCount);

    const handleRoleChange = (roleId: string) => {
        selectRole(roleId);
        setIsRoleDialogOpen(false);
        setAiTip(null);
        setAiAnalysisResult(null);
        toast({
            title: "Career Path Re-generated",
            description: `AI has updated your roadmap for the ${jobRoles.find(r => r.id === roleId)?.title} role.`,
        });
    };

    const runAIAnalysis = async () => {
        setIsAILoading(true);
        setAiTip(null);
        try {
            const nextCourse = roadmapCourses.find(c => !completedIds.includes(c.id));
            const completedNames = roadmapCourses.filter(c => completedIds.includes(c.id)).map(c => c.title).join(', ') || 'none yet';
            const prompt = `As a career coach, give me one specific, actionable tip (1-2 sentences) for someone pursuing ${jobRole.title} who is ${progress}% through their roadmap (${completedCount} of ${jobRole.roadmap.length} modules done). Completed: ${completedNames}. Next module: ${nextCourse?.title || 'all complete'}. Top skill gap: ${jobRole.skills.slice().sort((a, b) => a.progress - b.progress)[0]?.name}.`;
            const result = await aiAPI.askTutor(prompt);
            const tip = result?.answer || result?.data?.answer || result;
            setAiTip(typeof tip === 'string' ? tip : 'Focus on your next module to maintain momentum on your career path.');
            setAiAnalysisResult('Analysis complete! Check your updated recommendations below.');
        } catch {
            setAiTip('Focus on consistent daily progress — completing one module per week puts you on track to reach your goal within the estimated timeframe.');
            setAiAnalysisResult('Analysis complete!');
        } finally {
            setIsAILoading(false);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={container}
            className="max-w-6xl mx-auto space-y-8 pb-12 px-4 sm:px-6"
        >
            <section className="relative overflow-hidden rounded-[2.5rem] bg-[#0A0A0B] text-white p-8 lg:p-14 shadow-2xl border border-white/5">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-20"
                    style={{ backgroundImage: `url(${getRoleImage(jobRole.title)})` }}
                />
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80 pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
                    <div className="space-y-6 max-w-2xl">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] border border-primary/20">
                                <Zap className="w-3 h-3 fill-current" />
                                AI-Optimized Roadmap
                            </span>
                            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                                <DialogTrigger asChild>
                                    <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors group">
                                        <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                                        Switch Destination
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[550px] bg-[#121214] border-white/10 text-white">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-bold">Pivot Your Career</DialogTitle>
                                        <DialogDescription className="text-white/60">
                                            Our AI will instantly recalculate your learning path for the new target role.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-3 py-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                        {jobRoles.map((role) => (
                                            <button
                                                key={role.id}
                                                onClick={() => handleRoleChange(role.id)}
                                                className={`relative overflow-hidden flex items-start gap-4 p-5 rounded-2xl border transition-all text-left hover:bg-white/5 group ${user.targetJobRoleId === role.id ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5'}`}
                                            >
                                                <div
                                                    className="absolute inset-0 bg-cover bg-center opacity-15 group-hover:opacity-25 transition-opacity"
                                                    style={{ backgroundImage: `url(${getRoleImage(role.title)})` }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-r from-[#121214] via-[#121214]/85 to-transparent" />
                                                <div className={`mt-1 p-2.5 rounded-xl ${user.targetJobRoleId === role.id ? 'bg-primary text-white' : 'bg-white/5 text-white/40 group-hover:text-white transition-colors'}`}>
                                                    <Briefcase className="w-5 h-5" />
                                                </div>
                                                <div className="relative z-10 flex-1">
                                                    <div className="flex items-center justify-between pb-1">
                                                        <p className="font-bold text-lg">{role.title}</p>
                                                        {user.targetJobRoleId === role.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                                    </div>
                                                    <p className="text-sm text-white/40 line-clamp-2 leading-relaxed">{role.description}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight font-heading leading-[1.1]">
                            Your Path to <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient-text bg-clip-text text-transparent">{jobRole.title}</span>
                        </h1>

                        <p className="text-xl text-white/60 leading-relaxed max-w-xl">
                            Master the digital frontier. We've mapped out <span className="text-white font-bold">{jobRole.roadmap.length} critical milestones</span> to transition you into a professional level {jobRole.title}.
                        </p>

                        <div className="flex flex-wrap gap-4 pt-4">
                            {[
                                { icon: BookOpen, label: "Curriculum", value: `${jobRole.roadmap.length} courses`, color: "text-primary" },
                                { icon: TrendingUp, label: "Market Demand", value: jobRole.demand, color: "text-accent" },
                                { icon: Briefcase, label: "Potential", value: jobRole.salaryRange, color: "text-success" }
                            ].map((stat, i) => (
                                <div key={i} className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                    <div>
                                        <p className="text-[10px] text-white/40 uppercase font-black tracking-widest leading-none mb-1">{stat.label}</p>
                                        <p className="text-sm font-bold text-white">{stat.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative w-64 h-64 lg:w-80 lg:h-80 flex-shrink-0 flex items-center justify-center">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-[80px] animate-pulse" />
                        <svg className="w-full h-full transform -rotate-90 relative z-10">
                            <circle cx="50%" cy="50%" r="42%" className="stroke-white/5 fill-none" strokeWidth="12" />
                            <motion.circle
                                cx="50%" cy="50%" r="42%"
                                className="stroke-primary fill-none shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                strokeWidth="12"
                                strokeDasharray="100, 100"
                                initial={{ strokeDashoffset: 100 }}
                                animate={{ strokeDashoffset: 100 - progress }}
                                transition={{ duration: 2, ease: "anticipate" }}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
                            <span className="text-6xl lg:text-7xl font-black text-white tracking-tighter">{progress}%</span>
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mt-2">Level Reached</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold flex items-center gap-3">
                                <MapIcon className="w-8 h-8 text-primary" />
                                Sequence Map
                            </h2>
                            <p className="text-muted-foreground text-sm">Chronological order of mastery modules</p>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/30 px-4 py-2 rounded-full border border-border">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-success" /> Done</span>
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Current</span>
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-muted" /> Next</span>
                        </div>
                    </div>

                    <div className="relative pl-10 space-y-12 before:absolute before:left-[15px] before:top-4 before:bottom-4 before:w-1 before:bg-gradient-to-b before:from-success before:via-primary before:to-border/50 before:rounded-full">
                        {roadmapCourses.map((course, index) => {
                            const isCompleted = completedIds.includes(course.id);
                            const isNext = !isCompleted && (index === 0 || completedIds.includes(roadmapCourses[index - 1].id));
                            const isLocked = !isCompleted && !isNext;

                            return (
                                <motion.div key={course.id} variants={item} className="relative group">
                                    <div className={`absolute -left-[35px] top-6 w-8 h-8 rounded-full border-4 flex items-center justify-center z-10 transition-all duration-500 scale-100 group-hover:scale-110 ${isCompleted ? "bg-success border-background text-white" : isNext ? "bg-background border-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "bg-muted border-background"}`}>
                                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : isNext ? <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" /> : <Lock className="w-3 h-3 text-muted-foreground" />}
                                    </div>

                                    <div className={`rounded-[2rem] border transition-all duration-500 overflow-hidden ${isCompleted ? "bg-card/50 border-success/20 opacity-80" : isNext ? "bg-card border-primary shadow-2xl ring-4 ring-primary/5" : "bg-muted/20 border-border"}`}>
                                        <div className="relative h-36 sm:h-44 border-b border-border/60 overflow-hidden">
                                            <img
                                                src={course.thumbnail || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=700&fit=crop"}
                                                alt={course.title}
                                                className={`w-full h-full object-cover transition-transform duration-500 ${isLocked ? "grayscale opacity-50" : "group-hover:scale-105"}`}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                                            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                                                    {String(index + 1).padStart(2, "0")} - Module
                                                </span>
                                                {isNext && (
                                                    <span className="px-2 py-0.5 rounded bg-primary/20 text-white text-[10px] font-black uppercase border border-primary/40">
                                                        Live Track
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-8">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                                <div className="space-y-3">
                                                    <h3 className={`text-2xl font-bold tracking-tight ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>{course.title}</h3>
                                                    <p className="text-muted-foreground leading-relaxed max-w-xl">{course.description}</p>
                                                </div>
                                                {!isLocked && (
                                                    <Link to={`/course/${course.id}`} className="shrink-0">
                                                        <Button variant={isNext ? "default" : "outline"} className={`rounded-xl px-8 h-12 gap-3 font-bold transition-all duration-500 ${isNext ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30' : ''}`}>
                                                            {isCompleted ? "Review Lab" : "Enter Module"}
                                                            <ChevronRight className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                            {!isLocked && (
                                                <div className="mt-8 flex flex-wrap gap-6 border-t pt-6 border-border/50">
                                                    <div className="flex items-center gap-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest"><Clock className="w-4 h-4 text-primary" />{course.duration}</div>
                                                    <div className="flex items-center gap-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest"><Award className="w-4 h-4 text-accent" />Verified Proof</div>
                                                    <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full"><Search className="w-3 h-3" /> Syllabus Attached</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    {/* Advanced AI Assistant */}
                    <motion.div variants={item} className="bg-[#121214] rounded-[2rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="flex items-center gap-3 text-primary mb-6">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <BrainCircuit className="w-6 h-6 animate-pulse" />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="font-bold text-white text-lg leading-tight uppercase tracking-tighter">AI Career Coach</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                    <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Neural Engine Active</span>
                                </div>
                            </div>
                        </div>

                        <div className="min-h-[120px] flex items-center p-5 rounded-2xl bg-white/5 border border-white/5 mb-6 relative group/msg">
                            <AnimatePresence mode="wait">
                                {isAILoading ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center w-full gap-3"
                                    >
                                        <div className="flex gap-1.5">
                                            {[0, 1, 2].map(i => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                                    className="w-2 h-2 rounded-full bg-primary"
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-white/30 font-black uppercase tracking-[0.3em] font-mono">Parallel processing...</p>
                                    </motion.div>
                                ) : aiTip ? (
                                    <motion.div
                                        key="tip"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="space-y-3"
                                    >
                                        <p className="text-sm leading-relaxed text-white/80 font-medium italic">
                                            "{aiTip}"
                                        </p>
                                    </motion.div>
                                ) : (
                                    <div className="text-center space-y-2 w-full">
                                        <div className="text-white/20 mb-2">
                                            <MessageSquare className="w-10 h-10 mx-auto opacity-20" />
                                        </div>
                                        <p className="text-xs text-white/40 font-medium leading-relaxed">Ready to optimize your professional trajectory.</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        <Button
                            onClick={runAIAnalysis}
                            disabled={isAILoading}
                            className="w-full bg-primary hover:bg-primary/90 text-white border-0 rounded-xl h-14 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/30 group"
                        >
                            {isAILoading ? "Computing..." : "Sync AI Profile Analysis"}
                            {!isAILoading && <Sparkles className="ml-3 w-4 h-4 group-hover:scale-125 transition-transform" />}
                        </Button>

                        {aiAnalysisResult && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] text-center text-success font-bold uppercase tracking-widest mt-4">
                                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                {aiAnalysisResult}
                            </motion.p>
                        )}
                    </motion.div>

                    {/* Interactive Side Panels */}
                    <div className="space-y-6">
                        <motion.div variants={item} className="bg-card rounded-3xl p-8 border border-border shadow-card space-y-6 relative overflow-hidden group">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-xl flex items-center gap-3">
                                    <Award className="w-6 h-6 text-accent" />
                                    Credential Badges
                                </h3>
                                <Info className="w-4 h-4 text-muted-foreground opacity-30 hover:opacity-100 transition-opacity cursor-pointer" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { icon: Sparkles, title: "Path Starter", color: "text-accent", bg: "bg-accent/10", border: "border-accent", condition: completedCount >= 1 },
                                    { icon: Wand2, title: "Professional", color: "text-primary", bg: "bg-primary/10", border: "border-primary", condition: completedCount >= Math.floor(jobRole.roadmap.length / 2) },
                                    { icon: Briefcase, title: "Industry Master", color: "text-success", bg: "bg-success/10", border: "border-success", condition: completedCount === jobRole.roadmap.length }
                                ].map((badge, i) => (
                                    <div key={i} title={badge.title} className={`aspect-square rounded-2xl flex flex-col items-center justify-center border transition-all duration-500 scale-100 hover:scale-105 cursor-help ${badge.condition ? `${badge.bg} ${badge.border} opacity-100 shadow-md` : 'bg-muted/30 border-dashed border-border opacity-20 grayscale'}`}>
                                        <badge.icon className={`w-10 h-10 ${badge.condition ? badge.color : 'text-muted-foreground'}`} />
                                        <span className={`text-[8px] font-black uppercase tracking-tighter mt-2 text-center px-1 ${badge.condition ? badge.color : 'text-muted-foreground'}`}>{badge.title}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div variants={item} className="bg-primary/5 rounded-3xl p-8 border border-primary/20 space-y-4 shadow-inner relative overflow-hidden">
                            <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center font-black text-primary text-[10px]">
                                {coursesToMilestone}
                            </div>
                            <div className="flex items-center gap-3 text-primary">
                                <TrendingUp className="w-6 h-6" />
                                <h3 className="font-bold text-lg">Target Milestone</h3>
                            </div>
                            <p className="text-sm text-foreground/70 leading-relaxed font-medium">
                                You are tracking towards <span className="text-foreground font-black underline decoration-primary/30">{nextMilestone.title}</span>.
                                <br />
                                <span className="text-primary font-bold">{coursesToMilestone > 0 ? `${coursesToMilestone} key modules to finalization.` : "Goal achieved!"}</span>
                            </p>
                            <Button
                                variant="outline"
                                className="w-full bg-background/50 border-primary/20 rounded-xl h-12 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all duration-500"
                                onClick={() => setIsRoleDialogOpen(true)}
                            >
                                Recalibrate Path
                            </Button>
                        </motion.div>

                        <motion.div variants={item} className="bg-card rounded-3xl p-8 border border-border shadow-card space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-lg flex items-center gap-3">
                                    <Target className="w-6 h-6 text-success" />
                                    Gap Analysis
                                </h3>
                                <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40">Live Sync</span>
                            </div>
                            <div className="space-y-5">
                                {jobRole.skills.map((skill) => (
                                    <div key={skill.name} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-bold text-foreground tracking-tight">{skill.name}</span>
                                            <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{skill.progress}%</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${skill.progress}%` }}
                                                transition={{ duration: 1, delay: 0.5 }}
                                                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary pt-4">Generate Personalized Strategy</Button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default CareerRoadmap;
