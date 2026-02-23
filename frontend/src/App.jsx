import { useState, useRef, useEffect } from "react";

const API_URL = "https://procurex-api.onrender.com";

const STAGES = ["ingesting", "extracting", "eligibility_check", "market_intelligence", "strategy_synthesis"];
const STAGE_LABELS = {
  ingesting: "Reading & parsing PDF",
  extracting: "Extracting requirements",
  eligibility_check: "Checking eligibility",
  market_intelligence: "Analyzing market",
  strategy_synthesis: "Synthesizing strategy",
};
const STAGE_ICONS = {
  ingesting: "📄", extracting: "🔍",
  eligibility_check: "✅", market_intelligence: "📊", strategy_synthesis: "🎯",
};

function useAnimatedNumber(target, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return value;
}

function Pill({ text }) {
  const map = {
    BID: { bg: "#e8faf2", color: "#16a34a" },
    "NO BID": { bg: "#fff0f0", color: "#dc2626" },
    "CONDITIONAL BID": { bg: "#fffbeb", color: "#d97706" },
    HIGH: { bg: "#fff0f0", color: "#dc2626" },
    MEDIUM: { bg: "#fffbeb", color: "#d97706" },
    LOW: { bg: "#e8faf2", color: "#16a34a" },
    READY: { bg: "#e8faf2", color: "#16a34a" },
    MISSING: { bg: "#fff0f0", color: "#dc2626" },
    "NEEDS PREP": { bg: "#fffbeb", color: "#d97706" },
    "DO NOT BID": { bg: "#fff0f0", color: "#dc2626" },
    PROCEED: { bg: "#e8faf2", color: "#16a34a" },
  };
  const c = map[text] || { bg: "#f5f5f5", color: "#666" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      background: c.bg, color: c.color, padding: "3px 12px",
      borderRadius: "100px", fontSize: "12px", fontWeight: 700,
      whiteSpace: "nowrap"
    }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.color, display: "inline-block" }} />
      {text}
    </span>
  );
}

