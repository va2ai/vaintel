import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Layout } from './components/Layout.jsx';
import './styles/publication.css';

const CHAT_API = "/api/chat/message";

const ANALYSIS_PROMPT = `You are a VA claims decision analyst. I am pasting the following VA decision document for structured analysis.

<pasted_decision>
DECISION_TEXT
</pasted_decision>

Analyze this VA decision and provide a structured breakdown in the following format. Use markdown formatting with clear sections:

## Favorable Findings
List every finding in the veteran's favor — conceded diagnoses, accepted in-service events, positive credibility determinations, any partial grants. For each, cite the specific language from the decision.

## Denial Basis
For each denied issue, identify:
- Which of the Three Pillars failed (current diagnosis, in-service event, or nexus)
- The specific rationale the Board used
- What evidence the Board relied on for denial
- Any examiner opinions that weighed against the veteran

## Evidence Gaps
Identify what evidence was missing or insufficient:
- What the veteran needed but didn't have
- What the Board said would have changed the outcome
- Any Duty to Assist failures or inadequate examinations

## Issue-by-Issue Summary
For each claimed condition, provide:
- **Condition**: name
- **Outcome**: Granted / Denied / Remanded
- **Key reason**: one-sentence explanation

## Recommended Next Steps
Based on the decision, recommend:
- Whether to file a Supplemental Claim, HLR, or Board appeal
- What new evidence would strengthen each denied issue
- Specific 38 CFR sections or CAVC cases that support the veteran's position
- Whether a vocational expert, nexus letter, or buddy statements would help

Be specific. Cite regulation sections and case law where relevant. This is research support, not legal advice.`;

function renderMarkdown(text) {
  return { __html: DOMPurify.sanitize(marked.parse(text)) };
}

