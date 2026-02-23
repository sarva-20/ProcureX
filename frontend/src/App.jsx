import { useState, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STAGES = ["ingesting", "extracting", "eligibility_check", "market_intelligence", "strategy_synthesis", "complete"];
const STAGE_LABELS = {
  ingesting: "Reading PDF",
  extracting: "Extracting Requirements",
  eligibility_check: "Checking Eligibility",
  market_intelligence: "Market Intelligence",
  strategy_synthesis: "Strategy Synthesis",
  complete: "Complete"
};

function ScoreRing({ score, label, color }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="#1a1a2e" strokeWidth="6" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 45 45)" style={{ transition: "stroke-dasharray 1s ease" }} />
        <text x="45" y="50" textAnchor="middle" fill={color} fontSize="16" fontWeight="700"
          fontFamily="'DM Mono', monospace">{score}</text>
      </svg>
      <span style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
    </div>
  );
}

function Badge({ text, type }) {
  const colors = {
    BID: { bg: "#0d3d2e", color: "#00ff88", border: "#00ff88" },
    "NO BID": { bg: "#3d0d0d", color: "#ff4444", border: "#ff4444" },
    "CONDITIONAL BID": { bg: "#2d2d0d", color: "#ffcc00", border: "#ffcc00" },
    HIGH: { bg: "#3d0d0d", color: "#ff4444", border: "#ff4444" },
    MEDIUM: { bg: "#2d2d0d", color: "#ffcc00", border: "#ffcc00" },
    LOW: { bg: "#0d3d2e", color: "#00ff88", border: "#00ff88" },
    READY: { bg: "#0d3d2e", color: "#00ff88", border: "#00ff88" },
    MISSING: { bg: "#3d0d0d", color: "#ff4444", border: "#ff4444" },
    "NEEDS PREP": { bg: "#2d2d0d", color: "#ffcc00", border: "#ffcc00" },
  };
  const c = colors[text] || { bg: "#1a1a2e", color: "#aaa", border: "#333" };
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      padding: "2px 10px", borderRadius: "4px", fontSize: "11px",
      fontFamily: "'DM Mono', monospace", fontWeight: "700", letterSpacing: "0.05em"
    }}>{text}</span>
  );
}

