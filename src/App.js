import React, { useState, useMemo, useEffect } from "react";
import Tesseract from "tesseract.js";
import { C, Badge, Btn, Stat, Filt, Mod, thS, tdS } from "./components/UI";
import { fsListenCol, fsSetDoc, fsUpdateDoc, fsBatchSet, fsDelDoc, fsGetDoc, fsUploadFile } from "./services/firebase";
import { onAuthChange, authSignOut, fetchUserProfile, hasAnyUser } from "./services/auth";
import LoginPage from "./components/LoginPage";
import UserManagement from "./components/UserManagement";


const getLH = () => `
  <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #86198f; padding-bottom: 12px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; gap: 15px;">
      <img src="/logo.jpg" style="height: 60px; width: auto;" alt="Logo" />
      <div>
        <div style="color: #86198f; font-size: 17px; font-weight: 800; line-height: 1.1; margin-bottom: 4px; letter-spacing: -0.01em;">MAHAR UNITY COMPANY LIMITED (Marine Services)</div>
        <div style="font-size: 10px; color: #4b5563; line-height: 1.5;">
          No.87, SAN PYA(4), YAMONE NAR (2) Ward, DAWBON Tsp, Yangon, Myanmar.<br/>
          Ph: +95-9793832006, +95-9269016699 | Email: crewing@maharunity.com | Web: www.maharunity.com
        </div>
      </div>
    </div>
    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
      <img src="/ABS logo.png" style="height: 70px; width: auto;" alt="ABS Logo" />
    </div>
  </div>`;

