import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { discussionAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ThumbsUp, MessageSquare, Pin, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Reply {
  id: number;
  author_name: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
  replies?: Reply[];
}

interface Post {
  id: number;
  author_name: string;
  author_avatar: string | null;
  title: string;
  content: string;
  replies?: Reply[];
  reply_count: number;
  likes_count: number;
  is_pinned: boolean;
  is_liked?: boolean;
  created_at: string;
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
};

const ReplyItem = ({
  reply,
  postId,
  replyToReply,
  setReplyToReply,
  replyText,
  setReplyText,
  submitReply,
  replyingId,
  formatTime,
}: {
  reply: Reply;
  postId: number;
  replyToReply: { postId: number; replyId: number } | null;
  setReplyToReply: (v: { postId: number; replyId: number } | null) => void;
  replyText: string;
  setReplyText: (v: string) => void;
  submitReply: (postId: number, parentReplyId?: number | null) => void;
  replyingId: number | null;
  formatTime: (s: string) => string;
}) => {
  const isReplyingToThis = replyToReply?.replyId === reply.id;
  const nestedReplies = reply.replies ?? [];
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[10px] font-semibold flex-shrink-0 mt-0.5">
          {(reply.author_name || "?").charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">
            {reply.author_name}{" "}
            <span className="font-normal text-muted-foreground">
              · {formatTime(reply.created_at)}
            </span>
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">{reply.content}</p>
          <button
            onClick={() => setReplyToReply(isReplyingToThis ? null : { postId, replyId: reply.id })}
            className="text-xs text-primary hover:underline mt-1"
          >
            Reply
          </button>
        </div>
      </div>
      {isReplyingToThis && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="pl-8"
        >
          <Textarea
            placeholder="Write a reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            className="bg-muted/50 mt-1"
          />
          <div className="flex justify-end mt-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReplyToReply(null);
                setReplyText("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => submitReply(postId, reply.id)}
              disabled={!replyText.trim() || replyingId === postId}
            >
              {replyingId === postId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reply"}
            </Button>
          </div>
        </motion.div>
      )}
      {nestedReplies.length > 0 && (
        <div className="pl-6 ml-2 border-l-2 border-border space-y-2">
          {nestedReplies.map((r) => (
            <ReplyItem
              key={r.id}
              reply={r}
              postId={postId}
              replyToReply={replyToReply}
              setReplyToReply={setReplyToReply}
              replyText={replyText}
              setReplyText={setReplyText}
              submitReply={submitReply}
              replyingId={replyingId}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Discussions = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyToReply, setReplyToReply] = useState<{ postId: number; replyId: number } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [loadedReplies, setLoadedReplies] = useState<Record<number, Reply[]>>({});

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await discussionAPI.getPosts();
      const data = res?.data ?? res?.posts ?? res;
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch discussions:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const loadReplies = async (postId: number) => {
    if (loadedReplies[postId]) return;
    try {
      const res = await discussionAPI.getPostDetails(postId);
      const data = res?.data ?? res;
      const replies = data?.replies ?? [];
      setLoadedReplies((prev) => ({ ...prev, [postId]: replies }));
    } catch (err) {
      console.error("Failed to load replies:", err);
    }
  };

  const handlePost = async () => {
    const title = newTitle.trim() || "Untitled";
    if (!newContent.trim()) return;
    try {
      setPosting(true);
      await discussionAPI.createPost(title, newContent.trim());
      setNewTitle("");
      setNewContent("");
      await fetchPosts();
    } catch (err) {
      console.error("Failed to create post:", err);
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (id: number) => {
    try {
      const res = await discussionAPI.toggleLike(id);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                likes_count: p.likes_count + (res?.liked ? 1 : -1),
                is_liked: res?.liked ?? !p.is_liked,
              }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const submitReply = async (postId: number, parentReplyId?: number | null) => {
    if (!replyText.trim()) return;
    try {
      setReplyingId(postId);
      await discussionAPI.createReply(postId, replyText.trim(), parentReplyId);
      const res = await discussionAPI.getPostDetails(postId);
      const data = res?.data ?? res;
      setLoadedReplies((prev) => ({ ...prev, [postId]: data?.replies ?? [] }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, reply_count: p.reply_count + 1 } : p
        )
      );
      setReplyTo(null);
      setReplyToReply(null);
      setReplyText("");
      setExpandedReplies((prev) => new Set(prev).add(postId));
    } catch (err) {
      console.error("Failed to create reply:", err);
    } finally {
      setReplyingId(null);
    }
  };

  const toggleReplies = async (id: number) => {
    if (!expandedReplies.has(id)) {
      await loadReplies(id);
    }
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTogglePin = async (id: number) => {
    try {
      const res = await discussionAPI.togglePin(id);
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_pinned: res?.pinned ?? !p.is_pinned } : p))
      );
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  };

  const isInstructor = user?.role === "instructor" || user?.role === "admin";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Discussion Forum</h1>
        <p className="text-muted-foreground mt-1">Engage with your peers and instructors</p>
      </div>

      {/* New Post */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-card">
        <Input
          placeholder="Title (optional)"
          value={String(newTitle || "")}
          onChange={(e) => setNewTitle(e.target.value)}
          className="mb-2 bg-muted/50"
        />
        <Textarea
          placeholder="Start a new discussion..."
          value={String(newContent || "")}
          onChange={(e) => setNewContent(e.target.value)}
          rows={3}
          className="bg-muted/50"
        />
        <div className="flex justify-end mt-3">
          <Button
            onClick={handlePost}
            disabled={!newContent.trim() || posting}
            size="sm"
            className="gap-1.5"
          >
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Post
          </Button>
        </div>
      </div>

      {/* Threads */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const replies = loadedReplies[post.id] ?? [];
            const showReplies = expandedReplies.has(post.id);
            return (
              <div
                key={post.id}
                className={`bg-card rounded-xl p-5 border shadow-card ${
                  post.is_pinned ? "border-accent/30 bg-accent/5" : "border-border"
                }`}
              >
                {!!post.is_pinned && (
                  <div className="flex items-center gap-1 text-xs text-accent font-medium mb-2">
                    <Pin className="w-3 h-3" /> Pinned by Instructor
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                      {(post.author_name || "?").charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{post.author_name}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(post.created_at)}</p>
                    </div>
                  </div>
                  {isInstructor && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePin(post.id)}
                      className="gap-1 text-xs"
                    >
                      <Pin className="w-3 h-3" />
                      {post.is_pinned ? "Unpin" : "Pin"}
                    </Button>
                  )}
                </div>
                <h3 className="font-medium text-foreground text-sm">{post.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{post.content}</p>
                <div className="flex items-center gap-4 mt-4 flex-wrap">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1 text-sm transition-colors ${
                      post.is_liked ? "text-accent" : "text-muted-foreground hover:text-accent"
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" /> {post.likes_count > 0 ? post.likes_count : ""}
                  </button>
                  <button
                    onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" /> Add Reply
                  </button>
                  {post.reply_count > 0 && (
                    <button
                      onClick={() => toggleReplies(post.id)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showReplies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {showReplies ? "Hide" : "Show"} {post.reply_count} replies
                    </button>
                  )}
                </div>

                {/* Replies list (recursive for nested) */}
                {showReplies && replies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3 pl-4">
                    {replies.map((r) => (
                      <ReplyItem
                        key={r.id}
                        reply={r}
                        postId={post.id}
                        replyToReply={replyToReply}
                        setReplyToReply={setReplyToReply}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        submitReply={submitReply}
                        replyingId={replyingId}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                )}

                {/* Reply input (to post) */}
                {replyTo === post.id && !replyToReply && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-3 pt-3 border-t border-border"
                  >
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      className="bg-muted/50"
                    />
                    <div className="flex justify-end mt-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyTo(null);
                          setReplyText("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => submitReply(post.id)}
                        disabled={!replyText.trim() || replyingId === post.id}
                      >
                        {replyingId === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reply"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="bg-card rounded-xl p-12 border border-border text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No discussions yet. Start the first one!</p>
        </div>
      )}
    </motion.div>
  );
};

export default Discussions;
