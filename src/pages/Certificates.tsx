import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Award, Download, Eye, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { dashboardAPI } from "@/services/api";
import { jsPDF } from "jspdf";

interface CertItem {
  id: string;
  course: string;
  date: string;
  instructor: string;
}

const Certificates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [certs, setCerts] = useState<CertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        setLoading(true);
        const res = await dashboardAPI.getEnrolledCourses();
        const data = res?.data ?? res;
        const courses = Array.isArray(data) ? data : [];
        // Only show certificates for fully completed courses (100% progress)
        const completed = courses.filter(
          (c: { completed_at?: string | Date | null; progress_percentage?: number }) =>
            c.completed_at != null || (c.progress_percentage ?? 0) >= 100
        );
        const formatted: CertItem[] = completed.map((c: { id: number; title: string; completed_at?: string | Date; enrolled_at?: string | Date; instructor?: string }) => {
          const date = c.completed_at || c.enrolled_at;
          const dateStr = date ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";
          return {
            id: String(c.id),
            course: c.title || "Course",
            date: dateStr,
            instructor: c.instructor || "Instructor",
          };
        });
        setCerts(formatted);
      } catch {
        setCerts([]);
        toast({ title: "Could not load certificates", description: "Complete courses to earn certificates.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchCertificates();
  }, [toast]);

  const downloadCertificate = (cert: CertItem) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Background
    doc.setFillColor(15, 23, 42); // dark navy
    doc.rect(0, 0, W, H, "F");

    // Gold border (outer)
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(2);
    doc.rect(10, 10, W - 20, H - 20);

    // Gold border (inner)
    doc.setLineWidth(0.5);
    doc.rect(14, 14, W - 28, H - 28);

    // Header accent line
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.line(40, 38, W - 40, 38);
    doc.line(40, 40, W - 40, 40);

    // "CERTIFICATE OF COMPLETION"
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(212, 175, 55);
    doc.text("CERTIFICATE OF COMPLETION", W / 2, 32, { align: "center" });

    // "LMS Pro"
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text("LMS Pro", W / 2, 58, { align: "center" });

    // "This is to certify that"
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(180, 190, 210);
    doc.text("This is to certify that", W / 2, 74, { align: "center" });

    // Student name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.text(user?.name || "Student", W / 2, 90, { align: "center" });

    // Underline below name
    const nameWidth = doc.getTextWidth(user?.name || "Student");
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(W / 2 - nameWidth / 2, 93, W / 2 + nameWidth / 2, 93);

    // "has successfully completed"
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(180, 190, 210);
    doc.text("has successfully completed the course", W / 2, 105, { align: "center" });

    // Course name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(212, 175, 55);
    doc.text(cert.course, W / 2, 119, { align: "center" });

    // Footer divider
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.line(40, 131, W - 40, 131);
    doc.line(40, 133, W - 40, 133);

    // Date & Instructor
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(180, 190, 210);
    doc.text(`Date: ${cert.date}`, W / 2 - 50, 143, { align: "center" });
    doc.text(`Instructor: ${cert.instructor}`, W / 2 + 50, 143, { align: "center" });

    const fileName = `certificate-${cert.course.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ title: "Certificate downloaded", description: `${cert.course} certificate saved as PDF.` });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">My Certificates</h1>
      <p className="text-muted-foreground">Download certificates for courses you have completed (100%)</p>

      {loading ? (
        <div className="bg-card rounded-xl p-12 border border-border shadow-card flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading certificates...</p>
        </div>
      ) : certs.length === 0 ? (
        <div className="bg-card rounded-xl p-12 border border-border shadow-card text-center">
          <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No certificates yet. Complete a course to earn one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {certs.map(cert => (
            <div key={cert.id} className="bg-card rounded-xl p-5 border border-border shadow-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{cert.course}</p>
                  <p className="text-sm text-muted-foreground">{cert.instructor} · {cert.date}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreview(cert.id)} className="gap-1.5">
                  <Eye className="w-4 h-4" /> Preview
                </Button>
                <Button size="sm" onClick={() => downloadCertificate(cert)} className="gap-1.5">
                  <Download className="w-4 h-4" /> Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certificate Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card rounded-xl border border-border shadow-elevated max-w-2xl w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Certificate Preview</h3>
              <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 bg-gradient-hero text-center">
              <div className="bg-card/95 backdrop-blur rounded-xl p-10 max-w-lg mx-auto border border-border">
                <Award className="w-12 h-12 text-accent mx-auto mb-4" />
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Certificate of Completion</p>
                <h2 className="text-2xl font-bold text-foreground">{certs.find(c => c.id === preview)?.course}</h2>
                <p className="text-muted-foreground mt-3">Awarded to <span className="font-semibold text-foreground">{user?.name || "Student"}</span></p>
                <p className="text-sm text-muted-foreground mt-1">{certs.find(c => c.id === preview)?.date}</p>
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">LMS Pro · {certs.find(c => c.id === preview)?.instructor}</p>
                </div>
              </div>
            </div>
            <div className="p-4 flex justify-end gap-2 border-t border-border">
              <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
              <Button className="gap-1.5" onClick={() => downloadCertificate(certs.find(c => c.id === preview)!)}><Download className="w-4 h-4" /> Download</Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default Certificates;