const downloadCSV = (rows, filename) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  // Ensure .csv extension
  const safeName = (filename.endsWith(".csv") ? filename : filename + ".csv").replace(/[/\\?%*:|"<>]/g, '-');
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};

function App() {
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

  // ── Data Real-time Listeners ──────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      setCrew([]); setBills([]); setPayments([]); setSlips([]); setCrewPay([]);
      setFsOk(false);
      return;
    }
    
    setLoading(true);
    const unsubs = [
      fsListenCol("crew", (data) => { setCrew(data); setFsOk(true); setLoading(false); }),
      fsListenCol("bills", (data) => setBills(data)),
      fsListenCol("payments", (data) => setPayments(data)),
      fsListenCol("slips", (data) => setSlips(data)),
      fsListenCol("crewPayments", (data) => setCrewPay(data))
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [currentUser]);

  const bulkUpload = async (file) => {
    if (!file) return;
    setMigrating(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = text.split("\n").map(r => r.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
        const headers = rows[0].map(h => h.toLowerCase());
        const dataRows = rows.slice(1).filter(r => r.length > 1 && r[0]);
        
        const items = dataRows.map((r, i) => {
          const obj = {};
          headers.forEach((h, idx) => {
            const val = r[idx];
            if (h === "no") obj.no = Number(val) || i + 1;
            else if (h === "name") obj.nm = val;
            else if (h === "rank") obj.rk = val;
            else if (h === "ownerpaid" || h === "wages") obj.op = Number(val) || 0;
            else if (h === "vessel") obj.vs = val;
            else if (h === "client") obj.cl = val;
            else if (h === "joindate") obj.jd = val;
            else if (h === "salary") obj.sl = Number(val) || 0;
            else if (h === "office") obj.of = Number(val) || 0;
            else if (h === "remark") obj.rm = val;
            else if (h === "manningfees") obj.mf = Number(val) || 0;
            else if (h === "leavepay") obj.lp = Number(val) || 0;
            else if (h === "paiddepfees") obj.pdf = Number(val) || 0;
            else if (h === "balancedepfees") obj.bdf = Number(val) || 0;
          });
          
          return {
            id: `C${String(obj.no || i + 1).padStart(3, "0")}`,
            no: obj.no || i + 1,
            name: obj.nm || "Unknown",
            rank: obj.rk || "—",
            ownerPaid: obj.op || 0,
            vessel: obj.vs || "—",
            client: obj.cl || "—",
            joinDate: obj.jd || "",
            salary: obj.sl || 0,
            office: obj.of || 0,
            remark: obj.rm || "",
            manningFees: obj.mf || 0,
            leavePay: obj.lp || 0,
            paidDepFees: obj.pdf || 0,
            balanceDepFees: obj.bdf || 0,
            status: "Onboard",
            banks: [{ id: "B1", bankName: obj.bn || "", bankAccNo: obj.ba || "", bankAccName: obj.nm || obj.ban || "", label: "Primary" }],
            allotmentType: "bank",
            createdAt: new Date().toISOString()
          };
        });

        const ok = await fsBatchSet("crew", items);
        if (ok) showT(`${items.length} crew members uploaded successfully!`);
        else showT("Bulk upload failed", "err");
      } catch (err) {
        console.error("CSV parse error:", err);
        showT("Failed to parse CSV file", "err");
      }
      setMigrating(false);
    };
    reader.readAsText(file);
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
    { id: "dist",      label: "Payment Dist.", icon: "💸" },
    { id: "board",     label: "Status Board", icon: "📌" },
    { id: "users",     label: "User Management", icon: "🔐", adminOnly: true },
  ];
  const nav = allNav.filter(n => !n.adminOnly || userRole === "admin");
  const fs = { setD: fsSetDoc, upD: fsUpdateDoc, batchW: fsBatchSet, delD: fsDelDoc, getD: fsGetDoc };
  // ── Distribution & Payroll Helpers ────────────────────────────────────
  const genPayrollFromBill = async (bill, slipUrl) => {
    if (!bill.crew || !bill.crew.length) return;
    const items = [];
    for (const c of bill.crew) {
      const p = {
        id: `P${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        slipId: bill.id,
        crewId: c.crewId,
        crewName: c.name,
        rank: c.rank,
        vessel: c.vessel || bill.vessel,
        client: c.client || bill.client,
        total: c.netCrewPay || c.salary || 0,
        status: "Pending", 
        month: bill.month,
        type: c.allotmentType || "bank",
        bankName: c.bankName || "",
        bankAccNo: c.bankAccNo || "",
        bankAccName: c.bankAccName || "",
        signedSlipUrl: "",
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString()
      };
      items.push(p);
      if (fsOk) await fs.setD("crewPayments", p.id, p);
    }
    setCrewPay(prev => [...prev.filter(x => x.slipId !== bill.id), ...items]);
  };

  const createManualPayment = async (data) => {
    const pay = {
      id: `CPAY-MANUAL-${Date.now()}`,
      crewId: data.crewId, crewName: data.crewName,
      slipId: "AD-HOC", vessel: data.vessel,
      total: Number(data.total), 
      type: "bank", bankName: data.bankName, bankAccNo: data.bankAccNo, bankAccName: data.bankAccName,
      status: "Pending", date: new Date().toISOString().split("T")[0],
      month: data.month || selectedMonth
    };
    setCrewPay(prev => [...prev, pay]);
    if (fsOk) await fs.setD("crewPayments", pay.id, pay);
    showT("Manual payment created.");
  };

  const approve = async (id) => {
    const up = { status: "Approved", approvedAt: new Date().toISOString() };
    setCrewPay(prev => prev.map(x => x.id === id ? { ...x, ...up } : x));
    if (fsOk) await fs.upD("crewPayments", id, up);
    showT("Payment Approved ✓");
  };

  const markProcessed = async (id, slipUrl = "") => {
    const up = { status: "Processed", processedAt: new Date().toISOString(), signedSlipUrl: slipUrl };
    setCrewPay(prev => prev.map(x => x.id === id ? { ...x, ...up } : x));
    if (fsOk) await fs.upD("crewPayments", id, up);
    showT("Payment Processed & Signed ✓");
  };

  const markPaid = async (id) => {
    const p = crewPay.find(x => x.id === id);
    if (!p) return;
    const up = { status: "Paid", paidAt: new Date().toISOString() };
    setCrewPay(prev => prev.map(x => x.id === id ? { ...x, ...up } : x));
    if (fsOk) {
      await fs.upD("crewPayments", id, up);
      // Update crew registry if this was a standard payroll with deductions
      if (p.crewId && (p.depFeeDed || p.actLeavePay)) {
        const c = crew.find(cr => String(cr.id) === String(p.crewId));
        if (c) {
          const upd = {
            paidDepFees: (c.paidDepFees || 0) + (p.depFeeDed || 0),
            balanceDepFees: Math.max(0, (c.balanceDepFees || 0) - (p.depFeeDed || 0)),
            accumulatedLeavePay: (c.accumulatedLeavePay || 0) + (p.actLeavePay || 0)
          };
          await fs.upD("crew", c.id, upd);
        }
      }
    }
    showT("Payment Verified & Paid ✓", "ok");
  };

  const printPayslip = (p) => {
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Payslip - ${p.crewName}</title><style>body{font-family:sans-serif;padding:30px;line-height:1.5;} .h{font-weight:bold;margin-top:15px; border-bottom:1px solid #eee;}</style></head>
      <body>
        <h2 style="margin-bottom:0">MAHAR UNITY SHIPPING</h2>
        <p style="font-size:12px;margin-top:5px;color:#666">INDIVIDUAL PAYROLL SLIP</p>
        <div class="h">CREW DETAILS</div>
        <p>Name: <b>${p.crewName}</b><br/>ID: ${p.crewId || "—"}<br/>Vessel: ${p.vessel}</p>
        <div class="h">PAYMENT SUMMARY</div>
        <p>Slip ID: ${p.slipId}<br/>Date: ${p.date}</p>
        <div style="background:#f9f9f9;padding:15px;border:1px solid #ddd;margin-top:10px">
          <table style="width:100%">
            <tr><td><b>Total Net Pay:</b></td><td style="text-align:right"><b>$${(p.total || 0).toLocaleString()}</b></td></tr>
            <tr><td style="font-size:12px;color:#666">Deductions (Dep Fees):</td><td style="text-align:right;font-size:12px;color:#666">-$${(p.depFeeDed || 0).toLocaleString()}</td></tr>
            <tr><td style="font-size:12px;color:#666">Accumulated Leave Pay:</td><td style="text-align:right;font-size:12px;color:#666">+$${(p.actLeavePay || 0).toLocaleString()}</td></tr>
          </table>
        </div>
        <div class="h">BANKING DETAILS</div>
        <p>Bank: ${p.bankName}<br/>Account: ${p.bankAccNo}<br/>Beneficiary: ${p.bankAccName}</p>
        <div style="margin-top:60px;display:flex;justify-content:space-between">
          <div style="text-align:center;width:150px;border-top:1px solid #000;padding-top:10px">Accountant</div>
          <div style="text-align:center;width:150px;border-top:1px solid #000;padding-top:10px">Crew Signature</div>
        </div>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const p = { crew, setCrew, bills, setBills, payments, setPayments, slips, setSlips, crewPay, setCrewPay, filtered, fN, setFN, fV, setFV, fC, setFC, modal, setModal, setTab, showT, vessels, clients, fs, fsOk, selectedMonth, setSelectedMonth, userRole, bulkUpload, migrating, genPayrollFromBill, createManualPayment, approve, markProcessed, markPaid, printPayslip };

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
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, padding: "5px 6px", background: C.card, borderRadius: 6, border: `1px solid ${C.bdr}` }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: userRole === "admin" ? `linear-gradient(135deg,${C.inf},${C.pri})` : `linear-gradient(135deg,${C.ok},${C.pri})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{(userProfile?.displayName || "U")[0].toUpperCase()}</div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userProfile?.displayName || "User"}</div>
              <div style={{ fontSize: 9, color: userRole === "admin" ? C.inf : C.ok, textTransform: "capitalize" }}>{userRole}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: fsOk ? C.ok : C.wrn }}>● {fsOk ? "Firestore Sync Active" : "Connecting..." }</div>
          <div style={{ color: C.txD, marginTop: 2 }}>{crew.length} crew members</div>
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
          {tab === "dist" && <DistV {...p} onManualPayment={p.createManualPayment} />}
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
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} onClick={e => { try { e.target.showPicker() } catch(err){} }}
              style={{ background: "transparent", border: "none", color: C.acc, fontSize: 15, fontWeight: 700, cursor: "pointer", outline: "none", paddingRight: 18 }} />
            <span style={{ position: "absolute", right: 2, pointerEvents: "none", color: C.acc, fontSize: 10 }}>▼</span>
          </div>
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
function CrewV({ crew, setCrew, filtered, fN, setFN, fV, setFV, fC, setFC, modal, setModal, showT, vessels, clients, fs, bulkUpload, migrating }) {
  const [form, setForm] = useState({});
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none", width: "100%", boxSizing: "border-box" };
  const save = async () => { if (!form.name) return; const f = { ...form, ownerPaid: Number(form.ownerPaid) || 0, salary: Number(form.salary) || 0, office: Number(form.office) || 0, manningFees: Number(form.manningFees) || 0 }; await fs.setD("crew", f.id, f); setModal(null); showT(`${f.name} saved to Firestore`); };
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontSize: 11.5, color: C.txM }}>{filtered.length}/{crew.length} crew members</span>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="file" id="csv-upload" accept=".csv" style={{ display: "none" }} onChange={(e) => bulkUpload(e.target.files[0])} />
        <Btn v="ghost" s={{ color: C.err }} onClick={async () => {
          if(!window.confirm("Are you sure you want to clear ALL existing remarks for all crew?")) return;
          if (fs) {
            for (const c of crew) {
              if (c.remark) await fs.upD("crew", c.id, { remark: "" });
            }
            showT("All remarks cleared successfully");
          }
        }}>Clear Remarks</Btn>
        <Btn v="sec" onClick={() => document.getElementById("csv-upload").click()} disabled={migrating}>{migrating ? "Uploading..." : "Bulk CSV Import"}</Btn>
        <Btn onClick={() => { setForm({ id: `C${String(crew.length + 1).padStart(3, "0")}`, no: crew.length + 1, name: "", rank: "", ownerPaid: 0, vessel: "", client: "", joinDate: "", salary: 0, office: 0, paidDepFees: 0, balanceDepFees: 0, manningFees: 0, accumulatedLeavePay: 0, remark: "", status: "Onboard", allotmentType: "bank", banks: [{ id: "B1", bankName: "", bankAccNo: "", bankAccName: "", label: "Primary" }], bankName: "", bankAccNo: "", bankAccName: "" }); setModal("add"); }}>+ Add New</Btn>
      </div>
    </div>
    <Filt {...{ fN, setFN, fV, setFV, fC, setFC, vessels, clients }} />
    <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.bdr}` }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["No", "ID", "Name", "Rank", "Vessel", "Client", "Join", "OwnerPaid", "Salary", "DEP FEES", "Paid Dep", "Bal Dep", "Manning", "Leave Pay(Acc)", "Bank", "Acc No", "Acc Name", "Type", "Remark", ""].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{filtered.map(c => <tr key={c.id || c.no}><td style={tdS}>{c.no}</td><td style={tdS}><span style={{ color: C.acc, fontWeight: 600 }}>{c.id}</span></td><td style={tdS}><span style={{ fontWeight: 500 }}>{c.name}</span></td><td style={tdS}>{c.rank}</td><td style={{ ...tdS, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>{c.vessel || "—"}</td><td style={tdS}>{c.client}</td><td style={tdS}>{c.joinDate || "—"}</td><td style={{ ...tdS, fontWeight: 600, color: C.acc }}>${(c.ownerPaid || 0).toLocaleString()}</td><td style={tdS}>${(c.salary || 0).toLocaleString()}</td><td style={tdS}>${(c.office || 0).toLocaleString()}</td><td style={tdS}>${(c.paidDepFees || 0).toLocaleString()}</td><td style={tdS}>${(c.balanceDepFees || 0).toLocaleString()}</td><td style={tdS}>${(c.manningFees || 0).toLocaleString()}</td><td style={tdS}>${(c.accumulatedLeavePay || 0).toLocaleString()}</td><td style={tdS}>{c.bankName || "—"}</td><td style={tdS}>{c.bankAccNo || "—"}</td><td style={tdS}>{c.bankAccName || "—"}</td><td style={{ ...tdS, textTransform: "capitalize" }}>{c.allotmentType || "bank"}</td><td style={{ ...tdS, fontSize: 10, color: C.txD, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{c.remark || "—"}</td><td style={tdS}><Btn v="ghost" onClick={() => { setForm({ ...c }); setModal("edit"); }}>Edit</Btn></td></tr>)}</tbody></table></div>
    {(modal === "add" || modal === "edit") && <Mod title={modal === "add" ? "Add Crew" : "Edit Crew"} onClose={() => setModal(null)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          ["ID", "id", true], ["Name *", "name"], ["Rank", "rank"], ["Vessel", "vessel"], 
          ["Client", "client"], ["Join Date", "joinDate"], ["Owner Paid", "ownerPaid"], 
          ["Salary", "salary"], ["DEP FEES", "office"], ["Paid Dep Fees", "paidDepFees"],
          ["Bal Dep Fees", "balanceDepFees"], ["Manning Fees", "manningFees"], 
          ["Leave Pay (Acc)", "accumulatedLeavePay"], ["Remark", "remark"]
        ].map(([l, k, d]) => (
          <div key={k}>
            <label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>{l}</label>
            <input 
              value={form[k] ?? ""} 
              disabled={d} 
              type={["ownerPaid", "salary", "office", "paidDepFees", "balanceDepFees", "manningFees", "accumulatedLeavePay"].includes(k) ? "number" : "text"}
              onChange={e => setForm({ ...form, [k]: e.target.value })} 
              style={{ ...inp, opacity: d ? 0.5 : 1 }} 
            />
          </div>
        ))}
        <div>
          <label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Payment Type</label>
          <select value={form.allotmentType || "bank"} onChange={e => setForm({ ...form, allotmentType: e.target.value })} style={inp}>
            <option value="bank">Bank</option>
            <option value="cash">Cash (Office)</option>
          </select>
        </div>
      </div>

      {form.allotmentType === "bank" && (
        <div style={{ marginTop: 15, padding: 10, background: C.bgS, borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Registered Bank Accounts</span>
            <Btn v="sec" size="sm" onClick={() => setForm({ 
              ...form, 
              banks: [...(form.banks || []), { id: `B${(form.banks?.length || 0) + 1}`, bankName: "", bankAccNo: "", bankAccName: form.name, label: "" }] 
            })}>+ Add Bank</Btn>
          </div>
          {(form.banks || []).map((b, i) => (
            <div key={b.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1.5fr 80px 30px", gap: 6, marginBottom: 8, alignItems: "end" }}>
              <div>
                <label style={{ fontSize: 9, color: C.txD }}>Bank Name</label>
                <select value={b.bankName || ""} onChange={e => {
                  const nb = [...form.banks];
                  nb[i].bankName = e.target.value;
                  setForm({ ...form, banks: nb });
                }} style={{ ...inp, height: 32, fontSize: 11 }}>
                  <option value="">Select</option>
                  {["KBZ", "AYA", "A Bank", "CB", "MAB", "Yoma", "Kpay", "Aya Pay", "Other"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 9, color: C.txD }}>Acc No</label>
                <input value={b.bankAccNo || ""} onChange={e => {
                  const nb = [...form.banks];
                  nb[i].bankAccNo = e.target.value;
                  setForm({ ...form, banks: nb });
                }} style={{ ...inp, height: 32, fontSize: 11 }} />
              </div>
              <div>
                <label style={{ fontSize: 9, color: C.txD }}>Acc Name</label>
                <input value={b.bankAccName || ""} onChange={e => {
                  const nb = [...form.banks];
                  nb[i].bankAccName = e.target.value;
                  setForm({ ...form, banks: nb });
                }} style={{ ...inp, height: 32, fontSize: 11 }} />
              </div>
              <div>
                <label style={{ fontSize: 9, color: C.txD }}>Label (e.g. Wife)</label>
                <input value={b.label || ""} placeholder="Primary" onChange={e => {
                  const nb = [...form.banks];
                  nb[i].label = e.target.value;
                  setForm({ ...form, banks: nb });
                }} style={{ ...inp, height: 32, fontSize: 11 }} />
              </div>
              <Btn v="ghost" size="sm" onClick={() => {
                const nb = form.banks.filter((_, idx) => idx !== i);
                setForm({ ...form, banks: nb });
              }} style={{ color: C.err, padding: 0 }}>✕</Btn>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 14 }}>
        <Btn v="sec" onClick={() => setModal(null)}>Cancel</Btn>
        <Btn v="ok" onClick={save}>Save</Btn>
      </div>
    </Mod>}
  </div>;
}

// ============== BILLING ==============
function BillV({ crew, bills, setBills, showT, clients, fs, fsOk }) {
  const [sc, setSc] = useState(""); const [mo, setMo] = useState("2026-04"); const [vb, setVb] = useState(null);
  const [confDel, setConfDel] = useState(null);
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none" };
  const getDIM = (y, m) => new Date(y, m, 0).getDate();
  const fmtD = (d, m, y) => { const ms = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]; return `${d}.${ms[m - 1]}.${y}`; };
  const gen = async () => { 
    if (!sc) return; 
    let cl = crew.filter(c => c.client === sc); 
    if (sc === "Mr.Xing & Mr.Zhong") { cl = crew.filter(c => c.client === "XING" || c.client === "MR.ZHONG"); }
    else if (sc === "CHH (All)") { cl = crew.filter(c => c.client && c.client.startsWith("CHH")); }
    if (!cl.length) return; 
    const [y, m] = mo.split("-").map(Number); 
    const dim = getDIM(y, m);
    const bc = cl.map(c => { 
      let dob = dim; 
      if (c.joinDate) { 
        const jd = new Date(c.joinDate); 
        const ms2 = new Date(y, m - 1, 1); 
        const me = new Date(y, m - 1, dim); 
        if (jd > ms2 && jd <= me) dob = dim - jd.getDate() + 1; 
        else if (jd > me) dob = 0; 
      } 
      const isOfc = /master|chief|officer|engineer|cadet/i.test(c.rank || "");
      const lpPerc = isOfc ? 0.05 : 0.10;
      const ha = dob === dim ? (c.ownerPaid || 0) : Math.round(((c.ownerPaid || 0) / dim) * dob * 100) / 100; 
      const actManning = dob === dim ? (c.manningFees || 0) : Math.round(((c.manningFees || 0) / dim) * dob * 100) / 100;
      const maxLp = (c.salary || 0) * lpPerc;
      const actLeavePay = dob === dim ? maxLp : Math.round((maxLp / dim) * dob * 100) / 100;
      const depFeeDed = c.balanceDepFees > 0 ? c.balanceDepFees : 0;
      const netCrewPay = Math.max(0, ha - actManning - actLeavePay - depFeeDed);
      return { ...c, from: fmtD(1, m, y), to: fmtD(dim, m, y), daysOnBoard: dob, daysOfMonth: dim, actualHA: ha, pob: 0, bonus: 0, pdeFees: 0, visaFees: 0, workingGear: 0, totalPayment: ha, actManning, actLeavePay, depFeeDed, netCrewPay, billRemark: c.remark || "" }; 
    }).filter(r => r.daysOnBoard > 0);
    const vName = bc.length > 0 ? (bc.every(c => c.vessel === bc[0].vessel) ? bc[0].vessel : "Multiple Vessels") : "No Vessel";
    const bill = { id: `BILL-${String(bills.length + 1).padStart(3, "0")}`, client: sc, vessel: vName, month: mo, from: fmtD(1, m, y), to: fmtD(dim, m, y), crew: bc, totalHA: Math.round(bc.reduce((s, c) => s + c.actualHA, 0) * 100) / 100, total: Math.round(bc.reduce((s, c) => s + c.totalPayment, 0) * 100) / 100, status: "Draft", date: new Date().toISOString().split("T")[0], bankInfo: { accNo: "840-096-0029-001674-501", accName: "Mahar Unity (Thailand) Company Limited", bankName: "Bangkok Bank", swift: "BKKBTHBK", remark: "Manning fee calculated upon 30 days, no overlap" } };
    setBills([...bills, bill]); if (fsOk) fs.setD("bills", bill.id, bill); showT(`Bill ${bill.id} created for ${sc}`); 
  };
  const setSt = async (id, st) => { setBills(bills.map(b => b.id === id ? { ...b, status: st } : b)); if (fsOk) fs.upD("bills", id, { status: st }); showT(`${id} → ${st}`); };
  const fi = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 3, color: C.txt, padding: "3px 5px", fontSize: 10.5, outline: "none", width: 55, textAlign: "right" };
  const upB = (bid, field, val) => { setBills(bills.map(b => b.id === bid ? { ...b, bankInfo: { ...b.bankInfo, [field]: val } } : b)); };
  const remC = (bid, cid, name) => { setConfDel({ bid, cid, name }); };
  const execRemC = async () => {
    if (!confDel) return;
    const { bid, cid } = confDel;
    const ident = String(cid);
    setBills(prev => {
      const nb = prev.map(b => {
        if (b.id !== bid) return b;
        const nc = b.crew.filter(c => String(c.id || c.name) !== ident);
        const tHA = Math.round(nc.reduce((s, c) => s + (c.actualHA || 0), 0) * 100) / 100;
        const tot = Math.round(nc.reduce((s, c) => s + (c.totalPayment || 0), 0) * 100) / 100;
        const updated = { ...b, crew: nc, totalHA: tHA, total: tot };
        if (fsOk) fs.upD("bills", bid, { crew: nc, totalHA: tHA, total: tot });
        return updated;
      });
      return nb;
    });
    setConfDel(null);
    showT("Crew removed from bill");
  };
  const upL = (bid, cid, field, val) => {
    const ident = String(cid);
    setBills(prev => prev.map(b => {
      if (b.id !== bid) return b;
      const uc = (b.crew || []).map(c => {
        if (String(c.id || c.name) !== ident) return c;
        const isNum = field !== "billRemark";
        const u = { ...c, [field]: isNum ? (Number(val) || 0) : val };
        if (field === "daysOnBoard") {
          u.actualHA = u.daysOnBoard === u.daysOfMonth ? (u.ownerPaid || 0) : Math.round(((u.ownerPaid || 0) / u.daysOfMonth) * u.daysOnBoard * 100) / 100;
          u.actManning = u.daysOnBoard === u.daysOfMonth ? (u.manningFees || 0) : Math.round(((u.manningFees || 0) / u.daysOfMonth) * u.daysOnBoard * 100) / 100;
          const isOfc = /master|chief|officer|engineer|cadet/i.test(u.rank || "");
          const maxLp = (u.salary || 0) * (isOfc ? 0.05 : 0.10);
          u.actLeavePay = u.daysOnBoard === u.daysOfMonth ? maxLp : Math.round((maxLp / u.daysOfMonth) * u.daysOnBoard * 100) / 100;
        }
        u.totalPayment = (u.actualHA || 0) + (u.pob || 0) + (u.bonus || 0) + (u.pdeFees || 0) + (u.visaFees || 0) + (u.workingGear || 0);
        u.netCrewPay = Math.max(0, u.totalPayment - (u.actManning || 0) - (u.actLeavePay || 0) - (u.depFeeDed || 0));
        return u;
      });
      const newTHA = Math.round(uc.reduce((s, c) => s + (c.actualHA || 0), 0) * 100) / 100;
      const newTot = Math.round(uc.reduce((s, c) => s + (c.totalPayment || 0), 0) * 100) / 100;
      const updated = { ...b, crew: uc, totalHA: newTHA, total: newTot };
      if (fsOk) fs.upD("bills", bid, { crew: uc, totalHA: newTHA, total: newTot });
      return updated;
    }));
  };
  const exportCSV = (b) => {
    const hdr = ['Name','Sign On','Wages/M','From','To','Days Board','Days/M','Actual HA','POB','Bonus','PDE','VISA','WG','Total','Remark'];
    const rows = (b.crew||[]).map(c => [c.name,c.joinDate||'',c.ownerPaid||0,c.from,c.to,c.daysOnBoard,c.daysOfMonth,(c.actualHA||0).toFixed(2),c.pob||0,c.bonus||0,c.pdeFees||0,c.visaFees||0,c.workingGear||0,(c.totalPayment||0).toFixed(2),c.billRemark||'']);
    const csv = [hdr,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = `${b.id}-${b.client}-${b.month}`.replace(/[^a-zA-Z0-9\- \u1000-\u109F]/g, '_');
    link.download = `${safeName}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
  };
  const exportPDF = (b) => { const trs=(b.crew||[]).map((c,i)=>`<tr><td>${i+1}</td><td>${c.name}</td><td>${c.joinDate||''}</td><td>${c.ownerPaid||0}</td><td>${c.from}</td><td>${c.to}</td><td style="color:${c.daysOnBoard<c.daysOfMonth?'#F59E0B':'inherit'}">${c.daysOnBoard}</td><td>${c.daysOfMonth}</td><td>${(c.actualHA||0).toFixed(2)}</td><td>${c.pob||0}</td><td>${c.bonus||0}</td><td>${c.pdeFees||0}</td><td>${c.visaFees||0}</td><td>${c.workingGear||0}</td><td><b>${(c.totalPayment||0).toFixed(2)}</b></td><td>${c.billRemark||''}</td></tr>`).join(''); const html=`<!DOCTYPE html><html><head><title>${b.id}</title><style>*{font-family:'Inter',sans-serif;font-size:10px}body{margin:30px}h2{font-size:14px;margin-bottom:12px;color:#2563eb;border-bottom:1px solid #eee;padding-bottom:5px}.info{color:#666;margin-bottom:15px;display:flex;justify-content:space-between}table{border-collapse:collapse;width:100%;margin-bottom:20px}th,td{border:1px solid #e5e7eb;padding:6px 8px}th{background:#f9fafb;text-align:center;font-size:9px;font-weight:700;color:#374151}td{text-align:right}td:nth-child(1),td:nth-child(2),td:nth-child(3){text-align:left}.total td{font-weight:bold;background:#f3f4f6;color:#111827}.bank{margin-top:20px;padding:12px;border:1px solid #e5e7eb;font-size:9.5px;background:#f8fafc;border-radius:6px;line-height:1.6}@media print{body{margin:20px}}</style></head><body>${getLH()}<h2>${b.client} — ${b.month} MONTHLY BILL (${b.id})</h2><div class="info"><span><b>Period:</b> ${b.from} — ${b.to}</span><span><b>Crew:</b> ${(b.crew||[]).length} &nbsp;|&nbsp; <b>Date:</b> ${b.date||''}</span></div><table><thead><tr><th>#</th><th>Name</th><th>Sign On</th><th>Wages/M</th><th>From</th><th>To</th><th>Days Board</th><th>Days/M</th><th>Actual HA</th><th>POB</th><th>Bonus</th><th>PDE</th><th>VISA</th><th>WG</th><th>Total</th><th>Remark</th></tr></thead><tbody>${trs}</tbody><tfoot><tr class="total"><td colspan="14" style="text-align:right">TOTAL USD</td><td>${(b.total||0).toFixed(2)}</td><td></td></tr></tfoot></table><div class="bank"><b>BANK REMITTANCE DETAILS:</b><br/>Account No: ${b.bankInfo?.accNo} | Account Name: ${b.bankInfo?.accName} | Bank: ${b.bankInfo?.bankName} | SWIFT: <b>${b.bankInfo?.swift}</b><br/>REMARK: ${b.bankInfo?.remark || "Manning fee calculated upon 30 days, no overlap"}</div></body></html>`; const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),400); };
  return <div>
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}><h4 style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600 }}>Generate Monthly Bill</h4><div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Client</label><select value={sc} onChange={e => setSc(e.target.value)} style={inp}><option value="">Select</option><option value="Mr.Xing & Mr.Zhong">Mr.Xing & Mr.Zhong</option><option value="CHH (All)">CHH (All)</option>{clients.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Month</label><div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}><input type="month" value={mo} onChange={e => setMo(e.target.value)} onClick={e => { try { e.target.showPicker() } catch(err){} }} style={{...inp, paddingRight: 24, cursor: "pointer" }} /><span style={{ position: "absolute", right: 8, pointerEvents: "none", color: C.txM, fontSize: 9 }}>▼</span></div></div><Btn onClick={gen} disabled={!sc}>Generate</Btn></div></div>
    {!bills.length ? <div style={{ textAlign: "center", padding: 30, color: C.txD }}>No bills yet.</div> : bills.slice().reverse().map(b => <div key={b.id} style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontWeight: 700, color: C.acc, fontSize: 13 }}>{b.id}</span><Badge t={b.status} c={b.status === "Paid" ? "green" : b.status === "Sent" ? "blue" : "yellow"} /></div>        <div style={{ display: "flex", gap: 5 }}>
          {b.status === "Draft" && <Btn v="pri" onClick={() => setSt(b.id, "Sent")}>Send</Btn>}
          {b.status === "Sent" && <Btn v="wrn" onClick={() => setSt(b.id, "Draft")}>Revise</Btn>}
          <Btn v="ghost" onClick={() => exportCSV(b)} s={{ fontSize: 11 }}>📊 Download Excel</Btn>
          <Btn v="ghost" onClick={() => exportPDF(b)} s={{ fontSize: 11 }}>📄 PDF Version</Btn>
          <Btn v="sec" onClick={() => setVb(vb === b.id ? null : b.id)}>{vb === b.id ? "Hide" : "Details"}</Btn>
        </div>
      </div>
      <div style={{ background: C.bg, borderRadius: 6, padding: "8px 12px", border: `1px solid ${C.bdr}` }}><div style={{ fontSize: 13, fontWeight: 700, color: C.acc, marginBottom: 4 }}>{b.client} {(b.month || "").split("-").reverse().join("'")} BILL</div><div style={{ display: "flex", gap: 16, fontSize: 11, color: C.txM, flexWrap: "wrap" }}><span>Period: <b style={{ color: C.txt }}>{b.from} — {b.to}</b></span><span>Crew: <b style={{ color: C.txt }}>{(b.crew || []).length}</b></span><span>Total: <b style={{ color: C.ok, fontSize: 12.5 }}>${(b.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</b></span></div></div>
      {vb === b.id && <div style={{ overflowX: "auto", borderRadius: 5, border: `1px solid ${C.bdr}`, marginTop: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
          <thead>
            <tr>
              {b.status === "Draft" && <th style={{ ...thS, width: 30 }}></th>}
              {["Name", "Sign On Date", "Wages/M", "From", "To", "Days on Board", "Days of Month", "Actual HA", "POB", "Bonus", "PDE Fees", "VISA", "WG", "Owner Total", "Manning(-)", "Leave(-)", "DepFee(-)", "Crew Net", "Remark"].map(h => <th key={h} style={{ ...thS, fontSize: 9, padding: "6px 4px", background: ["Manning(-)", "Leave(-)", "DepFee(-)", "Crew Net"].includes(h) ? "#f1f5f9" : undefined }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {(b.crew || []).map((c, i) => (
              <tr key={c.id || i}>
                {b.status === "Draft" && (
                  <td style={{ ...tdS, textAlign: "center", padding: "2px 4px" }}>
                    <Btn v="ghost" onClick={(e) => { e.stopPropagation(); remC(b.id, c.id || c.name, c.name); }} s={{ color: C.wrn, padding: "2px 5px", fontSize: 11, minWidth: "auto" }}>✕</Btn>
                  </td>
                )}
                <td style={{ ...tdS, fontWeight: 500 }}>{c.name}</td>
                <td style={tdS}>{c.joinDate || "—"}</td>
                <td style={{ ...tdS, textAlign: "right" }}>{(c.ownerPaid || 0).toLocaleString()}</td>
                <td style={tdS}>{c.from || b.from}</td>
                <td style={tdS}>{c.to || b.to}</td>
                {b.status === "Draft" ? (
                  <>
                    <td style={tdS}><input type="number" min="0" max={c.daysOfMonth} value={c.daysOnBoard ?? ""} onChange={e => upL(b.id, c.id || c.name, "daysOnBoard", e.target.value)} style={{ ...fi, color: c.daysOnBoard < c.daysOfMonth ? C.wrn : C.txt, fontWeight: c.daysOnBoard < c.daysOfMonth ? 700 : 400, width: 45 }} /></td>
                    <td style={{ ...tdS, textAlign: "center" }}>{c.daysOfMonth}</td>
                    <td style={{ ...tdS, textAlign: "right", fontWeight: 600, color: C.inf }}>{(c.actualHA || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={tdS}><input type="number" value={c.pob || ""} onChange={e => upL(b.id, c.id || c.name, "pob", e.target.value)} style={fi} placeholder="0" /></td>
                    <td style={tdS}><input type="number" value={c.bonus || ""} onChange={e => upL(b.id, c.id || c.name, "bonus", e.target.value)} style={fi} placeholder="0" /></td>
                    <td style={tdS}><input type="number" value={c.pdeFees || ""} onChange={e => upL(b.id, c.id || c.name, "pdeFees", e.target.value)} style={fi} placeholder="0" /></td>
                    <td style={tdS}><input type="number" value={c.visaFees || ""} onChange={e => upL(b.id, c.id || c.name, "visaFees", e.target.value)} style={fi} placeholder="0" /></td>
                    <td style={tdS}><input type="number" value={c.workingGear || ""} onChange={e => upL(b.id, c.id || c.name, "workingGear", e.target.value)} style={fi} placeholder="0" /></td>
                    <td style={{ ...tdS, fontWeight: 700, textAlign: "right", color: C.acc }}>{(c.totalPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...tdS, textAlign: "right", color: C.err }}>{(c.actManning || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...tdS, textAlign: "right", color: C.err }}>{(c.actLeavePay || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={tdS}><input type="number" value={c.depFeeDed || ""} onChange={e => upL(b.id, c.id || c.name, "depFeeDed", e.target.value)} style={{...fi, color: C.err}} placeholder="0" /></td>
                    <td style={{ ...tdS, fontWeight: 700, textAlign: "right", color: C.ok }}>{(c.netCrewPay || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={tdS}><input value={c.billRemark || ""} onChange={e => upL(b.id, c.id || c.name, "billRemark", e.target.value)} style={{ ...fi, width: 90, textAlign: "left" }} placeholder="—" /></td>
                  </>
                ) : (
                  <>
                    <td style={{ ...tdS, textAlign: "center", color: c.daysOnBoard < c.daysOfMonth ? C.wrn : C.txt, fontWeight: c.daysOnBoard < c.daysOfMonth ? 700 : 400 }}>{c.daysOnBoard}</td>
                    <td style={{ ...tdS, textAlign: "center" }}>{c.daysOfMonth}</td>
                    <td style={{ ...tdS, textAlign: "right", fontWeight: 600 }}>{(c.actualHA || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{c.pob || "—"}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{c.bonus || "—"}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{c.pdeFees || "—"}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{c.visaFees || "—"}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{c.workingGear || "—"}</td>
                    <td style={{ ...tdS, fontWeight: 700, textAlign: "right", color: C.acc }}>{(c.totalPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...tdS, textAlign: "right", color: C.err }}>{(c.actManning || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...tdS, textAlign: "right", color: C.err }}>{(c.actLeavePay || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...tdS, textAlign: "right", color: C.err }}>{c.depFeeDed || "—"}</td>
                    <td style={{ ...tdS, fontWeight: 700, textAlign: "right", color: C.ok }}>{(c.netCrewPay || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ ...tdS, fontSize: 10, color: C.txD }}>{c.billRemark || "—"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: C.bg }}>
              <td colSpan={b.status === "Draft" ? 8 : 7} style={{ ...tdS, textAlign: "right", fontWeight: 700 }}>TOTAL</td>
              <td style={{ ...tdS, textAlign: "right", fontWeight: 700, color: C.acc }}>{(b.totalHA || b.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td colSpan={5}></td>
              <td style={{ ...tdS, textAlign: "right", fontWeight: 700, fontSize: 11, color: C.acc }}>{(b.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td colSpan={3}></td>
              <td style={{ ...tdS, textAlign: "right", fontWeight: 700, fontSize: 12, color: C.ok }}>{((b.crew || []).reduce((sum, c) => sum + (c.netCrewPay || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>}
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
      {confDel && (
        <Mod title="Confirm Removal" onClose={() => setConfDel(null)}>
          <div style={{ padding: 10, textAlign: "center" }}>
            <p style={{ marginBottom: 20, fontSize: 13 }}>Are you sure you want to remove <b>{confDel.name}</b> from this bill?</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn v="sec" onClick={() => setConfDel(null)}>Cancel</Btn>
              <Btn v="err" onClick={execRemC}>Remove Crew</Btn>
            </div>
          </div>
        </Mod>
      )}
    </div>;
}

// ============== RECONCILIATION ==============
function ReconV({ bills, setBills, payments, setPayments, showT, fs, fsOk, genPayrollFromBill }) {
  const [pf, setPf] = useState({ billId: "", amount: "", ref: "", date: new Date().toISOString().split("T")[0], slipUrl: "" });
  const [res, setRes] = useState(null);
  const [ocrLd, setOcrLd] = useState(false);
  const [upLd, setUpLd] = useState(false);
  const [ocrMsg, setOcrMsg] = useState("");
  const sent = bills.filter(b => b.status === "Sent");
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none", width: "100%", boxSizing: "border-box" };
  
  const handleOcr = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!pf.billId) { showT("Please select a Bill first to verify the amount against.", "wrn"); return; }
    
    setOcrLd(true); setUpLd(true); setOcrMsg("Uploading & Scanning slip..."); setRes(null);
    try {
      const storagePath = `slips/${Date.now()}_${file.name}`;
      const url = await fsUploadFile(file, storagePath);
      if (url) setPf(prev => ({ ...prev, slipUrl: url }));
      setUpLd(false);

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
    const pay = { id: `PAY-${String(payments.length + 1).padStart(3, "0")}`, billId: bill.id, client: bill.client, amount: amt, ref: pf.ref, date: pf.date, match: Math.abs(diff) < 0.01, diff, slipUrl: pf.slipUrl };
    setPayments([...payments, pay]); if (fsOk) fs.setD("payments", pay.id, pay);
    if (Math.abs(diff) < 0.01) { 
      setBills(bills.map(b => b.id === bill.id ? { ...b, status: "Paid" } : b)); 
      if (fsOk) fs.upD("bills", bill.id, { status: "Paid" }); 
      setRes({ ok: true, msg: `Matches ${bill.id}. PAID.` }); 
      showT("Matched!"); 
      // AUTO-TRIGGER PAYROLL
      await genPayrollFromBill(bill, pay.slipUrl);
    }
    else { setRes({ ok: false, msg: `Mismatch on ${bill.id}.`, diff }); showT("Mismatch", "wrn"); }
    setPf({ billId: "", amount: "", ref: "", date: new Date().toISOString().split("T")[0], slipUrl: "" }); setOcrMsg(""); };
    
  return <div>
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}><h4 style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600 }}>Record Payment & Bank Slip Verification</h4>{!sent.length ? <div style={{ color: C.txD, fontSize: 11.5 }}>No outstanding (Sent) bills.</div> : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>1. Select Bill</label><select value={pf.billId} onChange={e => { const b = bills.find(x => x.id === e.target.value); setPf({ ...pf, billId: e.target.value, amount: b ? String(b.total) : "" }); setOcrMsg(""); }} style={inp}><option value="">Select</option>{sent.map(b => <option key={b.id} value={b.id}>{b.id}-{b.client}</option>)}</select></div>
    <div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>2. Upload Bank Slip for OCR Validation</label><div style={{ display: "flex", gap: 8 }}><input type="file" accept="image/*" onChange={handleOcr} style={{...inp, flex: 1}} disabled={!pf.billId || ocrLd} /></div></div>
    {pf.slipUrl && <div style={{ gridColumn: "1/-1", marginBottom: 8 }}><div style={{ fontSize: 10, color: C.txM, marginBottom: 4 }}>Slip Preview:</div><img src={pf.slipUrl} alt="Slip Preview" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 6, border: `1px solid ${C.bdr}`, cursor: "pointer" }} onClick={() => window.open(pf.slipUrl, "_blank")} /></div>}
    {ocrMsg && <div style={{ gridColumn: "1/-1", fontSize: 11, padding: 8, borderRadius: 5, background: ocrMsg.includes("✅") ? C.okB : (ocrMsg.includes("❌") ? C.wrnB : C.bg), color: ocrMsg.includes("✅") ? C.ok : (ocrMsg.includes("❌") ? C.wrn : C.txM), border: `1px solid ${ocrMsg.includes("✅") ? C.ok : (ocrMsg.includes("❌") ? C.wrn : C.bdr)}` }}>{ocrLd ? (upLd ? "Uploading Attachment..." : "Scanning Image...") : ocrMsg}</div>}
    <div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>3. Amount</label><input type="number" value={pf.amount} onChange={e => setPf({ ...pf, amount: e.target.value })} style={inp} /></div><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Ref</label><input value={pf.ref} onChange={e => setPf({ ...pf, ref: e.target.value })} style={inp} /></div><div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Date</label><input type="date" value={pf.date} onChange={e => setPf({ ...pf, date: e.target.value })} style={inp} /></div><div style={{ gridColumn: "1/-1", marginTop: 8 }}><Btn onClick={rec} disabled={!pf.billId || !pf.amount || upLd}>Reconcile & Generate Payroll</Btn></div></div>}</div>
        {res && <div style={{ background: res.ok ? C.okB : C.wrnB, border: `1px solid ${res.ok ? C.ok : C.wrn}33`, borderRadius: 7, padding: 12, marginBottom: 14 }}>
      <div style={{ fontWeight: 600, color: res.ok ? C.ok : C.wrn }}>{res.ok ? "MATCH" : "MISMATCH"} - {res.msg}</div>
      {res.diff != null && !res.ok && (
        <>
          <div style={{ fontWeight: 700, color: C.wrn, marginTop: 3 }}>Difference: ${Math.abs(res.diff).toLocaleString()}</div>
          <div style={{ fontSize: 10, color: C.txD, marginTop: 6, lineHeight: 1.4 }}>
            <b>Tip:</b> If the owner intentionally paid a different amount (e.g. refused certain crew fees), please <b>Revise</b> the bill in the Monthly Billing tab to match the receipt before reconciling.
          </div>
        </>
      )}
    </div>}
    {payments.length > 0 && <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.bdr}` }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["ID", "Bill", "Client", "Amount", "Ref", "Date", "Status", "Slip"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{payments.slice().reverse().map(p => <tr key={p.id}><td style={tdS}><span style={{ fontWeight: 600, color: C.acc }}>{p.id}</span></td><td style={tdS}>{p.billId}</td><td style={tdS}>{p.client}</td><td style={tdS}>${(p.amount || 0).toLocaleString()}</td><td style={tdS}>{p.ref}</td><td style={tdS}>{p.date}</td><td style={tdS}><Badge t={p.match ? "Matched" : "Mismatch"} c={p.match ? "green" : "red"} /></td><td style={tdS}>{p.slipUrl ? <Btn v="ghost" onClick={() => window.open(p.slipUrl, "_blank")} s={{ fontSize: 10, padding: "2px 6px" }}>👁️ View</Btn> : "—"}</td></tr>)}</tbody></table></div>}
  </div>;
}

// ============== SLIP UPLOAD ==============
function SlipV({ crew, payments, slips, setSlips, showT, fs, fsOk }) {
  const [sp, setSp] = useState(""); const [sc, setSc] = useState([]);
  const mt = payments.filter(p => p.match); const py = payments.find(p => p.id === sp);
  const assignedCrewIds = py ? slips.filter(s => s.payId === sp).flatMap(s => s.crewIds || []) : [];
  const ac = py ? (py.client === "Mr.Xing & Mr.Zhong" ? crew.filter(c => c.client === "XING" || c.client === "MR.ZHONG") : (py.client === "CHH (All)" ? crew.filter(c => c.client && c.client.startsWith("CHH")) : crew.filter(c => c.client === py.client))) : [];
  const cc = ac.filter(c => !assignedCrewIds.includes(c.id));
  const assignedCount = ac.length - cc.length;
  const tg = id => setSc(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none", width: "100%", boxSizing: "border-box" };
  const up = () => { if (!sp || !sc.length) return; const sl = { id: `SLIP-${String(slips.length + 1).padStart(3, "0")}`, payId: sp, client: py.client, crewIds: [...sc], date: new Date().toISOString().split("T")[0] }; setSlips([...slips, sl]); if (fsOk) fs.setD("slips", sl.id, sl); showT(`Assignment ${sl.id} confirmed`); setSp(""); setSc([]); };
  const delSlip = async (id) => { setSlips(slips.filter(s => s.id !== id)); if (fsOk) await fs.delD("slips", id); showT(`Slip ${id} deleted`, "wrn"); };
  return <div>
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}><h4 style={{ margin: "0 0 3px", fontSize: 12.5, fontWeight: 600 }}>Salary Assignment</h4><p style={{ fontSize: 10.5, color: C.txD, margin: "0 0 10px" }}>Assign verified payments to individual crew members.</p>{!mt.length ? <div style={{ color: C.txD, fontSize: 11.5 }}>No matched payments yet.</div> : <>      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Payment</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={sp} onChange={e => { setSp(e.target.value); setSc([]); }} style={{ ...inp, maxWidth: 400 }}>
            <option value="">Select</option>
            {mt.map(p => <option key={p.id} value={p.id}>{p.id}-{p.client}</option>)}
          </select>
          {py && py.slipUrl && <Btn v="ghost" onClick={() => window.open(py.slipUrl, "_blank")} s={{ fontSize: 10, padding: "5px 10px" }}>👁️ View Original Slip</Btn>}
        </div>
      </div>
      {sp && <div style={{ fontSize: 10.5, color: C.inf, marginBottom: 8 }}>{assignedCount} crew already assigned to slips for this payment.</div>}{sp && cc.length === 0 && assignedCount > 0 && <div style={{ padding: 10, background: C.okB, color: C.ok, borderRadius: 5, fontSize: 11 }}>All crew members for this payment have been assigned.</div>}{sp && cc.length > 0 && <><div style={{ display: "flex", gap: 4, marginBottom: 8 }}><Btn v="ghost" onClick={() => setSc(cc.map(c => c.id))}>All</Btn><Btn v="ghost" onClick={() => setSc([])}>Clear</Btn></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 5, marginBottom: 10, maxHeight: 300, overflow: "auto" }}>{cc.map(c => { const sel = sc.includes(c.id); return <div key={c.id} onClick={() => tg(c.id)} style={{ padding: "6px 8px", borderRadius: 5, cursor: "pointer", background: sel ? C.priG : C.bg, border: `1px solid ${sel ? C.pri : C.bdr}`, display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${sel ? C.pri : C.txD}`, background: sel ? C.pri : "transparent", flexShrink: 0 }} /><div><div style={{ fontSize: 11.5, fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 9.5, color: C.txD }}>{c.rank} · {c.vessel}</div></div></div>; })}</div><Btn onClick={up} disabled={!sc.length}>Confirm Assignment ({sc.length} crew)</Btn></>}</>}</div>
    {slips.length > 0 && slips.slice().reverse().map(sl => <div key={sl.id} style={{ background: C.card, borderRadius: 7, border: `1px solid ${C.bdr}`, padding: 12, marginBottom: 6 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontWeight: 700, color: C.acc }}>{sl.id}</span><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 10, color: C.txD }}>{sl.date}</span><button onClick={() => delSlip(sl.id)} style={{ background: "transparent", border: "none", color: C.wrn, cursor: "pointer", fontSize: 10 }}>Delete</button></div></div><div style={{ fontSize: 11.5, color: C.txM, marginBottom: 5 }}>Pay: {sl.payId} · {sl.client}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{(sl.crewIds || []).map(cid => { const c = crew.find(cr => cr.id === cid); return c ? <span key={cid} style={{ background: C.okB, color: C.ok, padding: "2px 6px", borderRadius: 3, fontSize: 10 }}>{c.name}</span> : null; })}</div></div>)}
  </div>;
}

// ============== DISTRIBUTION ==============
// ============== DISTRIBUTION HUB ==============
function DistV({ crew, slips, crewPay, setCrewPay, showT, fs, fsOk, userRole, payments, bills, genPayrollFromBill, onManualPayment, markProcessed, markPaid, approve, printPayslip, selectedMonth }) {
  const [tab, setHubTab] = useState("approval");
  const [isManualModalOpen, setManualModalOpen] = useState(false);
  const [manualData, setManualData] = useState({ crewId: "", amount: "", vessel: "", remark: "" });
  const [calc, setCalc] = useState(null); 
  const [rate, setRate] = useState(3985);
  const [extra, setExtra] = useState({}); 
  const [splitT, setSplitT] = useState(null); 
  const [splitRows, setSplitRows] = useState([]); 

  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none", width: "100%", boxSizing: "border-box" };

  const handleManualSubmit = () => {
    if (!manualData.crewId || !manualData.amount) return showT("Please fill crew and amount", "wrn");
    const c = crew.find(cr => String(cr.id) === String(manualData.crewId));
    if (!c) return showT("Crew not found", "err");
    onManualPayment({
      crewId: c.id, crewName: c.name,
      total: Number(manualData.amount), vessel: manualData.vessel || c.vessel,
      bankName: c.bankName, bankAccNo: c.bankAccNo, bankAccName: c.bankAccName,
      month: selectedMonth
    });
    setManualModalOpen(false);
    setManualData({ crewId: "", amount: "", vessel: "", remark: "" });
  };

  const awaitingApproval = crewPay.filter(p => p.status === "Pending");
  // Robust filtering: handle potential month string differences (e.g. 2026-04 vs April 2026)
  const isCorrectMonth = (m) => !m || !selectedMonth || m === selectedMonth || m.includes(selectedMonth) || selectedMonth.includes(m);

  const approvedPayments = crewPay.filter(p => p.status === "Approved");
  const processedPayments = crewPay.filter(p => p.status === "Processed");
  
  const payrolls = useMemo(() => {
    const groups = {};
    const reportable = crewPay.filter(p => isCorrectMonth(p.month) && ["Approved", "Processed", "Paid"].includes(p.status));
    
    reportable.forEach(p => {
      const gKey = p.slipId || "MANUAL";
      if (!groups[gKey]) {
        const bill = bills.find(b => b.id === p.slipId) || { id: "MANUAL", client: p.client || "Manual Distribution", month: p.month, vessel: p.vessel };
        groups[gKey] = { bill, payments: [], clientName: bill.client };
      }
      groups[gKey].payments.push(p);
    });
    return Object.values(groups);
  }, [crewPay, bills, selectedMonth]);

  const paidPayments = crewPay.filter(p => p.status === "Paid" && isCorrectMonth(p.month));

  return (
    <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.bdr}`, padding: 20, marginBottom: 15 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Payment Distribution Hub</h2>
        <Btn onClick={() => setManualModalOpen(true)}>➕ Manual Payment</Btn>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${C.bdr}`, gap: 20, marginBottom: 20 }}>
        {["approval", "dist", "verify", "history"].map(t => (
          <button key={t} onClick={() => setHubTab(t)} style={{ 
            paddingBottom: 10, border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            color: tab === t ? C.pri : C.txD, borderBottom: tab === t ? `2px solid ${C.pri}` : "none" 
          }}>
            {t === "approval" ? "Approval Queue" : t === "dist" ? "Distribution" : t === "verify" ? "Verification" : "Paid History"}
            <Badge t={t==="approval"?awaitingApproval.length:t==="dist"?approvedPayments.length:t==="verify"?processedPayments.length:paidPayments.length} c={t==="history"?"green":t==="verify"?"indigo":t==="dist"?"orange":"blue"} s={{marginLeft:6}}/>
          </button>
        ))}
      </div>

      {tab === "approval" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
             <h3 style={{ fontSize: 14, margin: 0 }}>Pending Approval</h3>
          </div>
          {!awaitingApproval.length ? <p style={{ textAlign: "center", padding: 30, color: C.txD }}>No pending tasks.</p> : (
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Crew", "Amount", "Source", "Action"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{awaitingApproval.map(p => (
                <tr key={p.id}>
                  <td style={tdS}><b>{p.crewName}</b><br/><small style={{color:C.txD}}>{p.vessel}</small></td>
                  <td style={{ ...tdS, fontWeight: 700, color: C.acc }}>${(p.total || 0).toLocaleString()}</td>
                  <td style={tdS}>{p.slipId}</td>
                  <td style={tdS}>{userRole === "admin" ? <Btn v="ok" s={{fontSize:10}} onClick={() => approve(p.id)}>Approve</Btn> : <Badge t="Waiting for Admin" c="orange"/>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {tab === "dist" && (
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 15 }}>Distribution (Approved)</h3>
          {!approvedPayments.length ? <p style={{ textAlign: "center", padding: 30, color: C.txD }}>Nothing to distribute.</p> : (
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Crew", "Amount", "Method", "Actions"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{approvedPayments.map(p => (
                <tr key={p.id}>
                  <td style={tdS}><b>{p.crewName}</b></td>
                  <td style={{ ...tdS, fontWeight: 700, color: C.acc }}>${(p.total || 0).toLocaleString()}</td>
                  <td style={tdS}>{p.type === "bank" ? `${p.bankName} (${p.bankAccNo})` : "Cash Pickup"}</td>
                  <td style={tdS}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn v="sec" s={{fontSize:9}} onClick={() => printPayslip(p)}>🖨️ Slip</Btn>
                      {!p.isSplit && <Btn v="ghost" s={{fontSize:9}} onClick={() => {
                         const c = crew.find(cr => String(cr.id) === String(p.crewId)) || {};
                         const banks = c.banks && c.banks.length > 0 ? c.banks : [{ bankName: c.bankName, bankAccNo: c.bankAccNo, bankAccName: c.bankAccName, label: "Primary" }];
                         setSplitRows(banks.map((b, i) => ({ ...b, amount: i === 0 ? p.total : 0 }))); setSplitT(p);
                      }}>✂️ Split</Btn>}
                      <Btn s={{fontSize:9}} onClick={() => markProcessed(p.id)}>Process Done</Btn>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {tab === "verify" && (
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 15 }}>Verification (Signed Slips)</h3>
          {!processedPayments.length ? <p style={{ textAlign: "center", padding: 30, color: C.txD }}>No slips to verify.</p> : (
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Crew", "Amount", "Signed Slip", "Action"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{processedPayments.map(p => (
                <tr key={p.id}>
                  <td style={tdS}>{p.crewName}</td>
                  <td style={{ ...tdS, fontWeight: 700 }}>${(p.total || 0).toLocaleString()}</td>
                  <td style={tdS}>{p.signedSlipUrl ? <a href={p.signedSlipUrl} target="_blank" style={{color:C.pri}}>View</a> : "Missing"}</td>
                  <td style={tdS}>
                    {userRole === "admin" ? <Btn v="ok" s={{fontSize:10}} onClick={() => markPaid(p.id)}>Mark Paid</Btn> : 
                      <Btn v="ghost" s={{fontSize:9}} onClick={() => { const u = prompt("URL:", p.signedSlipUrl); if(u) markProcessed(p.id, u); }}>📎 Upload</Btn>}
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 15 }}>Payment History</h3>
          {!paidPayments.length ? <p style={{ textAlign: "center", padding: 30, color: C.txD }}>No history found.</p> : (
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Crew Name", "Amount", "Paid Date"].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{paidPayments.slice().reverse().map(p => (
                <tr key={p.id}><td style={tdS}>{p.crewName}</td><td style={tdS}>${(p.total || 0).toLocaleString()}</td><td style={tdS}>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {isManualModalOpen && (
         <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, WebkitBackdropFilter: "blur(2px)", backdropFilter: "blur(2px)" }}>
           <div style={{ background: C.card, padding: 25, borderRadius: 12, width: 400, border: `1px solid ${C.bdr}`, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
             <h3 style={{ margin: "0 0 5px", fontSize: 15, fontWeight: 700 }}>Add Manual Payment</h3>
             <p style={{ fontSize: 11, color: C.txD, marginBottom: 20 }}>Use for ad-hoc distributions (e.g. emergency leave pay).</p>
             <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, color: C.txM, fontWeight: 600, display: "block", marginBottom: 4 }}>Crew Member</label>
                  <select style={inp} value={manualData.crewId} onChange={e => setManualData({...manualData, crewId: e.target.value})}>
                    <option value="">Select Crew</option>
                    {crew.map(c => <option key={c.id} value={c.id}>{c.id} - {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.txM, fontWeight: 600, display: "block", marginBottom: 4 }}>Amount (USD)</label>
                  <input type="number" style={inp} value={manualData.amount} onChange={e => setManualData({...manualData, amount: e.target.value})} placeholder="0.00" />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.txM, fontWeight: 600, display: "block", marginBottom: 4 }}>Vessel (Override)</label>
                  <input style={inp} value={manualData.vessel} onChange={e => setManualData({...manualData, vessel: e.target.value})} placeholder="Default vessel if empty" />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 15 }}>
                  <Btn onClick={handleManualSubmit} s={{ flex: 2 }}>Create Payment</Btn>
                  <Btn v="ghost" onClick={() => setManualModalOpen(false)} s={{ flex: 1 }}>Cancel</Btn>
                </div>
             </div>
           </div>
         </div>
      )}

      {splitT && <Mod title={`Split Payment: ${splitT.crewName}`} onClose={() => setSplitT(null)} w={600}>
        <div style={{ marginBottom: 15, padding: 12, background: `${C.acc}10`, borderRadius: 8, border: `1px solid ${C.acc}30` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12 }}>Total to distribute: <b style={{ fontSize: 14 }}>${(splitT.total || 0).toLocaleString()}</b></span>
            <span style={{ fontSize: 12 }}>Remaining: <b style={{ fontSize: 14, color: (splitT.total - splitRows.reduce((a, b) => a + (Number(b.amount) || 0), 0)) === 0 ? C.ok : C.err }}>
              ${((splitT.total || 0) - splitRows.reduce((a, b) => a + (Number(b.amount) || 0), 0)).toLocaleString()}
            </b></span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {splitRows.map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 30px", gap: 8, alignItems: "end", background: C.bgS, padding: 8, borderRadius: 6 }}>
              <div>
                <label style={{ fontSize: 9, color: C.txD }}>Bank / Account</label>
                <div style={{ fontSize: 11, fontWeight: 500 }}>{row.bankName} - {row.bankAccNo}</div>
                <div style={{ fontSize: 10, color: C.txM }}>{row.bankAccName} {row.label && `(${row.label})`}</div>
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.txM }}>USD Amount</label>
                <input type="number" value={row.amount} onChange={e => {
                  const nr = [...splitRows];
                  nr[i].amount = e.target.value;
                  setSplitRows(nr);
                }} style={inp} />
              </div>
              <div style={{ display: "flex", alignItems: "center", height: 38 }}>
                <Btn v="ghost" s={{ color: C.err, padding: 0 }} onClick={() => setSplitRows(splitRows.filter((_, idx) => idx !== i))}>✕</Btn>
              </div>
            </div>
          ))}
          <Btn v="sec" size="sm" onClick={() => setSplitRows([...splitRows, { bankName: "Other", bankAccNo: "", bankAccName: splitT.crewName, amount: 0, label: "Additional" }])}>+ Add Custom Account</Btn>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <Btn v="sec" onClick={() => setSplitT(null)}>Cancel</Btn>
          <Btn v="ok" disabled={((splitT.total || 0) - splitRows.reduce((a, b) => a + (Number(b.amount) || 0), 0)) !== 0} onClick={async () => {
             const validRows = splitRows.filter(r => r.amount > 0);
             if (!validRows.length) return;
             
             const splitPayments = validRows.map((r, i) => ({
               ...splitT,
               id: `${splitT.id}-S${i+1}`,
               total: Number(r.amount),
               bankAmount: Number(r.amount),
               bankName: r.bankName,
               bankAccNo: r.bankAccNo,
               bankAccName: r.bankAccName,
               label: r.label,
               isSplit: true,
               status: "Approved"
             }));

             const updated = [...crewPay.filter(p => p.id !== splitT.id), ...splitPayments];
             setCrewPay(updated);
             if (fsOk) {
               await fs.delD("crewPayments", splitT.id);
               for (const sp of splitPayments) await fs.setD("crewPayments", sp.id, sp);
             }
             setSplitT(null);
             showT(`Payment split into ${splitPayments.length} parts ✓`);
          }}>Confirm Split</Btn>
        </div>
      </Mod>}

      {/* ── Payroll Reporting ── */}
      {payrolls.length > 0 && <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginTop: 14 }}>
        <h4 style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600 }}>🖨️ Payroll Reporting</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {payrolls.map(pr => (
            <div key={pr.bill.id} style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 6, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{pr.clientName} · {pr.bill.month}</div>
                <div style={{ fontSize: 9, color: C.txD }}>{pr.payments.length} crew · Bill: {pr.bill.id}</div>
              </div>
              <Btn v="ghost" s={{ fontSize: 10 }} onClick={async () => {
                  setCalc(pr);
                  if (fsOk) {
                      const saved = await fs.getD("payrollSettings", pr.bill.id);
                      if (saved) { setRate(saved.rate || 3985); setExtra(saved.extraSettings || {}); } else { setRate(3985); setExtra({}); }
                  }
              }}>Report</Btn>
            </div>
          ))}
        </div>
      </div>}

      {/* ── Payroll Calculation Modal ── */}
      {calc && <Mod title={`Payroll Summary: ${calc.clientName} (${calc.bill.month})`} onClose={() => setCalc(null)} w={950}>
        <div style={{ marginBottom: 15, display: "flex", gap: 20, alignItems: "center", background: C.bg, padding: 10, borderRadius: 6, border: `1px solid ${C.bdr}` }}>
          <div>
            <label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Exchange Rate (MMK/USD)</label>
            <input type="number" value={rate} onChange={e => setRate(e.target.value)} style={{ ...inp, width: 120 }} />
          </div>
          <div style={{ fontSize: 11, color: C.txD }}>Calculates MMK totals and groups Bank/Cash lists.</div>
        </div>
        
        <div style={{ overflowX: "auto", maxHeight: 400, border: `1px solid ${C.bdr}`, borderRadius: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
            <thead style={{ position: "sticky", top: 0, background: C.bg, zIndex: 1 }}>
              <tr>{["Name", "Vessel", "Rank", "Remittance(USD)", "Bank Chg(MMK)", "Refunds(MMK)", "Ded.(MMK)", "Remittance(MMK)", "Type"].map(h => <th key={h} style={thS}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {calc.payments.map(p => {
                const c = crew.find(cr => cr.id === p.crewId) || {};
                const ex = extra[p.crewId] || { bc: 200, ref: 0, ded: 0 };
                const mmk = (p.total * rate) - ex.bc + ex.ref - ex.ded;
                const updateExtra = (k, v) => setExtra({ ...extra, [p.crewId]: { ...ex, [k]: Number(v) } });
                
                return <tr key={p.id}>
                  <td style={tdS}><b>{c.name}</b></td>
                  <td style={tdS}>{c.vessel || "Unknown"}</td>
                  <td style={tdS}>{c.rank}</td>
                  <td style={{ ...tdS, fontWeight: 600 }}>${(p.total || 0).toLocaleString()}</td>
                  <td style={tdS}><input type="number" value={ex.bc} onChange={e => updateExtra("bc", e.target.value)} style={{ ...inp, padding: "2px 5px", fontSize: 10 }} /></td>
                  <td style={tdS}><input type="number" value={ex.ref} onChange={e => updateExtra("ref", e.target.value)} style={{ ...inp, padding: "2px 5px", fontSize: 10 }} /></td>
                  <td style={tdS}><input type="number" value={ex.ded} onChange={e => updateExtra("ded", e.target.value)} style={{ ...inp, padding: "2px 5px", fontSize: 10 }} /></td>
                  <td style={{ ...tdS, fontWeight: 700, color: C.pri }}>{mmk.toLocaleString()}</td>
                  <td style={tdS}><Badge t={c.allotmentType || "bank"} c={c.allotmentType === "cash" ? "orange" : "blue"} /></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 15 }}>
          <Btn v="ghost" s={{ fontSize: 10 }} onClick={() => exportPayrollPDF(calc, rate, extra, crew)}>📄 PDF Summary</Btn>
          <Btn v="ghost" s={{ fontSize: 10 }} onClick={() => exportBankPDF(calc, rate, extra, crew)}>📄 Bank PDF</Btn>
          <Btn v="ghost" s={{ fontSize: 10 }} onClick={() => exportCashPDF(calc, rate, extra, crew)}>📄 Cash PDF</Btn>
          <Btn onClick={async () => {
             const batchData = { billId: calc.bill.id, vessel: calc.vessel, month: calc.bill.month, rate: rate, extraSettings: extra, finalizedAt: new Date().toISOString() };
             if (fsOk) await fs.setD("payrollSettings", calc.bill.id, batchData);
             showT("Settings saved ✓");
          }}>💾 Save Settings</Btn>
        </div>
      </Mod>}
    </div>
  );
}


// ============== STATUS BOARD ==============
function BoardV({ userRole, crew, setCrew, crewPay, setCrewPay, slips, bills, payments, showT, fs, fsOk, selectedMonth, setSelectedMonth, fN, setFN, fV, setFV, fC, setFC, vessels, clients }) {
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
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} onClick={e => { try { e.target.showPicker() } catch(err){} }}
          style={{ background: "transparent", border: "none", color: C.acc, fontSize: 13, fontWeight: 700, cursor: "pointer", outline: "none", paddingRight: 16 }} />
        <span style={{ position: "absolute", right: 2, pointerEvents: "none", color: C.acc, fontSize: 9 }}>▼</span>
      </div>
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

// ============== PDF EXPORT HELPERS ==============

const exportPayrollPDF = (calc, rate, extra, crew) => {
  const w = window.open("", "_blank");
  let rows = "";
  let totUSD = 0, totMMK = 0;
  
  calc.payments.forEach(p => {
    const c = crew.find(cr => cr.id === p.crewId) || {};
    const ex = extra[p.crewId] || { bc: 200, ref: 0, ded: 0 };
    const mmk = (p.total * rate) - ex.bc + ex.ref - ex.ded;
    totUSD += (p.total || 0);
    totMMK += mmk;
    rows += `<tr>
      <td style="border:1px solid #ddd;padding:6px">${c.name}</td>
      <td style="border:1px solid #ddd;padding:6px">${c.vessel || "—"}</td>
      <td style="border:1px solid #ddd;padding:6px">${c.rank}</td>
      <td style="border:1px solid #ddd;padding:6px;text-align:right">$${(p.total || 0).toLocaleString()}</td>
      <td style="border:1px solid #ddd;padding:6px;text-align:right">${ex.bc.toLocaleString()}</td>
      <td style="border:1px solid #ddd;padding:6px;text-align:right">${ex.ref.toLocaleString()}</td>
      <td style="border:1px solid #ddd;padding:6px;text-align:right">${ex.ded.toLocaleString()}</td>
      <td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:bold">${mmk.toLocaleString()}</td>
    </tr>`;
  });

  w.document.write(`<html><head><title>Payroll Summary - ${calc.clientName}</title>
    <style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:20px;font-size:11px;} th{background:#f4f4f4;padding:8px;border:1px solid #ddd;text-align:left;}</style>
  </head><body>
    ${getLH()}
    <h2 style="text-align:center;margin:10px 0;font-size:16px;">PAYROLL SUMMARY REPORT</h2>
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:10px">
      <span><b>Client:</b> ${calc.clientName}</span>
      <span><b>Month:</b> ${calc.bill.month}</span>
      <span><b>Exchange Rate:</b> ${rate} MMK/USD</span>
    </div>
    <table>
      <thead><tr><th>Name</th><th>Vessel</th><th>Rank</th><th>USD</th><th>B.Chg</th><th>Ref.</th><th>Ded.</th><th>Total MMK</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="background:#f9f9f9;font-weight:bold">
        <td colspan="3" style="border:1px solid #ddd;padding:6px;text-align:right">GRAND TOTAL:</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">$${totUSD.toLocaleString()}</td>
        <td colspan="3" style="border:1px solid #ddd;padding:6px;"></td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right">${totMMK.toLocaleString()} MMK</td>
      </tr></tfoot>
    </table>
    <div style="margin-top:40px;display:flex;justify-content:space-between;font-size:12px">
      <div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:10px">Prepared By</div>
      <div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:10px">Approved By</div>
    </div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

const exportBankPDF = (calc, rate, extra, crew) => {
  const w = window.open("", "_blank");
  let rows = "";
  let totMMK = 0;
  
  calc.payments.filter(p => (crew.find(cr => cr.id === p.crewId)?.allotmentType || "bank") === "bank").forEach(p => {
    const c = crew.find(cr => cr.id === p.crewId) || {};
    const ex = extra[p.crewId] || { bc: 200, ref: 0, ded: 0 };
    const mmk = (p.total * rate) - ex.bc + ex.ref - ex.ded;
    totMMK += mmk;
    rows += `<tr>
      <td style="border:1px solid #ddd;padding:8px">${c.bankAccName}</td>
      <td style="border:1px solid #ddd;padding:8px">${c.bankAccNo}</td>
      <td style="border:1px solid #ddd;padding:8px">${c.bankName}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:right;font-weight:bold">${mmk.toLocaleString()}</td>
    </tr>`;
  });

  w.document.write(`<html><head><title>Bank Transfer List</title>
    <style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px;} th{background:#f4f4f4;padding:10px;border:1px solid #ddd;text-align:left;}</style>
  </head><body>
    ${getLH()}
    <h2 style="text-align:center;margin:10px 0;font-size:16px;">BANK TRANSFER INSTRUCTIONS</h2>
    <div style="font-size:12px;margin-bottom:15px"><b>Vessel:</b> ${calc.bill.vessel || "—"} | <b>Month:</b> ${calc.bill.month}</div>
    <table>
      <thead><tr><th>Account Name</th><th>Account Number</th><th>Bank</th><th>Amount (MMK)</th></tr></thead>
      <tbody>${rows}</tbody>
      <tr style="font-weight:bold;background:#f9f9f9">
        <td colspan="3" style="border:1px solid #ddd;padding:10px;text-align:right">TOTAL MMK:</td>
        <td style="border:1px solid #ddd;padding:10px;text-align:right">${totMMK.toLocaleString()}</td>
      </tr>
    </table>
    <div style="margin-top:50px;font-size:12px">
      <p>Please transfer the above amounts to the respective accounts.</p>
      <div style="margin-top:40px;display:flex;justify-content:space-between">
        <div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:10px">Authorized Signatory</div>
        <div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:10px">Date</div>
      </div>
    </div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

const exportCashPDF = (calc, rate, extra, crew) => {
  const w = window.open("", "_blank");
  let rows = "";
  
  calc.payments.filter(p => (crew.find(cr => cr.id === p.crewId)?.allotmentType) === "cash").forEach(p => {
    const c = crew.find(cr => cr.id === p.crewId) || {};
    const ex = extra[p.crewId] || { bc: 200, ref: 0, ded: 0 };
    const mmk = (p.total * rate) - ex.bc + ex.ref - ex.ded;
    rows += `<tr>
      <td style="border:1px solid #ddd;padding:10px">${c.name}</td>
      <td style="border:1px solid #ddd;padding:10px">${c.rank}</td>
      <td style="border:1px solid #ddd;padding:10px;text-align:right;font-weight:bold">${mmk.toLocaleString()}</td>
      <td style="border:1px solid #ddd;padding:10px;width:150px"></td>
    </tr>`;
  });

  w.document.write(`<html><head><title>Cash Pickup List</title>
    <style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px;} th{background:#f4f4f4;padding:10px;border:1px solid #ddd;text-align:left;}</style>
  </head><body>
    ${getLH()}
    <h2 style="text-align:center;margin:10px 0;font-size:16px;">CASH PICKUP LIST</h2>
    <div style="font-size:12px;margin-bottom:15px"><b>Vessel:</b> ${calc.bill.vessel || "—"} | <b>Month:</b> ${calc.bill.month}</div>
    <table>
      <thead><tr><th>Name</th><th>Rank</th><th>Amount (MMK)</th><th>Signature</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:50px;font-size:12px">
      <div style="margin-top:40px;display:flex;justify-content:space-between">
        <div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:10px">Paid By</div>
        <div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:10px">Date</div>
      </div>
    </div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

export default App;
