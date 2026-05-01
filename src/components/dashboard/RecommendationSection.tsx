import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, ChevronRight, BookOpen } from "lucide-react";
import { courses as mockCourses } from "@/data/mockData";
import { User } from "@/contexts/AuthContext";

interface RecommendationSectionProps {
    user: User | null;
    courses?: any[];
    enrolledCourses?: Array<{ id?: number; progress_percentage?: number; progress?: number }>;
}

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export const RecommendationSection = ({ user, courses: propCourses, enrolledCourses = [] }: RecommendationSectionProps) => {
    if (!user) return null;

    const courseList = Array.isArray(propCourses) && propCourses.length > 0 ? propCourses : mockCourses;

    // Completed = from profile or enrolled with 100% progress
    const completedFromEnrolled = new Set(
        enrolledCourses
            .filter((c: any) => (c.progress_percentage ?? c.progress ?? 0) >= 100)
            .map((c: any) => String(c.id))
    );
    const completedIds = [...new Set([...(user.completedCourseIds || []), ...completedFromEnrolled])];
    const preferredCats = user.preferredCategories || [];

    // Simple recommendation logic - use published courses when provided
    const getRecommendations = () => {
        const idMatch = (c: any) => !completedIds.includes(String(c.id));
        let recommended = courseList.filter((c: any) => idMatch(c));

        recommended.sort((a: any, b: any) => {
            const aPref = preferredCats.includes(a?.category) ? 1 : 0;
            const bPref = preferredCats.includes(b?.category) ? 1 : 0;
            return bPref - aPref;
        });

        return recommended.slice(0, 2);
    };

    const recommendedCourses = getRecommendations();

    if (recommendedCourses.length === 0) return null;

    return (
        <motion.div variants={fadeUp} className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-warning" />
                    <h2 className="text-lg font-semibold text-foreground">Recommended for You</h2>
                </div>
                <Link to="/courses" className="text-sm text-accent hover:underline font-medium flex items-center gap-1">
                    Explore all <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendedCourses.map((course, idx) => (
                    <Link key={course?.id ?? idx} to={`/course/${course?.id}`} className="group">
                        <div className="bg-card rounded-xl p-4 border border-border shadow-card hover:shadow-elevated transition-all duration-300 flex gap-4">
                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                                <img src={course?.thumbnail || "https://placehold.co/80x80?text=Course"} alt={course?.title || "Course"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="min-w-0 flex flex-col justify-center">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-accent">{course?.category || ""}</span>
                                <h3 className="font-semibold text-foreground text-sm line-clamp-1 mt-0.5">{course?.title || "Course"}</h3>
                                <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                                    <BookOpen className="w-3 h-3" />
                                    <span className="text-xs">{course?.duration || ""}</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </motion.div>
    );
};