function Card({ title, children, accent }) {
  return (
    <div style={{
      background: "#0d0d1a", border: `1px solid ${accent || "#222"}`,
      borderRadius: "12px", padding: "24px", marginBottom: "16px",
      borderLeft: `3px solid ${accent || "#444"}`
    }}>
      {title && <h3 style={{
        margin: "0 0 16px 0", fontSize: "12px", textTransform: "uppercase",
        letterSpacing: "0.15em", color: accent || "#888", fontFamily: "'DM Mono', monospace"
      }}>{title}</h3>}
      {children}
    </div>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [activeTab, setActiveTab] = useState("strategy");
  const fileRef = useRef();
  const pollRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
  };

  const pollStatus = async (id) => {
  try {
    const res = await fetch(`${API_URL}/status/${id}`);
    const data = await res.json();
    console.log("Poll response:", data); // debug
    if (data.bid_strategy) {
      clearInterval(pollRef.current);
      setStage("complete");
      setResult(data);
    } else if (data.status === "failed") {
      clearInterval(pollRef.current);
      setError(data.error);
      setStage(null);
    } else if (data.status === "complete") {
      clearInterval(pollRef.current);
      setStage("complete");
      setResult(data);
    } else {
      setStage(data.status);
    }
  } catch (e) {
    clearInterval(pollRef.current);
    setError("Connection lost. Is the backend running?");
    setStage(null);
  }
};

  const analyze = async () => {
    if (!file) return;
    setError(null);
    setResult(null);
    setStage("ingesting");

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch(`${API_URL}/analyze`, { method: "POST", body: form });
      const data = await res.json();
      setJobId(data.job_id);
      pollRef.current = setInterval(() => pollStatus(data.job_id), 3000);
    } catch (e) {
      setError("Could not reach backend. Is it running on port 8000?");
      setStage(null);
    }
  };

  const reset = () => {
    setFile(null); setStage(null); setResult(null);
    setError(null); setJobId(null); setActiveTab("strategy");
    clearInterval(pollRef.current);
  };

  const stageIdx = STAGES.indexOf(stage);
  const bid = result?.bid_strategy;
  const eligibility = result?.eligibility_report;
  const market = result?.market_intelligence;
  const extraction = result?.tender_extraction;

  const bidColor = bid?.bid_decision === "BID" ? "#00ff88" :
    bid?.bid_decision === "NO BID" ? "#ff4444" : "#ffcc00";

  return (
    <div style={{
      minHeight: "100vh", background: "#060610",
      fontFamily: "'DM Sans', sans-serif", color: "#e0e0e0"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500;700&family=Bebas+Neue&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #111", padding: "20px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(6,6,16,0.95)", position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px", height: "36px", background: "linear-gradient(135deg, #00ff88, #0088ff)",
            borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px"
          }}>⚡</div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: "22px", letterSpacing: "0.1em", lineHeight: 1 }}>PROCUREX</div>
            <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.15em", textTransform: "uppercase" }}>Tender Intelligence System</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 8px #00ff88" }} />
          <span style={{ fontSize: "11px", color: "#555", fontFamily: "'DM Mono'" }}>4-Agent LangChain Pipeline</span>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px" }}>

        {/* Upload Zone */}
        {!result && (
          <div style={{ marginBottom: "32px" }}>
            <div style={{
              fontSize: "11px", color: "#555", letterSpacing: "0.2em",
              textTransform: "uppercase", marginBottom: "12px", fontFamily: "'DM Mono'"
            }}>Upload Tender Document</div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !file && fileRef.current.click()}
              style={{
                border: `2px dashed ${dragging ? "#00ff88" : file ? "#0088ff" : "#222"}`,
                borderRadius: "12px", padding: "48px", textAlign: "center",
                cursor: file ? "default" : "pointer",
                background: dragging ? "rgba(0,255,136,0.03)" : "rgba(255,255,255,0.01)",
                transition: "all 0.2s"
              }}>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
                onChange={e => setFile(e.target.files[0])} />

              {file ? (
                <div>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
                  <div style={{ color: "#0088ff", fontFamily: "'DM Mono'", fontSize: "14px" }}>{file.name}</div>
                  <div style={{ color: "#555", fontSize: "12px", marginTop: "4px" }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "40px", marginBottom: "12px", opacity: 0.4 }}>⬆</div>
                  <div style={{ color: "#888", fontSize: "14px" }}>Drop a tender PDF here or click to browse</div>
                  <div style={{ color: "#444", fontSize: "12px", marginTop: "8px" }}>GeM · CPPP · NIC portals</div>
                </div>
              )}
            </div>

            {file && !stage && (
              <button onClick={analyze} style={{
                marginTop: "16px", width: "100%", padding: "16px",
                background: "linear-gradient(135deg, #00ff88, #0088ff)",
                border: "none", borderRadius: "8px", color: "#000",
                fontFamily: "'DM Mono'", fontWeight: "700", fontSize: "14px",
                letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase"
              }}>
                ⚡ Analyze Tender
              </button>
            )}
          </div>
        )}

        {/* Pipeline Progress */}
        {stage && stage !== "complete" && (
          <Card title="Pipeline Running" accent="#0088ff">
            <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>
              {STAGES.slice(0, -1).map((s, i) => (
                <div key={s} style={{
                  flex: 1, height: "4px", borderRadius: "2px",
                  background: i <= stageIdx ? "#0088ff" : "#1a1a2e",
                  transition: "background 0.5s"
                }} />
              ))}
            </div>
            {STAGES.slice(0, -1).map((s, i) => (
              <div key={s} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 0", borderBottom: "1px solid #111",
                opacity: i > stageIdx ? 0.3 : 1
              }}>
                <div style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: i < stageIdx ? "#00ff88" : i === stageIdx ? "#0088ff" : "#1a1a2e",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "10px", flexShrink: 0
                }}>
                  {i < stageIdx ? "✓" : i === stageIdx ? "⟳" : ""}
                </div>
                <span style={{
                  fontFamily: "'DM Mono'", fontSize: "13px",
                  color: i === stageIdx ? "#0088ff" : i < stageIdx ? "#00ff88" : "#555"
                }}>
                  {STAGE_LABELS[s]}
                </span>
                {i === stageIdx && (
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#555" }}>processing...</span>
                )}
              </div>
            ))}
          </Card>
        )}

        {error && (
          <div style={{
            background: "#1a0a0a", border: "1px solid #ff4444", borderRadius: "8px",
            padding: "16px", color: "#ff4444", fontFamily: "'DM Mono'", fontSize: "13px"
          }}>
            ✗ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Bid Decision Hero */}
            <div style={{
              background: `linear-gradient(135deg, ${bidColor}11, transparent)`,
              border: `1px solid ${bidColor}44`, borderRadius: "16px",
              padding: "32px", marginBottom: "24px", textAlign: "center"
            }}>
              <div style={{ fontSize: "11px", color: "#555", letterSpacing: "0.2em", marginBottom: "8px", fontFamily: "'DM Mono'" }}>
                BID DECISION
              </div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: "56px", color: bidColor, lineHeight: 1, marginBottom: "12px" }}>
                {bid?.bid_decision}
              </div>
              <div style={{ color: "#888", fontSize: "13px", maxWidth: "600px", margin: "0 auto", lineHeight: 1.6 }}>
                {bid?.bid_decision_rationale?.slice(0, 200)}...
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginTop: "24px" }}>
                <ScoreRing score={eligibility?.eligibility_score || 0} label="Eligibility" color="#0088ff" />
                <ScoreRing score={market?.win_probability || 0} label="Win Chance" color="#00ff88" />
                <ScoreRing score={100 - (market?.risk_assessment?.overall_risk_score || 0)} label="Safety" color="#ffcc00" />
              </div>
            </div>

            {/* Tender Info */}
            <Card title="Tender Details" accent="#444">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  ["Title", extraction?.tender_title],
                  ["Authority", extraction?.issuing_authority],
                  ["Tender No.", extraction?.tender_number],
                  ["Value", `₹${extraction?.estimated_value_inr}`],
                  ["Deadline", extraction?.submission_deadline],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontFamily: "'DM Mono'" }}>{k}</div>
                    <div style={{ fontSize: "13px", color: "#ccc" }}>{v || "—"}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
              {["strategy", "eligibility", "market", "checklist"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "8px 16px", border: "1px solid",
                  borderColor: activeTab === tab ? "#0088ff" : "#222",
                  borderRadius: "6px", background: activeTab === tab ? "rgba(0,136,255,0.1)" : "transparent",
                  color: activeTab === tab ? "#0088ff" : "#555",
                  fontFamily: "'DM Mono'", fontSize: "11px", cursor: "pointer",
                  textTransform: "uppercase", letterSpacing: "0.1em"
                }}>{tab}</button>
              ))}
            </div>

            {/* Strategy Tab */}
            {activeTab === "strategy" && bid && (
              <div>
                <Card title="Win Strategy" accent="#00ff88">
                  <p style={{ color: "#ccc", fontSize: "13px", lineHeight: 1.7, margin: 0 }}>
                    {bid.win_strategy?.primary_strategy}
                  </p>
                  {bid.win_strategy?.key_themes_for_proposal?.length > 0 && (
                    <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {bid.win_strategy.key_themes_for_proposal.map((t, i) => (
                        <span key={i} style={{
                          background: "#0d2a1a", border: "1px solid #00ff8844",
                          color: "#00ff88", padding: "4px 12px", borderRadius: "20px", fontSize: "12px"
                        }}>{t}</span>
                      ))}
                    </div>
                  )}
                </Card>

                <Card title="Action Plan" accent="#0088ff">
                  {bid.action_plan?.map((a, i) => (
                    <div key={i} style={{
                      display: "flex", gap: "12px", padding: "12px 0",
                      borderBottom: "1px solid #111"
                    }}>
                      <Badge text={a.priority} type="priority" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", color: "#ccc", marginBottom: "4px" }}>{a.action}</div>
                        <div style={{ fontSize: "11px", color: "#555", fontFamily: "'DM Mono'" }}>
                          {a.deadline} · {a.owner}
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>

                {bid.red_flags?.length > 0 && (
                  <Card title="Red Flags" accent="#ff4444">
                    {bid.red_flags.map((f, i) => (
                      <div key={i} style={{
                        padding: "8px 0", borderBottom: "1px solid #1a0a0a",
                        fontSize: "13px", color: "#ff8888", display: "flex", gap: "8px"
                      }}>
                        <span>⚠</span><span>{f.replace(/\*\*/g, "")}</span>
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            )}

            {/* Eligibility Tab */}
            {activeTab === "eligibility" && eligibility && (
              <div>
                <Card title="Eligibility Assessment" accent="#0088ff">
                  <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                    <Badge text={eligibility.recommendation} />
                    <span style={{ fontSize: "13px", color: "#888" }}>
                      Score: <span style={{ color: "#0088ff", fontFamily: "'DM Mono'" }}>{eligibility.eligibility_score}/100</span>
                    </span>
                  </div>
                  <p style={{ color: "#888", fontSize: "13px", lineHeight: 1.7, margin: 0 }}>{eligibility.reasoning}</p>
                </Card>

                <Card title="Criteria Analysis" accent="#444">
                  {eligibility.criteria_analysis?.map((c, i) => (
                    <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #111" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "13px", color: "#ccc", fontWeight: 500 }}>{c.criterion}</span>
                        <Badge text={c.meets_requirement === true ? "READY" : c.meets_requirement === false ? "MISSING" : "NEEDS PREP"} />
                      </div>
                      {c.gap && <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.5 }}>{c.gap}</div>}
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* Market Tab */}
            {activeTab === "market" && market && (
              <div>
                <Card title="Market Analysis" accent="#ffcc00">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontFamily: "'DM Mono'" }}>Competition</div>
                      <Badge text={market.market_analysis?.competitive_intensity} />
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontFamily: "'DM Mono'" }}>Recommended Bid</div>
                      <div style={{ fontSize: "14px", color: "#ffcc00", fontFamily: "'DM Mono'" }}>
                        {market.pricing_intelligence?.recommended_bid_price_inr}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px", fontFamily: "'DM Mono'" }}>Typical Competitors</div>
                  {market.market_analysis?.typical_competitors?.map((c, i) => (
                    <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid #111", fontSize: "13px", color: "#888" }}>· {c}</div>
                  ))}
                </Card>

                <Card title="Risk Assessment" accent="#ff4444">
                  {market.risk_assessment?.risks?.map((r, i) => (
                    <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid #111" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "13px", color: "#ccc" }}>{r.risk_type}</span>
                        <Badge text={r.severity} />
                      </div>
                      <div style={{ fontSize: "12px", color: "#666", lineHeight: 1.5, marginBottom: "6px" }}>{r.description}</div>
                      <div style={{ fontSize: "12px", color: "#00ff8877" }}>↳ {r.mitigation}</div>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* Checklist Tab */}
            {activeTab === "checklist" && bid && (
              <Card title="Compliance Checklist" accent="#00ff88">
                {bid.compliance_checklist?.map((item, i) => (
                  <div key={i} style={{
                    display: "flex", gap: "12px", padding: "12px 0",
                    borderBottom: "1px solid #111", alignItems: "flex-start"
                  }}>
                    <Badge text={item.status} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", color: "#ccc", marginBottom: "4px" }}>{item.item}</div>
                      {item.action_required && item.action_required !== "N/A" && (
                        <div style={{ fontSize: "12px", color: "#666" }}>{item.action_required}</div>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            )}

            <button onClick={reset} style={{
              marginTop: "24px", width: "100%", padding: "14px",
              background: "transparent", border: "1px solid #222",
              borderRadius: "8px", color: "#555", cursor: "pointer",
              fontFamily: "'DM Mono'", fontSize: "12px", letterSpacing: "0.1em"
            }}>
              ↺ ANALYZE ANOTHER TENDER
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: "48px", paddingTop: "24px", borderTop: "1px solid #111",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontSize: "11px", color: "#333", fontFamily: "'DM Mono'" }}>
            PROCUREX · LangChain + Gemini 2.5 Flash
          </span>
          <span style={{ fontSize: "11px", color: "#333", fontFamily: "'DM Mono'" }}>
            Built by Sarvatarshan Sankar
          </span>
        </div>
      </div>
    </div>
  );
}
