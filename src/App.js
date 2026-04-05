import React, { useState, useMemo, useEffect } from "react";
import Tesseract from "tesseract.js";
import { C, Badge, Btn, Stat, Filt, Mod, thS, tdS } from "./components/UI";
import csvCrew from "./data/crewData";
import { fsGetCol, fsSetDoc, fsUpdateDoc, fsBatchSet, fsDelDoc } from "./services/firebase";
import { onAuthChange, authSignOut, fetchUserProfile, hasAnyUser } from "./services/auth";
import LoginPage from "./components/LoginPage";
import UserManagement from "./components/UserManagement";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [crew, setCrew] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [slips, setSlips] = useState([]);
  const [crewPay, setCrewPay] = useState([]);
  const [sb, setSb] = useState(true);
  const [modal, setModal] = useState(null);
  const [fN, setFN] = useState("");
  const [fV, setFV] = useState("");
  const [fC, setFC] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fsOk, setFsOk] = useState(false);
  const [migrating, setMigrating] = useState(false);
  // ── Auth State ──
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);      // "admin" | "accountant"
  const [userProfile, setUserProfile] = useState(null);
  const [isFirstTime, setIsFirstTime] = useState(false);
  // selectedMonth = the salary month (e.g. "2026-03" means March salaries paid ~end of April)
  const now = new Date();
  const defaultSalaryMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`; // previous month
  const [selectedMonth, setSelectedMonth] = useState(defaultSalaryMonth);

  const vessels = useMemo(() => [...new Set(crew.map(c => c.vessel).filter(Boolean))].sort(), [crew]);
  const clients = useMemo(() => [...new Set(crew.map(c => c.client).filter(c => c && c !== "."))].sort(), [crew]);
  const showT = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // ── Auth listener: run once, checks login state ────────────────────────
  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser.uid);
        setCurrentUser(firebaseUser);
        setUserProfile(profile);
        setUserRole(profile?.role || "accountant");
        setIsFirstTime(false);
      } else {
        // No user logged in — check if first-time setup needed
        setCurrentUser(null);
        setUserProfile(null);
        setUserRole(null);
        const anyUser = await hasAnyUser();
        setIsFirstTime(!anyUser);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Data loader: runs after auth is confirmed ────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      setLoading(true);
      try {
        const cr = await fsGetCol("crew");
        if (cr && cr.length > 0) {
          setCrew(cr); setFsOk(true);
          const [bl, py, sl, cp] = await Promise.all([fsGetCol("bills"), fsGetCol("payments"), fsGetCol("slips"), fsGetCol("crewPayments")]);
          if (bl) setBills(bl); if (py) setPayments(py); if (sl) setSlips(sl); if (cp) setCrewPay(cp);
        } else {
          const items = csvCrew.map(c => ({ id: `C${String(c.no).padStart(3, "0")}`, ...c, name: c.name.trim(), vessel: c.vessel.trim(), client: c.client.trim(), status: "Onboard", allotment: { type: "bank", bankName: "", account: "", split: 100 } }));
          setCrew(items);
        }
      } catch (e) {
        console.error("Load error:", e);
        const items = csvCrew.map(c => ({ id: `C${String(c.no).padStart(3, "0")}`, ...c, name: c.name.trim(), vessel: c.vessel.trim(), client: c.client.trim(), status: "Onboard", allotment: { type: "bank", bankName: "", account: "", split: 100 } }));
        setCrew(items);
      }
      setLoading(false);
    })();
  }, [currentUser]);

  const migrate = async () => {
    setMigrating(true);
    const items = csvCrew.map(c => ({ id: `C${String(c.no).padStart(3, "0")}`, ...c, name: c.name.trim(), vessel: c.vessel.trim(), client: c.client.trim(), status: "Onboard", allotment: { type: "bank", bankName: "", account: "", split: 100 }, createdAt: new Date().toISOString() }));
    const ok = await fsBatchSet("crew", items);
    if (ok) { setCrew(items); setFsOk(true); showT(`${items.length} crew migrated to Firestore!`); }
    else showT("Migration failed", "err");
    setMigrating(false);
  };

  const filtered = useMemo(() => crew.filter(c => {
    if (fN && !c.name.toLowerCase().includes(fN.toLowerCase()) && !(c.id || "").toLowerCase().includes(fN.toLowerCase())) return false;
    if (fV && c.vessel !== fV) return false;
    if (fC && c.client !== fC) return false;
    return true;
  }), [crew, fN, fV, fC]);

  const allNav = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "crew",      label: "Crew Registry", icon: "👥" },
    { id: "billing",   label: "Monthly Billing", icon: "📄" },
    { id: "reconcile", label: "Reconciliation", icon: "🔍" },
    { id: "slip",      label: "Slip Upload", icon: "📋" },
    { id: "dist",      label: "Payment Dist.", icon: "💸" },
    { id: "board",     label: "Status Board", icon: "📌" },
    { id: "users",     label: "User Management", icon: "🔐", adminOnly: true },
  ];
  const nav = allNav.filter(n => !n.adminOnly || userRole === "admin");
  const fs = { setD: fsSetDoc, upD: fsUpdateDoc, batchW: fsBatchSet, delD: fsDelDoc };
  const p = { crew, setCrew, bills, setBills, payments, setPayments, slips, setSlips, crewPay, setCrewPay, filtered, fN, setFN, fV, setFV, fC, setFC, modal, setModal, setTab, showT, vessels, clients, fs, fsOk, selectedMonth, setSelectedMonth, userRole };

  const Spinner = ({ msg }) => (<div style={{ height: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.txt, fontFamily: "sans-serif" }}><div style={{ width: 50, height: 50, borderRadius: 12, background: `linear-gradient(135deg,${C.pri},${C.inf})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "#fff", fontSize: 22, fontWeight: 700 }}>M</div><div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>MAHAR UNITY SRPS</div><div style={{ color: C.txM, fontSize: 12 }}>{msg || "Loading..."}</div></div>);

  if (authLoading) return <Spinner msg="Checking authentication..." />;
  if (!currentUser) return <LoginPage isFirstTime={isFirstTime} />;
  if (loading) return <Spinner msg="Loading from Firestore..." />;

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.txt, fontFamily: "system-ui,sans-serif", fontSize: "12.5px", overflow: "hidden" }}>
      {toast && <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, background: toast.type === "ok" ? C.ok : toast.type === "wrn" ? C.wrn : C.err, color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>{toast.msg}</div>}
      <div style={{ width: sb ? 200 : 50, transition: "width 0.2s", background: C.sf, borderRight: `1px solid ${C.bdr}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: sb ? "12px 10px" : "12px 6px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.bdr}`, cursor: "pointer", minHeight: 48 }} onClick={() => setSb(!sb)}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${C.pri},${C.inf})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", fontSize: 14, fontWeight: 700 }}>M</div>
          {sb && <div><div style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px" }}>MAHAR UNITY</div><div style={{ fontSize: 9, color: C.txD, letterSpacing: "1px" }}>SRPS ACCOUNTING</div></div>}
        </div>
        <nav style={{ flex: 1, padding: "6px 4px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
          {nav.map(n => <button key={n.id} onClick={() => setTab(n.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: sb ? "8px 9px" : "8px 10px", borderRadius: 6, border: "none", cursor: "pointer", transition: "all 0.15s", background: tab === n.id ? C.priG : "transparent", color: tab === n.id ? C.acc : C.txM, fontSize: 12, fontWeight: tab === n.id ? 600 : 400, textAlign: "left", borderLeft: tab === n.id ? `2px solid ${C.pri}` : "2px solid transparent", justifyContent: sb ? "flex-start" : "center" }}>{sb ? n.label : n.icon}</button>)}
        </nav>
        {sb && <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.bdr}`, fontSize: 9.5 }}>
          {/* User info */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, padding: "5px 6px", background: C.card, borderRadius: 6, border: `1px solid ${C.bdr}` }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: userRole === "admin" ? `linear-gradient(135deg,${C.inf},${C.pri})` : `linear-gradient(135deg,${C.ok},${C.pri})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{(userProfile?.displayName || "U")[0].toUpperCase()}</div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userProfile?.displayName || "User"}</div>
              <div style={{ fontSize: 9, color: userRole === "admin" ? C.inf : C.ok, textTransform: "capitalize" }}>{userRole}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: fsOk ? C.ok : C.wrn }}>● {fsOk ? "Firestore Connected" : "Local Mode"}</div>
          <div style={{ color: C.txD, marginTop: 2 }}>{crew.length} crew</div>
          {!fsOk && userRole === "admin" && <button onClick={migrate} disabled={migrating} style={{ marginTop: 4, background: C.ok, color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", fontSize: 9, cursor: "pointer", opacity: migrating ? 0.5 : 1 }}>{migrating ? "Migrating..." : "Migrate to Firestore"}</button>}
          <button onClick={async () => { await authSignOut(); }} style={{ marginTop: 6, width: "100%", background: `${C.err}18`, color: C.err, border: `1px solid ${C.err}30`, borderRadius: 4, padding: "4px 8px", fontSize: 9.5, cursor: "pointer", fontWeight: 600 }}>Sign Out</button>
        </div>}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "8px 20px", borderBottom: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: C.sf, minHeight: 42 }}>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{nav.find(n => n.id === tab)?.label}</h2>
          <span style={{ fontSize: 10, color: C.txD }}>April 2026</span>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {tab === "dashboard" && <Dash {...p} />}
          {tab === "board" && <BoardV {...p} />}
          {tab === "crew" && <CrewV {...p} />}
          {tab === "billing" && <BillV {...p} />}
          {tab === "reconcile" && <ReconV {...p} />}
          {tab === "slip" && <SlipV {...p} />}
          {tab === "dist" && <DistV {...p} />}
          {tab === "users" && userRole === "admin" && <UserManagement currentUser={currentUser} showT={showT} />}
        </div>
      </div>
    </div>
  );
}

