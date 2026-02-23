import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Target,
    Map as MapIcon,
    CheckCircle2,
    Circle,
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
    Filter
} from "lucide-react";
import { jobRoles, courses } from "@/data/mockData";
import { useAuth } from "@/contexts/AuthContext";
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

const CareerRoadmap = () => {
    const { user, updateUser } = useAuth();
    const { toast } = useToast();
    const [isAILoading, setIsAILoading] = useState(false);
    const [aiTip, setAiTip] = useState<string | null>(null);
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

    if (!user || !user.targetJobRoleId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <Target className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
                <h2 className="text-2xl font-bold font-heading">Set Your Career Target</h2>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    You haven't selected a target career path yet. Choose a role to see your personalized roadmap.
                </p>
                <div className="mt-6 flex gap-4">
                    {jobRoles.map(role => (
                        <Button key={role.id} onClick={() => updateUser({ targetJobRoleId: role.id })}>
                            Become a {role.title}
                        </Button>
                    ))}
                </div>
            </div>
        );
    }

    const jobRole = jobRoles.find(jr => jr.id === user.targetJobRoleId);
    if (!jobRole) return null;

    const completedIds = user.completedCourseIds || [];
    const roadmapCourses = jobRole.roadmap.map(id => {
        return courses.find(c => c.id === id) || { id, title: "Specialized Topic", description: "Coming soon to your roadmap." };
    });

    const completedCount = jobRole.roadmap.filter(id => completedIds.includes(id)).length;
    const progress = Math.round((completedCount / jobRole.roadmap.length) * 100);

    const nextMilestone = jobRole.milestones.find(m => completedCount < m.reqCourses) || jobRole.milestones[jobRole.milestones.length - 1];
    const coursesToMilestone = Math.max(0, nextMilestone.reqCourses - completedCount);

    const handleRoleChange = (roleId: string) => {
        updateUser({ targetJobRoleId: roleId });
        setIsRoleDialogOpen(false);
        toast({
            title: "Career Path Updated",
            description: `You are now tracking the ${jobRoles.find(r => r.id === roleId)?.title} roadmap.`,
        });
    };

    const generateAITip = () => {
        setIsAILoading(true);
        // Simulated AI logic
        const tips = [
            `Focus on mastering ${roadmapCourses.find(c => !completedIds.includes(c.id))?.title || "your next course"} to unlock higher-tier roles.`,
            `Your progress in ${jobRole.skills[0].name} is excellent. Consider adding Cloud skills to your portfolio.`,
            `The demand for ${jobRole.title} is expected to grow by 15% next quarter. Keep pushing!`,
            `AI suggests you might enjoy the "System Design" course next to broaden your architectural understanding.`,
            `You're in the top 10% of learners on the ${jobRole.title} track. Stay consistent!`
        ];

        setTimeout(() => {
            setAiTip(tips[Math.floor(Math.random() * tips.length)]);
            setIsAILoading(false);
        }, 1200);
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
            className="max-w-6xl mx-auto space-y-8 pb-12"
        >
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-accent/5 border border-border p-8 lg:p-12">
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-4 max-w-2xl">
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
                                <Target className="w-3 h-3" />
                                Active Path
                            </div>
                            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-tighter gap-1 hover:bg-primary/5">
                                        <RefreshCw className="w-3 h-3" />
                                        Switch
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                        <DialogTitle>Change Career Path</DialogTitle>
                                        <DialogDescription>
                                            Selecting a new career path will update your learning roadmap and progress tracking.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        {jobRoles.map((role) => (
                                            <button
                                                key={role.id}
                                                onClick={() => handleRoleChange(role.id)}
                                                className={`flex items-start gap-4 p-4 rounded-xl border transition-all text-left hover:border-primary hover:bg-primary/5 group ${user.targetJobRoleId === role.id ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                                            >
                                                <div className={`mt-1 p-2 rounded-lg ${user.targetJobRoleId === role.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                    <Briefcase className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-bold text-foreground">{role.title}</p>
                                                        {user.targetJobRoleId === role.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{role.description}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-bold font-heading">Your Pathway to {jobRole.title}</h1>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            {jobRole.description} We've curated this sequence of courses to help you master the skills required for this role.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-xl border border-border shadow-sm">
                                <BookOpen className="w-5 h-5 text-primary" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Courses</p>
                                    <p className="text-sm font-bold">{jobRole.roadmap.length}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-xl border border-border shadow-sm">
                                <TrendingUp className="w-5 h-5 text-accent" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Role Demand</p>
                                    <p className="text-sm font-bold">{jobRole.demand}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-xl border border-border shadow-sm">
                                <Briefcase className="w-5 h-5 text-success" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Avg. Salary</p>
                                    <p className="text-sm font-bold">{jobRole.salaryRange}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative w-48 h-48 lg:w-64 lg:h-64 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="50%" cy="50%" r="45%" className="stroke-muted/20 fill-none" strokeWidth="8" />
                            <motion.circle
                                cx="50%" cy="50%" r="45%"
                                className="stroke-primary fill-none"
                                strokeWidth="8"
                                strokeDasharray="100, 100"
                                initial={{ strokeDashoffset: 100 }}
                                animate={{ strokeDashoffset: 100 - progress }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-4xl lg:text-5xl font-black text-foreground">{progress}%</span>
                            <span className="text-xs font-bold text-muted-foreground uppercase">Journey Complete</span>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <MapIcon className="w-6 h-6 text-primary" />
                            Learning Timeline
                        </h2>
                        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> Completed</span>
                            <span className="flex items-center gap-1.5"><Circle className="w-3.5 h-3.5 text-primary" /> Up Next</span>
                            <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-muted-foreground" /> Locked</span>
                        </div>
                    </div>

                    <div className="relative pl-8 space-y-12 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-success before:via-primary before:to-border">
                        {roadmapCourses.map((course, index) => {
                            const isCompleted = completedIds.includes(course.id);
                            const isNext = !isCompleted && (index === 0 || completedIds.includes(roadmapCourses[index - 1].id));
                            const isLocked = !isCompleted && !isNext;

                            return (
                                <motion.div key={course.id} variants={item} className="relative">
                                    <div className={`absolute -left-[30px] top-1 w-6 h-6 rounded-full border-4 flex items-center justify-center z-10 ${isCompleted ? "bg-success border-success" : isNext ? "bg-background border-primary animate-pulse" : "bg-muted border-border"}`}>
                                        {isCompleted ? <CheckCircle2 className="w-3 h-3 text-success-foreground" /> : isNext ? <Circle className="w-2 h-2 text-primary" /> : <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
                                    </div>
                                    <div className={`group rounded-2xl border transition-all duration-300 overflow-hidden ${isCompleted ? "bg-card border-success/30 opacity-75" : isNext ? "bg-card border-primary shadow-elevated" : "bg-muted/30 border-border"}`}>
                                        <div className="p-6">
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Step {index + 1}</span>
                                                        {isNext && <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase">Recommended Next</span>}
                                                    </div>
                                                    <h3 className={`text-xl font-bold ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>{course.title}</h3>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{(course as any).description}</p>
                                                </div>
                                                {!isLocked && (
                                                    <Link to={`/course/${course.id}`}>
                                                        <Button variant={isNext ? "default" : "outline"} size="sm" className="gap-2">
                                                            {isCompleted ? "Review Material" : "Start Now"}
                                                            <ChevronRight className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                            {!isLocked && (
                                                <div className="mt-6 flex flex-wrap gap-4 border-t pt-4 border-border/50">
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>{(course as any).duration || "10 weeks"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Award className="w-3.5 h-3.5" />
                                                        <span>Certificate Included</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* AI Career Assistant */}
                    <motion.div variants={item} className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl p-6 border border-indigo-500/20 shadow-lg space-y-4 relative overflow-hidden group">
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500" />
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            <BrainCircuit className="w-5 h-5 animate-pulse" />
                            <h3 className="font-bold">AI Career Assistant</h3>
                            <span className="ml-auto px-1.5 py-0.5 rounded bg-indigo-500/20 text-[8px] font-black uppercase tracking-widest">Powered by AI</span>
                        </div>

                        <div className="min-h-[80px] flex items-center justify-center p-3 rounded-xl bg-background/50 border border-indigo-500/10">
                            <AnimatePresence mode="wait">
                                {isAILoading ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center gap-2"
                                    >
                                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                                        <p className="text-[10px] text-muted-foreground animate-pulse">Analyzing your learning patterns...</p>
                                    </motion.div>
                                ) : aiTip ? (
                                    <motion.div
                                        key="tip"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="space-y-2"
                                    >
                                        <p className="text-sm leading-relaxed italic text-foreground/90 flex gap-2">
                                            <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0 text-indigo-500" />
                                            "{aiTip}"
                                        </p>
                                    </motion.div>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center">Get personalized insights and career advice based on your current progress.</p>
                                )}
                            </AnimatePresence>
                        </div>

                        <Button
                            onClick={generateAITip}
                            disabled={isAILoading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-md group"
                        >
                            {isAILoading ? "Processing..." : "Generate AI Insight"}
                            {!isAILoading && <Sparkles className="ml-2 w-4 h-4 group-hover:rotate-12 transition-transform" />}
                        </Button>
                    </motion.div>

                    <motion.div variants={item} className="bg-card rounded-2xl p-6 border border-border shadow-card space-y-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Award className="w-5 h-5 text-accent" />
                            Career Badges
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div title="Path Starter" className={`aspect-square rounded-xl flex items-center justify-center border transition-all cursor-help ${completedCount >= 1 ? 'bg-accent/10 border-accent grayscale-0 opacity-100 shadow-sm' : 'bg-accent/5 border-dashed border-border grayscale opacity-50'}`}>
                                <Sparkles className={`w-8 h-8 ${completedCount >= 1 ? 'text-accent' : 'text-muted-foreground'}`} />
                            </div>
                            <div title="Skill Professional" className={`aspect-square rounded-xl flex items-center justify-center border transition-all cursor-help ${completedCount >= Math.floor(jobRole.roadmap.length / 2) ? 'bg-primary/10 border-primary grayscale-0 opacity-100 shadow-sm' : 'bg-primary/5 border-dashed border-border grayscale opacity-50'}`}>
                                <Wand2 className={`w-8 h-8 ${completedCount >= Math.floor(jobRole.roadmap.length / 2) ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div title="Role Master" className={`aspect-square rounded-xl flex items-center justify-center border transition-all cursor-help ${completedCount === jobRole.roadmap.length ? 'bg-success/10 border-success grayscale-0 opacity-100 shadow-sm' : 'bg-success/5 border-dashed border-border grayscale opacity-50'}`}>
                                <Briefcase className={`w-8 h-8 ${completedCount === jobRole.roadmap.length ? 'text-success' : 'text-muted-foreground'}`} />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">Complete key milestones to unlock path badges.</p>
                    </motion.div>

                    <motion.div variants={item} className="bg-primary/5 rounded-2xl p-6 border border-primary/20 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Info className="w-5 h-5" />
                            <h3 className="font-bold">Next Milestone</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            You are currently working towards the <span className="text-foreground font-bold">{nextMilestone.title}</span> milestone. {coursesToMilestone > 0 ? `Complete ${coursesToMilestone} more course${coursesToMilestone > 1 ? 's' : ''} to reach it.` : "You've reached your target milestone!"}
                        </p>
                        <Button
                            variant="outline"
                            className="w-full border-primary/20 hover:bg-primary/5"
                            onClick={() => setIsRoleDialogOpen(true)}
                        >
                            Change Path
                        </Button>
                    </motion.div>

                    <motion.div variants={item} className="bg-card rounded-2xl p-6 border border-border shadow-card space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-success" />
                                Skills Gap Analysis
                            </h3>
                            <Filter className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                        </div>
                        <div className="space-y-3">
                            {jobRole.skills.map((skill) => (
                                <div key={skill.name} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span>{skill.name}</span>
                                        <span>{skill.progress}%</span>
                                    </div>
                                    <Progress value={skill.progress} className="h-1.5" />
                                </div>
                            ))}
                        </div>
                        <div className="pt-2">
                            <Button variant="ghost" size="sm" className="w-full text-[10px] font-bold uppercase tracking-tighter">View Detailed Analysis</Button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default CareerRoadmap;

