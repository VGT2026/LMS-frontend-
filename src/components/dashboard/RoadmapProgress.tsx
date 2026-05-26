import { motion } from "framer-motion";
import { Map, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { User } from "@/contexts/AuthContext";

interface RoadmapProgressProps {
  user: User | null;
}

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export const RoadmapProgress = ({ user }: RoadmapProgressProps) => {
  if (!user || user.role !== "student") return null;

  return (
    <motion.div
      variants={fadeUp}
      className="bg-[#121214] rounded-2xl p-6 border border-white/5 shadow-2xl space-y-4 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent">
            <Map className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-white text-sm tracking-tight">Career Roadmap</h3>
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">AI study guide</span>
          </div>
        </div>
        <Link to="/roadmap" className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all">
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <p className="text-sm text-white/60 leading-relaxed">
        Pick courses from your catalog and get an AI-recommended order — with one clear course to start first.
      </p>

      <Link
        to="/roadmap"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-accent/15 border border-accent/30 text-accent text-sm font-semibold hover:bg-accent/25 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Build my path
      </Link>
    </motion.div>
  );
};