// ============== DASHBOARD ==============
function Dash({ crew, bills, payments, crewPay, slips, setTab, selectedMonth, setSelectedMonth }) {
  // selectedMonth = salary month (e.g. "2026-03" = March salaries)
  // Payment for that month typically arrives ~end of next month
  const mBills = bills.filter(b => b.month === selectedMonth);
  const mBillIds = new Set(mBills.map(b => b.id));
  const mPayments = payments.filter(p => mBillIds.has(p.billId));
  const mSlipIds = new Set(
    payments.filter(p => mBillIds.has(p.billId)).map(p => p.id)
  );
  const mSlips = slips.filter(s => mSlipIds.has(s.payId));
  const mSlipCrewIds = new Set(mSlips.flatMap(s => s.crewIds || []));
  const mPaidCrewIds = new Set(
    crewPay.filter(p => {
      // Find the slip this payment came from and check if it's from this month's bills
      const slip = slips.find(s => s.id === p.slipId);
      return slip && mSlipIds.has(slip.payId);
    }).map(p => p.crewId)
  );

  const tb = mBills.reduce((s, b) => s + (b.total || 0), 0);
  const tr = mPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const paidCount = mPaidCrewIds.size;
  const slipCount = mSlipCrewIds.size;
  const pendingCount = crew.length - paidCount;

  // Month display helpers
  const [sy, sm] = selectedMonth.split("-").map(Number);
  const salaryMonthLabel = new Date(sy, sm - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });
  const payMonthDate = new Date(sy, sm, 1); // next month
  const payMonthLabel = payMonthDate.toLocaleString("en", { month: "long", year: "numeric" });

  // Prev/next month helpers
  const changeMonth = (delta) => {
    const d = new Date(sy, sm - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const bc = {}; crew.forEach(c => { if (!bc[c.client]) bc[c.client] = { n: 0, t: 0 }; bc[c.client].n++; bc[c.client].t += (c.ownerPaid || 0); });
  const tc = Object.entries(bc).sort((a, b) => b[1].t - a[1].t).slice(0, 8);
  const mx = Math.max(...tc.map(([, d]) => d.t), 1);
  const vCount = [...new Set(crew.map(c => c.vessel).filter(Boolean))].length;

  const pct = crew.length > 0 ? Math.round((paidCount / crew.length) * 100) : 0;

  return <div>
    {/* Month selector banner */}
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <div>
        <div style={{ fontSize: 10, color: C.txD, marginBottom: 2 }}>VIEWING SALARY MONTH</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => changeMonth(-1)} style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, cursor: "pointer", padding: "3px 8px", fontSize: 13 }}>‹</button>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            style={{ background: "transparent", border: "none", color: C.acc, fontSize: 15, fontWeight: 700, cursor: "pointer", outline: "none" }} />
          <button onClick={() => changeMonth(1)} style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, cursor: "pointer", padding: "3px 8px", fontSize: 13 }}>›</button>
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: C.txM, background: C.bg, borderRadius: 6, padding: "6px 10px", border: `1px solid ${C.bdr}` }}>
        <span style={{ color: C.txD }}>Salary: </span><b style={{ color: C.acc }}>{salaryMonthLabel}</b>
        <span style={{ color: C.txD, margin: "0 6px" }}>→</span>
        <span style={{ color: C.txD }}>Payment expected: </span><b style={{ color: C.ok }}>{payMonthLabel}</b>
      </div>
    </div>

    {/* Stats */}
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <Stat label="Total Crew" val={crew.length} sub={`${vCount} vessels`} color={C.pri} onClick={() => setTab("crew")} icon="👥" />
      <Stat label="Bills This Month" val={mBills.length} sub={mBills.length ? `$${tb.toLocaleString()} USD` : "No bills"} color={C.inf} onClick={() => setTab("billing")} icon="📄" />
      <Stat label="Received" val={mPayments.length ? `$${tr.toLocaleString()}` : "—"} sub={tr >= tb && tb > 0 ? "Fully paid" : tb > 0 ? `$${(tb - tr).toLocaleString()} short` : ""} color={C.ok} icon="💰" />
      <Stat label="Salary Paid" val={`${paidCount}/${crew.length}`} sub={`${pct}%`} color={pct === 100 ? C.ok : pct > 50 ? C.wrn : C.err} onClick={() => setTab("board")} icon="✅" />
    </div>

    {/* Progress bar */}
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.txM }}>Salary Payment Progress — {salaryMonthLabel}</h4>
        <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? C.ok : C.wrn }}>{pct}%</span>
      </div>
      <div style={{ height: 10, background: C.bg, borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${C.pri},${C.ok})`, borderRadius: 5, transition: "width 0.5s" }} />
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 10.5 }}>
        {[["Paid", paidCount, C.ok], ["Slip Received", slipCount - paidCount, C.inf], ["Pending", pendingCount - (slipCount - paidCount), C.wrn]].map(([l, v, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            <span style={{ color: C.txM }}>{l}:</span>
            <span style={{ fontWeight: 700, color: c }}>{Math.max(0, v)}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Top clients */}
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14 }}>
      <h4 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: C.txM }}>Top Clients by Owner Paid</h4>
      {tc.map(([cl, d]) => <div key={cl} style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 11.5 }}>{cl}</span><span style={{ fontSize: 11.5, fontWeight: 600, color: C.acc }}>${d.t.toLocaleString()}</span></div>
        <div style={{ height: 5, background: C.bg, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${(d.t / mx) * 100}%`, background: `linear-gradient(90deg,${C.pri},${C.acc})`, borderRadius: 3 }} /></div>
        <div style={{ fontSize: 9, color: C.txD, marginTop: 1 }}>{d.n} crew</div>
      </div>)}
    </div>
  </div>;
}

