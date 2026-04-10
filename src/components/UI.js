import React, { useEffect, useRef } from "react";

export const C = {
  bg:"#0A0F1C",sf:"#0F1629",card:"#151D30",cardH:"#1A2540",bdr:"#1C2B4A",
  pri:"#0EA5E9",priG:"rgba(14,165,233,0.12)",acc:"#38BDF8",
  ok:"#10B981",okB:"rgba(16,185,129,0.1)",wrn:"#F59E0B",wrnB:"rgba(245,158,11,0.1)",
  err:"#EF4444",errB:"rgba(239,68,68,0.1)",inf:"#8B5CF6",infB:"rgba(139,92,246,0.1)",
  txt:"#E2E8F0",txM:"#94A3B8",txD:"#64748B",
  bgS:"#111827",
  font: "'DM Sans', 'Outfit', ui-sans-serif, system-ui, sans-serif",
};

export const thS = {
  padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:600,color:C.txM,
  textTransform:"uppercase",letterSpacing:"0.5px",background:C.card,
  borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap",position:"sticky",top:0,
  userSelect:"none",
};

export const tdS = {
  padding:"7px 10px",borderBottom:`1px solid ${C.bdr}18`,fontSize:11.5,whiteSpace:"nowrap",
  transition:"background 0.12s",
};

// Row hover helpers — attach to <tr>
export const trHover = {
  onMouseEnter: e => { e.currentTarget.style.background = "rgba(14,165,233,0.04)"; },
  onMouseLeave: e => { e.currentTarget.style.background = "transparent"; },
};

// ── Badge ─────────────────────────────────────────────────────────────────
export function Badge({ t, c, s }) {
  const m = {
    green:  [C.ok,  "rgba(16,185,129,0.15)"],
    yellow: [C.wrn, "rgba(245,158,11,0.15)"],
    red:    [C.err, "rgba(239,68,68,0.15)"],
    blue:   [C.pri, "rgba(14,165,233,0.15)"],
    purple: [C.inf, "rgba(139,92,246,0.15)"],
    orange: ["#F97316","rgba(249,115,22,0.15)"],
    indigo: ["#6366F1","rgba(99,102,241,0.15)"],
  };
  const [fg, bg] = m[c] || m.blue;
  const count = typeof t === "number";
  return (
    <span style={{
      background: bg, color: fg,
      padding: count ? "1px 7px" : "2px 9px",
      borderRadius: 20,
      fontSize: count ? 10 : 10.5,
      fontWeight: 600,
      whiteSpace: "nowrap",
      border: `1px solid ${fg}30`,
      letterSpacing: "0.2px",
      ...s,
    }}>
      {t}
    </span>
  );
}

