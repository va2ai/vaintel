import { useState } from 'react';

export function VaMathCalc() {
  const [ratings, setRatings] = useState([{ value: "", bilateral: false }]);
  const [result, setResult] = useState(null);

  const addRating = () => setRatings(r => [...r, { value: "", bilateral: false }]);
  const removeRating = (idx) => setRatings(r => r.filter((_, i) => i !== idx));
  const updateRating = (idx, field, val) => setRatings(r => r.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  const calculate = () => {
    const parsed = ratings.map(r => ({ value: parseInt(r.value, 10), bilateral: r.bilateral })).filter(r => !isNaN(r.value) && r.value >= 0 && r.value <= 100);
    if (parsed.length === 0) return;

    // Separate bilateral and non-bilateral
    const bilateral = parsed.filter(r => r.bilateral).map(r => r.value);
    const nonBilateral = parsed.filter(r => !r.bilateral).map(r => r.value);

    // Combine bilateral ratings first
    let bilateralCombined = null;
    let bilateralFactor = 0;
    if (bilateral.length > 0) {
      bilateral.sort((a, b) => b - a);
      let bVal = bilateral[0];
      for (let i = 1; i < bilateral.length; i++) {
        bVal = Math.round(bVal + bilateral[i] - (bVal * bilateral[i]) / 100);
      }
      bilateralFactor = Math.round(bVal * 0.1 * 10) / 10;
      bilateralCombined = Math.round(bVal + bilateralFactor);
    }

    // Build final list: non-bilateral + bilateral combined (if any)
    const allValues = [...nonBilateral.map(v => v)];
    if (bilateralCombined !== null) allValues.push(bilateralCombined);
    allValues.sort((a, b) => b - a);

    // Combine all using VA math
    const steps = [];
    let remaining = 100;
    let combined = 0;
    for (let i = 0; i < allValues.length; i++) {
      const loss = Math.round(remaining * allValues[i] / 100 * 10) / 10;
      combined = Math.round((combined + loss) * 10) / 10;
      remaining = Math.round((100 - combined) * 10) / 10;
      steps.push({ rating: allValues[i], loss, combined, remaining, isBilateral: bilateralCombined !== null && allValues[i] === bilateralCombined && i === allValues.indexOf(bilateralCombined) });
    }

    const exact = combined;
    const rounded = Math.round(exact / 10) * 10;

    setResult({ steps, exact, rounded, bilateralFactor: bilateral.length > 0 ? bilateralFactor : null, bilateralCombined, allRatings: parsed });
  };

  const VALID_RATINGS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  const inputRow = { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 };
  const selectStyle = { fontFamily: "'Source Sans 3', sans-serif", fontSize: 15, padding: "8px 12px", borderRadius: 4, border: "1px solid var(--cream-border)", background: "var(--white)", color: "var(--ink)", width: 90, minHeight: "auto" };
  const btnStyle = { fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 4, cursor: "pointer", padding: "7px 14px", minHeight: "auto", transition: "all 0.15s" };

  return (
    <div style={{ background: "var(--navy-900)", borderRadius: 8, padding: "28px 28px 24px", marginBottom: 40, color: "var(--white)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--gold-500)", color: "var(--navy-900)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, minHeight: "auto" }}>%</div>
        <h3 style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 700, color: "var(--white)", margin: 0 }}>VA Combined Rating Calculator</h3>
      </div>
      <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 20, marginTop: 4 }}>Enter your individual disability ratings below. Check 'bilateral' for paired extremities (both knees, both arms, etc.).</p>

      {/* Rating inputs */}
      <div style={{ marginBottom: 16 }}>
        {ratings.map((r, i) => (
          <div key={i} style={inputRow}>
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: "var(--gold-400)", width: 20, textAlign: "right" }}>{i + 1}.</span>
            <select value={r.value} onChange={e => updateRating(i, "value", e.target.value)} style={selectStyle}>
              <option value="">--%</option>
              {VALID_RATINGS.map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "rgba(255,255,255,0.6)", cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={r.bilateral} onChange={e => updateRating(i, "bilateral", e.target.checked)} style={{ accentColor: "var(--gold-500)" }} />
              Bilateral
            </label>
            {ratings.length > 1 && (
              <button onClick={() => removeRating(i)} style={{ ...btnStyle, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", padding: "5px 8px", fontSize: 12 }} title="Remove">X</button>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: result ? 24 : 0 }}>
        <button onClick={addRating} style={{ ...btnStyle, background: "rgba(255,255,255,0.08)", color: "var(--gold-400)" }}>+ Add Rating</button>
        <button onClick={calculate} style={{ ...btnStyle, background: "var(--gold-500)", color: "var(--navy-900)", padding: "8px 24px" }}>Calculate</button>
        {result && <button onClick={() => { setRatings([{ value: "", bilateral: false }]); setResult(null); }} style={{ ...btnStyle, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>Reset</button>}
      </div>

      {/* Results */}
      {result && (
        <div style={{ animation: "fadeUp 0.3s ease-out" }}>
          {/* Combined rating display */}
          <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--gold-400)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Combined Rating</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 48, fontWeight: 700, color: "var(--gold-400)", lineHeight: 1 }}>{result.rounded}%</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
                Exact combined: <strong style={{ color: "var(--white)" }}>{result.exact.toFixed(1)}%</strong>
                <br />Rounded to nearest 10: <strong style={{ color: "var(--gold-400)" }}>{result.rounded}%</strong>
                {result.bilateralFactor !== null && (<><br />Bilateral factor applied: <strong style={{ color: "var(--white)" }}>+{result.bilateralFactor.toFixed(1)}%</strong></>)}
              </div>
            </div>
          </div>

          {/* Step-by-step breakdown */}
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 10, color: "var(--gold-400)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Step-by-Step Breakdown</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--sans)", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "rgba(255,255,255,0.4)", fontWeight: 500, fontSize: 11 }}>Step</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "rgba(255,255,255,0.4)", fontWeight: 500, fontSize: 11 }}>Rating</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "rgba(255,255,255,0.4)", fontWeight: 500, fontSize: 11 }}>Disability Added</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "rgba(255,255,255,0.4)", fontWeight: 500, fontSize: 11 }}>Running Total</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "rgba(255,255,255,0.4)", fontWeight: 500, fontSize: 11 }}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {result.steps.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "8px", color: "var(--gold-400)", fontFamily: "'JetBrains Mono'", fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: "8px", color: "var(--white)", fontWeight: 600 }}>{s.rating}%{s.isBilateral ? " *" : ""}</td>
                    <td style={{ padding: "8px", color: "rgba(255,255,255,0.6)" }}>{s.loss.toFixed(1)}%</td>
                    <td style={{ padding: "8px", color: "var(--white)", fontWeight: 600 }}>{s.combined.toFixed(1)}%</td>
                    <td style={{ padding: "8px", color: "rgba(255,255,255,0.4)" }}>{s.remaining.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.bilateralFactor !== null && (
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>* Includes bilateral factor (+{result.bilateralFactor.toFixed(1)}%) per 38 CFR 4.26</div>
            )}
          </div>

          {/* Threshold info */}
          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { pct: 30, label: "Dependent allowances" },
              { pct: 70, label: "TDIU eligible (w/ 40%+ single)" },
              { pct: 100, label: "DEA, CHAMPVA, property tax" },
            ].map(t => (
              <div key={t.pct} style={{
                padding: "5px 10px", borderRadius: 4, fontSize: 11, fontFamily: "'JetBrains Mono'",
                background: result.rounded >= t.pct ? "rgba(200,162,50,0.15)" : "rgba(255,255,255,0.04)",
                color: result.rounded >= t.pct ? "var(--gold-400)" : "rgba(255,255,255,0.25)",
                border: `1px solid ${result.rounded >= t.pct ? "rgba(200,162,50,0.3)" : "rgba(255,255,255,0.06)"}`,
              }}>
                {t.pct}%: {t.label} {result.rounded >= t.pct ? "\u2713" : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