// ============== CREW REGISTRY ==============
function CrewV({ crew, setCrew, filtered, fN, setFN, fV, setFV, fC, setFC, modal, setModal, showT, vessels, clients, fs, fsOk }) {
  const [form, setForm] = useState({});
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none", width: "100%", boxSizing: "border-box" };
  const save = async () => { if (!form.name) return; const f = { ...form, ownerPaid: Number(form.ownerPaid) || 0, salary: Number(form.salary) || 0, office: Number(form.office) || 0, manningFees: Number(form.manningFees) || 0 }; if (fsOk) await fs.setD("crew", f.id, f); if (modal === "add") setCrew([...crew, f]); else setCrew(crew.map(c => c.id === f.id ? f : c)); showT(`${f.name} saved${fsOk ? " to Firestore" : ""}`); setModal(null); };
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ fontSize: 11.5, color: C.txM }}>{filtered.length}/{crew.length} crew</span><Btn onClick={() => { setForm({ id: `C${String(crew.length + 1).padStart(3, "0")}`, no: crew.length + 1, name: "", rank: "", ownerPaid: 0, vessel: "", client: "", joinDate: "", salary: 0, office: 0, remark: "", manningFees: 0, status: "Onboard", allotment: { type: "bank", bankName: "", account: "", split: 100 } }); setModal("add"); }}>+ Add</Btn></div>
    <Filt {...{ fN, setFN, fV, setFV, fC, setFC, vessels, clients }} />
    <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.bdr}` }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["No", "ID", "Name", "Rank", "Vessel", "Client", "Join", "OwnerPaid", "Salary", "Office", "Manning", "Remark", ""].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{filtered.map(c => <tr key={c.id || c.no}><td style={tdS}>{c.no}</td><td style={tdS}><span style={{ color: C.acc, fontWeight: 600 }}>{c.id}</span></td><td style={tdS}><span style={{ fontWeight: 500 }}>{c.name}</span></td><td style={tdS}>{c.rank}</td><td style={{ ...tdS, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>{c.vessel || "—"}</td><td style={tdS}>{c.client}</td><td style={tdS}>{c.joinDate || "—"}</td><td style={{ ...tdS, fontWeight: 600, color: C.acc }}>${(c.ownerPaid || 0).toLocaleString()}</td><td style={tdS}>${(c.salary || 0).toLocaleString()}</td><td style={tdS}>${(c.office || 0).toLocaleString()}</td><td style={tdS}>${c.manningFees || 0}</td><td style={{ ...tdS, fontSize: 10, color: C.txD, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{c.remark || "—"}</td><td style={tdS}><Btn v="ghost" onClick={() => { setForm({ ...c }); setModal("edit"); }}>Edit</Btn></td></tr>)}</tbody></table></div>
    {(modal === "add" || modal === "edit") && <Mod title={modal === "add" ? "Add Crew" : "Edit Crew"} onClose={() => setModal(null)}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{[["ID", "id", true], ["Name *", "name"], ["Rank", "rank"], ["Vessel", "vessel"], ["Client", "client"], ["Join Date", "joinDate"], ["Owner Paid", "ownerPaid"], ["Salary", "salary"], ["Office", "office"], ["Manning", "manningFees"], ["Remark", "remark"]].map(([l, k, d]) => <div key={k}><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>{l}</label><input value={form[k] ?? ""} disabled={d} onChange={e => setForm({ ...form, [k]: e.target.value })} style={{ ...inp, opacity: d ? 0.5 : 1 }} /></div>)}</div><div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 14 }}><Btn v="sec" onClick={() => setModal(null)}>Cancel</Btn><Btn v="ok" onClick={save}>Save</Btn></div></Mod>}
  </div>;
}

// ============== BILLING ==============
function BillV({ crew, bills, setBills, showT, clients, fs, fsOk }) {
  const [sc, setSc] = useState(""); const [mo, setMo] = useState("2026-04"); const [vb, setVb] = useState(null);
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none" };
  const getDIM = (y, m) => new Date(y, m, 0).getDate();
  const fmtD = (d, m, y) => { const ms = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]; return `${d}.${ms[m - 1]}.${y}`; };
  const gen = async () => { if (!sc) return; const cl = crew.filter(c => c.client === sc); if (!cl.length) return; const [y, m] = mo.split("-").map(Number); const dim = getDIM(y, m);
    const bc = cl.map(c => { let dob = dim; if (c.joinDate) { const jd = new Date(c.joinDate); const ms2 = new Date(y, m - 1, 1); const me = new Date(y, m - 1, dim); if (jd > ms2 && jd <= me) dob = dim - jd.getDate() + 1; else if (jd > me) dob = 0; } const ha = dob === dim ? (c.ownerPaid || 0) : Math.round(((c.ownerPaid || 0) / dim) * dob * 100) / 100; return { ...c, from: fmtD(1, m, y), to: fmtD(dim, m, y), daysOnBoard: dob, daysOfMonth: dim, actualHA: ha, pob: 0, bonus: 0, pdeFees: 0, visaFees: 0, workingGear: 0, totalPayment: ha, billRemark: c.remark || "" }; }).filter(r => r.daysOnBoard > 0);
    const bill = { id: `BILL-${String(bills.length + 1).padStart(3, "0")}`, client: sc, month: mo, from: fmtD(1, m, y), to: fmtD(dim, m, y), crew: bc, totalHA: Math.round(bc.reduce((s, c) => s + c.actualHA, 0) * 100) / 100, total: Math.round(bc.reduce((s, c) => s + c.totalPayment, 0) * 100) / 100, status: "Draft", date: new Date().toISOString().split("T")[0], bankInfo: { accNo: "840-096-0029-001674-501", accName: "Mahar Unity (Thailand) Company Limited", bankName: "Bangkok Bank", swift: "BKKBTHBK", remark: "Manning fee calculated upon 30 days, no overlap" } };
    setBills([...bills, bill]); if (fsOk) fs.setD("bills", bill.id, bill); showT(`Bill ${bill.id} created`); };
  const setSt = async (id, st) => { setBills(bills.map(b => b.id === id ? { ...b, status: st } : b)); if (fsOk) fs.upD("bills", id, { status: st }); showT(`${id} → ${st}`); };
  const fi = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 3, color: C.txt, padding: "3px 5px", fontSize: 10.5, outline: "none", width: 55, textAlign: "right" };
  const upB = (bid, field, val) => { setBills(bills.map(b => b.id === bid ? { ...b, bankInfo: { ...b.bankInfo, [field]: val } } : b)); };
  const upL = (bid, cid, field, val) => { setBills(bills.map(b => { if (b.id !== bid) return b; const uc = (b.crew || []).map(c => { if (c.id !== cid) return c; const isNum = field !== "billRemark"; const u = { ...c, [field]: isNum ? (Number(val) || 0) : val }; if (field === "daysOnBoard") { u.actualHA = u.daysOnBoard === u.daysOfMonth ? (u.ownerPaid || 0) : Math.round(((u.ownerPaid || 0) / u.daysOfMonth) * u.daysOnBoard * 100) / 100; } u.totalPayment = (u.actualHA || 0) + (u.pob || 0) + (u.bonus || 0) + (u.pdeFees || 0) + (u.visaFees || 0) + (u.workingGear || 0); return u; }); const newTHA = Math.round(uc.reduce((s, c) => s + (c.actualHA || 0), 0) * 100) / 100; return { ...b, crew: uc, totalHA: newTHA, total: Math.round(uc.reduce((s, c) => s + (c.totalPayment || 0), 0) * 100) / 100 }; })); };
  const exportCSV = (b) => { const hdr = ['Name','Sign On','Wages/M','From','To','Days Board','Days/M','Actual HA','POB','Bonus','PDE','VISA','WG','Total','Remark']; const rows = (b.crew||[]).map(c => [c.name,c.joinDate||'',c.ownerPaid||0,c.from,c.to,c.daysOnBoard,c.daysOfMonth,(c.actualHA||0).toFixed(2),c.pob||0,c.bonus||0,c.pdeFees||0,c.visaFees||0,c.workingGear||0,(c.totalPayment||0).toFixed(2),c.billRemark||'']); const csv = [hdr,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n'); const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv); a.download=`${b.id}-${b.client}-${b.month}.csv`; a.click(); };
  const exportPDF = (b) => { const trs=(b.crew||[]).map((c,i)=>`<tr><td>${i+1}</td><td>${c.name}</td><td>${c.joinDate||''}</td><td>${c.ownerPaid||0}</td><td>${c.from}</td><td>${c.to}</td><td style="color:${c.daysOnBoard<c.daysOfMonth?'#F59E0B':'inherit'}">${c.daysOnBoard}</td><td>${c.daysOfMonth}</td><td>${(c.actualHA||0).toFixed(2)}</td><td>${c.pob||0}</td><td>${c.bonus||0}</td><td>${c.pdeFees||0}</td><td>${c.visaFees||0}</td><td>${c.workingGear||0}</td><td><b>${(c.totalPayment||0).toFixed(2)}</b></td><td>${c.billRemark||''}</td></tr>`).join(''); const html=`<!DOCTYPE html><html><head><title>${b.id}</title><style>*{font-family:Arial,sans-serif;font-size:10px}body{margin:20px}h2{font-size:14px;margin-bottom:4px}.info{color:#666;margin-bottom:10px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 5px}th{background:#f0f0f0;text-align:center;font-size:9px}td{text-align:right}td:nth-child(1),td:nth-child(2),td:nth-child(3){text-align:left}.total td{font-weight:bold;background:#f9f9f9}.bank{margin-top:12px;padding:8px;border:1px solid #ccc;font-size:9px}@media print{body{margin:10px}}</style></head><body><h2>${b.client} — ${b.month} MONTHLY BILL (${b.id})</h2><div class="info">Period: ${b.from} — ${b.to} &nbsp;|&nbsp; Crew: ${(b.crew||[]).length} &nbsp;|&nbsp; Status: ${b.status} &nbsp;|&nbsp; Date: ${b.date||''}</div><table><thead><tr><th>#</th><th>Name</th><th>Sign On</th><th>Wages/M</th><th>From</th><th>To</th><th>Days Board</th><th>Days/M</th><th>Actual HA</th><th>POB</th><th>Bonus</th><th>PDE</th><th>VISA</th><th>WG</th><th>Total</th><th>Remark</th></tr></thead><tbody>${trs}</tbody><tfoot><tr class="total"><td colspan="14" style="text-align:right">TOTAL USD</td><td>${(b.total||0).toFixed(2)}</td><td></td></tr></tfoot></table><div class="bank"><b>BANK REMITTANCE:</b> ${b.bankInfo?.accNo} | ${b.bankInfo?.accName} | ${b.bankInfo?.bankName} | SWIFT: ${b.bankInfo?.swift}<br>REMARK: ${b.bankInfo?.remark || "Manning fee calculated upon 30 days, no overlap"}</div></body></html>`; const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),400); };
  return <div>
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}><h4 style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600 }}>Generate Monthly Bill</h4><div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Client</label><select value={sc} onChange={e => setSc(e.target.value)} style={inp}><option value="">Select</option>{clients.map(c => <option key={c}>{c}</option>)}</select></div><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Month</label><input type="month" value={mo} onChange={e => setMo(e.target.value)} style={inp} /></div><Btn onClick={gen} disabled={!sc}>Generate</Btn></div></div>
    {!bills.length ? <div style={{ textAlign: "center", padding: 30, color: C.txD }}>No bills yet.</div> : bills.slice().reverse().map(b => <div key={b.id} style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontWeight: 700, color: C.acc, fontSize: 13 }}>{b.id}</span><Badge t={b.status} c={b.status === "Paid" ? "green" : b.status === "Sent" ? "blue" : "yellow"} /></div><div style={{ display: "flex", gap: 5 }}>{b.status === "Draft" && <Btn v="pri" onClick={() => setSt(b.id, "Sent")}>Send</Btn>}<Btn v="ghost" onClick={() => exportCSV(b)} s={{ fontSize: 11 }}>📊 Excel</Btn><Btn v="ghost" onClick={() => exportPDF(b)} s={{ fontSize: 11 }}>📄 PDF</Btn><Btn v="sec" onClick={() => setVb(vb === b.id ? null : b.id)}>{vb === b.id ? "Hide" : "Details"}</Btn></div></div>
      <div style={{ background: C.bg, borderRadius: 6, padding: "8px 12px", border: `1px solid ${C.bdr}` }}><div style={{ fontSize: 13, fontWeight: 700, color: C.acc, marginBottom: 4 }}>{b.client} {(b.month || "").split("-").reverse().join("'")} BILL</div><div style={{ display: "flex", gap: 16, fontSize: 11, color: C.txM, flexWrap: "wrap" }}><span>Period: <b style={{ color: C.txt }}>{b.from} — {b.to}</b></span><span>Crew: <b style={{ color: C.txt }}>{(b.crew || []).length}</b></span><span>Total: <b style={{ color: C.ok, fontSize: 12.5 }}>${(b.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</b></span></div></div>
      {vb === b.id && <div style={{ overflowX: "auto", borderRadius: 5, border: `1px solid ${C.bdr}`, marginTop: 8 }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}><thead><tr>{["Name", "Sign On Date", "Wages/M", "From", "To", "Days on Board", "Days of Month", "Actual HA", "POB", "Bonus", "PDE Fees", "VISA FEES", "WG", "Total Payment", "Remark"].map(h => <th key={h} style={{ ...thS, fontSize: 9, padding: "6px 4px" }}>{h}</th>)}</tr></thead><tbody>{(b.crew || []).map((c, i) => <tr key={c.id || i}><td style={{ ...tdS, fontWeight: 500 }}>{c.name}</td><td style={tdS}>{c.joinDate || "—"}</td><td style={{ ...tdS, textAlign: "right" }}>{(c.ownerPaid || 0).toLocaleString()}</td><td style={tdS}>{c.from || b.from}</td><td style={tdS}>{c.to || b.to}</td>{b.status === "Draft" ? <><td style={tdS}><input type="number" min="0" max={c.daysOfMonth} value={c.daysOnBoard ?? ""} onChange={e => upL(b.id, c.id, "daysOnBoard", e.target.value)} style={{ ...fi, color: c.daysOnBoard < c.daysOfMonth ? C.wrn : C.txt, fontWeight: c.daysOnBoard < c.daysOfMonth ? 700 : 400, width: 45 }} /></td><td style={{ ...tdS, textAlign: "center" }}>{c.daysOfMonth}</td><td style={{ ...tdS, textAlign: "right", fontWeight: 600, color: C.inf }}>{(c.actualHA || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td style={tdS}><input type="number" value={c.pob || ""} onChange={e => upL(b.id, c.id, "pob", e.target.value)} style={fi} placeholder="0" /></td><td style={tdS}><input type="number" value={c.bonus || ""} onChange={e => upL(b.id, c.id, "bonus", e.target.value)} style={fi} placeholder="0" /></td><td style={tdS}><input type="number" value={c.pdeFees || ""} onChange={e => upL(b.id, c.id, "pdeFees", e.target.value)} style={fi} placeholder="0" /></td><td style={tdS}><input type="number" value={c.visaFees || ""} onChange={e => upL(b.id, c.id, "visaFees", e.target.value)} style={fi} placeholder="0" /></td><td style={tdS}><input type="number" value={c.workingGear || ""} onChange={e => upL(b.id, c.id, "workingGear", e.target.value)} style={fi} placeholder="0" /></td><td style={{ ...tdS, fontWeight: 700, textAlign: "right", color: C.acc }}>{(c.totalPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td style={tdS}><input value={c.billRemark || ""} onChange={e => upL(b.id, c.id, "billRemark", e.target.value)} style={{ ...fi, width: 90, textAlign: "left" }} placeholder="—" /></td></> : <><td style={{ ...tdS, textAlign: "center", color: c.daysOnBoard < c.daysOfMonth ? C.wrn : C.txt, fontWeight: c.daysOnBoard < c.daysOfMonth ? 700 : 400 }}>{c.daysOnBoard}</td><td style={{ ...tdS, textAlign: "center" }}>{c.daysOfMonth}</td><td style={{ ...tdS, textAlign: "right", fontWeight: 600 }}>{(c.actualHA || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td style={{ ...tdS, textAlign: "right" }}>{c.pob || "—"}</td><td style={{ ...tdS, textAlign: "right" }}>{c.bonus || "—"}</td><td style={{ ...tdS, textAlign: "right" }}>{c.pdeFees || "—"}</td><td style={{ ...tdS, textAlign: "right" }}>{c.visaFees || "—"}</td><td style={{ ...tdS, textAlign: "right" }}>{c.workingGear || "—"}</td><td style={{ ...tdS, fontWeight: 700, textAlign: "right", color: C.acc }}>{(c.totalPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td style={{ ...tdS, fontSize: 10, color: C.txD }}>{c.billRemark || "—"}</td></>}</tr>)}</tbody><tfoot><tr style={{ background: C.bg }}><td colSpan={7} style={{ ...tdS, textAlign: "right", fontWeight: 700 }}>TOTAL</td><td style={{ ...tdS, textAlign: "right", fontWeight: 700, color: C.acc }}>{(b.totalHA || b.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td colSpan={5}></td><td style={{ ...tdS, textAlign: "right", fontWeight: 700, fontSize: 12, color: C.ok }}>{(b.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td></td></tr></tfoot></table></div>}
      {vb === b.id && b.bankInfo && <div style={{ background: C.bg, borderRadius: 5, padding: 12, border: `1px solid ${C.bdr}`, marginTop: 8, fontSize: 10.5 }}>
        <div style={{ fontWeight: 600, color: C.txM, marginBottom: 8 }}>BANK REMITTANCE {b.status === "Draft" && <span style={{ color: C.inf, fontWeight: 400, marginLeft: 8 }}>(Editable in Draft)</span>}</div>
        {b.status === "Draft" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <div><label style={{ display: "block", fontSize: 9, color: C.txD, marginBottom: 2 }}>Account No</label><input value={b.bankInfo.accNo} onChange={e => upB(b.id, "accNo", e.target.value)} style={{ ...fi, width: "100%", textAlign: "left", boxSizing: "border-box" }} /></div>
            <div><label style={{ display: "block", fontSize: 9, color: C.txD, marginBottom: 2 }}>Account Name</label><input value={b.bankInfo.accName} onChange={e => upB(b.id, "accName", e.target.value)} style={{ ...fi, width: "100%", textAlign: "left", boxSizing: "border-box" }} /></div>
            <div><label style={{ display: "block", fontSize: 9, color: C.txD, marginBottom: 2 }}>Bank Name</label><input value={b.bankInfo.bankName} onChange={e => upB(b.id, "bankName", e.target.value)} style={{ ...fi, width: "100%", textAlign: "left", boxSizing: "border-box" }} /></div>
            <div><label style={{ display: "block", fontSize: 9, color: C.txD, marginBottom: 2 }}>SWIFT</label><input value={b.bankInfo.swift} onChange={e => upB(b.id, "swift", e.target.value)} style={{ ...fi, width: "100%", textAlign: "left", boxSizing: "border-box" }} /></div>
            <div style={{ gridColumn: "1/-1" }}><label style={{ display: "block", fontSize: 9, color: C.txD, marginBottom: 2 }}>Remark</label><input value={b.bankInfo.remark} onChange={e => upB(b.id, "remark", e.target.value)} style={{ ...fi, width: "100%", textAlign: "left", boxSizing: "border-box" }} /></div>
          </div>
        ) : (
          <>
            <div>Acc: {b.bankInfo.accNo} | {b.bankInfo.accName} | {b.bankInfo.bankName} | SWIFT: <b>{b.bankInfo.swift}</b></div>
            <div style={{ color: C.txD, marginTop: 4 }}>REMARK: {b.bankInfo.remark || "Manning fee calculated upon 30 days, no overlap"}</div>
          </>
        )}
      </div>}
    </div>)}
  </div>;
}

// ============== RECONCILIATION ==============
function ReconV({ bills, setBills, payments, setPayments, showT, fs, fsOk }) {
  const [pf, setPf] = useState({ billId: "", amount: "", ref: "", date: new Date().toISOString().split("T")[0] });
  const [res, setRes] = useState(null);
  const [ocrLd, setOcrLd] = useState(false);
  const [ocrMsg, setOcrMsg] = useState("");
  const sent = bills.filter(b => b.status === "Sent");
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none", width: "100%", boxSizing: "border-box" };
  
  const handleOcr = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!pf.billId) { showT("Please select a Bill first to verify the amount against.", "wrn"); return; }
    
    setOcrLd(true); setOcrMsg("Scanning slip..."); setRes(null);
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      const b = bills.find(x => x.id === pf.billId);
      if (!b) throw new Error("Bill not found.");
      
      const targetAmt = b.total;
      // Find all numbers in text
      const nums = text.match(/\d+[.,]?\d*/g);
      let foundMatch = false;
      let highestVal = 0;
      
      if (nums) {
        for (let str of nums) {
          const val = parseFloat(str.replace(/,/g, ""));
          if (!isNaN(val)) {
            if (val > highestVal) highestVal = val;
            if (Math.abs(val - targetAmt) < 0.01) {
              foundMatch = true; break;
            }
          }
        }
      }
      
      if (foundMatch) {
         setPf(prev => ({ ...prev, amount: String(targetAmt) }));
         setOcrMsg("✅ OCR Verified: Matching amount found in slip.");
         showT("OCR Match found!");
      } else {
         setOcrMsg(`❌ OCR Warning: Mismatch. Expected $${targetAmt.toLocaleString()}, largest number found was $${highestVal.toLocaleString()}.`);
         showT("OCR Amount Mismatch", "wrn");
      }
    } catch (err) {
      console.error(err);
      setOcrMsg("⚠️ OCR Error: Failed to process image.");
    }
    setOcrLd(false);
  };

  const rec = async () => { const bill = bills.find(b => b.id === pf.billId); if (!bill) return; const amt = Number(pf.amount); const diff = amt - bill.total;
    const pay = { id: `PAY-${String(payments.length + 1).padStart(3, "0")}`, billId: bill.id, client: bill.client, amount: amt, ref: pf.ref, date: pf.date, match: Math.abs(diff) < 0.01, diff };
    setPayments([...payments, pay]); if (fsOk) fs.setD("payments", pay.id, pay);
    if (Math.abs(diff) < 0.01) { setBills(bills.map(b => b.id === bill.id ? { ...b, status: "Paid" } : b)); if (fsOk) fs.upD("bills", bill.id, { status: "Paid" }); setRes({ ok: true, msg: `Matches ${bill.id}. PAID.` }); showT("Matched!"); }
    else { setRes({ ok: false, msg: `Mismatch on ${bill.id}.`, diff }); showT("Mismatch", "wrn"); }
    setPf({ billId: "", amount: "", ref: "", date: new Date().toISOString().split("T")[0] }); setOcrMsg(""); };
    
  return <div>
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}><h4 style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600 }}>Record Payment & Bank Slip Verification</h4>{!sent.length ? <div style={{ color: C.txD, fontSize: 11.5 }}>No outstanding (Sent) bills.</div> : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>1. Select Bill</label><select value={pf.billId} onChange={e => { const b = bills.find(x => x.id === e.target.value); setPf({ ...pf, billId: e.target.value, amount: b ? String(b.total) : "" }); setOcrMsg(""); }} style={inp}><option value="">Select</option>{sent.map(b => <option key={b.id} value={b.id}>{b.id}-{b.client}</option>)}</select></div>
    <div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>2. Upload Bank Slip for OCR Validation</label><div style={{ display: "flex", gap: 8 }}><input type="file" accept="image/*" onChange={handleOcr} style={{...inp, flex: 1}} disabled={!pf.billId || ocrLd} /></div></div>
    {ocrMsg && <div style={{ gridColumn: "1/-1", fontSize: 11, padding: 8, borderRadius: 5, background: ocrMsg.includes("✅") ? C.okB : (ocrMsg.includes("❌") ? C.wrnB : C.bg), color: ocrMsg.includes("✅") ? C.ok : (ocrMsg.includes("❌") ? C.wrn : C.txM), border: `1px solid ${ocrMsg.includes("✅") ? C.ok : (ocrMsg.includes("❌") ? C.wrn : C.bdr)}` }}>{ocrLd ? "Scanning Image..." : ocrMsg}</div>}
    <div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>3. Amount</label><input type="number" value={pf.amount} onChange={e => setPf({ ...pf, amount: e.target.value })} style={inp} /></div><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Ref</label><input value={pf.ref} onChange={e => setPf({ ...pf, ref: e.target.value })} style={inp} /></div><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Date</label><input type="date" value={pf.date} onChange={e => setPf({ ...pf, date: e.target.value })} style={inp} /></div><div style={{ gridColumn: "1/-1", marginTop: 8 }}><Btn onClick={rec} disabled={!pf.billId || !pf.amount}>Reconcile & Create Resulting Slips</Btn></div></div>}</div>
    {res && <div style={{ background: res.ok ? C.okB : C.wrnB, border: `1px solid ${res.ok ? C.ok : C.wrn}33`, borderRadius: 7, padding: 12, marginBottom: 14 }}><div style={{ fontWeight: 600, color: res.ok ? C.ok : C.wrn }}>{res.ok ? "MATCH" : "MISMATCH"} - {res.msg}</div>{res.diff != null && !res.ok && <div style={{ fontWeight: 700, color: C.wrn, marginTop: 3 }}>Difference: ${Math.abs(res.diff).toLocaleString()}</div>}</div>}
    {payments.length > 0 && <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.bdr}` }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["ID", "Bill", "Client", "Amount", "Ref", "Date", "Status"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{payments.slice().reverse().map(p => <tr key={p.id}><td style={tdS}><span style={{ fontWeight: 600, color: C.acc }}>{p.id}</span></td><td style={tdS}>{p.billId}</td><td style={tdS}>{p.client}</td><td style={tdS}>${(p.amount || 0).toLocaleString()}</td><td style={tdS}>{p.ref}</td><td style={tdS}>{p.date}</td><td style={tdS}><Badge t={p.match ? "Matched" : "Mismatch"} c={p.match ? "green" : "red"} /></td></tr>)}</tbody></table></div>}
  </div>;
}

// ============== SLIP UPLOAD ==============
function SlipV({ crew, payments, slips, setSlips, showT, fs, fsOk }) {
  const [sp, setSp] = useState(""); const [sc, setSc] = useState([]);
  const mt = payments.filter(p => p.match); const py = payments.find(p => p.id === sp);
  const assignedCrewIds = py ? slips.filter(s => s.payId === sp).flatMap(s => s.crewIds || []) : [];
  const cc = py ? crew.filter(c => c.client === py.client && !assignedCrewIds.includes(c.id)) : [];
  const assignedCount = py ? (crew.filter(c => c.client === py.client).length - cc.length) : 0;
  const tg = id => setSc(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none", width: "100%", boxSizing: "border-box" };
  const up = () => { if (!sp || !sc.length) return; const sl = { id: `SLIP-${String(slips.length + 1).padStart(3, "0")}`, payId: sp, client: py.client, crewIds: [...sc], date: new Date().toISOString().split("T")[0] }; setSlips([...slips, sl]); if (fsOk) fs.setD("slips", sl.id, sl); showT(`Slip ${sl.id} created`); setSp(""); setSc([]); };
  const delSlip = async (id) => { setSlips(slips.filter(s => s.id !== id)); if (fsOk) await fs.delD("slips", id); showT(`Slip ${id} deleted`, "wrn"); };
  return <div>
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}><h4 style={{ margin: "0 0 3px", fontSize: 12.5, fontWeight: 600 }}>Upload Salary Slip</h4><p style={{ fontSize: 10.5, color: C.txD, margin: "0 0 10px" }}>Select matched payment & choose crew.</p>{!mt.length ? <div style={{ color: C.txD, fontSize: 11.5 }}>No matched payments yet.</div> : <><div style={{ marginBottom: 10 }}><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Payment</label><select value={sp} onChange={e => { setSp(e.target.value); setSc([]); }} style={{ ...inp, maxWidth: 400 }}><option value="">Select</option>{mt.map(p => <option key={p.id} value={p.id}>{p.id}-{p.client}</option>)}</select></div>{sp && <div style={{ fontSize: 10.5, color: C.inf, marginBottom: 8 }}>{assignedCount} crew already assigned to slips for this payment.</div>}{sp && cc.length === 0 && assignedCount > 0 && <div style={{ padding: 10, background: C.okB, color: C.ok, borderRadius: 5, fontSize: 11 }}>All crew members for this payment have been assigned to uploaded slips.</div>}{sp && cc.length > 0 && <><div style={{ display: "flex", gap: 4, marginBottom: 8 }}><Btn v="ghost" onClick={() => setSc(cc.map(c => c.id))}>All</Btn><Btn v="ghost" onClick={() => setSc([])}>Clear</Btn></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 5, marginBottom: 10, maxHeight: 300, overflow: "auto" }}>{cc.map(c => { const sel = sc.includes(c.id); return <div key={c.id} onClick={() => tg(c.id)} style={{ padding: "6px 8px", borderRadius: 5, cursor: "pointer", background: sel ? C.priG : C.bg, border: `1px solid ${sel ? C.pri : C.bdr}`, display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${sel ? C.pri : C.txD}`, background: sel ? C.pri : "transparent", flexShrink: 0 }} /><div><div style={{ fontSize: 11.5, fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 9.5, color: C.txD }}>{c.rank} · {c.vessel}</div></div></div>; })}</div><Btn onClick={up} disabled={!sc.length}>Upload ({sc.length} crew)</Btn></>}</>}</div>
    {slips.length > 0 && slips.slice().reverse().map(sl => <div key={sl.id} style={{ background: C.card, borderRadius: 7, border: `1px solid ${C.bdr}`, padding: 12, marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontWeight: 700, color: C.acc }}>{sl.id}</span><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 10, color: C.txD }}>{sl.date}</span><button onClick={() => delSlip(sl.id)} style={{ background: "transparent", border: "none", color: C.wrn, cursor: "pointer", fontSize: 10 }}>Delete</button></div></div><div style={{ fontSize: 11.5, color: C.txM, marginBottom: 5 }}>Pay: {sl.payId} · {sl.client}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{(sl.crewIds || []).map(cid => { const c = crew.find(cr => cr.id === cid); return c ? <span key={cid} style={{ background: C.okB, color: C.ok, padding: "2px 6px", borderRadius: 3, fontSize: 10 }}>{c.name}</span> : null; })}</div></div>)}
  </div>;
}