// ── Button ────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, v = "pri", disabled, s, loading }) {
  const variants = {
    pri:   { background: C.pri,  color: "#fff",  border: "none" },
    sec:   { background: C.card, color: C.txt,   border: `1px solid ${C.bdr}` },
    ok:    { background: C.ok,   color: "#fff",  border: "none" },
    err:   { background: C.err,  color: "#fff",  border: "none" },
    wrn:   { background: C.wrn,  color: "#fff",  border: "none" },
    ghost: { background: "transparent", color: C.txM, border: "none" },
  };
  const base = variants[v] || variants.pri;
  return (
    <button
      onClick={disabled || loading ? undefined : onClick}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          e.currentTarget.style.opacity = "0.85";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.transform = "translateY(0)";
      }}
      onMouseDown={e => { e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
      style={{
        ...base,
        borderRadius: 6,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        fontWeight: 600,
        fontSize: 11.5,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 12px",
        opacity: disabled ? 0.45 : 1,
        transition: "opacity 0.15s, transform 0.1s",
        whiteSpace: "nowrap",
        ...s,
      }}
    >
      {loading ? (
        <>
          <span style={{
            width: 10, height: 10, borderRadius: "50%",
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            display: "inline-block",
            animation: "mu-spin 0.7s linear infinite",
          }} />
          {children}
        </>
      ) : children}
    </button>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────
export function Stat({ icon, label, val, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color || C.pri;
        e.currentTarget.style.background = `${color || C.pri}0A`;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.bdr;
        e.currentTarget.style.background = C.card;
        e.currentTarget.style.transform = "translateY(0)";
      }}
      style={{
        background: C.card,
        borderRadius: 10,
        padding: "13px 15px",
        border: `1px solid ${C.bdr}`,
        cursor: onClick ? "pointer" : "default",
        flex: "1 1 170px",
        minWidth: 160,
        transition: "all 0.2s",
      }}
    >
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color || C.pri}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: color || C.pri, fontSize: 16,
        }}>
          {icon}
        </div>
        {onClick && <span style={{ color: C.txD, fontSize: 11 }}>→</span>}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || C.txt }}>{val}</div>
      <div style={{ fontSize: 10.5, color: C.txM, marginTop: 1 }}>{label}</div>
      {sub && <div style={{ fontSize: 9.5, color: color || C.txD, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Filter Bar ───────────────────────────────────────────────────────────
export function Filt({ fN, setFN, fV, setFV, fC, setFC, vessels, clients }) {
  const inp = {
    background: C.card,
    border: `1px solid ${C.bdr}`,
    borderRadius: 6,
    color: C.txt,
    padding: "6px 9px",
    fontSize: 11.5,
    outline: "none",
    flex: "1 1 140px",
    minWidth: 120,
    transition: "border-color 0.15s",
  };
  const focusStyle = (e) => { e.target.style.borderColor = C.pri; };
  const blurStyle  = (e) => { e.target.style.borderColor = C.bdr; };

  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
      {/* Search with icon */}
      <div style={{ position:"relative", flex:"1 1 200px", minWidth:160 }}>
        <span style={{
          position:"absolute", left:9, top:"50%", transform:"translateY(-50%)",
          color:C.txD, fontSize:12, pointerEvents:"none",
        }}>🔍</span>
        <input
          placeholder="Search name / ID..."
          value={fN}
          onChange={e => setFN(e.target.value)}
          onFocus={focusStyle}
          onBlur={blurStyle}
          style={{ ...inp, paddingLeft: 28, width:"100%", boxSizing:"border-box" }}
        />
      </div>
      <select
        value={fV}
        onChange={e => setFV(e.target.value)}
        onFocus={focusStyle}
        onBlur={blurStyle}
        style={inp}
      >
        <option value="">All Vessels</option>
        {(vessels || []).map(v => <option key={v}>{v}</option>)}
      </select>
      <select
        value={fC}
        onChange={e => setFC(e.target.value)}
        onFocus={focusStyle}
        onBlur={blurStyle}
        style={inp}
      >
        <option value="">All Clients</option>
        {(clients || []).map(c => <option key={c}>{c}</option>)}
      </select>
      {(fN || fV || fC) && (
        <button
          onClick={() => { setFN(""); setFV(""); setFC(""); }}
          style={{
            background:"transparent", border:`1px solid ${C.bdr}`,
            borderRadius:6, color:C.txM, cursor:"pointer",
            fontSize:11, padding:"5px 10px",
          }}
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function Mod({ title, onClose, children, w }) {
  // Escape key to close
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{
        position:"fixed", inset:0,
        background:"rgba(0,0,0,0.65)",
        display:"flex", alignItems:"center", justifyContent:"center",
        zIndex:999,
        backdropFilter:"blur(2px)",
        WebkitBackdropFilter:"blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.sf,
          borderRadius: 12,
          border: `1px solid ${C.bdr}`,
          width: w || 520,
          maxWidth: "95vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          animation: "mu-modal-in 0.18s ease",
        }}
      >
        {/* Header */}
        <div style={{
          padding:"13px 18px",
          borderBottom:`1px solid ${C.bdr}`,
          display:"flex", justifyContent:"space-between", alignItems:"center",
          flexShrink:0,
        }}>
          <h3 style={{ margin:0, fontSize:14, fontWeight:600, color:C.txt }}>{title}</h3>
          <button
            onClick={onClose}
            onMouseEnter={e => { e.currentTarget.style.background=C.card; }}
            onMouseLeave={e => { e.currentTarget.style.background="transparent"; }}
            style={{
              background:"transparent", border:"none",
              color:C.txM, cursor:"pointer",
              fontSize:16, width:28, height:28,
              borderRadius:6, display:"flex",
              alignItems:"center", justifyContent:"center",
              transition:"background 0.15s",
            }}
          >
            ✕
          </button>
        </div>
        {/* Scrollable body */}
        <div style={{ padding:18, overflow:"auto", flex:1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Global keyframe injector (runs once) ─────────────────────────────────
const _styleId = "mu-ui-keyframes";
if (typeof document !== "undefined" && !document.getElementById(_styleId)) {
  const s = document.createElement("style");
  s.id = _styleId;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after {
      font-family: 'DM Sans', 'Outfit', ui-sans-serif, system-ui, sans-serif;
      box-sizing: border-box;
    }

    /* Smooth scrollbar */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #1C2B4A; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #0EA5E9; }

    /* Input focus glow */
    input:focus, select:focus, textarea:focus {
      border-color: #0EA5E9 !important;
      box-shadow: 0 0 0 2px rgba(14,165,233,0.15);
    }

    /* Table row hover */
    .mu-table-row:hover td {
      background: rgba(14,165,233,0.04);
    }

    @keyframes mu-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes mu-modal-in {
      from { opacity:0; transform:scale(0.96) translateY(8px); }
      to   { opacity:1; transform:scale(1) translateY(0); }
    }
    @keyframes mu-toast-in {
      from { opacity:0; transform:translateX(40px); }
      to   { opacity:1; transform:translateX(0); }
    }
    @keyframes mu-pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    @keyframes mu-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes mu-spinner-ring {
      0%   { stroke-dashoffset: 100; }
      100% { stroke-dashoffset: 0; }
    }
    @keyframes mu-ripple {
      from { transform: scale(0); opacity: 0.45; }
      to   { transform: scale(4); opacity: 0; }
    }
    @keyframes mu-logo-glow {
      0%, 100% { filter: drop-shadow(0 0 5px rgba(134,25,143,0.5)); }
      50%       { filter: drop-shadow(0 0 14px rgba(134,25,143,0.9)) drop-shadow(0 0 4px rgba(14,165,233,0.4)); }
    }
    @keyframes mu-slide-in-left {
      from { opacity:0; transform:translateX(-10px); }
      to   { opacity:1; transform:translateX(0); }
    }
    @keyframes mu-tab-indicator {
      from { transform: scaleY(0); }
      to   { transform: scaleY(1); }
    }
    @keyframes mu-ring-pulse {
      0%   { transform: scale(1);    opacity: 1; }
      70%  { transform: scale(1.18); opacity: 0; }
      100% { transform: scale(1);    opacity: 0; }
    }
    @keyframes mu-wave-dot {
      0%, 100% { transform: translateY(0);   opacity: 0.5; }
      50%       { transform: translateY(-7px); opacity: 1; }
    }
  `;
  document.head.appendChild(s);
}
