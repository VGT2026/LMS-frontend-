import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2, Sparkles, Copy, Download, Upload, RotateCcw, BookOpen, Lightbulb, List, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { aiAPI } from "@/services/api";
import { extractFileContent, getFileType } from "@/utils/fileExtractor";
import { jsPDF } from "jspdf";

interface SummaryResult {
    title: string;
    keyPoints: string[];
    shortSummary: string;
    studyNotes: string;
    wordCount: number;
    readingTime: string;
}

interface SavedSummary {
    id: number;
    title: string;
    short_summary: string;
    key_points: string[];
    study_notes: string;
    word_count: number;
    reading_time: string;
    created_at?: string;
}

const ContentSummarizer = () => {
    const { toast } = useToast();
    const [content, setContent] = useState("");
    const [summarizing, setSummarizing] = useState(false);
    const [result, setResult] = useState<SummaryResult | null>(null);
    const [activeTab, setActiveTab] = useState<"summary" | "points" | "notes">("summary");
    const [pdfName, setPdfName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [savedSummaries, setSavedSummaries] = useState<SavedSummary[]>([]);
    const [loadingSavedSummaries, setLoadingSavedSummaries] = useState(false);
    const [summaryId, setSummaryId] = useState<number | null>(null);

    useEffect(() => {
        loadSavedSummaries();
    }, []);

    const handleSummarize = async () => {
        if (!content.trim()) {
            toast({ title: "No content", description: "Please paste some text to summarize.", variant: "destructive" });
            return;
        }

        if (content.length > 50000) {
            toast({ title: "Content too large", description: "Please limit content to 50,000 characters.", variant: "destructive" });
            return;
        }

        setSummarizing(true);
        setError(null);

        try {
            console.log("[SUMMARIZER] Sending content for summarization...", { length: content.length });
            const summary = await aiAPI.summarizeContent(content, "text");
            
            if (summary) {
                setResult(summary);
                setSummaryId(summary.summaryId || null);
                console.log("[SUMMARIZER] ✅ Summary generated successfully, ID:", summary.summaryId);
                toast({ title: "Summary ready!", description: "AI has analyzed and summarized your content." });
            } else {
                throw new Error("No summary data received");
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to summarize content. Please try again.";
            console.error("[SUMMARIZER] ❌ Error:", errorMsg);
            setError(errorMsg);
            setSummaryId(null);
            toast({ 
                title: "Summarization failed", 
                description: errorMsg, 
                variant: "destructive" 
            });
        } finally {
            setSummarizing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPdfName(file.name);
            setError(null); // Clear previous errors
            try {
                const fileType = getFileType(file.name);
                console.log(`[SUMMARIZER] Extracting text from ${fileType}... (${file.size} bytes)`);
                const extractedText = await extractFileContent(file);
                
                if (!extractedText || extractedText.trim().length === 0) {
                    throw new Error('The file appears to be empty or has no readable content.');
                }

                setContent(extractedText);
                toast({ 
                    title: "✅ File loaded successfully", 
                    description: `Extracted ${extractedText.split(/\s+/).length} words from ${file.name}` 
                });
                console.log(`[SUMMARIZER] ✅ Extracted ${extractedText.length} characters from ${fileType}`);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Could not read the file. Please try again.';
                console.error('[SUMMARIZER] ❌ File extraction error:', errorMsg);
                setError(errorMsg); // Show error in alert
                toast({ 
                    title: "❌ Failed to extract file", 
                    description: errorMsg, 
                    variant: "destructive" 
                });
            }
        }
    };

    const loadSavedSummaries = async () => {
        // Check if user is logged in
        const token = localStorage.getItem('lms_token') || sessionStorage.getItem('lms_token');
        if (!token) {
            console.log('[SUMMARIZER] User not logged in, skipping saved summaries load');
            setLoadingSavedSummaries(false);
            return;
        }

        setLoadingSavedSummaries(true);
        try {
            const response = await aiAPI.getSummaries();
            // API returns { summaries, pagination }
            setSavedSummaries(response?.summaries || []);
            console.log('[SUMMARIZER] Loaded saved summaries', response?.summaries?.length);
        } catch (error: any) {
            console.error('[SUMMARIZER] Failed to load saved summaries', error);
            
            // Check if it's an authentication error
            if (error?.message?.includes('401') || error?.message?.includes('token') || error?.message?.includes('unauthorized')) {
                toast({ 
                    title: "Authentication Required", 
                    description: "Please log in to view your saved summaries.", 
                    variant: "destructive" 
                });
            } else {
                toast({ 
                    title: "Failed to load saved summaries", 
                    description: "Unable to fetch your saved summaries. Please try again.", 
                    variant: "destructive" 
                });
            }
        } finally {
            setLoadingSavedSummaries(false);
        }
    };

    const viewSavedSummary = (saved: SavedSummary) => {
        setResult({
            title: saved.title,
            shortSummary: saved.short_summary,
            keyPoints: saved.key_points || [],
            studyNotes: saved.study_notes,
            wordCount: saved.word_count,
            readingTime: saved.reading_time,
        });
        setContent(saved.study_notes || '');
        setError(null);
    };

    const deleteSavedSummary = async (summaryId: number) => {
        try {
            await aiAPI.deleteSummary(summaryId);
            toast({ title: 'Deleted', description: 'Saved summary has been removed.' });
            if (savedSummaries.some(s => s.id === summaryId)) {
                setSavedSummaries((current) => current.filter((s) => s.id !== summaryId));
            }
            if (result && result.title === savedSummaries.find((s) => s.id === summaryId)?.title) {
                setResult(null);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to delete summary';
            toast({ title: 'Delete failed', description: msg, variant: 'destructive' });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard!" });
    };

    const downloadAsText = () => {
        if (!result) return;
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let yPosition = margin;

        // Title
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(result.title, margin, yPosition);
        yPosition += 15;

        // Summary section
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Summary", margin, yPosition);
        yPosition += 10;
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const summaryLines = doc.splitTextToSize(result.shortSummary, pageWidth - 2 * margin);
        doc.text(summaryLines, margin, yPosition);
        yPosition += summaryLines.length * 5 + 10;

        // Key Points section
        if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = margin;
        }
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Key Points", margin, yPosition);
        yPosition += 10;
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        result.keyPoints.forEach((point, index) => {
            if (yPosition > pageHeight - 20) {
                doc.addPage();
                yPosition = margin;
            }
            doc.text(`${index + 1}. ${point}`, margin, yPosition);
            yPosition += 7;
        });

        // Study Notes section
        if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = margin;
        }
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Study Notes", margin, yPosition);
        yPosition += 10;
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const notesLines = doc.splitTextToSize(result.studyNotes, pageWidth - 2 * margin);
        doc.text(notesLines, margin, yPosition);

        // Save the PDF
        doc.save("ai-summary.pdf");
        toast({ title: "Downloaded!", description: "Summary saved as ai-summary.pdf" });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: 'hsl(224deg 92.37% 26.93%)' }}
                >
                    <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">AI Content Summarizer</h1>
                    <p className="text-sm text-muted-foreground">Paste lesson content and get AI-powered summaries, key points, and study notes</p>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <Button 
                        asChild 
                        size="sm"
                        style={{ backgroundColor: 'hsl(224deg 92.37% 26.93%)', color: 'white' }}
                    >
                        <Link to="/saved-summaries">History</Link>
                    </Button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3"
                >
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-medium text-destructive">
                            {error.includes('extract') ? 'File Extraction Error' : 'Summarization Error'}
                        </p>
                        <p className="text-sm text-destructive/80 mt-1">{error}</p>
                        
                        {/* File Extraction Error Solutions */}
                        {error.includes('scanned') && (
                            <div className="mt-3 p-3 bg-amber-100/50 rounded-lg border border-amber-200/50">
                                <p className="text-xs font-semibold text-amber-900 mb-1">💡 Solution:</p>
                                <ul className="text-xs text-amber-900 space-y-1">
                                    <li>• Try converting the PDF with an OCR tool (Google Drive, Adobe, or ILovePDF)</li>
                                    <li>• Copy the text manually and paste it into the text area</li>
                                    <li>• Check if the scanned image quality is clear enough for OCR</li>
                                </ul>
                            </div>
                        )}
                        
                        {error.includes('password') && (
                            <div className="mt-3 p-3 bg-amber-100/50 rounded-lg border border-amber-200/50">
                                <p className="text-xs font-semibold text-amber-900 mb-1">💡 Solution:</p>
                                <ul className="text-xs text-amber-900 space-y-1">
                                    <li>• Remove the password protection from the PDF</li>
                                    <li>• Save as a new PDF file without protection</li>
                                    <li>• Use an online PDF tool to remove the password</li>
                                </ul>
                            </div>
                        )}

                        {error.includes('empty') && (
                            <div className="mt-3 p-3 bg-amber-100/50 rounded-lg border border-amber-200/50">
                                <p className="text-xs font-semibold text-amber-900 mb-1">💡 Solution:</p>
                                <ul className="text-xs text-amber-900 space-y-1">
                                    <li>• Make sure the file contains readable text</li>
                                    <li>• Try uploading a different file</li>
                                    <li>• Paste text directly into the text area</li>
                                </ul>
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => setError(null)}
                        className="text-destructive/70 hover:text-destructive transition-colors"
                    >
                        ✕
                    </button>
                </motion.div>
            )}

            {/* Input */}
            <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
                <Textarea
                    placeholder="Paste your lesson text, lecture notes, or any learning material here...\n\nThe AI will analyze the content and create:\n• A concise summary\n• Key bullet points\n• Study notes with review questions"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="bg-muted/50"
                />
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        {content.split(/\s+/).filter(Boolean).length} words {content.length > 0 && `/ ${content.length} characters`}
                    </p>
                    <div className="flex items-center gap-3">
                        <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={handleFileUpload} className="hidden" id="sum-file-upload" />
                        <label
                            htmlFor="sum-file-upload"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            {pdfName || "Upload File"}
                        </label>
                        <Button 
                            onClick={handleSummarize} 
                            disabled={summarizing || !content.trim()} 
                            className="gap-1.5"
                            style={{ backgroundColor: 'hsl(224deg 92.37% 26.93%)', color: 'white' }}
                        >
                            {summarizing ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Summarizing...</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> Summarize</>
                            )}
                        </Button>
                        {result && (
                            <Button variant="outline" onClick={() => { setResult(null); setError(null); }} className="gap-1.5">
                                <RotateCcw className="w-4 h-4" /> Reset
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading */}
            {summarizing && (
                <div className="bg-card rounded-xl border border-border shadow-card p-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                    <p className="text-foreground font-medium">AI is analyzing your content...</p>
                    <p className="text-sm text-muted-foreground mt-1">Extracting key concepts and generating summaries</p>
                </div>
            )}

            {/* Result */}
            {!summarizing && result && (
                <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: "Original Words", value: result.wordCount, icon: FileText },
                            { label: "Reading Time", value: result.readingTime, icon: BookOpen },
                            { label: "Key Points", value: result.keyPoints.length, icon: List },
                            { label: "Compression", value: `${Math.round((1 - result.shortSummary.length / Math.max(1, content.length)) * 100)}%`, icon: Sparkles },
                        ].map(stat => (
                            <div key={stat.label} className="bg-card rounded-xl p-3 border border-border">
                                <stat.icon className="w-4 h-4 text-primary mb-1" />
                                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                        <div className="flex border-b border-border">
                            {[
                                { key: "summary", label: "Summary", icon: Sparkles },
                                { key: "points", label: "Key Points", icon: List },
                                { key: "notes", label: "Study Notes", icon: Lightbulb },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.key
                                        ? "bg-primary/5 text-primary border-b-2 border-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-5">
                            {activeTab === "summary" && (
                                <div>
                                    <p className="text-sm text-foreground leading-relaxed">{result.shortSummary}</p>
                                </div>
                            )}

                            {activeTab === "points" && (
                                <div className="space-y-2">
                                    {result.keyPoints.map((point, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                                {i + 1}
                                            </span>
                                            <p className="text-sm text-foreground leading-relaxed">{point}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === "notes" && (
                                <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                                    {result.studyNotes}
                                </pre>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                                <Button variant="outline" size="sm" onClick={() => copyToClipboard(
                                    activeTab === "summary" ? result.shortSummary
                                        : activeTab === "points" ? result.keyPoints.join("\n")
                                            : result.studyNotes
                                )} className="gap-1.5">
                                    <Copy className="w-3.5 h-3.5" /> Copy
                                </Button>
                                <Button 
                                    size="sm" 
                                    onClick={downloadAsText} 
                                    className="gap-1.5"
                                    style={{ backgroundColor: 'hsl(224deg 92.37% 26.93%)', color: 'white' }}
                                >
                                    <Download className="w-3.5 h-3.5" /> Download PDF
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Saved Summaries */}
            <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Saved Summaries</h2>
                    <Button size="sm" variant="outline" onClick={loadSavedSummaries} className="gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" /> Refresh
                    </Button>
                </div>

                {loadingSavedSummaries ? (
                    <p className="text-sm text-muted-foreground">Loading saved summaries...</p>
                ) : !localStorage.getItem('lms_token') && !sessionStorage.getItem('lms_token') ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-2">Login required to view saved summaries.</p>
                        <p className="text-xs text-muted-foreground">Your summaries will be saved automatically when you log in!</p>
                    </div>
                ) : savedSummaries.length === 0 ? (
                    <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-2">No saved summaries yet.</p>
                        <p className="text-xs text-muted-foreground">Create your first summary above to see it saved here!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {savedSummaries.map((saved) => (
                            <div key={saved.id} className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate" title={saved.title}>{saved.title || `Summary #${saved.id}`}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {saved.word_count} words · {saved.reading_time}
                                            {saved.created_at ? ` · ${new Date(saved.created_at).toLocaleString()}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button size="sm" variant="outline" onClick={() => viewSavedSummary(saved)}>View</Button>
                                        <Button size="sm" variant="destructive" onClick={() => deleteSavedSummary(saved.id)}>Delete</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ContentSummarizer;
