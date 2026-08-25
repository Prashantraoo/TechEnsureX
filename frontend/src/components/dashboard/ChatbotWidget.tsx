import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiApi } from "@/lib/api";

type Msg = { role: "user" | "bot"; text: string };

const seed: Msg[] = [
  { role: "bot", text: "Hi! I'm EnsureAI. Ask me anything about your claims, policies or coverage." },
];

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgs, loading, open]);

  const send = async () => {
    if (!input.trim()) return;

    const newMsgs: Msg[] = [...msgs, { role: "user", text: input }];
    setMsgs(newMsgs);
    setInput("");
    setLoading(true);

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
          next[next.length - 1] = { role: "bot", text: "I'm having trouble connecting right now. Please try again later." };
          return next;
        });
      }
    } catch {
      setMsgs(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "bot", text: "I'm having trouble connecting right now. Please try again later." };
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-primary shadow-elevated grid place-items-center text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {open ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
            exit={{ opacity: 0, y: 8, scale: 0.96, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] h-[480px] bg-card border border-border/70 rounded-2xl shadow-elevated flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-gradient-primary text-primary-foreground flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/20 grid place-items-center backdrop-blur">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">EnsureAI Assistant</p>
                <p className="text-xs text-primary-foreground/80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" /> Online
                </p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                    m.role === "user" ? "bg-gradient-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border/70 rounded-bl-sm"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border/70 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce delay-75" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce delay-150" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            
            <div className="p-3 border-t border-border bg-card flex gap-2 shrink-0">
              <label htmlFor="chatbot-input" className="sr-only">Message EnsureAI</label>
              <Input
                id="chatbot-input"
                value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask anything…" className="h-10"
                disabled={loading}
              />
              <Button onClick={send} disabled={!input.trim() || loading} size="icon" className="h-10 w-10 bg-gradient-primary shrink-0" aria-label="Send message">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