// ============== DISTRIBUTION ==============
function DistV({ crew, slips, crewPay, setCrewPay, showT, fs, fsOk, userRole }) {
  // IDs that already have a crewPayment record (any status)
  const processedIds = new Set(crewPay.map(p => p.crewId));

  // Slips that still have unprocessed crew
  const pendingSlips = slips.filter(s => (s.crewIds || []).some(id => !processedIds.has(id)));

  // Payments waiting for admin approval
  const awaitingApproval = crewPay.filter(p => p.status === "Pending Approval");
  const paidPayments     = crewPay.filter(p => p.status === "Paid");

  // Accountant: process slip → status "Pending Approval"
  const proc = async (sl) => {
    // Look up the bill via payment
    const payment = payments.find(p => p.id === sl.payId);
    const bill = payment ? bills.find(b => b.id === payment.billId) : null;

    const newPays = (sl.crewIds || [])
      .filter(id => !processedIds.has(id))
      .map((cid, i) => {
        const c = crew.find(cr => cr.id === cid);
        if (!c) return null;
        
        let actualPayment = c.ownerPaid || 0;
        if (bill && bill.crew) {
          const billCrew = bill.crew.find(bc => bc.id === cid);
          if (billCrew && billCrew.totalPayment !== undefined) {
             actualPayment = billCrew.totalPayment;
          }
        }

        return {
          id: `CPAY-${String(crewPay.length + i + 1).padStart(3, "0")}`,
          crewId: cid, crewName: c.name, slipId: sl.id,
          total: actualPayment, bankAmount: actualPayment, cashAmount: 0,
          type: c.allotment?.type || "bank",
          status: "Pending Approval",
          date: new Date().toISOString().split("T")[0],
        };
      }).filter(Boolean);
    setCrewPay([...crewPay, ...newPays]);
    if (fsOk) fs.batchW("crewPayments", newPays);
    showT(`${newPays.length} payments submitted — awaiting admin approval`, "wrn");
  };

  // Admin: approve a single payment
  const approve = async (payId) => {
    setCrewPay(crewPay.map(p => p.id === payId ? { ...p, status: "Paid", approvedAt: new Date().toISOString() } : p));
    if (fsOk) fs.upD("crewPayments", payId, { status: "Paid", approvedAt: new Date().toISOString() });
    showT("Payment approved ✓");
  };

  // Admin: approve all pending at once
  const approveAll = async () => {
    const now = new Date().toISOString();
    const updated = crewPay.map(p => p.status === "Pending Approval" ? { ...p, status: "Paid", approvedAt: now } : p);
    setCrewPay(updated);
    if (fsOk) {
      for (const p of awaitingApproval) {
        await fs.upD("crewPayments", p.id, { status: "Paid", approvedAt: now });
      }
    }
    showT(`${awaitingApproval.length} payments approved ✓`);
  };

  return <div>
    {/* ── Accountant: Process Slips ── */}
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}>
      <h4 style={{ margin: "0 0 3px", fontSize: 12.5, fontWeight: 600 }}>Payment Distribution</h4>
      <p style={{ fontSize: 10.5, color: C.txD, margin: "0 0 10px" }}>
        {userRole === "admin"
          ? "Review and approve crew salary payments."
          : "Process crew payments from uploaded slips. Payments require Admin approval before finalizing."}
      </p>
      {!pendingSlips.length
        ? <div style={{ color: C.txD, fontSize: 11.5 }}>{slips.length ? "All slips processed." : "No slips uploaded yet."}</div>
        : pendingSlips.map(sl => {
            const pendingCrew = (sl.crewIds || []).filter(id => !processedIds.has(id));
            return <div key={sl.id} style={{ background: C.bg, borderRadius: 6, padding: 10, marginBottom: 6, border: `1px solid ${C.bdr}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><span style={{ fontWeight: 600, color: C.acc }}>{sl.id}</span> · {sl.client} · {pendingCrew.length} crew</span>
                <Btn v="ok" onClick={() => proc(sl)}>Submit for Approval</Btn>
              </div>
            </div>;
          })
      }
    </div>

    {/* ── Admin: Approval Queue ── */}
    {userRole === "admin" && awaitingApproval.length > 0 && (
      <div style={{ background: `${C.wrn}10`, borderRadius: 8, border: `1px solid ${C.wrn}40`, padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: C.wrn }}>⏳ Pending Approval ({awaitingApproval.length})</h4>
            <p style={{ margin: "3px 0 0", fontSize: 10.5, color: C.txD }}>Review and confirm each payment before finalizing.</p>
          </div>
          <Btn v="ok" onClick={approveAll}>✓ Approve All</Btn>
        </div>
        <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.bdr}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Crew Name", "Slip", "Amount", "Type", "Date", "Action"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{awaitingApproval.map(p => (
              <tr key={p.id} style={{ background: `${C.wrn}05` }}>
                <td style={tdS}><span style={{ fontWeight: 600 }}>{p.crewName}</span></td>
                <td style={tdS}>{p.slipId}</td>
                <td style={{ ...tdS, fontWeight: 600, color: C.acc }}>${(p.total || 0).toLocaleString()}</td>
                <td style={tdS}>{p.type}</td>
                <td style={{ ...tdS, color: C.txD }}>{p.date}</td>
                <td style={tdS}><Btn v="ok" s={{ fontSize: 10, padding: "3px 10px" }} onClick={() => approve(p.id)}>Approve</Btn></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    )}

    {/* ── Paid Payments History ── */}
    {paidPayments.length > 0 && <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.bdr}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["ID", "Crew", "Slip", "Total", "Type", "Status", "Date"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
        <tbody>{paidPayments.slice().reverse().map(p => (
          <tr key={p.id}>
            <td style={tdS}><span style={{ fontWeight: 600, color: C.acc }}>{p.id}</span></td>
            <td style={tdS}>{p.crewName}</td>
            <td style={tdS}>{p.slipId}</td>
            <td style={{ ...tdS, fontWeight: 600 }}>${(p.total || 0).toLocaleString()}</td>
            <td style={tdS}>{p.type}</td>
            <td style={tdS}><Badge t="Paid" c="green" /></td>
            <td style={tdS}>{p.date}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>}
  </div>;
}


// ============== STATUS BOARD ==============
function BoardV({ crew, crewPay, slips, payments, bills, fN, setFN, fV, setFV, fC, setFC, vessels, clients, selectedMonth, setSelectedMonth }) {
  // Filter by selected salary month
  const mBills = bills.filter(b => b.month === selectedMonth);
  const mBillIds = new Set(mBills.map(b => b.id));
  const mPayIds = new Set(payments.filter(p => mBillIds.has(p.billId)).map(p => p.id));
  const mSlips = slips.filter(s => mPayIds.has(s.payId));
  const ss = new Set(mSlips.flatMap(s => s.crewIds || []));
  const ps = new Set(
    crewPay.filter(p => {
      const slip = slips.find(s => s.id === p.slipId);
      return slip && mPayIds.has(slip.payId) && p.status === "Paid";
    }).map(p => p.crewId)
  );

  const gS = c => ps.has(c.id) ? "Paid" : ss.has(c.id) ? "Slip Received" : "Pending";
  const fl = crew.filter(c => {
    if (fN && !c.name.toLowerCase().includes(fN.toLowerCase()) && !(c.id || "").toLowerCase().includes(fN.toLowerCase())) return false;
    if (fV && c.vessel !== fV) return false;
    if (fC && c.client !== fC) return false;
    return true;
  });
  const pd = fl.filter(c => gS(c) === "Paid").length;
  const sr = fl.filter(c => gS(c) === "Slip Received").length;
  const pn = fl.filter(c => gS(c) === "Pending").length;

  const [sy, sm] = selectedMonth.split("-").map(Number);
  const salaryMonthLabel = new Date(sy, sm - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });
  const changeMonth = (delta) => {
    const d = new Date(sy, sm - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return <div>
    {/* Month selector */}
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ fontSize: 10, color: C.txD }}>SALARY MONTH:</div>
      <button onClick={() => changeMonth(-1)} style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, cursor: "pointer", padding: "3px 8px", fontSize: 13 }}>‹</button>
      <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
        style={{ background: "transparent", border: "none", color: C.acc, fontSize: 13, fontWeight: 700, cursor: "pointer", outline: "none" }} />
      <button onClick={() => changeMonth(1)} style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, cursor: "pointer", padding: "3px 8px", fontSize: 13 }}>›</button>
      <span style={{ fontSize: 10, color: C.txD, marginLeft: 4 }}>— {salaryMonthLabel} salary status</span>
    </div>

    <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
      {[["Paid", pd, C.ok, C.okB], ["Slip Rcv", sr, C.inf, C.infB], ["Pending", pn, C.wrn, C.wrnB]].map(([l, v, c, bg]) =>
        <div key={l} style={{ background: bg, border: `1px solid ${c}30`, borderRadius: 7, padding: "8px 14px", flex: "1 1 140px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: c }}>{v}</div>
          <div style={{ fontSize: 10, color: c }}>{l}</div>
        </div>
      )}
    </div>
    <Filt {...{ fN, setFN, fV, setFV, fC, setFC, vessels, clients }} />
    <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.bdr}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["No", "ID", "Name", "Rank", "Vessel", "Client", "Wages/M", "Status"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
        <tbody>{fl.map(c => {
          const st = gS(c);
          const sc2 = st === "Paid" ? C.ok : st === "Slip Received" ? C.inf : C.wrn;
          return <tr key={c.id || c.no} style={{ background: `${sc2}06`, borderLeft: `3px solid ${sc2}` }}>
            <td style={tdS}>{c.no}</td>
            <td style={tdS}><span style={{ color: C.acc, fontWeight: 600 }}>{c.id}</span></td>
            <td style={tdS}><span style={{ fontWeight: 500 }}>{c.name}</span></td>
            <td style={tdS}>{c.rank}</td>
            <td style={tdS}>{c.vessel || "—"}</td>
            <td style={tdS}>{c.client}</td>
            <td style={{ ...tdS, fontWeight: 600 }}>${(c.ownerPaid || 0).toLocaleString()}</td>
            <td style={tdS}><Badge t={st} c={st === "Paid" ? "green" : st === "Slip Received" ? "purple" : "yellow"} /></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}
