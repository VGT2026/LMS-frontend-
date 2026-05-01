import React from "react";
import { motion } from "framer-motion";
import { Target, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { jobRoles, courses } from "@/data/mockData";
import { User } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

interface RoadmapProgressProps {
    user: User | null;
    courses?: Array<{ id: number | string; title: string }>;
}

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export const RoadmapProgress = ({ user, courses: propCourses }: RoadmapProgressProps) => {
    if (!user || !user.targetJobRoleId) return null;

    // Support both mock IDs (jr1, jr2) and numeric DB IDs (1, 2) -> map to mock for display
    const idMatch = user.targetJobRoleId;
    const jobRole = jobRoles.find(jr => jr.id === idMatch)
        ?? jobRoles.find(jr => jr.id === `jr${idMatch}`)
        ?? (idMatch === "1" ? jobRoles[0] : idMatch === "2" ? jobRoles[1] : idMatch === "3" ? jobRoles[2] : null);
    if (!jobRole) return null;

    const roadmapCourseIds = jobRole.roadmap || [];
    const completedIds = user.completedCourseIds || [];
    const courseList = Array.isArray(propCourses) && propCourses.length > 0 ? propCourses : courses;

    const roadmapCourses = roadmapCourseIds.map(id => {
        const strId = String(id);
        const found = courseList.find((c: any) => String(c.id) === strId);
        return found ? {
            id: found.id,
            title: found.title,
            completed: completedIds.includes(strId) || completedIds.includes(String(found.id))
        } : { id, title: "Course in path", completed: false };
    });

    const completedCount = roadmapCourseIds.filter(id => completedIds.includes(id) || completedIds.includes(String(id))).length;
    const progress = roadmapCourseIds.length > 0 ? Math.round((completedCount / roadmapCourseIds.length) * 100) : 0;

    return (
        <motion.div variants={fadeUp} className="bg-[#121214] rounded-2xl p-6 border border-white/5 shadow-2xl space-y-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Target className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="font-bold text-white text-sm tracking-tight">{jobRole.title}</h3>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Career Trajectory</span>
                    </div>
                </div>
                <Link to="/roadmap" className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all">
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-white/40">Efficiency</span>
                    <span className="text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5 bg-white/5" />
            </div>

            <div className="space-y-2.5 pt-2">
                {roadmapCourses.slice(0, 3).map((course, index) => {
                    const isCompleted = completedIds.includes(String(course.id));
                    const prevCourse = index > 0 ? roadmapCourses[index - 1] : null;
                    const isNext = !isCompleted && (index === 0 || (prevCourse && completedIds.includes(String(prevCourse.id))));

                    return (
                        <div key={course.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${isNext ? "bg-white/5 border border-primary/20 shadow-lg" : "bg-transparent opacity-60"}`}>
                            {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                            ) : (
                                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isNext ? "border-primary" : "border-white/10"}`}>
                                    {isNext && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className={`text-[11px] font-bold truncate ${isCompleted ? "text-white/30" : "text-white/90"}`}>
                                    {course.title}
                                </p>
                                {isNext && <span className="text-[8px] text-primary font-black uppercase tracking-widest">AI Recommendation</span>}
                            </div>
                        </div>
                    );
                })}
                {roadmapCourses.length > 3 && (
                    <p className="text-[10px] text-white/20 text-center font-bold uppercase tracking-widest pt-2">
                        + {roadmapCourses.length - 3} more modules in path
                    </p>
                )}
            </div>
        </motion.div>
    );
};
