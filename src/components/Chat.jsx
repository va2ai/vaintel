import { useState, useRef, useCallback, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { CloseIcon, SendIcon, BookIcon } from './icons.jsx';

const CHAT_API = import.meta.env.DEV 
  ? "/api/chat/message" 
  : "https://vet-research-524576132881.us-central1.run.app/api/chat/message";

export function Chat({ contextTitle, contextType, contextText, suggestions }) {
  const [showChat, setShowChat] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([
    { role: "ai", text: "Welcome to the V2V Research Assistant. I can search BVA decisions, look up CAVC precedent, navigate 38 CFR, and help with claims strategy. What can I help you research?", tools: [] }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedTool, setExpandedTool] = useState(null);
  const chatEnd = useRef(null);
  const streamTextRef = useRef("");
  const chatHistoryRef = useRef([]);
  const chatLoadingRef = useRef(false);

  // Default suggestions if none provided
  const activeSuggestions = suggestions || ["TDIU eligibility", "Search BVA decisions", "38 CFR lookup", "Secondary conditions"];

  // Update initial greeting if opened with context and no history
  useEffect(() => {
    if (chatHistoryRef.current.length === 0 && contextTitle) {
      let text = `I see you're reading **${contextTitle}**. Do you have any specific questions about this ${contextType}, or can I help you research something else?`;
      
      // Special handling for the Medication Rule context to add the legal rights preamble
      if (contextTitle.includes("Medication Rule")) {
        text = `**Proposed Rating Reductions** — If you ever receive a proposed rating reduction notice, you have rights to respond and submit evidence; the VA must show actual sustained improvement under 38 CFR § 3.344.\n\nI see you're reading about the medication rule withdrawal. How can I help you research this?`;
      }

      setChatMsgs([
        { 
          role: "ai", 
          text: text, 
          tools: [] 
        }
      ]);
    }
  }, [contextTitle, contextType]);

  // Nexus Scout chat handoff
  useEffect(() => {
    if (window.__nexusScoutQuery) {
      const q = window.__nexusScoutQuery;
      delete window.__nexusScoutQuery;
      setChatInput(q);
      setShowChat(true);
    }
  }, []);

  useEffect(() => {
    if (showChat) chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs, showChat]);

  const sendChatMsg = useCallback(async (q) => {
    if (!q.trim() || chatLoadingRef.current) return;
    const originalText = q.trim();

    // Inject context behind the scenes if it's the very first user message
    let apiText = originalText;
    if (chatHistoryRef.current.length === 0 && contextTitle) {
      if (contextText) {
        // Strip markdown characters for cleaner AI consumption
        const cleanContent = contextText.replace(/[#*`]/g, '').substring(0, 4000);
        // Explicitly say we are "pasting" the text to bypass the AI's anti-web-browsing refusal
        apiText = `I am pasting the following text for you to use as context for my question:\n\n<pasted_context>\nTitle: ${contextTitle}\n\n${cleanContent}\n</pasted_context>\n\nMy Question: ${originalText}`;
      } else {
        apiText = `My question relates to the topic: ${contextTitle}.\n\nQuestion: ${originalText}`;
      }
    }

    // Add user message
    const userMsg = { role: "user", text: originalText, tools: [] };
    setChatMsgs(p => [...p, userMsg]);
    chatHistoryRef.current.push({ role: "user", content: apiText });

    // Add placeholder assistant message
    setChatMsgs(p => [...p, { role: "ai", text: "", tools: [], streaming: true }]);
    setChatLoading(true);
    chatLoadingRef.current = true;
    streamTextRef.current = "";

    try {
      const body = { message: apiText, history: chatHistoryRef.current.slice(0, -1) };
      const res = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText.substring(0, 120));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const tools = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;
          let evt;
          try { evt = JSON.parse(raw); } catch { continue; }

          if (evt.event === "delta" && evt.text) {
            streamTextRef.current += evt.text;
            setChatMsgs(p => {
              const updated = [...p];
              const last = updated[updated.length - 1];
              if (last && last.role === "ai") {
                updated[updated.length - 1] = { ...last, text: streamTextRef.current };
              }
              return updated;
            });
          } else if (evt.event === "tool_start") {
            tools.push({ tool: evt.tool, input: evt.input });
            setChatMsgs(p => {
              const updated = [...p];
              const last = updated[updated.length - 1];
              if (last && last.role === "ai") {
                updated[updated.length - 1] = { ...last, tools: [...tools] };
              }
              return updated;
            });
          } else if (evt.event === "complete") {
            break;
          } else if (evt.event === "error") {
            throw new Error(evt.detail || "Agent error");
          }
        }
      }

      // Finalize
      const finalText = streamTextRef.current;
      if (finalText) {
        chatHistoryRef.current.push({ role: "assistant", content: finalText });
      }
      setChatMsgs(p => {
        const updated = [...p];
        const last = updated[updated.length - 1];
        if (last && last.role === "ai") {
          updated[updated.length - 1] = { ...last, streaming: false };
        }
        return updated;
      });
    } catch (e) {
      setChatMsgs(p => {
        const updated = [...p];
        const last = updated[updated.length - 1];
        if (last && last.role === "ai") {
          updated[updated.length - 1] = { ...last, text: `Error: ${e.message}`, streaming: false };
        }
        return updated;
      });
    } finally {
      setChatLoading(false);
      chatLoadingRef.current = false;
    }
  }, [chatMsgs.length]);

  const handleChat = useCallback(() => {
    if (!chatInput.trim()) return;
    const q = chatInput.trim();
    setChatInput("");
    sendChatMsg(q);
  }, [chatInput, sendChatMsg]);

  const sendQuickChat = useCallback((text) => {
    sendChatMsg(text);
  }, [sendChatMsg]);

  // Render sanitized AI markdown -- DOMPurify strips all unsafe HTML
  const renderAIMessage = (text) => {
    const sanitized = DOMPurify.sanitize(marked.parse(text));
    return { __html: sanitized };
  };

  return (
    <>
      {/* FLOATING CHAT PANEL */}
      {showChat && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", animation: "fadeIn 0.2s ease-out" }} onClick={(e) => { if (e.target === e.currentTarget) setShowChat(false); }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: "85vh", height: 520, background: "var(--white)", borderRadius: "16px 16px 0 0", display: "flex", flexDirection: "column", animation: "slideUp 0.3s ease-out", boxShadow: "0 -8px 32px rgba(0,0,0,0.2)" }} className="chat-panel">
            <div style={{ padding: "14px 20px", background: "var(--navy-900)", borderRadius: "16px 16px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "dotPulse 2s infinite" }} />
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: "rgba(255,255,255,0.8)" }}>V2V Research Assistant</span>
              </div>
              <button onClick={() => setShowChat(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 4, minHeight: 44, justifyContent: "center" }}><CloseIcon /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {chatMsgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "88%", display: "flex", flexDirection: "column", gap: 6 }}>
                    {/* Tool badges */}
                    {m.tools && m.tools.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {m.tools.map((t, j) => {
                          const colors = { search_bva_cases: { bg: "rgba(26,58,107,0.12)", color: "#1A3A6B", label: "BVA" }, lookup_cfr_section: { bg: "rgba(27,107,58,0.12)", color: "#1B6B3A", label: "CFR" }, search_knowva: { bg: "rgba(212,118,10,0.12)", color: "#D4760A", label: "KnowVA" } };
                          const c = colors[t.tool] || { bg: "rgba(0,0,0,0.06)", color: "var(--ink-light)", label: t.tool };
                          return (
                            <span key={j} style={{ padding: "3px 8px", borderRadius: 4, background: c.bg, fontSize: 10, fontFamily: "'JetBrains Mono'", fontWeight: 600, color: c.color, letterSpacing: "0.03em", minHeight: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 4, height: 4, borderRadius: "50%", background: c.color, animation: "dotPulse 1.5s infinite" }} />
                              {c.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {/* Message bubble */}
                    {(m.text || m.streaming) && (
                      <div style={{ padding: "10px 14px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: m.role === "user" ? "var(--navy-800)" : "var(--cream)", color: m.role === "user" ? "var(--white)" : "var(--ink)", fontSize: 14, lineHeight: 1.55, border: m.role === "ai" ? "1px solid var(--cream-border)" : "none" }}>
                        {m.role === "ai" && m.text ? (
                          <div dangerouslySetInnerHTML={renderAIMessage(m.text)} style={{ overflowWrap: "break-word" }} />
                        ) : m.role === "ai" && m.streaming && !m.text ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            {[0,1,2].map(k => (<div key={k} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--navy-700)", animation: `dotPulse 1.2s infinite ${k * 0.2}s` }} />))}
                          </div>
                        ) : (
                          <span>{m.text}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <div className="hide-scroll" style={{ padding: "6px 12px", display: "flex", gap: 6, overflowX: "auto", borderTop: "1px solid var(--cream-border)" }}>
              {activeSuggestions.map(q => (
                <button key={q} onClick={() => sendQuickChat(q)} disabled={chatLoading} style={{ padding: "6px 12px", borderRadius: 6, whiteSpace: "nowrap", border: "1px solid var(--cream-border)", background: "transparent", fontFamily: "'JetBrains Mono'", fontSize: 10, color: chatLoading ? "var(--cream-border)" : "var(--ink-light)", cursor: chatLoading ? "default" : "pointer", minHeight: 32, justifyContent: "center" }}>{q}</button>
              ))}
            </div>
            <div style={{ padding: "10px 12px", display: "flex", gap: 8, borderTop: "1px solid var(--cream-border)", paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChat()} placeholder="Ask about your claim..."
                style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--cream-border)", fontSize: 15, fontFamily: "'Source Sans 3'", outline: "none", background: "var(--cream)", WebkitAppearance: "none" }}
                onFocus={e => e.target.style.borderColor = "var(--gold-500)"} onBlur={e => e.target.style.borderColor = "var(--cream-border)"} />
              <button onClick={handleChat} disabled={chatLoading} style={{ width: 44, height: 44, borderRadius: 8, border: "none", background: chatInput.trim() && !chatLoading ? "var(--navy-900)" : "var(--cream-border)", color: chatInput.trim() && !chatLoading ? "var(--gold-400)" : "var(--ink-muted)", cursor: chatInput.trim() && !chatLoading ? "pointer" : "default", justifyContent: "center", flexShrink: 0, opacity: chatLoading ? 0.6 : 1 }}><SendIcon /></button>
            </div>
          </div>
          <style>{`@media (min-width: 768px) { .chat-panel { max-width: 480px !important; right: 24px !important; left: auto !important; } }`}</style>
        </div>
      )}

      {/* FAB */}
      {!showChat && (
        <button onClick={() => setShowChat(true)} style={{ position: "fixed", bottom: 20, right: 20, zIndex: 90, width: 56, height: 56, borderRadius: 28, background: "var(--navy-900)", border: "2px solid var(--gold-500)", boxShadow: "0 4px 20px rgba(11,26,46,0.3)", cursor: "pointer", justifyContent: "center", color: "var(--gold-400)", fontSize: 22 }}>
          <BookIcon />
        </button>
      )}
    </>
  );
}
