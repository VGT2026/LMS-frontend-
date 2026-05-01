import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Calendar, Trophy, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { useAssignments } from "@/contexts/AssignmentContext";

const Assignments = () => {
  const { assignments, loading } = useAssignments();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assignments</h1>
          <p className="text-muted-foreground mt-1">View and start your course assignments</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg border border-primary/20 flex items-center gap-2">
          <ListChecks className="w-5 h-5" />
          <span className="font-bold">{assignments.length} Available</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="bg-card rounded-xl p-12 border border-border text-center">
            <p className="text-muted-foreground">Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-card rounded-xl p-12 border border-border text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium text-foreground">No assignments found</p>
            <p className="text-muted-foreground">You're all caught up for now!</p>
          </div>
        ) : (
          assignments.map((a) => (
            <motion.div
              key={a.id}
              whileHover={{ y: -2 }}
              className="bg-card rounded-xl border border-border shadow-card overflow-hidden group"
            >
              <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{a.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.courseTitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden md:flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Due: {a.dueDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>{a.points} Points</span>
                    </div>
                  </div>
                  <Link to={`/assignment/${a.id}`}>
                    <Button size="sm" className="gap-2">
                      Start Assignment <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Assignments;
