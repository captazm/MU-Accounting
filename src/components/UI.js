import React from "react";

export const C = {
  bg:"#0A0F1C",sf:"#0F1629",card:"#151D30",cardH:"#1A2540",bdr:"#1C2B4A",
  pri:"#0EA5E9",priG:"rgba(14,165,233,0.12)",acc:"#38BDF8",
  ok:"#10B981",okB:"rgba(16,185,129,0.1)",wrn:"#F59E0B",wrnB:"rgba(245,158,11,0.1)",
  err:"#EF4444",errB:"rgba(239,68,68,0.1)",inf:"#8B5CF6",infB:"rgba(139,92,246,0.1)",
  txt:"#E2E8F0",txM:"#94A3B8",txD:"#64748B"
};

export const thS = {
  padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:600,color:C.txM,
  textTransform:"uppercase",letterSpacing:"0.5px",background:C.card,
  borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap",position:"sticky",top:0
};

export const tdS = {
  padding:"7px 10px",borderBottom:`1px solid ${C.bdr}18`,fontSize:11.5,whiteSpace:"nowrap"
};

export function Badge({ t, c }) {
  const m = { green:[C.ok,C.okB], yellow:[C.wrn,C.wrnB], red:[C.err,C.errB], blue:[C.pri,C.priG], purple:[C.inf,C.infB] };
  const [fg, bg] = m[c] || m.blue;
  return <span style={{ background:bg, color:fg, padding:"2px 7px", borderRadius:4, fontSize:10.5, fontWeight:600, whiteSpace:"nowrap" }}>{t}</span>;
}

export function Btn({ children, onClick, v="pri", disabled, s }) {
  const st = { pri:{background:C.pri,color:"#fff"}, sec:{background:C.card,color:C.txt,border:`1px solid ${C.bdr}`}, ok:{background:C.ok,color:"#fff"}, err:{background:C.err,color:"#fff"}, ghost:{background:"transparent",color:C.txM} };
  return <button onClick={disabled?undefined:onClick} style={{ border:"none",borderRadius:5,cursor:disabled?"not-allowed":"pointer",fontWeight:600,fontSize:11.5,display:"inline-flex",alignItems:"center",gap:4,padding:"5px 11px",opacity:disabled?0.5:1,transition:"all 0.15s",...st[v],...s }}>{children}</button>;
}

export function Stat({ icon, label, val, sub, color, onClick }) {
  return <div onClick={onClick}
    onMouseEnter={e=>{ if(onClick){ e.currentTarget.style.borderColor=color||C.pri; e.currentTarget.style.background=`${color||C.pri}08`; }}}
    onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.bdr; e.currentTarget.style.background=C.card; }}
    style={{ background:C.card,borderRadius:8,padding:"13px 15px",border:`1px solid ${C.bdr}`,cursor:onClick?"pointer":"default",flex:"1 1 170px",minWidth:160,transition:"all 0.2s" }}>
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
      <div style={{ width:32,height:32,borderRadius:7,background:`${color||C.pri}15`,display:"flex",alignItems:"center",justifyContent:"center",color:color||C.pri,fontSize:16 }}>{icon}</div>
      {onClick && <span style={{ color:C.txD,fontSize:11 }}>→</span>}
    </div>
    <div style={{ fontSize:20,fontWeight:700,color:color||C.txt }}>{val}</div>
    <div style={{ fontSize:10.5,color:C.txM,marginTop:1 }}>{label}</div>
    {sub && <div style={{ fontSize:9.5,color:color||C.txD,marginTop:3 }}>{sub}</div>}
  </div>;
}

export function Filt({ fN, setFN, fV, setFV, fC, setFC, vessels, clients }) {
  const inp = { background:C.card,border:`1px solid ${C.bdr}`,borderRadius:5,color:C.txt,padding:"6px 9px",fontSize:11.5,outline:"none",flex:"1 1 140px",minWidth:120 };
  return <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:12 }}>
    <div style={{ position:"relative",flex:"1 1 180px",minWidth:150 }}>
      <input placeholder="Search name/ID..." value={fN} onChange={e=>setFN(e.target.value)} style={{ ...inp,paddingLeft:8,width:"100%",boxSizing:"border-box" }}/>
    </div>
    <select value={fV} onChange={e=>setFV(e.target.value)} style={inp}><option value="">All Vessels</option>{(vessels||[]).map(v=><option key={v}>{v}</option>)}</select>
    <select value={fC} onChange={e=>setFC(e.target.value)} style={inp}><option value="">All Clients</option>{(clients||[]).map(c=><option key={c}>{c}</option>)}</select>
  </div>;
}

export function Mod({ title, onClose, children }) {
  return <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999 }} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{ background:C.sf,borderRadius:10,border:`1px solid ${C.bdr}`,width:520,maxWidth:"93vw",maxHeight:"85vh",display:"flex",flexDirection:"column" }}>
      <div style={{ padding:"12px 16px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <h3 style={{ margin:0,fontSize:14,fontWeight:600 }}>{title}</h3>
        <button onClick={onClose} style={{ background:"none",border:"none",color:C.txM,cursor:"pointer",fontSize:16 }}>✕</button>
      </div>
      <div style={{ padding:16,overflow:"auto",flex:1 }}>{children}</div>
    </div>
  </div>;
}
