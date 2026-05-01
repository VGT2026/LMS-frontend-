import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Search, Loader2, Plus, MessageSquare } from "lucide-react";
import { messageAPI, authAPI } from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Message {
    id: number;
    conversation_id: number;
    sender_id: number;
    content: string;
    is_read: boolean;
    created_at: string;
}

interface Participant {
    user_id: number;
    name: string;
    avatar: string | null;
    role: string;
}

interface Conversation {
    id: number;
    participants: Participant[];
    last_message?: {
        content: string;
        sender_id: number;
        created_at: string;
        is_read: boolean;
    };
    unread_count: number;
}

interface UserResult {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string;
}

const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const MessagesPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMsg, setNewMsg] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [startingChatWith, setStartingChatWith] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchConversations = async () => {
        try {
            const data = await messageAPI.getConversations();
            setConversations(data);
        } catch (error) {
            console.error("Failed to fetch conversations", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchMessages = async (convId: number) => {
        try {
            const data = await messageAPI.getMessages(convId);
            setMessages(data);
            await messageAPI.markAsRead(convId);
            setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c));
        } catch (error) {
            console.error("Failed to fetch messages", error);
        }
    };

    useEffect(() => {
        if (activeId) {
            fetchMessages(activeId);
            const interval = setInterval(() => fetchMessages(activeId), 5000);
            return () => clearInterval(interval);
        }
    }, [activeId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const search = async () => {
            if (userSearchQuery.trim().length < 2) {
                setSearchResults([]);
                return;
            }
            setSearchingUsers(true);
            try {
                const results = await authAPI.searchUsers(userSearchQuery);
                const rawResults = results?.data || results || [];
                const visibleResults = user?.role === "student"
                    ? rawResults.filter((u: UserResult) => u.role !== "admin")
                    : rawResults;
                setSearchResults(visibleResults);
            } catch (error) {
                console.error("Failed to search users", error);
            } finally {
                setSearchingUsers(false);
            }
        };
        const debounce = setTimeout(search, 500);
        return () => clearTimeout(debounce);
    }, [userSearchQuery, user?.role]);

    const containsRestrictedNumbers = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return false;
        const onlyDigits = /^\d+$/;
        const hasLongDigitString = /\d{6,}/;
        const hasPhoneNumber = /\b\d{10,}\b|(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/;
        return onlyDigits.test(trimmed) || hasLongDigitString.test(trimmed) || hasPhoneNumber.test(trimmed);
    };

    const sendMessage = async () => {
        if (!newMsg.trim() || !activeId) return;
        if (containsRestrictedNumbers(newMsg)) {
            toast({
                title: "Cannot send",
                description: "Sharing numbers is not allowed. Use text like 'My score is 85' to share scores.",
                variant: "destructive",
            });
            return;
        }
        setSending(true);
        try {
            const sentMsg = await messageAPI.sendMessage({ conversationId: activeId, content: newMsg });
            setMessages(prev => [...prev, sentMsg]);
            setNewMsg("");
            fetchConversations().catch(err => console.error("Failed to refresh conversations:", err));
        } catch (error) {
            console.error("Failed to send message", error);
            toast({
                title: "Failed to send",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            });
        } finally {
            setSending(false);
        }
    };

    const startNewChat = async (recipientId: number) => {
        if (startingChatWith !== null) return;
        setStartingChatWith(recipientId);
        try {
            const existing = conversations.find(c => c.participants.some(p => p.user_id === recipientId));
            if (existing) {
                setActiveId(existing.id);
                setIsNewChatOpen(false);
                return;
            }
            const sentMsg = await messageAPI.sendMessage({ recipientId, content: "Hi!" });
            await fetchConversations();
            setActiveId(sentMsg.conversation_id);
            setIsNewChatOpen(false);
        } catch (error) {
            console.error("Failed to start chat", error);
            toast({
                title: "Failed to start chat",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            });
        } finally {
            setStartingChatWith(null);
        }
    };

    const getOtherParticipant = (conv: Conversation) => {
        if (!conv.participants || conv.participants.length === 0) return null;
        return conv.participants.find(p => String(p.user_id) !== user?.id) || conv.participants[0];
    };

    const filtered = conversations.filter(c => {
        const other = getOtherParticipant(c);
        return other?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    });

    const activeConv = conversations.find(c => c.id === activeId);
    const otherParticipant = activeConv ? getOtherParticipant(activeConv) : null;

    if (loading && conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-[calc(100vh-7rem)] flex rounded-lg overflow-hidden bg-muted/30 shadow-sm"
        >
            {/* Sidebar - Facebook Messenger layout */}
            <div className="w-80 sm:w-96 flex flex-col flex-shrink-0 bg-card border-r border-border overflow-x-hidden">
                <div className="p-3 border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-semibold text-foreground">Chats</h2>
                        <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1.5 h-9 px-3 rounded-full">
                                    <Plus className="h-4 w-4" /> New chat
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-semibold">New Message</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-2">
                                    <Input
                                        placeholder="Search by name or email..."
                                        value={userSearchQuery}
                                        onChange={e => setUserSearchQuery(e.target.value)}
                                        className="h-10 rounded-lg bg-muted"
                                    />
                                    <div className="max-h-[280px] overflow-y-auto space-y-1 rounded-lg bg-muted/50 p-2">
                                        {searchingUsers ? (
                                            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                        ) : searchResults.length > 0 ? (
                                            searchResults.map(u => {
                                                const isStarting = startingChatWith === u.id;
                                                return (
                                                    <button
                                                        key={u.id}
                                                        type="button"
                                                        disabled={startingChatWith !== null}
                                                        onClick={() => startNewChat(u.id)}
                                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left cursor-pointer select-none touch-manipulation disabled:opacity-70 disabled:cursor-not-allowed"
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold uppercase shrink-0">
                                                            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : (u.avatar || u.name.charAt(0))}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[15px] font-medium text-foreground truncate">{u.name}</p>
                                                            <p className="text-[13px] text-muted-foreground capitalize">{u.role}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        ) : userSearchQuery.length >= 2 ? (
                                            <p className="text-[15px] text-muted-foreground text-center py-6">No users found</p>
                                        ) : (
                                            <p className="text-[15px] text-muted-foreground text-center py-6">Type at least 2 characters to search</p>
                                        )}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search conversations..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 h-9 rounded-lg bg-muted border-0 text-sm focus-visible:ring-0"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <MessageSquare className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No conversations yet</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">Start a new chat to connect with others</p>
                        </div>
                    ) : (
                        <div>
                            {filtered.map((conv, idx) => {
                                const other = getOtherParticipant(conv);
                                const isActive = activeId === conv.id;
                                return (
                                    <motion.button
                                        key={conv.id}
                                        type="button"
                                        initial={{ opacity: 0, x: -4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        onClick={() => setActiveId(conv.id)}
                                        className={`w-full text-left px-3 py-2.5 flex items-center gap-3 cursor-pointer select-none touch-manipulation border-b border-border/50 ${
                                            isActive ? "bg-primary/10" : "hover:bg-muted/50"
                                        }`}
                                    >
                                        <div className="shrink-0">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold text-primary-foreground bg-primary">
                                                {other?.avatar || other?.name?.charAt(0) || '?'}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-[15px] truncate ${conv.unread_count > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                                                    {other?.name || 'Unknown User'}
                                                </p>
                                                <span className="text-[12px] text-muted-foreground shrink-0">
                                                    {conv.last_message ? formatTime(conv.last_message.created_at) : ''}
                                                </span>
                                            </div>
                                            <p className={`text-[13px] truncate mt-0.5 ${conv.unread_count > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                                                {conv.last_message?.content || 'No messages yet'}
                                            </p>
                                        </div>
                                        {conv.unread_count > 0 && (
                                            <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground">
                                                {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                            </span>
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat area - Facebook Messenger layout */}
            <AnimatePresence mode="wait">
                {activeConv && otherParticipant ? (
                    <motion.div
                        key="chat"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col bg-background"
                    >
                        {/* Chat header */}
                        <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold bg-primary">
                                {otherParticipant.avatar || otherParticipant.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-semibold text-foreground truncate">{otherParticipant.name || 'Unknown User'}</p>
                                <p className="text-[13px] text-muted-foreground capitalize">{otherParticipant.role || 'User'}</p>
                            </div>
                        </div>

                        {/* Messages - Facebook bubble layout */}
                        <div className="flex-1 overflow-y-auto p-4 bg-muted/30">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                                        <MessageSquare className="h-10 w-10 text-muted-foreground" />
                                    </div>
                                    <p className="text-[15px] font-medium text-foreground">No messages yet</p>
                                    <p className="text-[13px] text-muted-foreground mt-1">Send a message to start the conversation</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {messages.map((msg, idx) => {
                                        const isMe = String(msg.sender_id) === user?.id;
                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.01 }}
                                                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                                            >
                                                <div className={`max-w-[65%] px-4 py-2 rounded-[18px] text-[15px] ${
                                                    isMe
                                                        ? "bg-primary text-primary-foreground rounded-br-[4px]"
                                                        : "bg-card text-foreground rounded-bl-[4px] shadow-sm border border-border"
                                                }`}>
                                                    <p className="leading-snug whitespace-pre-wrap break-words">
                                                        {msg.content}
                                                        <span className={`ml-2 text-[11px] align-bottom ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input - Facebook style layout */}
                        <div className="p-3 bg-card border-t border-border">
                            <div className="flex gap-2 items-center">
                                <Input
                                    placeholder="Aa"
                                    value={newMsg}
                                    onChange={e => setNewMsg(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                                    className="flex-1 h-10 rounded-[20px] bg-muted border-0 text-[15px] focus-visible:ring-0 px-4"
                                    disabled={sending}
                                />
                                <Button
                                    onClick={sendMessage}
                                    disabled={!newMsg.trim() || sending}
                                    size="icon"
                                    className="h-10 w-10 rounded-full shrink-0"
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center bg-muted/30 p-8"
                    >
                        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                            <MessageSquare className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-[17px] font-semibold text-foreground mb-2">Your messages</h3>
                        <p className="text-[15px] text-muted-foreground text-center max-w-sm mb-6">
                            Select a conversation from the sidebar or start a new chat to connect with instructors and peers.
                        </p>
                        <Button onClick={() => setIsNewChatOpen(true)} className="gap-2 rounded-full">
                            <Plus className="h-4 w-4" /> New message
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default MessagesPage;
