import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User as UserIcon, Sparkles, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { getCurrentUser, AuthUser } from "@/lib/auth";
import { aiApi } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";

type Msg = { role: "user" | "bot"; text: string };

const suggestions = [
  "What is the status of my claim CL-2041?",
  "Find cashless hospitals near Bandra.",
  "Does my plan cover maternity?",
  "How much of my sum insured is left?",
];

export default function Assistant() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Tracks whether the user was already at (or near) the bottom before this
  // update, so a new message only auto-scrolls when they're following along
  // — not while they've deliberately scrolled up to reread something.
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    async function load() {
      const u = await getCurrentUser();
      setUser(u);
      setMsgs([{
        role: "bot",
        text: `Hi ${u?.name || "there"}! I'm EnsureAI. I can help you with your policies, claims, or finding hospitals. How can I assist you today?`
      }]);
    }
    load();
  }, []);

  useEffect(() => {
    // Instant, not smooth: a streamed reply re-triggers this on every chunk,
    // and a smooth animation restarted that often never catches up to the
    // growing content — which reads as "stopped following" even though the
    // user never scrolled.
    if (stickToBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [msgs, loading]);

  const handleConversationScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const newMsgs: Msg[] = [...msgs, { role: "user", text }];
    setMsgs(newMsgs);
    setInput("");
    setLoading(true);

    // Map format for API
    const apiMessages = newMsgs.map(m => ({
      role: m.role === "bot" ? "assistant" : "user",
      content: m.text
    }));

    // Placeholder bubble filled in as chunks arrive, so the reply forms
    // progressively instead of appearing all at once after the full
    // generation completes.
    setMsgs([...newMsgs, { role: "bot", text: "" }]);
    let botText = "";
    let receivedAny = false;

    try {
      await aiApi.chat(apiMessages, (chunk) => {
        receivedAny = true;
        botText += chunk;
        setLoading(false);
        setMsgs(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: "bot", text: botText };
          return next;
        });
      });
      if (!receivedAny) {
        setMsgs(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: "bot", text: "Sorry, I'm having trouble connecting to the AI brain right now." };
          return next;
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get AI response.");
      setMsgs(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "bot", text: "Sorry, I'm having trouble connecting to the AI brain right now." };
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <PageHeader
        title={<span className="flex items-center gap-2">EnsureAI <Sparkles className="w-5 h-5 text-accent" /></span>}
        description="Your personal insurance expert."
      />

      <Card className="flex-1 flex flex-col overflow-hidden bg-background/50 border-border/70">
        <div ref={scrollRef} onScroll={handleConversationScroll} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6">
          {msgs.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-4 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-10 h-10 rounded-full shrink-0 grid place-items-center ${
                m.role === "bot" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {m.role === "bot" ? <Bot className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                m.role === "user" ? "bg-muted text-foreground rounded-tr-sm" 
                : "bg-gradient-card border border-border/70 rounded-tl-sm prose prose-sm dark:prose-invert"
              }`}>
                {/* Simple render of markdown for bot */}
                {m.text.split('\n').map((line, idx) => (
                  <span key={idx}>
                    {line}
                    <br/>
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground shrink-0 grid place-items-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-gradient-card border border-border/70 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-75" />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-150" />
              </div>
            </motion.div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-4 border-t border-border bg-card">
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map(s => (
              <Badge 
                key={s} variant="secondary" 
                className="cursor-pointer hover:bg-secondary hover:text-secondary-foreground transition-colors py-1.5 px-3"
                onClick={() => handleSend(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="assistant-input" className="sr-only">Ask EnsureAI</label>
            <Input
              id="assistant-input"
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend(input)}
              placeholder="Ask EnsureAI about claims, policies, or coverage..."
              className="h-12 bg-background border-border"
              disabled={loading}
            />
            <Button onClick={() => handleSend(input)} disabled={!input.trim() || loading} size="icon" className="h-12 w-12 shrink-0" aria-label="Send message">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
