import { motion } from "framer-motion";
import { Target, CheckCircle2, Circle } from "lucide-react";
import { Link } from "react-router-dom";
import { jobRoles, courses } from "@/data/mockData";
import { User } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

interface RoadmapProgressProps {
    user: User | null;
}

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export const RoadmapProgress = ({ user }: RoadmapProgressProps) => {
    if (!user || !user.targetJobRoleId) return null;

    const jobRole = jobRoles.find(jr => jr.id === user.targetJobRoleId);
    if (!jobRole) return null;

    const roadmapCourseIds = jobRole.roadmap;
    const completedIds = user.completedCourseIds || [];

    const roadmapCourses = roadmapCourseIds.map(id => {
        return courses.find(c => c.id === id) || { id, title: "Upcoming Course", completed: false };
    });

    const completedCount = roadmapCourseIds.filter(id => completedIds.includes(id)).length;
    const progress = Math.round((completedCount / roadmapCourseIds.length) * 100);

    return (
        <motion.div variants={fadeUp} className="bg-card rounded-xl p-5 border border-border shadow-card space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">Career Roadmap: {jobRole.title}</h3>
                </div>
                <Link to="/roadmap" className="text-[10px] text-accent hover:underline font-bold uppercase tracking-tighter">
                    Full View
                </Link>
            </div>

            <Progress value={progress} className="h-2" />

            <div className="space-y-3 mt-4">
                {roadmapCourses.map((course, index) => {
                    const isCompleted = completedIds.includes(course.id);
                    const isNext = !isCompleted && (index === 0 || completedIds.includes(roadmapCourses[index - 1].id));

                    return (
                        <div key={course.id} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isNext ? "bg-primary/5 border border-primary/20" : ""}`}>
                            {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                            ) : (
                                <Circle className={`w-4 h-4 flex-shrink-0 ${isNext ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
                            )}
                            <div className="min-w-0">
                                <p className={`text-xs font-medium truncate ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                    {(course as any).title}
                                </p>
                                {isNext && <span className="text-[10px] text-primary font-bold uppercase tracking-tighter">Recommended Next</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};
