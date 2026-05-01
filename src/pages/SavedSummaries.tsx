import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { aiAPI } from "@/services/api";
import { ChevronLeft, ChevronRight, Download, Edit3, Trash2, Database, Cloud, Check } from "lucide-react";
import { jsPDF } from "jspdf";
import { Link } from "react-router-dom";

interface SavedSummary {
    id: number;
    title: string;
    short_summary: string;
    key_points: string[];
    study_notes: string;
    word_count: number;
    reading_time: string;
    created_at: string;
}

const SavedSummaries = () => {
    const { toast } = useToast();
    const [summaries, setSummaries] = useState<SavedSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<number | null>(null);
    const [savingId, setSavingId] = useState<number | null>(null);
    const saveTimers = useRef<Record<number, number>>({});

    const loadSummaries = async (pageNum = 1) => {
        setLoading(true);
        try {
            const offset = (pageNum - 1) * limit;
            console.log("[SAVED_SUMMARIES] Fetching summaries with limit:", limit, "offset:", offset);
            const response = await aiAPI.getSummaries(limit, offset);
            console.log("[SAVED_SUMMARIES] Raw response:", response);
            
            const responseSummaries = response?.summaries ?? [];
            const pagination = response?.pagination ?? { limit, offset, total: 0, hasMore: false };
            
            console.log("[SAVED_SUMMARIES] Extracted summaries:", responseSummaries?.length, "Total:", pagination.total);
            
            setSummaries(responseSummaries);
            setTotal(pagination.total);
            setHasMore(pagination.hasMore);
            setPage(pageNum);
        } catch (error) {
            console.error("[SAVED_SUMMARIES] Full error:", error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error("[SAVED_SUMMARIES] Error message:", errorMsg);
            toast({ 
                title: "Failed to load saved summaries", 
                description: errorMsg || "Please try again.", 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSummaries(1);
    }, []);

    const filteredSummaries = summaries.filter((summary) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
            summary.title.toLowerCase().includes(query) ||
            summary.short_summary.toLowerCase().includes(query) ||
            summary.study_notes.toLowerCase().includes(query)
        );
    });

    const scheduleSave = (summaryId: number) => {
        setSavingId(summaryId);
        if (saveTimers.current[summaryId]) {
            clearTimeout(saveTimers.current[summaryId]);
        }
        saveTimers.current[summaryId] = window.setTimeout(() => {
            saveSummary(summaryId);
        }, 1200);
    };

    const saveSummary = async (summaryId: number) => {
        const summary = summaries.find((s) => s.id === summaryId);
        if (!summary) return;

        try {
            await aiAPI.updateSummary(summaryId, {
                title: summary.title,
                shortSummary: summary.short_summary,
                studyNotes: summary.study_notes,
            });
            setLastSavedId(summaryId);
            setSavingId(null);
            setTimeout(() => setLastSavedId(null), 2000);
        } catch (error) {
            console.error("[SAVED_SUMMARIES] Save error", error);
            setSavingId(null);
            toast({ title: "Autosave failed", description: "Could not update summary.", variant: "destructive" });
        }
    };

    const handleFieldChange = (summaryId: number, field: "title" | "short_summary" | "study_notes", value: string) => {
        setSummaries((prev) =>
            prev.map((s) =>
                s.id === summaryId ? { ...s, [field]: value } : s
            )
        );
        scheduleSave(summaryId);
    };

    const downloadPdf = (summary: SavedSummary) => {
        const doc = new jsPDF();
        const margin = 15;
        let y = 20;

        doc.setFontSize(18);
        doc.text(summary.title || "AI Summary", margin, y);
        y += 10;

        doc.setFontSize(12);
        doc.text(`Word Count: ${summary.word_count} · Reading Time: ${summary.reading_time}`, margin, y);
        y += 10;

        doc.setFontSize(14);
        doc.text("Summary:", margin, y);
        y += 8;

        doc.setFontSize(11);
        const shortLines = doc.splitTextToSize(summary.short_summary || "", 180);
        doc.text(shortLines, margin, y);
        y += shortLines.length * 6 + 8;

        doc.setFontSize(14);
        doc.text("Key Points:", margin, y);
        y += 8;

        summary.key_points?.forEach((point, index) => {
            const pointLines = doc.splitTextToSize(`${index + 1}. ${point}`, 180);
            if (y + pointLines.length * 6 > 280) {
                doc.addPage();
                y = 20;
            }
            doc.text(pointLines, margin, y);
            y += pointLines.length * 6;
        });
        y += 8;

        doc.setFontSize(14);
        doc.text("Study Notes:", margin, y);
        y += 8;

        const notesLines = doc.splitTextToSize(summary.study_notes || "", 180);
        if (y + notesLines.length * 6 > 280) {
            doc.addPage();
            y = 20;
        }
        doc.text(notesLines, margin, y);

        doc.save(`summary-${summary.id}.pdf`);
    };

    const deleteSummary = async (summaryId: number) => {
        try {
            await aiAPI.deleteSummary(summaryId);
            setSummaries((prev) => prev.filter((s) => s.id !== summaryId));
            toast({ title: "Deleted", description: "Summary removed.", variant: "destructive" });
        } catch (error) {
            console.error("[SAVED_SUMMARIES] Delete error", error);
            toast({ title: "Delete failed", description: "Could not delete summary.", variant: "destructive" });
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Saved Summaries</h1>
                    <p className="text-sm text-muted-foreground">Manage your previously generated AI summaries.</p>
                </div>
                <Button asChild>
                    <Link to="/ai-summarizer">Back to AI Summarizer</Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                    placeholder="Search summaries..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Button variant="outline" onClick={() => loadSummaries(page)}>
                    Refresh
                </Button>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <p className="text-xs text-muted-foreground mb-2">
                    Showing {filteredSummaries.length} of {total} saved summaries
                </p>

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                ) : filteredSummaries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No saved summaries found.</p>
                ) : (
                    <div className="space-y-4">
                        {filteredSummaries.map((summary) => (
                            <div key={summary.id} className="rounded-lg border border-border p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 space-y-1">
                                        <Input
                                            value={summary.title}
                                            onChange={(e) => handleFieldChange(summary.id, "title", e.target.value)}
                                            className="text-lg font-semibold"
                                            placeholder="Untitled summary"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {summary.word_count} words · {summary.reading_time} · {new Date(summary.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-1">
                                            {savingId === summary.id ? (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs font-medium text-amber-900 dark:text-amber-100">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                                    Saving...
                                                </div>
                                            ) : lastSavedId === summary.id ? (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-100 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-xs font-medium text-green-900 dark:text-green-100">
                                                    <Check className="w-3.5 h-3.5" />
                                                    Saved
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button size="sm" variant="outline" onClick={() => downloadPdf(summary)}>
                                                <Download className="w-3.5 h-3.5" /> PDF
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => deleteSummary(summary.id)}>
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Short Summary</p>
                                        <Textarea
                                            value={summary.short_summary}
                                            onChange={(e) => handleFieldChange(summary.id, "short_summary", e.target.value)}
                                            className="h-20"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Study Notes</p>
                                        <Textarea
                                            value={summary.study_notes}
                                            onChange={(e) => handleFieldChange(summary.id, "study_notes", e.target.value)}
                                            className="h-20"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Key Points</p>
                                    <ul className="list-disc list-inside text-sm">
                                        {summary.key_points?.map((kp, idx) => (
                                            <li key={idx}>{kp}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / limit) || 1}</p>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => loadSummaries(Math.max(1, page - 1))} disabled={page <= 1}>
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => loadSummaries(page + 1)} disabled={!hasMore}>
                        Next <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

export default SavedSummaries;