function Ring({ value, color, size = 64, stroke = 6 }) {
  const animated = useAnimatedNumber(value);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (animated / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <text x={size/2} y={size/2+5} textAnchor="middle" fontSize="14" fontWeight="800" fill="#111" fontFamily="'Syne',sans-serif">{animated}</text>
    </svg>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("strategy");
  const fileRef = useRef();
  const pollRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
  };

  const pollStatus = async (id) => {
    try {
      const res = await fetch(`${API_URL}/status/${id}`);
      const data = await res.json();
      if (data.bid_strategy) {
        clearInterval(pollRef.current); setStage("complete"); setResult(data);
      } else if (data.status === "failed") {
        clearInterval(pollRef.current); setError(data.error); setStage(null);
      } else { setStage(data.status); }
    } catch {
      clearInterval(pollRef.current); setError("Connection lost."); setStage(null);
    }
  };

  const analyze = async () => {
    if (!file) return;
    setError(null); setResult(null); setStage("ingesting");
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API_URL}/analyze`, { method: "POST", body: form });
      const data = await res.json();
      pollRef.current = setInterval(() => pollStatus(data.job_id), 3000);
    } catch {
      setError("Could not reach backend."); setStage(null);
    }
  };

  const reset = () => {
    setFile(null); setStage(null); setResult(null);
    setError(null); setActiveTab("strategy");
    clearInterval(pollRef.current);
  };

  const bid = result?.bid_strategy;
  const eligibility = result?.eligibility_report;
  const market = result?.market_intelligence;
  const extraction = result?.tender_extraction;
  const stageIdx = STAGES.indexOf(stage);
  const bidColor = bid?.bid_decision === "BID" ? "#16a34a" : bid?.bid_decision === "NO BID" ? "#dc2626" : "#d97706";

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8fc", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#111" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.3) !important; }
        .tab:hover { background: #f0f0f8 !important; }
      `}</style>

      {/* BG blobs */}
      <div style={{ position:"fixed", top:"-300px", right:"-200px", width:"700px", height:"700px", borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"fixed", bottom:"-200px", left:"-200px", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle, rgba(16,163,74,0.05) 0%, transparent 70%)", pointerEvents:"none" }} />

      {/* Nav */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(248,248,252,0.9)", backdropFilter:"blur(20px)", borderBottom:"1px solid #eee", padding:"0 40px", height:"60px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"32px", height:"32px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px" }}>⚡</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"18px" }}>ProcureX</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#16a34a", animation:"pulse 2s infinite" }} />
          <span style={{ fontSize:"12px", color:"#999", fontWeight:500 }}>4-Agent AI · Live</span>
        </div>
      </nav>

      <div style={{ maxWidth:"820px", margin:"0 auto", padding:"56px 20px 80px" }}>

        {/* Hero */}
        {!result && !stage && (
          <>
            <div style={{ textAlign:"center", marginBottom:"48px", animation:"fadeUp 0.5s ease both" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"#fff", border:"1px solid #eee", borderRadius:"100px", padding:"6px 16px", marginBottom:"20px", fontSize:"12px", fontWeight:600, color:"#6366f1" }}>
                ✦ LangChain + Gemini 2.5 Flash
              </div>
              <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"clamp(32px,5.5vw,54px)", lineHeight:1.1, marginBottom:"18px" }}>
                Government tender analysis,<br />
                <span style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>done by AI agents.</span>
              </h1>
              <p style={{ fontSize:"16px", color:"#888", maxWidth:"440px", margin:"0 auto", lineHeight:1.7 }}>
                Upload any GeM or CPPP tender PDF. Four agents analyze eligibility, market position, and generate a complete bid strategy.
              </p>
            </div>

            {/* Upload */}
            <div style={{ animation:"fadeUp 0.5s ease 0.15s both" }}>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !file && fileRef.current.click()}
                style={{
                  border: `2px dashed ${dragging || file ? "#6366f1" : "#e0e0e8"}`,
                  borderRadius:"20px", padding: file ? "28px 32px" : "56px 32px",
                  textAlign:"center", cursor: file ? "default" : "pointer",
                  background: dragging ? "#fafaff" : "#fff",
                  transition:"all 0.2s", marginBottom:"12px",
                  boxShadow:"0 2px 20px rgba(0,0,0,0.04)"
                }}>
                <input ref={fileRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={e => setFile(e.target.files[0])} />
                {file ? (
                  <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
                    <div style={{ width:"48px", height:"48px", background:"#f0f0ff", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px" }}>📄</div>
                    <div style={{ textAlign:"left" }}>
                      <div style={{ fontWeight:700, fontSize:"15px" }}>{file.name}</div>
                      <div style={{ color:"#aaa", fontSize:"13px", marginTop:"2px" }}>{(file.size/1024).toFixed(1)} KB · PDF</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} style={{ marginLeft:"auto", background:"#f5f5f5", border:"none", borderRadius:"8px", padding:"6px 14px", cursor:"pointer", color:"#999", fontSize:"12px", fontWeight:600 }}>Remove</button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize:"36px", marginBottom:"14px" }}>☁️</div>
                    <div style={{ fontWeight:700, fontSize:"15px", marginBottom:"6px" }}>Drop your tender PDF here</div>
                    <div style={{ color:"#bbb", fontSize:"13px" }}>or click to browse · GeM, CPPP, NIC portals</div>
                  </>
                )}
              </div>

              {file && (
                <button className="hover-lift" onClick={analyze} style={{
                  width:"100%", padding:"17px",
                  background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
                  border:"none", borderRadius:"14px", color:"#fff",
                  fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:"15px",
                  cursor:"pointer", boxShadow:"0 4px 20px rgba(99,102,241,0.2)",
                  transition:"all 0.2s", marginBottom:"12px"
                }}>Analyze Tender →</button>
              )}

              {error && <div style={{ background:"#fff0f0", border:"1px solid #fecaca", borderRadius:"12px", padding:"14px", color:"#dc2626", fontSize:"13px", fontWeight:500 }}>⚠ {error}</div>}

              <div style={{ display:"flex", justifyContent:"center", gap:"8px", marginTop:"28px", flexWrap:"wrap" }}>
                {["📄 PDF Extractor", "✅ Eligibility", "📊 Market Intel", "🎯 Bid Strategy"].map(a => (
                  <div key={a} style={{ background:"#fff", border:"1px solid #eee", borderRadius:"100px", padding:"5px 14px", fontSize:"12px", color:"#777", fontWeight:500 }}>{a}</div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Progress */}
        {stage && stage !== "complete" && (
          <div style={{ background:"#fff", borderRadius:"24px", boxShadow:"0 2px 30px rgba(0,0,0,0.06)", padding:"40px", animation:"fadeUp 0.4s ease both" }}>
            <div style={{ marginBottom:"28px" }}>
              <div style={{ fontSize:"12px", color:"#bbb", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>Analyzing your tender</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"22px" }}>{STAGE_LABELS[stage] || "Processing..."}</h2>
            </div>
            <div style={{ height:"5px", background:"#f0f0f0", borderRadius:"100px", marginBottom:"28px", overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:"100px", background:"linear-gradient(90deg,#6366f1,#8b5cf6)", width:`${((stageIdx+1)/STAGES.length)*100}%`, transition:"width 0.5s ease" }} />
            </div>
            {STAGES.map((s, i) => (
              <div key={s} style={{ display:"flex", alignItems:"center", gap:"14px", padding:"12px 0", borderBottom: i < STAGES.length-1 ? "1px solid #f5f5f5" : "none", opacity: i > stageIdx ? 0.3 : 1, transition:"opacity 0.3s" }}>
                <div style={{ width:"34px", height:"34px", borderRadius:"10px", flexShrink:0, background: i < stageIdx ? "#e8faf2" : i === stageIdx ? "#f0f0ff" : "#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px" }}>
                  {i < stageIdx ? "✓" : STAGE_ICONS[s]}
                </div>
                <span style={{ fontSize:"14px", fontWeight:600, color: i === stageIdx ? "#6366f1" : i < stageIdx ? "#16a34a" : "#bbb", flex:1 }}>{STAGE_LABELS[s]}</span>
                {i === stageIdx && <div style={{ width:"16px", height:"16px", border:"2px solid #6366f1", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />}
                {i < stageIdx && <span style={{ fontSize:"12px", color:"#16a34a", fontWeight:600 }}>Done</span>}
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ animation:"fadeUp 0.5s ease both" }}>

            {/* Decision Card */}
            <div style={{ background:"#fff", borderRadius:"24px", boxShadow:"0 2px 30px rgba(0,0,0,0.06)", padding:"40px", marginBottom:"12px", border:`1px solid ${bid?.bid_decision==="BID"?"#bbf7d0":bid?.bid_decision==="NO BID"?"#fecaca":"#fde68a"}` }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"24px", flexWrap:"wrap" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"11px", color:"#bbb", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"10px" }}>Bid Decision</div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:"52px", lineHeight:1, color:bidColor, marginBottom:"16px" }}>{bid?.bid_decision}</div>
                  <p style={{ color:"#777", fontSize:"14px", lineHeight:1.75, maxWidth:"460px" }}>{bid?.bid_decision_rationale?.slice(0,220)}...</p>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                  {[
                    { label:"Eligibility", val: eligibility?.eligibility_score||0, color:"#6366f1" },
                    { label:"Win Chance", val: market?.win_probability||0, color:"#16a34a" },
                    { label:"Safety", val: 100-(market?.risk_assessment?.overall_risk_score||0), color:"#f59e0b" },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                      <Ring value={val} color={color} />
                      <span style={{ fontSize:"12px", color:"#bbb", fontWeight:500 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tender details */}
            <div style={{ background:"#fff", borderRadius:"18px", boxShadow:"0 2px 16px rgba(0,0,0,0.04)", padding:"24px", marginBottom:"12px", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:"18px" }}>
              {[["Tender No.", extraction?.tender_number], ["Authority", extraction?.issuing_authority], ["Value", `₹${extraction?.estimated_value_inr}`], ["Deadline", extraction?.submission_deadline]].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize:"10px", color:"#ccc", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:"5px" }}>{k}</div>
                  <div style={{ fontSize:"13px", fontWeight:600, color:"#111" }}>{v||"—"}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", gap:"4px", marginBottom:"12px", background:"#fff", borderRadius:"14px", padding:"4px", boxShadow:"0 2px 10px rgba(0,0,0,0.04)" }}>
              {["strategy","eligibility","market","checklist"].map(tab => (
                <button key={tab} className="tab" onClick={() => setActiveTab(tab)} style={{ flex:1, padding:"10px", background: activeTab===tab ? "#6366f1" : "transparent", color: activeTab===tab ? "#fff" : "#aaa", border:"none", borderRadius:"10px", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:"13px", cursor:"pointer", textTransform:"capitalize", transition:"all 0.2s" }}>{tab}</button>
              ))}
            </div>

            {/* Strategy */}
            {activeTab === "strategy" && bid && (
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                {bid.win_strategy?.primary_strategy && (
                  <div style={{ background:"#fff", borderRadius:"18px", padding:"28px", boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize:"11px", color:"#bbb", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:"12px" }}>Win Strategy</div>
                    <p style={{ color:"#555", fontSize:"14px", lineHeight:1.8 }}>{bid.win_strategy.primary_strategy}</p>
                    {bid.win_strategy.key_themes_for_proposal?.length > 0 && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginTop:"14px" }}>
                        {bid.win_strategy.key_themes_for_proposal.map((t,i) => <span key={i} style={{ background:"#f0f0ff", color:"#6366f1", padding:"4px 14px", borderRadius:"100px", fontSize:"12px", fontWeight:600 }}>{t}</span>)}
                      </div>
                    )}
                  </div>
                )}
                {bid.action_plan?.length > 0 && (
                  <div style={{ background:"#fff", borderRadius:"18px", padding:"28px", boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize:"11px", color:"#bbb", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:"12px" }}>Action Plan</div>
                    {bid.action_plan.map((a,i) => (
                      <div key={i} style={{ display:"flex", gap:"12px", padding:"12px 0", borderBottom: i < bid.action_plan.length-1 ? "1px solid #f5f5f5":"none", alignItems:"flex-start" }}>
                        <Pill text={a.priority} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:"14px", fontWeight:500, marginBottom:"3px" }}>{a.action}</div>
                          <div style={{ fontSize:"12px", color:"#bbb" }}>{a.deadline} · {a.owner}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {bid.red_flags?.length > 0 && (
                  <div style={{ background:"#fff8f8", border:"1px solid #fecaca", borderRadius:"18px", padding:"28px" }}>
                    <div style={{ fontSize:"11px", color:"#dc2626", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:"12px" }}>Red Flags</div>
                    {bid.red_flags.map((f,i) => (
                      <div key={i} style={{ display:"flex", gap:"10px", padding:"9px 0", borderBottom: i < bid.red_flags.length-1 ? "1px solid #fee2e2":"none", fontSize:"14px", color:"#666" }}>
                        <span style={{ color:"#dc2626" }}>⚠</span><span>{f.replace(/\*\*/g,"")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Eligibility */}
            {activeTab === "eligibility" && eligibility && (
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                <div style={{ background:"#fff", borderRadius:"18px", padding:"28px", boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"14px" }}>
                    <Pill text={eligibility.recommendation||"DO NOT BID"} />
                    <span style={{ fontSize:"13px", color:"#aaa" }}>Score: <b style={{ color:"#6366f1" }}>{eligibility.eligibility_score}/100</b></span>
                  </div>
                  <p style={{ color:"#666", fontSize:"14px", lineHeight:1.8 }}>{eligibility.reasoning}</p>
                </div>
                <div style={{ background:"#fff", borderRadius:"18px", padding:"28px", boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize:"11px", color:"#bbb", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:"12px" }}>Criteria Breakdown</div>
                  {eligibility.criteria_analysis?.map((c,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"13px 0", borderBottom: i < eligibility.criteria_analysis.length-1 ? "1px solid #f5f5f5":"none", gap:"16px" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:"14px", fontWeight:600, marginBottom:"3px" }}>{c.criterion}</div>
                        {c.gap && <div style={{ fontSize:"12px", color:"#aaa", lineHeight:1.6 }}>{c.gap}</div>}
                      </div>
                      <Pill text={c.meets_requirement===true?"READY":c.meets_requirement===false?"MISSING":"NEEDS PREP"} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Market */}
            {activeTab === "market" && market && (
              <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                <div style={{ display:"flex", gap:"12px" }}>
                  <div style={{ flex:1, background:"#fff", borderRadius:"18px", padding:"24px", boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize:"11px", color:"#bbb", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:"10px" }}>Competition</div>
                    <Pill text={market.market_analysis?.competitive_intensity} />
                  </div>
                  <div style={{ flex:1, background:"#fff", borderRadius:"18px", padding:"24px", boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize:"11px", color:"#bbb", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:"10px" }}>Recommended Bid</div>
                    <div style={{ fontSize:"18px", fontWeight:800, fontFamily:"'Syne',sans-serif" }}>{market.pricing_intelligence?.recommended_bid_price_inr}</div>
                  </div>
                </div>
                <div style={{ background:"#fff", borderRadius:"18px", padding:"28px", boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize:"11px", color:"#bbb", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:"12px" }}>Risk Assessment</div>
                  {market.risk_assessment?.risks?.map((r,i) => (
                    <div key={i} style={{ padding:"13px 0", borderBottom: i < market.risk_assessment.risks.length-1 ? "1px solid #f5f5f5":"none" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"7px" }}>
                        <span style={{ fontSize:"14px", fontWeight:600 }}>{r.risk_type}</span>
                        <Pill text={r.severity} />
                      </div>
                      <p style={{ fontSize:"13px", color:"#888", lineHeight:1.6, marginBottom:"5px" }}>{r.description}</p>
                      <div style={{ fontSize:"12px", color:"#16a34a", fontWeight:500 }}>↳ {r.mitigation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist */}
            {activeTab === "checklist" && bid && (
              <div style={{ background:"#fff", borderRadius:"18px", padding:"28px", boxShadow:"0 2px 16px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize:"11px", color:"#bbb", textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600, marginBottom:"12px" }}>Compliance Checklist</div>
                {bid.compliance_checklist?.map((item,i) => (
                  <div key={i} style={{ display:"flex", gap:"12px", padding:"13px 0", borderBottom: i < bid.compliance_checklist.length-1 ? "1px solid #f5f5f5":"none", alignItems:"flex-start" }}>
                    <Pill text={item.status} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"14px", fontWeight:500, marginBottom:"3px" }}>{item.item}</div>
                      {item.action_required && item.action_required !== "N/A" && <div style={{ fontSize:"12px", color:"#aaa" }}>{item.action_required}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={reset} style={{ marginTop:"20px", width:"100%", padding:"15px", background:"#fff", border:"1px solid #eee", borderRadius:"12px", color:"#aaa", cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:"14px" }}>
              ↺ Analyze another tender
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