export default function DecisionDeconstructor() {
  const [decisionText, setDecisionText] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [inputMode, setInputMode] = useState("paste"); // paste or upload
  const streamRef = useRef("");
  const abortRef = useRef(null);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setDecisionText(ev.target.result);
    };
    reader.readAsText(file);
  }, []);

  const analyzeDecision = useCallback(async () => {
    if (!decisionText.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult("");
    streamRef.current = "";

    const prompt = ANALYSIS_PROMPT.replace("DECISION_TEXT", decisionText.trim());

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [] }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText.substring(0, 200));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
            streamRef.current += evt.text;
            setAnalysisResult(streamRef.current);
          } else if (evt.event === "complete") {
            break;
          } else if (evt.event === "error") {
            throw new Error(evt.detail || "Analysis error");
          }
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message);
      }
    } finally {
      setIsAnalyzing(false);
      abortRef.current = null;
    }
  }, [decisionText, isAnalyzing]);

  const stopAnalysis = useCallback(() => {
    abortRef.current?.abort();
    setIsAnalyzing(false);
  }, []);

  const wordCount = decisionText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <Layout activeSection="tools">
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{
              fontFamily: "'JetBrains Mono'", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: "#c084fc", background: "rgba(168,85,247,0.12)",
              padding: "3px 10px", borderRadius: 4,
              border: "1px solid rgba(168,85,247,0.25)"
            }}>Professional</span>
          </div>
          <h1 style={{ fontFamily: "'Lora'", fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
            Decision Deconstructor
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-light)", lineHeight: 1.6, maxWidth: 640 }}>
            Paste or upload a VA decision letter. The analysis extracts favorable findings, identifies denial basis by issue, maps evidence gaps, and recommends next steps grounded in 38 CFR and CAVC precedent.
          </p>
        </div>

        {/* Input Section */}
        {!analysisResult && !isAnalyzing && (
          <div style={{ marginBottom: 24 }}>

            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setInputMode("paste")}
                style={{
                  padding: "8px 16px", borderRadius: 6, border: "1px solid",
                  borderColor: inputMode === "paste" ? "var(--navy-900)" : "var(--cream-border)",
                  background: inputMode === "paste" ? "var(--navy-900)" : "transparent",
                  color: inputMode === "paste" ? "white" : "var(--ink-light)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Source Sans 3'"
                }}
              >Paste Text</button>
              <button
                onClick={() => setInputMode("upload")}
                style={{
                  padding: "8px 16px", borderRadius: 6, border: "1px solid",
                  borderColor: inputMode === "upload" ? "var(--navy-900)" : "var(--cream-border)",
                  background: inputMode === "upload" ? "var(--navy-900)" : "transparent",
                  color: inputMode === "upload" ? "white" : "var(--ink-light)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Source Sans 3'"
                }}
              >Upload File</button>
            </div>

            {inputMode === "paste" ? (
              <textarea
                value={decisionText}
                onChange={(e) => setDecisionText(e.target.value)}
                placeholder="Paste the full text of your VA decision letter here..."
                style={{
                  width: "100%", minHeight: 280, padding: 16, borderRadius: 8,
                  border: "1px solid var(--cream-border)", fontSize: 14,
                  fontFamily: "'Source Sans 3'", lineHeight: 1.6,
                  resize: "vertical", outline: "none", background: "var(--cream)"
                }}
                onFocus={e => e.target.style.borderColor = "var(--gold-500)"}
                onBlur={e => e.target.style.borderColor = "var(--cream-border)"}
              />
            ) : (
              <div style={{
                border: "2px dashed var(--cream-border)", borderRadius: 8,
                padding: "48px 24px", textAlign: "center", background: "var(--cream)"
              }}>
                <input
                  type="file"
                  accept=".txt,.doc,.docx,.pdf"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                  id="decision-upload"
                />
                <label htmlFor="decision-upload" style={{
                  display: "inline-block", padding: "12px 24px", borderRadius: 8,
                  background: "var(--navy-900)", color: "white", fontWeight: 600,
                  fontSize: 14, cursor: "pointer", fontFamily: "'Source Sans 3'"
                }}>
                  Choose File
                </label>
                <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 12 }}>
                  Text files (.txt) supported. For PDF decisions, copy the text and use Paste mode.
                </p>
                {decisionText && (
                  <p style={{ fontSize: 13, color: "var(--gold-600)", marginTop: 8, fontWeight: 600 }}>
                    File loaded: {wordCount.toLocaleString()} words
                  </p>
                )}
              </div>
            )}

            {/* Word count and analyze button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <span style={{ fontSize: 12, color: "var(--ink-muted)", fontFamily: "'JetBrains Mono'" }}>
                {wordCount > 0 ? `${wordCount.toLocaleString()} words` : ""}
              </span>
              <button
                onClick={analyzeDecision}
                disabled={!decisionText.trim()}
                style={{
                  padding: "12px 28px", borderRadius: 8, border: "none",
                  background: decisionText.trim() ? "var(--gold-500)" : "var(--cream-border)",
                  color: decisionText.trim() ? "var(--navy-900)" : "var(--ink-muted)",
                  fontWeight: 700, fontSize: 15, cursor: decisionText.trim() ? "pointer" : "default",
                  fontFamily: "'Source Sans 3'"
                }}
              >
                Analyze Decision
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isAnalyzing && !analysisResult && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
              {[0,1,2].map(k => (
                <div key={k} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--navy-700)",
                  animation: `dotPulse 1.2s infinite ${k * 0.2}s`
                }} />
              ))}
            </div>
            <p style={{ fontSize: 15, color: "var(--ink-light)" }}>
              Analyzing decision... searching BVA precedent, CFR, and KnowVA...
            </p>
            <button onClick={stopAnalysis} style={{
              marginTop: 12, padding: "8px 20px", borderRadius: 6,
              border: "1px solid var(--cream-border)", background: "transparent",
              fontSize: 13, color: "var(--ink-light)", cursor: "pointer",
              fontFamily: "'Source Sans 3'"
            }}>Cancel</button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: "16px 20px", borderRadius: 8, marginBottom: 24,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#dc2626", fontSize: 14
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        {analysisResult && (
          <div>
            {isAnalyzing && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "dotPulse 1.5s infinite" }} />
                <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono'", color: "var(--ink-light)" }}>Analyzing...</span>
                <button onClick={stopAnalysis} style={{
                  marginLeft: "auto", padding: "4px 12px", borderRadius: 4,
                  border: "1px solid var(--cream-border)", background: "transparent",
                  fontSize: 11, color: "var(--ink-muted)", cursor: "pointer"
                }}>Stop</button>
              </div>
            )}

            <div
              className="decision-analysis-result"
              style={{
                padding: "28px 32px", borderRadius: 8,
                border: "1px solid var(--cream-border)", background: "var(--white)",
                fontSize: 15, lineHeight: 1.7, color: "var(--ink)",
              }}
              dangerouslySetInnerHTML={renderMarkdown(analysisResult)}
            />

            {!isAnalyzing && (
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button
                  onClick={() => { setAnalysisResult(""); setError(null); }}
                  style={{
                    padding: "10px 20px", borderRadius: 8,
                    border: "1px solid var(--cream-border)", background: "transparent",
                    fontSize: 14, fontWeight: 600, color: "var(--ink-light)",
                    cursor: "pointer", fontFamily: "'Source Sans 3'"
                  }}
                >Analyze Another Decision</button>
                <button
                  onClick={() => {
                    const blob = new Blob([analysisResult], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "decision-analysis.md";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    padding: "10px 20px", borderRadius: 8, border: "none",
                    background: "var(--navy-900)", color: "var(--gold-400)",
                    fontSize: 14, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Source Sans 3'"
                  }}
                >Download Analysis</button>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{
          marginTop: 40, padding: "16px 20px", borderRadius: 8,
          background: "var(--cream-bg)", fontSize: 12, color: "var(--ink-muted)",
          lineHeight: 1.6
        }}>
          This tool provides research support only. It is not legal advice. All analysis should be reviewed by a qualified attorney or accredited representative before taking action on your claim. Not affiliated with the VA.
        </div>
      </div>
    </Layout>
  );
}
