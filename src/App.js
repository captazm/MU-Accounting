import React, { useState, useMemo, useEffect } from "react";
import Tesseract from "tesseract.js";
import { C, Badge, Btn, Stat, Filt, Mod, thS, tdS, trHover } from "./components/UI";
import { fsListenCol, fsSetDoc, fsUpdateDoc, fsBatchSet, fsDelDoc, fsGetDoc, fsUploadFile } from "./services/firebase";
import { onAuthChange, authSignOut, fetchUserProfile, hasAnyUser } from "./services/auth";
import LoginPage from "./components/LoginPage";
import UserManagement from "./components/UserManagement";

const escHTML = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m]));
const escCSV = (s) => { const str = String(s ?? ""); return /^[=+\-@]/.test(str) ? "'" + str.replace(/"/g, '""') : str.replace(/"/g, '""'); };

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
  const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${escCSV(r[k])}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = (filename.endsWith(".csv") ? filename : filename + ".csv").replace(/[/\\?%*:|"<>]/g, '-');
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
};

function App() {
  const [tab, setTab] = useState("dashboard");
  const [crew, setCrew] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [slips, setSlips] = useState([]);
  const [crewPay, setCrewPay] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [income,   setIncome]   = useState([]);
  const [sb, setSb] = useState(true);
  const [modal, setModal] = useState(null);
  const [fN, setFN] = useState("");
  const [fV, setFV] = useState("");
  const [fC, setFC] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fsOk, setFsOk] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const now = new Date();
  const defaultSalaryMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultSalaryMonth);

  const vessels = useMemo(() => [...new Set(crew.map(c => c.vessel).filter(Boolean))].sort(), [crew]);
  const clients = useMemo(() => [...new Set(crew.map(c => c.client).filter(c => c && c !== "."))].sort(), [crew]);
  const showT = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser.uid);
        if (profile && profile.active === false) {
          await authSignOut();
          setCurrentUser(null); setUserProfile(null); setUserRole(null);
          setAuthLoading(false); return;
        }
        setCurrentUser(firebaseUser);
        setUserProfile(profile);
        setUserRole(profile?.role || "accountant");
        setIsFirstTime(false);
      } else {
        setCurrentUser(null); setUserProfile(null); setUserRole(null);
        const anyUser = await hasAnyUser();
        setIsFirstTime(!anyUser);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setCrew([]); setBills([]); setPayments([]); setSlips([]); setCrewPay([]);
      setFsOk(false); return;
    }
    setLoading(true);
    const unsubs = [
      fsListenCol("crew", (data) => { setCrew(data); setFsOk(true); setLoading(false); }),
      fsListenCol("bills", (data) => setBills(data)),
      fsListenCol("payments", (data) => setPayments(data)),
      fsListenCol("slips", (data) => setSlips(data)),
      fsListenCol("crewPayments", (data) => setCrewPay(data)),
      fsListenCol("expenses",     (data) => setExpenses(data)),
      fsListenCol("income",       (data) => setIncome(data)),
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
            no: obj.no || i + 1, name: obj.nm || "Unknown", rank: obj.rk || "—",
            ownerPaid: obj.op || 0, vessel: obj.vs || "—", client: obj.cl || "—",
            joinDate: obj.jd || "", salary: obj.sl || 0, office: obj.of || 0,
            remark: obj.rm || "", manningFees: obj.mf || 0, leavePay: obj.lp || 0,
            paidDepFees: obj.pdf || 0, balanceDepFees: obj.bdf || 0, status: "Onboard",
            banks: [{ id: "B1", bankName: obj.bn || "", bankAccNo: obj.ba || "", bankAccName: obj.nm || obj.ban || "", label: "Primary" }],
            allotmentType: "bank", createdAt: new Date().toISOString()
          };
        });
        const ok = await fsBatchSet("crew", items);
        if (ok) showT(`${items.length} crew members uploaded successfully!`);
        else showT("Bulk upload failed", "err");
      } catch (err) {
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
    { id: "dashboard", label: "Dashboard",       icon: <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:16,height:16}}><rect x="2" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.9"/><rect x="11" y="2" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5"/><rect x="2" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5"/><rect x="11" y="11" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.75"/></svg> },
    { id: "crew",      label: "Crew Registry",   icon: <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:16,height:16}}><circle cx="7.5" cy="6" r="3" fill="currentColor" opacity="0.9"/><circle cx="13.5" cy="7" r="2.2" fill="currentColor" opacity="0.5"/><path d="M1 16c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.9"/><path d="M13.5 10.5c2.485 0 4.5 1.97 4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/></svg> },
    { id: "billing",   label: "Monthly Billing", icon: <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:16,height:16}}><rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/><path d="M3 2h11l3 3v13a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z" fill="currentColor" opacity="0.12"/><path d="M13 2v4h4" stroke="currentColor" strokeWidth="1.4" opacity="0.5"/><path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.9"/></svg> },
    { id: "reconcile", label: "Reconciliation",  icon: <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:16,height:16}}><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/><circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.9"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/></svg> },
    { id: "dist",      label: "Payment Dist.",   icon: <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:16,height:16}}><path d="M3 10h14M13 6l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/><circle cx="5" cy="10" r="2" fill="currentColor" opacity="0.5"/><circle cx="15" cy="6" r="1.5" fill="currentColor" opacity="0.4"/><circle cx="15" cy="14" r="1.5" fill="currentColor" opacity="0.4"/></svg> },
    { id: "board",     label: "Status Board",    icon: <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:16,height:16}}><rect x="2" y="3" width="16" height="2" rx="1" fill="currentColor" opacity="0.4"/><rect x="2" y="9" width="12" height="2" rx="1" fill="currentColor" opacity="0.9"/><rect x="2" y="15" width="9" height="2" rx="1" fill="currentColor" opacity="0.6"/><circle cx="17" cy="10" r="2.5" fill="currentColor" opacity="0.85"/></svg> },
    { id: "expenses",  label: "Expenses",        icon: <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:16,height:16}}><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/><path d="M2 8h16" stroke="currentColor" strokeWidth="1.4" opacity="0.7"/><circle cx="6" cy="13" r="1.2" fill="currentColor" opacity="0.9"/><path d="M10 12h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/></svg> },
    { id: "users",     label: "User Management", icon: <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:16,height:16}}><circle cx="10" cy="7" r="3" fill="currentColor" opacity="0.9"/><path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.7"/><path d="M14 4l1.5 1.5L17 4M14 4h3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/></svg>, adminOnly: true },
  ];
  const nav = allNav.filter(n => !n.adminOnly || userRole === "admin");
  const fs = { setD: fsSetDoc, upD: fsUpdateDoc, batchW: fsBatchSet, delD: fsDelDoc, getD: fsGetDoc };

  const genPayrollFromBill = async (bill, slipUrl) => {
    if (!bill.crew || !bill.crew.length) return;
    const items = [];
    for (const c of bill.crew) {
      const p = {
        id: `P${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        // Identity
        slipId:       bill.id,
        crewId:       c.crewId || c.id,
        crewName:     c.name,
        rank:         c.rank         || "",
        vessel:       c.vessel       || bill.vessel || "",
        client:       c.client       || bill.client || "",
        month:        bill.month,
        joinDate:     c.joinDate     || "",
        // Bill period
        billFrom:     c.from         || bill.from   || "",
        billTo:       c.to           || bill.to     || "",
        daysOnBoard:  c.daysOnBoard  || 0,
        daysOfMonth:  c.daysOfMonth  || 0,
        // Earnings (from bill row)
        ownerPaid:    c.ownerPaid    || 0,   // Wages/Month
        actualHA:     c.actualHA     || 0,   // Actual HA (pro-rated)
        pob:          c.pob          || 0,
        bonus:        c.bonus        || 0,
        pdeFees:      c.pdeFees      || 0,
        visaFees:     c.visaFees     || 0,
        workingGear:  c.workingGear  || 0,
        totalPayment: c.totalPayment || 0,   // Owner total
        // Deductions (from bill row)
        actManning:   c.actManning   || 0,   // Manning fee (deducted)
        actLeavePay:  c.actLeavePay  || 0,   // Leave pay accumulated
        depFeeDed:    c.depFeeDed    || 0,   // DEP fee deducted
        // Crew registry fields
        salary:       c.salary       || 0,   // Basic salary
        leavePay:     c.leavePay     || 0,   // Leave pay / month (from registry)
        office:       c.office       || 0,   // DEP fees/month
        paidDepFees:  c.paidDepFees  || 0,
        balanceDepFees: c.balanceDepFees || 0,
        accumulatedLeavePay: c.accumulatedLeavePay || 0,
        // Net result
        netCrewPay:   c.netCrewPay   || 0,
        total:        c.netCrewPay   || 0,   // final payable (editable later)
        grossTotal:   c.netCrewPay   || 0,   // reference to pre-edit total
        // Bank
        type:         c.allotmentType || "bank",
        bankName:     c.bankName      || "",
        bankAccNo:    c.bankAccNo     || "",
        bankAccName:  c.bankAccName   || "",
        // Status
        status:       "Pending",
        signedSlipUrl: "",
        date:         new Date().toISOString().split("T")[0],
        createdAt:    new Date().toISOString(),
      };
      items.push(p);
      if (fsOk) await fs.setD("crewPayments", p.id, p);
    }
    setCrewPay(prev => [...prev.filter(x => x.slipId !== bill.id), ...items]);
  };

  const createManualPayment = async (data) => {
    const pay = {
      id: `CPAY-MANUAL-${Date.now()}`, crewId: data.crewId, crewName: data.crewName,
      slipId: "AD-HOC", vessel: data.vessel, total: Number(data.total),
      type: "bank", bankName: data.bankName, bankAccNo: data.bankAccNo, bankAccName: data.bankAccName,
      status: "Pending", date: new Date().toISOString().split("T")[0], month: data.month || selectedMonth
    };
    setCrewPay(prev => [...prev, pay]);
    if (fsOk) await fs.setD("crewPayments", pay.id, pay);
    showT("Manual payment created.");
  };

  const approve = async (id) => {
    if (userRole !== "admin") { showT("Admin permission လိုအပ်သည်", "err"); return; }
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
    if (userRole !== "admin") { showT("Admin permission လိုအပ်သည်", "err"); return; }
    const p = crewPay.find(x => x.id === id);
    if (!p) return;
    const up = { status: "Paid", paidAt: new Date().toISOString() };
    setCrewPay(prev => prev.map(x => x.id === id ? { ...x, ...up } : x));
    if (fsOk) {
      await fs.upD("crewPayments", id, up);
      if (p.crewId && (p.depFeeDed || p.actLeavePay || p.leavePayRefunded)) {
        const c = crew.find(cr => String(cr.id) === String(p.crewId));
        if (c) {
          const upd = {
            paidDepFees: (c.paidDepFees || 0) + (p.depFeeDed || 0),
            balanceDepFees: Math.max(0, (c.balanceDepFees || 0) - (p.depFeeDed || 0)),
            accumulatedLeavePay: Math.max(0,
              (c.accumulatedLeavePay || 0)
              + (p.actLeavePay || 0)
              - (p.leavePayRefunded || 0)
            )
          };
          await fs.upD("crew", c.id, upd);
        }
      }
    }
    showT("Payment Verified & Paid ✓", "ok");
  };

  const printPayslip = (p, exchRate = 3985) => {
    const w = window.open("", "_blank");
    const fmtUSD = (v) => `${(Number(v)||0).toLocaleString(undefined,{minimumFractionDigits:2})}`;
    const fmtMMK = (v) => `${Math.round(Number(v)||0).toLocaleString()} MMK`;
    // Bank charge logic:
    // - 200 MMK fixed always
    // - 5 USD additional UNLESS salary < $200 (exempted)
    const bankChargeUSD = (Number(p.salary) || 0) < 200 ? 0 : (Number(p.bankCharge) || 5);
    const bankChargeMMK = 200;
    const usedRate = exchRate;
    // Net MMK = (net USD - bankChargeUSD) * rate - bankChargeMMK
    const netMMK = Math.max(0, Math.round((Number(p.total) - bankChargeUSD) * usedRate - bankChargeMMK));
    const row = (lbl, val, cls="", note="") =>
      `<tr><td class="lbl">${lbl}${note?`<span class="note">${note}</span>`:''}</td><td class="val ${cls}">${val}</td></tr>`;
    const divider = `<tr><td colspan="2" style="padding:3px 0"><div style="border-top:1px dashed #e5e7eb"></div></td></tr>`;
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip — ${p.crewName}</title>
    <style>
      *{font-family:Arial,sans-serif;margin:0;padding:0;box-sizing:border-box}
      body{padding:24px 28px;font-size:11px;color:#111;background:#fff;max-width:680px;margin:0 auto}
      h1{font-size:15px;font-weight:800;color:#111;margin-bottom:2px}
      .subtitle{font-size:10px;color:#6b7280;margin-bottom:16px}
      .section{margin-bottom:12px}
      .section-title{font-size:8.5px;font-weight:700;letter-spacing:1.4px;color:#6b21a8;text-transform:uppercase;border-bottom:2px solid #6b21a8;padding-bottom:3px;margin-bottom:7px}
      table{width:100%;border-collapse:collapse}
      td{padding:3.5px 6px;vertical-align:top}
      td.lbl{color:#555;width:58%}
      td.val{font-weight:600;text-align:right}
      .pos{color:#059669}.neg{color:#dc2626}.muted{color:#9ca3af}.blue{color:#1d4ed8}.purple{color:#7c3aed}
      .total-row td{font-size:13px;font-weight:800;padding-top:8px;border-top:2px solid #111}
      .total-row td.val{color:#059669}
      .mmk-row td{font-size:12px;font-weight:700;color:#7c3aed;padding-top:5px}
      .note{font-size:8px;color:#9ca3af;margin-left:6px;font-weight:400}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;margin-bottom:12px}
      .info-item .ilbl{font-size:8.5px;color:#9ca3af;margin-bottom:1px}
      .info-item .ival{font-size:11px;font-weight:600}
      .bank-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;margin-top:10px;font-size:10.5px;line-height:1.8}
      .bank-label{font-size:8.5px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px}
      .sig-row{display:flex;justify-content:space-between;margin-top:36px;padding-top:10px;border-top:1px solid #e5e7eb}
      .sig-box{text-align:center;width:160px}
      .sig-line{border-top:1px solid #000;padding-top:6px;margin-top:30px;font-size:9.5px;color:#555}
      @media print{body{padding:16px;max-width:100%}}
    </style></head>
    <body>
      ${getLH()}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div>
          <h1>INDIVIDUAL PAYROLL SLIP</h1>
          <div class="subtitle">Salary Month: <b style="color:#6b21a8">${p.month||'—'}</b> &nbsp;·&nbsp; Bill Ref: <b>${p.slipId||'—'}</b></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:9px;color:#9ca3af">Issue Date</div>
          <div style="font-size:11px;font-weight:700">${p.date||new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Crew Information</div>
        <div class="info-grid">
          <div class="info-item"><div class="ilbl">Full Name</div><div class="ival">${p.crewName||'—'}</div></div>
          <div class="info-item"><div class="ilbl">Crew ID</div><div class="ival">${p.crewId||'—'}</div></div>
          <div class="info-item"><div class="ilbl">Rank / Position</div><div class="ival">${p.rank||'—'}</div></div>
          <div class="info-item"><div class="ilbl">Vessel</div><div class="ival">${p.vessel||'—'}</div></div>
          <div class="info-item"><div class="ilbl">Sign-On Date</div><div class="ival">${p.joinDate||'—'}</div></div>
          <div class="info-item"><div class="ilbl">Service Period</div><div class="ival">${p.billFrom?`${p.billFrom} → ${p.billTo}`:'—'}</div></div>
          <div class="info-item"><div class="ilbl">Days on Board</div><div class="ival">${p.daysOnBoard?`${p.daysOnBoard} of ${p.daysOfMonth} days`:'—'}</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Salary &amp; Earnings</div>
        <table>
          ${row('Basic Salary (Contract)', fmtUSD(p.salary), 'blue')}
          ${Number(p.bonus)>0        ? row('Bonus / Allowance', fmtUSD(p.bonus), 'pos') : ''}
          ${Number(p.leavePayRefunded)>0 ? row('Leave Pay (Refunded)', fmtUSD(p.leavePayRefunded), 'pos') : ''}
          ${Number(p.pdeFees)>0      ? row('PDE Fees (Reimbursed)', fmtUSD(p.pdeFees), 'pos') : ''}
          ${Number(p.visaFees)>0     ? row('Visa Fees (Reimbursed)', fmtUSD(p.visaFees), 'pos') : ''}
          ${Number(p.workingGear)>0  ? row('Working Gear Allowance', fmtUSD(p.workingGear), 'pos') : ''}
        </table>
      </div>

      ${(Number(p.balanceDepFees)>0 || Number(p.depFeeDed)>0) ? `
      <div class="section">
        <div class="section-title">Departure (DEP) Fees</div>
        <table>
          ${row('Total DEP Fees (One-time)',   fmtUSD(Number(p.paidDepFees||0) + Number(p.balanceDepFees||0) + Number(p.depFeeDed||0)), 'muted', 'one-time departure fee')}
          ${row('Previously Paid',             fmtUSD(p.paidDepFees), 'muted')}
          ${Number(p.depFeeDed)>0 ? row('Deducted This Month',       fmtUSD(p.depFeeDed), 'neg') : row('Deducted This Month', '—', 'muted')}
          ${Number(p.balanceDepFees)>0 ? row('Remaining Balance', fmtUSD(p.balanceDepFees), 'neg') : row('Remaining Balance', 'Fully Settled', 'pos')}
        </table>
      </div>` : ''}

      <div class="section">
        <div class="section-title">Leave Pay</div>
        <table>
          ${row('Leave Pay Deducted (This Month)', fmtUSD(p.actLeavePay), Number(p.actLeavePay)>0?'neg':'muted', 'held by company')}
          ${row('Leave Pay Accumulated (Balance)', fmtUSD(p.accumulatedLeavePay), 'blue', 'returnable on sign-off')}
        </table>
      </div>

      <div class="section">
        <div class="section-title">Net Pay Calculation (USD)</div>
        <table>
          ${row('Basic Salary',              fmtUSD(p.salary))}
          ${Number(p.bonus)>0 ? row('+ Bonus / Other Allowances', fmtUSD(p.bonus), 'pos') : ''}
          ${Number(p.depFeeDed)>0 ? row('− DEP Fee Deducted', fmtUSD(p.depFeeDed), 'neg') : ''}
          ${Number(p.actLeavePay)>0 ? row('− Leave Pay Deducted', fmtUSD(p.actLeavePay), 'neg') : ''}
          ${Number(p.otherDed)>0 ? row('− Other Deductions', fmtUSD(p.otherDed), 'neg') : ''}
          ${Number(p.extraBonus)>0 ? row('+ Extra Allowance', fmtUSD(p.extraBonus), 'pos') : ''}
          ${bankChargeUSD>0 ? row(`− Bank Charge (USD)`, fmtUSD(bankChargeUSD), 'neg', p.salary<200?'exempted (salary < $200)':'standard 5 USD') : ''}
          ${divider}
          <tr class="total-row">
            <td class="lbl">NET PAY TO CREW (USD)</td>
            <td class="val pos">${fmtUSD(p.total)}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">MMK Conversion</div>
        <table>
          ${row('Net Pay (USD)',             fmtUSD(p.total))}
          ${row('Exchange Rate',             `${Number(usedRate).toLocaleString()} MMK / 1 USD`)}
          ${row('Converted Amount',          fmtMMK(Number(p.total) * usedRate))}
          ${row('− Bank Transfer Charge',    fmtMMK(bankChargeMMK), 'neg', 'fixed')}
          ${divider}
          <tr class="mmk-row">
            <td class="lbl" style="font-size:12px;font-weight:700">NET RECEIVABLE (MMK)</td>
            <td class="val purple">${fmtMMK(netMMK)}</td>
          </tr>
        </table>
      </div>

      <div class="bank-box">
        <div class="bank-label" style="margin-bottom:6px">Payment Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">
          <div><span style="color:#9ca3af">Method: </span><b>${p.type==='cash'?'Cash (Office Pickup)':'Bank Transfer'}</b></div>
          <div><span style="color:#9ca3af">Bank: </span><b>${p.bankName||'—'}</b></div>
          <div><span style="color:#9ca3af">Account No: </span><b>${p.bankAccNo||'—'}</b></div>
          <div><span style="color:#9ca3af">Account Name: </span><b>${p.bankAccName||'—'}</b></div>
        </div>
        ${p.remark ? `<div style="margin-top:6px;font-size:10px;color:#6b7280"><b>Note:</b> ${p.remark}</div>` : ''}
      </div>

      <div class="sig-row">
        <div class="sig-box"><div class="sig-line">Prepared By (Accountant)</div></div>
        <div class="sig-box"><div class="sig-line">Approved By (Admin)</div></div>
        <div class="sig-box"><div class="sig-line">Crew Signature &amp; Date</div></div>
      </div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const deleteBill = async (billId) => {
    if (userRole !== "admin") { showT("Admin permission လိုအပ်သည်", "err"); return; }
    
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    if (!window.confirm(`Are you sure you want to delete bill ${billId}?\nThis will also delete associated payments and payroll records.`)) return;

    setLoading(true);
    try {
      // 1. Delete associated payments (reconciliations)
      const relatedPayments = payments.filter(pay => pay.billId === billId);
      for (const pay of relatedPayments) {
        await fs.delD("payments", pay.id);
      }

      // 2. Delete associated payrolls (crewPayments)
      const relatedPayrolls = crewPay.filter(cp => cp.slipId === billId);
      for (const cp of relatedPayrolls) {
        await fs.delD("crewPayments", cp.id);
      }

      // 3. Delete the bill itself
      await fs.delD("bills", billId);

      // 4. Update local state synchronously (to reflect changes immediately)
      setBills(prev => prev.filter(b => b.id !== billId));
      setPayments(prev => prev.filter(pay => pay.billId !== billId));
      setCrewPay(prev => prev.filter(cp => cp.slipId !== billId));

      showT(`Bill ${billId} and associated records deleted successfully.`);
    } catch (err) {
      console.error("Delete bill error:", err);
      showT("Failed to delete bill", "err");
    } finally {
      setLoading(false);
    }
  };

  const p = { crew, setCrew, bills, setBills, payments, setPayments, slips, setSlips, crewPay, setCrewPay, filtered, fN, setFN, fV, setFV, fC, setFC, modal, setModal, setTab, showT, vessels, clients, fs, fsOk, selectedMonth, setSelectedMonth, userRole, bulkUpload, migrating, genPayrollFromBill, createManualPayment, approve, markProcessed, markPaid, printPayslip, deleteBill };

  // ── Improved Spinner ────────────────────────────────────────────────────
  const Spinner = ({ msg }) => (
    <div style={{
      height: "100vh", background: C.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui,sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position:"absolute", top:"35%", left:"50%", transform:"translate(-50%,-50%)", width:360, height:360, borderRadius:"50%", background:"radial-gradient(circle, rgba(134,25,143,0.1) 0%, transparent 70%)", pointerEvents:"none", animation:"mu-pulse-dot 3s ease-in-out infinite" }} />
      <div style={{ position:"absolute", bottom:"20%", left:"50%", transform:"translateX(-50%)", width:280, height:180, borderRadius:"50%", background:"radial-gradient(circle, rgba(14,165,233,0.06) 0%, transparent 70%)", pointerEvents:"none" }} />
      {/* Logo — circular, triple pulsing rings */}
      <div style={{ position:"relative", width:84, height:84, marginBottom:30 }}>
        <div style={{ position:"absolute", inset:-14, borderRadius:"50%", border:"1px solid rgba(134,25,143,0.12)", animation:"mu-ring-pulse 2.4s ease-in-out 0.8s infinite" }} />
        <div style={{ position:"absolute", inset:-7,  borderRadius:"50%", border:"1.5px solid rgba(134,25,143,0.25)", animation:"mu-ring-pulse 2.4s ease-in-out 0.4s infinite" }} />
        <div style={{ position:"absolute", inset:-2,  borderRadius:"50%", border:"2px solid rgba(134,25,143,0.45)", animation:"mu-ring-pulse 2.4s ease-in-out infinite" }} />
        <div style={{ width:"100%", height:"100%", borderRadius:"50%", overflow:"hidden", boxShadow:"0 0 24px rgba(134,25,143,0.35), 0 0 48px rgba(134,25,143,0.12)" }}>
          <img src="/logo.jpg" alt="Mahar Unity" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        </div>
      </div>
      <div style={{ fontSize:15, fontWeight:700, letterSpacing:"2.5px", color:C.txt, marginBottom:3 }}>MAHAR UNITY</div>
      <div style={{ fontSize:9.5, color:C.txD, letterSpacing:"3.5px", marginBottom:30 }}>SRPS ACCOUNTING</div>
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:14 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ width:i===2?7:5, height:i===2?7:5, borderRadius:"50%", background:C.pri, opacity:0.4+i*0.12, animation:`mu-wave-dot 1.3s ease-in-out ${i*0.13}s infinite` }} />
        ))}
      </div>
      <div style={{ fontSize:11, color:C.txM, letterSpacing:"0.3px" }}>{msg || "Loading..."}</div>
    </div>
  );

  if (authLoading) return <Spinner msg="Checking authentication..." />;
  if (!currentUser) return <LoginPage isFirstTime={isFirstTime} />;
  if (loading) return <Spinner msg="Loading from Firestore..." />;

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.txt, fontFamily: "system-ui,sans-serif", fontSize: "12.5px", overflow: "hidden" }}>

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 9999,
          background: toast.type === "ok" ? C.ok : toast.type === "wrn" ? C.wrn : C.err,
          color: "#fff", padding: "10px 16px", borderRadius: 8,
          fontSize: 12, fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", gap: 8,
          animation: "mu-toast-in 0.25s ease",
          maxWidth: 320,
        }}>
          <span style={{ fontSize: 14 }}>
            {toast.type === "ok" ? "✓" : toast.type === "wrn" ? "⚠" : "✕"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* ── Sidebar ── */}
      <div style={{
        width: sb ? 210 : 54, transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        background: "rgba(15,22,41,0.98)",
        borderRight: `1px solid ${C.bdr}`,
        display: "flex", flexDirection: "column", flexShrink: 0,
        backdropFilter: "blur(12px)",
      }}>
        {/* Logo header */}
        <div
          onClick={() => setSb(!sb)}
          title={sb ? "Collapse sidebar" : "Expand sidebar"}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(14,165,233,0.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          style={{
            padding: sb ? "10px 12px" : "10px 0",
            display: "flex", alignItems: "center", gap: 10,
            borderBottom: `1px solid ${C.bdr}`,
            cursor: "pointer", minHeight: 52,
            transition: "background 0.2s",
            justifyContent: sb ? "flex-start" : "center",
          }}
        >
          {/* App logo */}
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            overflow: "hidden", flexShrink: 0,
            background: C.card,
            border: `1px solid rgba(134,25,143,0.35)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: "0 0 0 0 rgba(134,25,143,0)",
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "scale(1.08) rotate(-2deg)";
              e.currentTarget.style.boxShadow = "0 0 16px rgba(134,25,143,0.5)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "scale(1) rotate(0)";
              e.currentTarget.style.boxShadow = "0 0 0 0 rgba(134,25,143,0)";
            }}
          >
            <img src="/logo.jpg" alt="Mahar Unity" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          {sb && (
            <div style={{ overflow: "hidden", animation: "mu-fade-in 0.2s ease" }}>
              <div style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: "0.5px", color: C.txt, whiteSpace: "nowrap" }}>MAHAR UNITY</div>
              <div style={{ fontSize: 9, color: C.txD, letterSpacing: "1.5px", marginTop: 1 }}>SRPS ACCOUNTING</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "8px 6px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {nav.map(n => {
            const isActive = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                title={!sb ? n.label : undefined}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `rgba(14,165,233,0.08)`; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                style={{
                  display: "flex", alignItems: "center",
                  gap: 9,
                  padding: sb ? "6px 8px" : "7px 0",
                  width: "100%",
                  borderRadius: 9,
                  border: isActive ? `1px solid rgba(14,165,233,0.22)` : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.18s",
                  background: isActive ? `rgba(14,165,233,0.1)` : "transparent",
                  color: isActive ? C.acc : C.txM,
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  textAlign: "left",
                  justifyContent: sb ? "flex-start" : "center",
                  position: "relative",
                }}
              >
                {isActive && (
                  <span style={{
                    position: "absolute", left: 0, top: "22%", bottom: "22%",
                    width: 3, borderRadius: "0 3px 3px 0",
                    background: C.pri,
                    boxShadow: `0 0 8px ${C.pri}`,
                  }} />
                )}
                {/* Glassmorphism icon container */}
                <span style={{
                  width: 28, height: 28,
                  borderRadius: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginLeft: isActive ? 4 : 2,
                  background: isActive
                    ? `rgba(14,165,233,0.18)`
                    : `rgba(255,255,255,0.05)`,
                  border: isActive
                    ? `1px solid rgba(14,165,233,0.35)`
                    : `1px solid rgba(255,255,255,0.08)`,
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  transition: "all 0.18s",
                  boxShadow: isActive
                    ? `0 2px 8px rgba(14,165,233,0.2), inset 0 1px 0 rgba(255,255,255,0.1)`
                    : `inset 0 1px 0 rgba(255,255,255,0.06)`,
                  color: isActive ? C.acc : C.txM,
                }}>
                  {n.icon}
                </span>
                {sb && (
                  <span style={{
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    letterSpacing: "0.2px",
                  }}>{n.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User info + sign out */}
        {sb && (
          <div style={{
            padding: "10px",
            borderTop: `1px solid ${C.bdr}40`,
            background: "rgba(0,0,0,0.25)",
          }}>
            {/* User card */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
              padding: "7px 8px",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 9, border: `1px solid ${C.bdr}50`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: userRole === "admin"
                  ? `linear-gradient(135deg, ${C.inf}, ${C.pri})`
                  : `linear-gradient(135deg, ${C.ok}, #0EA5E9)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 11, fontWeight: 700,
                boxShadow: userRole === "admin"
                  ? `0 0 0 2px rgba(139,92,246,0.35)`
                  : `0 0 0 2px rgba(16,185,129,0.35)`,
              }}>
                {(userProfile?.displayName || "U")[0].toUpperCase()}
              </div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userProfile?.displayName || "User"}
                </div>
                <div style={{ fontSize: 9, color: userRole === "admin" ? C.inf : C.ok, textTransform: "capitalize", display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: userRole === "admin" ? C.inf : C.ok, display: "inline-block" }} />
                  {userRole}
                </div>
              </div>
            </div>

            {/* Sync status */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, marginBottom: 2 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: fsOk ? C.ok : C.wrn, display: "inline-block",
                boxShadow: fsOk ? `0 0 6px ${C.ok}` : `0 0 6px ${C.wrn}`,
                animation: fsOk ? "mu-pulse-dot 2.5s ease infinite" : "none",
              }} />
              <span style={{ color: fsOk ? C.ok : C.wrn, fontSize: 9 }}>
                {fsOk ? "Firestore Live" : "Connecting..."}
              </span>
              <span style={{ color: C.txD, fontSize: 9, marginLeft: "auto" }}>{crew.length} crew</span>
            </div>

            {/* Sign out */}
            <button
              onClick={async () => { await authSignOut(); }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(239,68,68,0.2)";
                e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
              }}
              style={{
                marginTop: 8, width: "100%",
                background: "rgba(239,68,68,0.08)",
                color: C.err, border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 7, padding: "5px 8px",
                fontSize: 10, cursor: "pointer", fontWeight: 600,
                transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              }}
            >
              <span style={{ fontSize: 11 }}>&#x2192;</span> Sign Out
            </button>
          </div>
        )}

        {/* Collapsed bottom user avatar */}
        {!sb && (
          <div style={{
            padding: "8px 0 10px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            borderTop: `1px solid ${C.bdr}40`,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: userRole === "admin"
                ? `linear-gradient(135deg,${C.inf},${C.pri})`
                : `linear-gradient(135deg,${C.ok},#0EA5E9)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 11, fontWeight: 700,
              boxShadow: `0 0 0 2px ${C.bdr}`,
              cursor: "default",
            }} title={`${userProfile?.displayName} (${userRole})`}>
              {(userProfile?.displayName || "U")[0].toUpperCase()}
            </div>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: fsOk ? C.ok : C.wrn,
              boxShadow: fsOk ? `0 0 5px ${C.ok}` : `0 0 5px ${C.wrn}`,
              display: "inline-block",
            }} />
          </div>
        )}

      </div>{/* end sidebar */}

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{
          padding: "0 20px",
          borderBottom: `1px solid ${C.bdr}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(15,22,41,0.95)",
          backdropFilter: "blur(8px)",
          minHeight: 46,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.txt }}>
              {nav.find(n => n.id === tab)?.label}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 10.5, color: C.txD, letterSpacing: "0.3px" }}>
              {new Date().toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: fsOk ? C.ok : C.wrn,
              boxShadow: fsOk ? `0 0 6px ${C.ok}` : `0 0 6px ${C.wrn}`,
            }} />
          </div>
        </div>

        {/* Page content */}
        <div key={tab} style={{ flex: 1, overflow: "auto", padding: 16, animation: "mu-fade-in 0.18s ease" }}>
          {tab === "dashboard" && <Dash {...p} />}
          {tab === "board"     && <BoardV {...p} />}
          {tab === "crew"      && <CrewV {...p} />}
          {tab === "billing"   && <BillV {...p} />}
          {tab === "reconcile" && <ReconV {...p} />}
          {tab === "dist"      && <DistV {...p} onManualPayment={p.createManualPayment} fsUploadFile={fsUploadFile} />}
          {tab === "expenses"  && <ExpensesV bills={bills} crewPay={crewPay} expenses={expenses} setExpenses={setExpenses} income={income} setIncome={setIncome} showT={showT} fs={fs} fsOk={fsOk} userRole={userRole} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />}
          {tab === "users" && userRole === "admin" && <UserManagement currentUser={currentUser} showT={showT} />}
        </div>

        {/* Footer */}
        <footer style={{ textAlign: "center", padding: "8px 16px", borderTop: `1px solid ${C.bdr}`, background: C.sf, fontSize: 10.5, color: C.txD, flexShrink: 0 }}>
          Developed by{" "}
          <span style={{ color: "#f97316", fontWeight: 700 }}>AZM</span>
        </footer>
      </div>
    </div>
  );
}

// ============== DASHBOARD ==============
function Dash({ crew, bills, payments, crewPay, slips, setTab, selectedMonth, setSelectedMonth }) {
  const mBills = bills.filter(b => b.month === selectedMonth);
  const mBillIds = new Set(mBills.map(b => b.id));
  const mPayments = payments.filter(p => mBillIds.has(p.billId));
  const mSlipIds = new Set(payments.filter(p => mBillIds.has(p.billId)).map(p => p.id));
  const mSlips = slips.filter(s => mSlipIds.has(s.payId));
  const mSlipCrewIds = new Set(mSlips.flatMap(s => s.crewIds || []));
  const mPaidCrewIds = new Set(crewPay.filter(p => { const slip = slips.find(s => s.id === p.slipId); return slip && mSlipIds.has(slip.payId); }).map(p => p.crewId));

  const tb = mBills.reduce((s, b) => s + (b.total || 0), 0);
  const tr = mPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const paidCount = mPaidCrewIds.size;
  const slipCount = mSlipCrewIds.size;
  const pendingCount = crew.length - paidCount;
  const [sy, sm] = selectedMonth.split("-").map(Number);
  const salaryMonthLabel = new Date(sy, sm - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });
  const payMonthLabel = new Date(sy, sm, 1).toLocaleString("en", { month: "long", year: "numeric" });
  const changeMonth = (delta) => { const d = new Date(sy, sm - 1 + delta, 1); setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  const bc = {}; crew.forEach(c => { if (!bc[c.client]) bc[c.client] = { n: 0, t: 0 }; bc[c.client].n++; bc[c.client].t += (c.ownerPaid || 0); });
  const tc = Object.entries(bc).sort((a, b) => b[1].t - a[1].t).slice(0, 8);
  const mx = Math.max(...tc.map(([, d]) => d.t), 1);
  const vCount = [...new Set(crew.map(c => c.vessel).filter(Boolean))].length;
  const pct = crew.length > 0 ? Math.round((paidCount / crew.length) * 100) : 0;

  return <div>
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <div>
        <div style={{ fontSize: 10, color: C.txD, marginBottom: 2 }}>VIEWING SALARY MONTH</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => changeMonth(-1)} style={{ background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, cursor: "pointer", padding: "3px 8px", fontSize: 13 }}>‹</button>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} onClick={e => { try { e.target.showPicker() } catch(err){} }} style={{ background: "transparent", border: "none", color: C.acc, fontSize: 15, fontWeight: 700, cursor: "pointer", outline: "none", paddingRight: 18 }} />
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
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <Stat label="Total Crew" val={crew.length} sub={`${vCount} vessels`} color={C.pri} onClick={() => setTab("crew")} icon="👥" />
      <Stat label="Bills This Month" val={mBills.length} sub={mBills.length ? `$${tb.toLocaleString()} USD` : "No bills"} color={C.inf} onClick={() => setTab("billing")} icon="📄" />
      <Stat label="Received" val={mPayments.length ? `$${tr.toLocaleString()}` : "—"} sub={tr >= tb && tb > 0 ? "Fully paid" : tb > 0 ? `$${(tb - tr).toLocaleString()} short` : ""} color={C.ok} icon="💰" />
      <Stat label="Salary Paid" val={`${paidCount}/${crew.length}`} sub={`${pct}%`} color={pct === 100 ? C.ok : pct > 50 ? C.wrn : C.err} onClick={() => setTab("board")} icon="✅" />
    </div>
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
  const save = async () => {
    if (!form.name) return;
    // Pick primary bank from banks array (first entry) or use top-level fields
    const primaryBank = (form.banks && form.banks.length > 0) ? form.banks[0] : {};
    const officeAmt = Number(form.office) || 0;
    const paidAmt   = Number(form.paidDepFees) || 0;
    const ownerAmt  = Number(form.ownerPaid) || 0;
    const salaryAmt = Number(form.salary) || 0;
    const f = {
      ...form,
      ownerPaid:    ownerAmt,
      salary:       salaryAmt,
      office:       officeAmt,
      manningFees:  Math.max(0, ownerAmt - salaryAmt),  // Auto: Owner Paid − Salary
      leavePay:     Number(form.leavePay)     || 0,
      paidDepFees:  paidAmt,
      balanceDepFees: Math.max(0, officeAmt - paidAmt),  // Auto: Total − Paid
      accumulatedLeavePay: Number(form.accumulatedLeavePay) || 0,
      // Always sync top-level bank fields from the banks array primary entry
      bankName:    form.bankName    || primaryBank.bankName    || "",
      bankAccNo:   form.bankAccNo   || primaryBank.bankAccNo   || "",
      bankAccName: form.bankAccName || primaryBank.bankAccName || "",
    };
    await fs.setD("crew", f.id, f);
    setModal(null);
    showT(`${f.name} saved to Firestore`);
  };
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <span style={{ fontSize: 11.5, color: C.txM }}>{filtered.length}/{crew.length} crew members</span>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="file" id="csv-upload" accept=".csv" style={{ display: "none" }} onChange={(e) => bulkUpload(e.target.files[0])} />
        <Btn v="ghost" s={{ color: C.err }} onClick={async () => {
          if(!window.confirm("Are you sure you want to clear ALL existing remarks for all crew?")) return;
          if (fs) { for (const c of crew) { if (c.remark) await fs.upD("crew", c.id, { remark: "" }); } showT("All remarks cleared successfully"); }
        }}>Clear Remarks</Btn>
        <Btn v="sec" onClick={() => document.getElementById("csv-upload").click()} disabled={migrating}>{migrating ? "Uploading..." : "Bulk CSV Import"}</Btn>
        <Btn onClick={() => { setForm({ id: `C${String(crew.length + 1).padStart(3, "0")}`, no: crew.length + 1, name: "", rank: "", ownerPaid: 0, vessel: "", client: "", joinDate: "", salary: 0, office: 0, paidDepFees: 0, balanceDepFees: 0, manningFees: 0, leavePay: 0, accumulatedLeavePay: 0, remark: "", status: "Onboard", allotmentType: "bank", banks: [{ id: "B1", bankName: "", bankAccNo: "", bankAccName: "", label: "Primary" }], bankName: "", bankAccNo: "", bankAccName: "" }); setModal("add"); }}>+ Add New</Btn>
      </div>
    </div>
    <Filt {...{ fN, setFN, fV, setFV, fC, setFC, vessels, clients }} />
    <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.bdr}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["No","ID","Name","Rank","Vessel","Client","Join","OwnerPaid","Salary","DEP FEES","Paid Dep (Cum.)","Bal Dep","Manning","Leave Pay","Leave Pay (Acc)","Bank","Acc No","Acc Name","Type","Remark",""].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map(c => (
          <tr key={c.id || c.no} {...trHover}>
            <td style={tdS}>{c.no}</td>
            <td style={tdS}><span style={{ color: C.acc, fontWeight: 600 }}>{c.id}</span></td>
            <td style={tdS}><span style={{ fontWeight: 500 }}>{c.name}</span></td>
            <td style={tdS}>{c.rank}</td>
            <td style={{ ...tdS, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }} title={c.vessel}>{c.vessel || "—"}</td>
            <td style={tdS}>{c.client}</td>
            <td style={tdS}>{c.joinDate || "—"}</td>
            <td style={{ ...tdS, fontWeight: 600, color: C.acc }}>${(c.ownerPaid || 0).toLocaleString()}</td>
            <td style={tdS}>${(c.salary || 0).toLocaleString()}</td>
            <td style={tdS}>${(c.office || 0).toLocaleString()}</td>
            <td style={tdS}>${(c.paidDepFees || 0).toLocaleString()}</td>
            <td style={tdS}>${(c.balanceDepFees || 0).toLocaleString()}</td>
            <td style={tdS}>${(c.manningFees || 0).toLocaleString()}</td>
            <td style={tdS}>${(c.leavePay || 0).toLocaleString()}</td>
            <td style={{ ...tdS, color: C.inf, fontWeight: 500 }}>${(c.accumulatedLeavePay || 0).toLocaleString()}</td>
            <td style={tdS}>{c.bankName || "—"}</td>
            <td style={tdS}>{c.bankAccNo || "—"}</td>
            <td style={tdS}>{c.bankAccName || "—"}</td>
            <td style={{ ...tdS, textTransform: "capitalize" }}>{c.allotmentType || "bank"}</td>
            <td style={{ ...tdS, fontSize: 10, color: C.txD, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }} title={c.remark}>{c.remark || "—"}</td>
            <td style={tdS}><Btn v="ghost" onClick={() => {
              const primaryBank = (c.banks && c.banks.length > 0) ? c.banks[0] : {};
              setForm({
                ...c,
                bankName:    c.bankName    || primaryBank.bankName    || "",
                bankAccNo:   c.bankAccNo   || primaryBank.bankAccNo   || "",
                bankAccName: c.bankAccName || primaryBank.bankAccName || "",
                banks: c.banks || [{ id: "B1", bankName: c.bankName || "", bankAccNo: c.bankAccNo || "", bankAccName: c.bankAccName || "", label: "Primary" }],
              });
              setModal("edit");
            }}>Edit</Btn></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
    {(modal === "add" || modal === "edit") && <Mod title={modal === "add" ? "Add Crew" : "Edit Crew"} onClose={() => setModal(null)}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[["ID","id",true],["Name *","name"],["Rank","rank"],["Vessel","vessel"],["Client","client"],["Join Date","joinDate"],["Owner Paid","ownerPaid"],["Salary","salary"],["Manning Fees — auto","manningFees"],["DEP FEES (Total)","office"],["Paid Dep Fees (Cumulative)","paidDepFees"],["Bal Dep Fees — auto","balanceDepFees"],["Leave Pay / Month","leavePay"],["Leave Pay (Acc.) — auto","accumulatedLeavePay",false,true],["Remark","remark"]].map(([l, k, d, readOnly]) => {
          const isAutoBal = k === "balanceDepFees";
          const isAutoManning = k === "manningFees";
          const isPaidDep = k === "paidDepFees";
          const autoBalance = Math.max(0, (Number(form.office)||0) - (Number(form.paidDepFees)||0));
          const autoManning = Math.max(0, (Number(form.ownerPaid)||0) - (Number(form.salary)||0));
          const displayValue = isAutoBal ? autoBalance
                            : isAutoManning ? autoManning
                            : (form[k] ?? "");
          const effectiveReadOnly = readOnly || isAutoBal || isAutoManning;
          const tooltip = isAutoBal
            ? "Auto-calculated: DEP FEES (Total) − Paid Dep Fees"
            : isAutoManning
            ? "Auto-calculated: Owner Paid − Salary (fixed every month)"
            : isPaidDep
            ? "Cumulative amount crew has paid toward DEP Fees. Initially enter what crew paid before boarding. Auto-increments each month as salary deductions are processed (Mark Paid)."
            : (readOnly ? "Auto-accumulated from payroll deductions. Do not edit manually." : undefined);
          return (
          <div key={k}>
            <label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>{l}</label>
            <input
              value={displayValue}
              disabled={d}
              readOnly={effectiveReadOnly}
              title={tooltip}
              type={["ownerPaid","salary","office","paidDepFees","balanceDepFees","manningFees","leavePay","accumulatedLeavePay"].includes(k) ? "number" : "text"}
              onChange={e => !effectiveReadOnly && setForm({ ...form, [k]: e.target.value })}
              style={{ ...inp, opacity: (d || effectiveReadOnly) ? 0.5 : 1, cursor: effectiveReadOnly ? "not-allowed" : "text",
                color: effectiveReadOnly ? C.inf : C.txt, fontWeight: effectiveReadOnly ? 600 : 400 }}
            />
          </div>
          );
        })}
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
            <Btn v="sec" size="sm" onClick={() => setForm({ ...form, banks: [...(form.banks || []), { id: `B${(form.banks?.length || 0) + 1}`, bankName: "", bankAccNo: "", bankAccName: form.name, label: "" }] })}>+ Add Bank</Btn>
          </div>
          {(form.banks || []).map((b, i) => (
            <div key={b.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1.5fr 80px 30px", gap: 6, marginBottom: 8, alignItems: "end" }}>
              <div><label style={{ fontSize: 9, color: C.txD }}>Bank Name</label><select value={b.bankName || ""} onChange={e => { const nb = [...form.banks]; nb[i].bankName = e.target.value; const upd = { ...form, banks: nb }; if (i === 0) { upd.bankName = e.target.value; } setForm(upd); }} style={{ ...inp, height: 32, fontSize: 11 }}><option value="">Select</option>{["KBZ","AYA","A Bank","CB","MAB","Yoma","Kpay","Aya Pay","Other"].map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>
              <div><label style={{ fontSize: 9, color: C.txD }}>Acc No</label><input value={b.bankAccNo || ""} onChange={e => { const nb = [...form.banks]; nb[i].bankAccNo = e.target.value; const upd = { ...form, banks: nb }; if (i === 0) { upd.bankAccNo = e.target.value; } setForm(upd); }} style={{ ...inp, height: 32, fontSize: 11 }} /></div>
              <div><label style={{ fontSize: 9, color: C.txD }}>Acc Name</label><input value={b.bankAccName || ""} onChange={e => { const nb = [...form.banks]; nb[i].bankAccName = e.target.value; const upd = { ...form, banks: nb }; if (i === 0) { upd.bankAccName = e.target.value; } setForm(upd); }} style={{ ...inp, height: 32, fontSize: 11 }} /></div>
              <div><label style={{ fontSize: 9, color: C.txD }}>Label</label><input value={b.label || ""} placeholder="Primary" onChange={e => { const nb = [...form.banks]; nb[i].label = e.target.value; setForm({ ...form, banks: nb }); }} style={{ ...inp, height: 32, fontSize: 11 }} /></div>
              <Btn v="ghost" size="sm" onClick={() => { const nb = form.banks.filter((_, idx) => idx !== i); setForm({ ...form, banks: nb }); }} style={{ color: C.err, padding: 0 }}>✕</Btn>
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
function BillV({ crew, bills, setBills, showT, clients, fs, fsOk, deleteBill, userRole }) {
  const [sc, setSc] = useState(""); const [mo, setMo] = useState("2026-04"); const [vb, setVb] = useState(null);
  const [confDel, setConfDel] = useState(null);
  const inp = { background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 5, color: C.txt, padding: "6px 9px", fontSize: 11.5, outline: "none" };
  const getDIM = (y, m) => new Date(y, m, 0).getDate();
  const fmtD = (d, m, y) => { const ms = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]; return `${d}.${ms[m-1]}.${y}`; };
  const gen = async () => {
    if (!sc) return;
    let cl = crew.filter(c => c.client === sc);
    if (sc === "Mr.Xing & Mr.Zhong") cl = crew.filter(c => c.client === "XING" || c.client === "MR.ZHONG");
    else if (sc === "CHH (All)") cl = crew.filter(c => c.client && c.client.startsWith("CHH"));
    if (!cl.length) return;
    const [y, m] = mo.split("-").map(Number);
    const dim = getDIM(y, m);
    const bc = cl.map(c => {
      let dob = dim;
      if (c.joinDate) { const jd = new Date(c.joinDate); const ms2 = new Date(y,m-1,1); const me = new Date(y,m-1,dim); if (jd >= ms2 && jd <= me) dob = dim - jd.getDate() + 1; else if (jd > me) dob = 0; }
      const ha = dob === dim ? (c.ownerPaid||0) : Math.round(((c.ownerPaid||0)/dim)*dob*100)/100;
      const actManning = dob === dim ? (c.manningFees||0) : Math.round(((c.manningFees||0)/dim)*dob*100)/100;
      const maxLp = Number(c.leavePay) || 0;  // Leave pay from registry (monthly rate)
      const actLeavePay = dob === dim ? maxLp : Math.round((maxLp/dim)*dob*100)/100;
      const depFeeDed = c.balanceDepFees > 0 ? c.balanceDepFees : 0;
      const netCrewPay = Math.max(0, ha - actManning - actLeavePay - depFeeDed);
      return { ...c, from: fmtD(1,m,y), to: fmtD(dim,m,y), daysOnBoard: dob, daysOfMonth: dim, actualHA: ha, pob:0, bonus:0, pdeFees:0, visaFees:0, workingGear:0, totalPayment: ha, actManning, actLeavePay, depFeeDed, netCrewPay, billRemark: c.remark||"", pobNote: "" };
    }).filter(r => r.daysOnBoard > 0);
    const vName = bc.length > 0 ? (bc.every(c => c.vessel === bc[0].vessel) ? bc[0].vessel : "Multiple Vessels") : "No Vessel";
    const nextBillNum = bills.reduce((max, b) => { const n = parseInt((b.id||"").replace("BILL-",""),10); return n > max ? n : max; }, 0) + 1;
    const bill = { id: `BILL-${String(nextBillNum).padStart(3,"0")}`, client: sc, vessel: vName, month: mo, from: fmtD(1,m,y), to: fmtD(dim,m,y), crew: bc, totalHA: Math.round(bc.reduce((s,c)=>s+c.actualHA,0)*100)/100, total: Math.round(bc.reduce((s,c)=>s+c.totalPayment,0)*100)/100, status: "Draft", date: new Date().toISOString().split("T")[0], bankInfo: { accNo:"840-096-0029-001674-501", accName:"Mahar Unity (Thailand) Company Limited", bankName:"Bangkok Bank", swift:"BKKBTHBK", remark:"Manning fee calculated upon 30 days, no overlap" } };
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
        const tHA = Math.round(nc.reduce((s,c)=>s+(c.actualHA||0),0)*100)/100;
        const tot = Math.round(nc.reduce((s,c)=>s+(c.totalPayment||0),0)*100)/100;
        const updated = { ...b, crew: nc, totalHA: tHA, total: tot };
        if (fsOk) fs.upD("bills", bid, { crew: nc, totalHA: tHA, total: tot });
        return updated;
      });
      return nb;
    });
    setConfDel(null); showT("Crew removed from bill");
  };
  const upL = (bid, cid, field, val) => {
    const ident = String(cid);
    setBills(prev => prev.map(b => {
      if (b.id !== bid) return b;
      const uc = (b.crew||[]).map(c => {
        if (String(c.id||c.name) !== ident) return c;
        const isNum = field !== "billRemark";
        const u = { ...c, [field]: isNum ? (Number(val)||0) : val };
        if (field === "daysOnBoard" || field === "pob" || field === "bonus" || field === "pdeFees" || field === "visaFees" || field === "workingGear" || field === "depFeeDed") {
          if (field === "daysOnBoard") {
            u.actualHA = u.daysOnBoard===u.daysOfMonth?(u.ownerPaid||0):Math.round(((u.ownerPaid||0)/u.daysOfMonth)*u.daysOnBoard*100)/100;
            u.actManning = u.daysOnBoard===u.daysOfMonth?(u.manningFees||0):Math.round(((u.manningFees||0)/u.daysOfMonth)*u.daysOnBoard*100)/100;
            const maxLp = Number(u.leavePay) || 0;  // Leave pay from registry
            u.actLeavePay = u.daysOnBoard===u.daysOfMonth ? maxLp : Math.round((maxLp/u.daysOfMonth)*u.daysOnBoard*100)/100;
          }
          u.totalPayment=Math.max(0,(u.actualHA||0)+(u.bonus||0)+(u.pdeFees||0)+(u.visaFees||0)+(u.workingGear||0)-(u.pob||0));
          u.netCrewPay=Math.max(0,u.totalPayment-(u.actManning||0)-(u.actLeavePay||0)-(u.depFeeDed||0));
        }
        return u;
      });
      const newTHA=Math.round(uc.reduce((s,c)=>s+(c.actualHA||0),0)*100)/100;
      const newTot=Math.round(uc.reduce((s,c)=>s+(c.totalPayment||0),0)*100)/100;
      const updated={ ...b, crew: uc, totalHA: newTHA, total: newTot };
      if (fsOk) fs.upD("bills", bid, { crew: uc, totalHA: newTHA, total: newTot });
      return updated;
    }));
  };
  const exportCSV = (b) => {
    const hdr=['Name','Sign On','Wages/M','From','To','Days Board','Days/M','Actual HA','POB','Bonus','PDE','VISA','WG','Total','Remark'];
    const rows=(b.crew||[]).map(c=>[c.name,c.joinDate||'',c.ownerPaid||0,c.from,c.to,c.daysOnBoard,c.daysOfMonth,(c.actualHA||0).toFixed(2),c.pob||0,c.bonus||0,c.pdeFees||0,c.visaFees||0,c.workingGear||0,(c.totalPayment||0).toFixed(2),c.billRemark||'']);
    const csv=[hdr,...rows].map(r=>r.map(v=>`"${escCSV(v)}"`).join(',')).join('\n');
    const blob=new Blob(["\uFEFF"+csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url;
    const safeName=`${b.id}-${b.client}-${b.month}`.replace(/[^a-zA-Z0-9\- \u1000-\u109F]/g,'_');
    link.download=`${safeName}.csv`; document.body.appendChild(link); link.click();
    setTimeout(()=>{document.body.removeChild(link);URL.revokeObjectURL(url);},100);
  };
  const exportPDF = (b) => { const trs=(b.crew||[]).map((c,i)=>`<tr><td>${i+1}</td><td>${escHTML(c.name)}</td><td>${escHTML(c.joinDate)}</td><td>${escHTML(c.ownerPaid)}</td><td>${escHTML(c.from)}</td><td>${escHTML(c.to)}</td><td style="color:${c.daysOnBoard<c.daysOfMonth?'#F59E0B':'inherit'}">${escHTML(c.daysOnBoard)}</td><td>${escHTML(c.daysOfMonth)}</td><td>${(c.actualHA||0).toFixed(2)}</td><td style="color:${c.pob>0?'#dc2626':'inherit'}">${escHTML(c.pob||0)}</td><td>${escHTML(c.bonus)}</td><td>${escHTML(c.pdeFees)}</td><td>${escHTML(c.visaFees)}</td><td>${escHTML(c.workingGear)}</td><td><b>${(c.totalPayment||0).toFixed(2)}</b></td><td>${escHTML(c.billRemark)}</td></tr>`).join(''); const html=`<!DOCTYPE html><html><head><title>${escHTML(b.id)}</title><style>*{font-family:'Inter',sans-serif;font-size:10px}body{margin:30px}h2{font-size:14px;margin-bottom:12px;color:#2563eb;border-bottom:1px solid #eee;padding-bottom:5px}.info{color:#666;margin-bottom:15px;display:flex;justify-content:space-between}table{border-collapse:collapse;width:100%;margin-bottom:20px}th,td{border:1px solid #e5e7eb;padding:6px 8px}th{background:#f9fafb;text-align:center;font-size:9px;font-weight:700;color:#374151}td{text-align:right}td:nth-child(1),td:nth-child(2),td:nth-child(3){text-align:left}.total td{font-weight:bold;background:#f3f4f6;color:#111827}.bank{margin-top:20px;padding:12px;border:1px solid #e5e7eb;font-size:9.5px;background:#f8fafc;border-radius:6px;line-height:1.6}@media print{body{margin:20px}}</style></head><body>${getLH()}<h2>${escHTML(b.client)} — ${escHTML(b.month)} MONTHLY BILL (${escHTML(b.id)})</h2><div class="info"><span><b>Period:</b> ${escHTML(b.from)} — ${escHTML(b.to)}</span><span><b>Crew:</b> ${(b.crew||[]).length} &nbsp;|&nbsp; <b>Date:</b> ${escHTML(b.date)}</span></div><table><thead><tr><th>#</th><th>Name</th><th>Sign On</th><th>Wages/M</th><th>From</th><th>To</th><th>Days Board</th><th>Days/M</th><th>Actual HA</th><th>POB(-)</th><th>Bonus</th><th>PDE</th><th>VISA</th><th>WG</th><th>Total</th><th>Remark</th></tr></thead><tbody>${trs}</tbody><tfoot><tr class="total"><td colspan="14" style="text-align:right">TOTAL USD</td><td>${(b.total||0).toFixed(2)}</td><td></td></tr></tfoot></table><div class="bank"><b>BANK REMITTANCE DETAILS:</b><br/>Account No: ${escHTML(b.bankInfo?.accNo)} | Account Name: ${escHTML(b.bankInfo?.accName)} | Bank: ${escHTML(b.bankInfo?.bankName)} | SWIFT: <b>${escHTML(b.bankInfo?.swift)}</b><br/>REMARK: ${escHTML(b.bankInfo?.remark||"Manning fee calculated upon 30 days, no overlap")}</div></body></html>`; const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),400); };
  return <div>
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}>
      <h4 style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600 }}>Generate Monthly Bill</h4>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Client</label><select value={sc} onChange={e => setSc(e.target.value)} style={inp}><option value="">Select</option><option value="Mr.Xing & Mr.Zhong">Mr.Xing & Mr.Zhong</option><option value="CHH (All)">CHH (All)</option>{clients.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>Month</label><div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}><input type="month" value={mo} onChange={e => setMo(e.target.value)} onClick={e => { try { e.target.showPicker() } catch(err){} }} style={{...inp, paddingRight: 24, cursor: "pointer"}} /><span style={{ position: "absolute", right: 8, pointerEvents: "none", color: C.txM, fontSize: 9 }}>▼</span></div></div>
        <Btn onClick={gen} disabled={!sc}>Generate</Btn>
      </div>
    </div>
    {!bills.length ? <div style={{ textAlign: "center", padding: 30, color: C.txD }}>No bills yet.</div> : bills.slice().reverse().map(b => (
      <div key={b.id} style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, color: C.acc, fontSize: 13 }}>{b.id}</span>
            <Badge t={b.status} c={b.status === "Paid" ? "green" : b.status === "Sent" ? "blue" : "yellow"} />
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {b.status === "Draft" && <Btn v="pri" onClick={() => setSt(b.id, "Sent")}>Send</Btn>}
            {b.status === "Sent" && <Btn v="wrn" onClick={() => setSt(b.id, "Draft")}>Revise</Btn>}
            <Btn v="ghost" onClick={() => exportCSV(b)} s={{ fontSize: 11 }}>📊 Download Excel</Btn>
            <Btn v="ghost" onClick={() => exportPDF(b)} s={{ fontSize: 11 }}>📄 PDF Version</Btn>
            <Btn v="sec" onClick={() => setVb(vb === b.id ? null : b.id)}>{vb === b.id ? "Hide" : "Details"}</Btn>
            {userRole === "admin" && <Btn v="err" onClick={() => deleteBill(b.id)} s={{ fontSize: 11 }}>🗑️ Delete</Btn>}
          </div>
        </div>
        <div style={{ background: C.bg, borderRadius: 6, padding: "8px 12px", border: `1px solid ${C.bdr}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.acc, marginBottom: 4 }}>{b.client} {(b.month||"").split("-").reverse().join("'")} BILL</div>
          <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.txM, flexWrap: "wrap" }}>
            <span>Period: <b style={{ color: C.txt }}>{b.from} — {b.to}</b></span>
            <span>Crew: <b style={{ color: C.txt }}>{(b.crew||[]).length}</b></span>
            <span>Total: <b style={{ color: C.ok, fontSize: 12.5 }}>${(b.total||0).toLocaleString(undefined,{minimumFractionDigits:2})} USD</b></span>
          </div>
        </div>
        {vb === b.id && (
          <div style={{ overflowX: "auto", borderRadius: 5, border: `1px solid ${C.bdr}`, marginTop: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
              <thead>
                <tr>
                  {b.status === "Draft" && <th style={{ ...thS, width: 30 }}></th>}
                  {["Name","Sign On Date","Wages/M","From","To","Days on Board","Days of Month","Actual HA","POB(-)","Bonus","PDE Fees","VISA","WG","Owner Total","Manning(-)","Leave(-)","DepFee(-)","Crew Net","Remark"].map(h => <th key={h} style={{ ...thS, fontSize: 9, padding: "6px 4px", background: ["Manning(-)","Leave(-)","DepFee(-)","Crew Net","POB(-)"].includes(h) ? "#f1f5f9" : undefined }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(b.crew||[]).map((c, i) => (
                  <tr key={c.id || i} {...trHover}>
                    {b.status === "Draft" && (<td style={{ ...tdS, textAlign: "center", padding: "2px 4px" }}><Btn v="ghost" onClick={(e) => { e.stopPropagation(); remC(b.id, c.id||c.name, c.name); }} s={{ color: C.wrn, padding: "2px 5px", fontSize: 11, minWidth: "auto" }}>✕</Btn></td>)}
                    <td style={{ ...tdS, fontWeight: 500 }}>{c.name}</td>
                    <td style={tdS}>{c.joinDate || "—"}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{(c.ownerPaid||0).toLocaleString()}</td>
                    <td style={tdS}>{c.from||b.from}</td>
                    <td style={tdS}>{c.to||b.to}</td>
                    {b.status === "Draft" ? (<>
                      <td style={tdS}><input type="number" min="0" max={c.daysOfMonth} value={c.daysOnBoard??""} onChange={e=>upL(b.id,c.id||c.name,"daysOnBoard",e.target.value)} style={{...fi,color:c.daysOnBoard<c.daysOfMonth?C.wrn:C.txt,fontWeight:c.daysOnBoard<c.daysOfMonth?700:400,width:45}}/></td>
                      <td style={{...tdS,textAlign:"center"}}>{c.daysOfMonth}</td>
                      <td style={{...tdS,textAlign:"right",fontWeight:600,color:C.inf}}>{(c.actualHA||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td style={tdS}><input type="number" value={c.pob||""} onChange={e=>upL(b.id,c.id||c.name,"pob",e.target.value)} style={fi} placeholder="0"/></td>
                      <td style={tdS}><input type="number" value={c.bonus||""} onChange={e=>upL(b.id,c.id||c.name,"bonus",e.target.value)} style={fi} placeholder="0"/></td>
                      <td style={tdS}><input type="number" value={c.pdeFees||""} onChange={e=>upL(b.id,c.id||c.name,"pdeFees",e.target.value)} style={fi} placeholder="0"/></td>
                      <td style={tdS}><input type="number" value={c.visaFees||""} onChange={e=>upL(b.id,c.id||c.name,"visaFees",e.target.value)} style={fi} placeholder="0"/></td>
                      <td style={tdS}><input type="number" value={c.workingGear||""} onChange={e=>upL(b.id,c.id||c.name,"workingGear",e.target.value)} style={fi} placeholder="0"/></td>
                      <td style={{...tdS,fontWeight:700,textAlign:"right",color:C.acc}}>{(c.totalPayment||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td style={{...tdS,textAlign:"right",color:C.err}}>{(c.actManning||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td style={{...tdS,textAlign:"right",color:C.err}}>{(c.actLeavePay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td style={tdS}><input type="number" value={c.depFeeDed||""} onChange={e=>upL(b.id,c.id||c.name,"depFeeDed",e.target.value)} style={{...fi,color:C.err}} placeholder="0"/></td>
                      <td style={{...tdS,fontWeight:700,textAlign:"right",color:C.ok}}>{(c.netCrewPay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td style={tdS}><input value={c.billRemark||""} onChange={e=>upL(b.id,c.id||c.name,"billRemark",e.target.value)} style={{...fi,width:90,textAlign:"left"}} placeholder="—"/></td>
                    </>) : (<>
                      <td style={{...tdS,textAlign:"center",color:c.daysOnBoard<c.daysOfMonth?C.wrn:C.txt,fontWeight:c.daysOnBoard<c.daysOfMonth?700:400}}>{c.daysOnBoard}</td>
                      <td style={{...tdS,textAlign:"center"}}>{c.daysOfMonth}</td>
                      <td style={{...tdS,textAlign:"right",fontWeight:600}}>{(c.actualHA||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td style={{...tdS,textAlign:"right"}}>{c.pob||"—"}</td>
                      <td style={{...tdS,textAlign:"right"}}>{c.bonus||"—"}</td>
                      <td style={{...tdS,textAlign:"right"}}>{c.pdeFees||"—"}</td>
                      <td style={{...tdS,textAlign:"right"}}>{c.visaFees||"—"}</td>
                      <td style={{...tdS,textAlign:"right"}}>{c.workingGear||"—"}</td>
                      <td style={{...tdS,fontWeight:700,textAlign:"right",color:C.acc}}>{(c.totalPayment||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td style={{...tdS,textAlign:"right",color:C.err}}>{(c.actManning||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td style={{...tdS,textAlign:"right",color:C.err}}>{(c.actLeavePay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td style={{...tdS,textAlign:"right",color:C.err}}>{c.depFeeDed||"—"}</td>
                      <td style={{...tdS,fontWeight:700,textAlign:"right",color:C.ok}}>{(c.netCrewPay||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                      <td style={{...tdS,fontSize:10,color:C.txD}}>{c.billRemark||"—"}</td>
                    </>)}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: C.bg }}>
                  <td colSpan={b.status==="Draft"?8:7} style={{...tdS,textAlign:"right",fontWeight:700}}>TOTAL</td>
                  <td style={{...tdS,textAlign:"right",fontWeight:700,color:C.acc}}>{(b.totalHA||b.total||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  <td colSpan={5}></td>
                  <td style={{...tdS,textAlign:"right",fontWeight:700,fontSize:11,color:C.acc}}>{(b.total||0).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  <td colSpan={3}></td>
                  <td style={{...tdS,textAlign:"right",fontWeight:700,fontSize:12,color:C.ok}}>{((b.crew||[]).reduce((sum,c)=>sum+(c.netCrewPay||0),0)).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {vb === b.id && b.bankInfo && (
          <div style={{ background: C.bg, borderRadius: 5, padding: 12, border: `1px solid ${C.bdr}`, marginTop: 8, fontSize: 10.5 }}>
            <div style={{ fontWeight: 600, color: C.txM, marginBottom: 8 }}>BANK REMITTANCE {b.status === "Draft" && <span style={{ color: C.inf, fontWeight: 400, marginLeft: 8 }}>(Editable in Draft)</span>}</div>
            {b.status === "Draft" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                {[["Account No","accNo"],["Account Name","accName"],["Bank Name","bankName"],["SWIFT","swift"]].map(([l,k]) => (
                  <div key={k}><label style={{ display: "block", fontSize: 9, color: C.txD, marginBottom: 2 }}>{l}</label><input value={b.bankInfo[k]} onChange={e => upB(b.id, k, e.target.value)} style={{ ...fi, width: "100%", textAlign: "left", boxSizing: "border-box" }} /></div>
                ))}
                <div style={{ gridColumn: "1/-1" }}><label style={{ display: "block", fontSize: 9, color: C.txD, marginBottom: 2 }}>Remark</label><input value={b.bankInfo.remark} onChange={e => upB(b.id, "remark", e.target.value)} style={{ ...fi, width: "100%", textAlign: "left", boxSizing: "border-box" }} /></div>
              </div>
            ) : (
              <>
                <div>Acc: {b.bankInfo.accNo} | {b.bankInfo.accName} | {b.bankInfo.bankName} | SWIFT: <b>{b.bankInfo.swift}</b></div>
                <div style={{ color: C.txD, marginTop: 4 }}>REMARK: {b.bankInfo.remark || "Manning fee calculated upon 30 days, no overlap"}</div>
              </>
            )}
          </div>
        )}
      </div>
    ))}
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
    const file = e.target.files[0]; if (!file) return;
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
      const nums = text.match(/\d+[.,]?\d*/g);
      let foundMatch = false; let highestVal = 0;
      if (nums) { for (let str of nums) { const val = parseFloat(str.replace(/,/g,"")); if (!isNaN(val)) { if (val > highestVal) highestVal = val; if (Math.abs(val - targetAmt) < 0.01) { foundMatch = true; break; } } } }
      if (foundMatch) { setPf(prev => ({ ...prev, amount: String(targetAmt) })); setOcrMsg("✅ OCR Verified: Matching amount found in slip."); showT("OCR Match found!"); }
      else { setOcrMsg(`❌ OCR Warning: Mismatch. Expected $${targetAmt.toLocaleString()}, largest number found was $${highestVal.toLocaleString()}.`); showT("OCR Amount Mismatch", "wrn"); }
    } catch (err) { setOcrMsg("⚠️ OCR Error: Failed to process image."); }
    setOcrLd(false);
  };
  const rec = async () => {
    const bill = bills.find(b => b.id === pf.billId); if (!bill) return;
    const amt = Number(pf.amount); const diff = amt - bill.total;
    const nextPayNum = payments.reduce((max, p) => { const n = parseInt((p.id||"").replace("PAY-",""),10); return n > max ? n : max; }, 0) + 1;
    const pay = { id: `PAY-${String(nextPayNum).padStart(3,"0")}`, billId: bill.id, client: bill.client, amount: amt, ref: pf.ref, date: pf.date, match: Math.abs(diff) < 0.01, diff, slipUrl: pf.slipUrl };
    setPayments([...payments, pay]); if (fsOk) fs.setD("payments", pay.id, pay);
    if (Math.abs(diff) < 0.01) {
      setBills(bills.map(b => b.id === bill.id ? { ...b, status: "Paid" } : b));
      if (fsOk) fs.upD("bills", bill.id, { status: "Paid" });
      setRes({ ok: true, msg: `Matches ${bill.id}. PAID.` }); showT("Matched!");
      await genPayrollFromBill(bill, pay.slipUrl);
    } else { setRes({ ok: false, msg: `Mismatch on ${bill.id}.`, diff }); showT("Mismatch", "wrn"); }
    setPf({ billId: "", amount: "", ref: "", date: new Date().toISOString().split("T")[0], slipUrl: "" }); setOcrMsg("");
  };
  return <div>
    <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 14, marginBottom: 14 }}>
      <h4 style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600 }}>Record Payment & Bank Slip Verification</h4>
      {!sent.length ? <div style={{ color: C.txD, fontSize: 11.5 }}>No outstanding (Sent) bills.</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>1. Select Bill</label><select value={pf.billId} onChange={e => { const b=bills.find(x=>x.id===e.target.value); setPf({...pf,billId:e.target.value,amount:b?String(b.total):""}); setOcrMsg(""); }} style={inp}><option value="">Select</option>{sent.map(b=><option key={b.id} value={b.id}>{b.id}-{b.client}</option>)}</select></div>
          <div><label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 3 }}>2. Upload Bank Slip for OCR Validation</label><input type="file" accept="image/*" onChange={handleOcr} style={{...inp,flex:1}} disabled={!pf.billId||ocrLd} /></div>
          {pf.slipUrl && <div style={{ gridColumn:"1/-1", marginBottom: 8 }}><div style={{ fontSize: 10, color: C.txM, marginBottom: 4 }}>Slip Preview:</div><img src={pf.slipUrl} alt="Slip Preview" style={{ maxWidth:"100%", maxHeight:200, borderRadius:6, border:`1px solid ${C.bdr}`, cursor:"pointer" }} onClick={() => window.open(pf.slipUrl,"_blank")} /></div>}
          {ocrMsg && <div style={{ gridColumn:"1/-1", fontSize:11, padding:8, borderRadius:5, background:ocrMsg.includes("✅")?C.okB:(ocrMsg.includes("❌")?C.wrnB:C.bg), color:ocrMsg.includes("✅")?C.ok:(ocrMsg.includes("❌")?C.wrn:C.txM), border:`1px solid ${ocrMsg.includes("✅")?C.ok:(ocrMsg.includes("❌")?C.wrn:C.bdr)}` }}>{ocrLd?(upLd?"Uploading Attachment...":"Scanning Image..."):ocrMsg}</div>}
          <div><label style={{ fontSize:10, color:C.txM, display:"block", marginBottom:3 }}>3. Amount</label><input type="number" value={pf.amount} onChange={e=>setPf({...pf,amount:e.target.value})} style={inp}/></div>
          <div><label style={{ fontSize:10, color:C.txM, display:"block", marginBottom:3 }}>Ref</label><input value={pf.ref} onChange={e=>setPf({...pf,ref:e.target.value})} style={inp}/></div>
          <div><label style={{ fontSize:10, color:C.txM, display:"block", marginBottom:3 }}>Date</label><input type="date" value={pf.date} onChange={e=>setPf({...pf,date:e.target.value})} style={inp}/></div>
          <div style={{ gridColumn:"1/-1", marginTop:8 }}><Btn onClick={rec} disabled={!pf.billId||!pf.amount||upLd}>Reconcile & Generate Payroll</Btn></div>
        </div>
      )}
    </div>
    {res && <div style={{ background:res.ok?C.okB:C.wrnB, border:`1px solid ${res.ok?C.ok:C.wrn}33`, borderRadius:7, padding:12, marginBottom:14 }}>
      <div style={{ fontWeight:600, color:res.ok?C.ok:C.wrn }}>{res.ok?"MATCH":"MISMATCH"} - {res.msg}</div>
      {res.diff != null && !res.ok && (<><div style={{ fontWeight:700, color:C.wrn, marginTop:3 }}>Difference: ${Math.abs(res.diff).toLocaleString()}</div><div style={{ fontSize:10, color:C.txD, marginTop:6, lineHeight:1.4 }}><b>Tip:</b> If the owner intentionally paid a different amount, please <b>Revise</b> the bill to match before reconciling.</div></>)}
    </div>}
    {payments.length > 0 && <div style={{ overflowX:"auto", borderRadius:6, border:`1px solid ${C.bdr}` }}><table style={{ width:"100%", borderCollapse:"collapse" }}><thead><tr>{["ID","Bill","Client","Amount","Ref","Date","Status","Slip"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{payments.slice().reverse().map(p=><tr key={p.id} {...trHover}><td style={tdS}><span style={{ fontWeight:600, color:C.acc }}>{p.id}</span></td><td style={tdS}>{p.billId}</td><td style={tdS}>{p.client}</td><td style={tdS}>${(p.amount||0).toLocaleString()}</td><td style={tdS}>{p.ref}</td><td style={tdS}>{p.date}</td><td style={tdS}><Badge t={p.match?"Matched":"Mismatch"} c={p.match?"green":"red"}/></td><td style={tdS}>{p.slipUrl?<Btn v="ghost" onClick={()=>window.open(p.slipUrl,"_blank")} s={{fontSize:10,padding:"2px 6px"}}>👁️ View</Btn>:"—"}</td></tr>)}</tbody></table></div>}
  </div>;
}

// ============== DISTRIBUTION HUB ==============
function DistV({ crew, slips, crewPay, setCrewPay, showT, fs, fsOk, userRole, payments, bills, genPayrollFromBill, onManualPayment, markProcessed, markPaid, approve, printPayslip, selectedMonth, fsUploadFile }) {
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
    onManualPayment({ crewId: c.id, crewName: c.name, total: Number(manualData.amount), vessel: manualData.vessel || c.vessel, bankName: c.bankName, bankAccNo: c.bankAccNo, bankAccName: c.bankAccName, month: selectedMonth });
    setManualModalOpen(false); setManualData({ crewId: "", amount: "", vessel: "", remark: "" });
  };

  const awaitingApproval = crewPay.filter(p => p.status === "Pending");
  const isCorrectMonth = (m) => !m || !selectedMonth || m === selectedMonth || m.includes(selectedMonth) || selectedMonth.includes(m);
  const approvedPayments = crewPay.filter(p => p.status === "Approved");
  const processedPayments = crewPay.filter(p => p.status === "Processed");

  // ── Edit payroll modal state ──────────────────────────────────────────
  const [editingPayroll, setEditingPayroll] = useState(null); // payroll record being edited
  const [editForm, setEditForm] = useState({});

  const openEditPayroll = (p) => {
    setEditForm({
      // Editable earnings
      salary:      p.salary      || 0,
      actualHA:    p.actualHA    || 0,
      bonus:       p.bonus       || 0,
      pdeFees:     p.pdeFees     || 0,
      visaFees:    p.visaFees    || 0,
      workingGear: p.workingGear || 0,
      actLeavePay: p.actLeavePay || p.leavePay || 0,   // bill pro-rated first, fallback to registry
      accumulatedLeavePay: p.accumulatedLeavePay || 0,
      leavePayRefunded: p.leavePayRefunded || 0,
      // Editable deductions
      office:        p.office        || 0,
      paidDepFees:   p.paidDepFees   || 0,
      balanceDepFees:p.balanceDepFees|| 0,
      depFeeDed:     p.depFeeDed     || 0,
      // Adjustment fields
      total:       p.total      || 0,
      bankCharge:  p.bankCharge || 0,
      otherDed:    p.otherDed   || 0,
      extraBonus:  p.extraBonus || 0,
      remark:      p.remark     || "",
      bankName:    p.bankName    || "",
      bankAccNo:   p.bankAccNo   || "",
      bankAccName: p.bankAccName || "",
    });
    setEditingPayroll(p);
  };

  const saveAndSubmit = async () => {
    if (!editingPayroll) return;
    // Compute auto net from earnings − deductions (mirrors UI)
    const earnSum = Number(editForm.salary||0) + Number(editForm.bonus||0) + Number(editForm.pdeFees||0)
                  + Number(editForm.visaFees||0) + Number(editForm.workingGear||0) + Number(editForm.leavePayRefunded||0);
    const dedSum  = Number(editForm.depFeeDed||0) + Number(editForm.actLeavePay||0);
    const autoNet = earnSum - dedSum;
    const netTotal = Math.max(0, autoNet + Number(editForm.extraBonus||0)
      - Number(editForm.bankCharge||0) - Number(editForm.otherDed||0));
    const up = {
      // Earnings
      salary:       Number(editForm.salary),
      actualHA:     Number(editForm.actualHA),
      bonus:        Number(editForm.bonus),
      pdeFees:      Number(editForm.pdeFees),
      visaFees:     Number(editForm.visaFees),
      workingGear:  Number(editForm.workingGear),
      actLeavePay:  Number(editForm.actLeavePay),
      accumulatedLeavePay: Number(editForm.accumulatedLeavePay),
      leavePayRefunded: Number(editForm.leavePayRefunded||0),
      // Deductions
      office:        Number(editForm.office),
      paidDepFees:   Number(editForm.paidDepFees),
      balanceDepFees:Number(editForm.balanceDepFees),
      depFeeDed:     Number(editForm.depFeeDed),
      // Adjustments & final
      total:        netTotal,
      grossTotal:   autoNet,
      netCrewPay:   autoNet,
      bankCharge:   Number(editForm.bankCharge),
      otherDed:     Number(editForm.otherDed),
      extraBonus:   Number(editForm.extraBonus||0),
      remark:       editForm.remark,
      bankName:     editForm.bankName,
      bankAccNo:    editForm.bankAccNo,
      bankAccName:  editForm.bankAccName,
      status:       "ReadyForApproval",
      submittedAt:  new Date().toISOString(),
    };
    setCrewPay(prev => prev.map(x => x.id === editingPayroll.id ? { ...x, ...up } : x));
    if (fsOk) await fs.upD("crewPayments", editingPayroll.id, up);
    setEditingPayroll(null);
    showT(`${editingPayroll.crewName} — submitted for approval ✓`);
  };

  const readyForApproval = crewPay.filter(p => p.status === "ReadyForApproval");
  const payrolls = useMemo(() => {
    const groups = {};
    crewPay.filter(p => ["ReadyForApproval","Approved","Processed","Paid"].includes(p.status)).forEach(p => {
      const gKey = p.slipId || "AD-HOC";
      const bill = bills.find(b => b.id === p.slipId);
      // If bill exists, only include crew that are actually in the bill
      if (bill) {
        const billCrewIds = new Set((bill.crew || []).map(c => String(c.id || c.crewId)));
        if (!billCrewIds.has(String(p.crewId))) return; // skip crew not in this bill
      }
      if (!groups[gKey]) {
        groups[gKey] = {
          bill: bill || { id: gKey, client: p.client || p.vessel || "Ad-Hoc", month: p.month, vessel: p.vessel },
          payments: [],
          clientName: bill ? bill.client : (p.client || p.vessel || "Ad-Hoc"),
          totalInBill: bill ? (bill.crew || []).length : 0,
        };
      }
      groups[gKey].payments.push(p);
    });
    return Object.values(groups);
  }, [crewPay, bills]);
  const paidPayments = crewPay.filter(p => p.status === "Paid" && isCorrectMonth(p.month));

  return (
    <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.bdr}`, padding: 20, marginBottom: 15 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Payment Distribution Hub</h2>
        <Btn onClick={() => setManualModalOpen(true)}>➕ Manual Payment</Btn>
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.bdr}`, gap: 20, marginBottom: 20, overflowX:"auto" }}>
        {["edit","approval","dist","verify","history"].map(t => (
          <button key={t} onClick={() => setHubTab(t)} style={{ paddingBottom: 10, border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace:"nowrap", color: tab===t?C.pri:C.txD, borderBottom: tab===t?`2px solid ${C.pri}`:"none", transition: "color 0.15s" }}>
            {t==="edit"?"✏️ Edit & Submit":t==="approval"?"Admin Approval":t==="dist"?"Distribution":t==="verify"?"Verification":"Paid History"}
            <Badge
              t={t==="edit"?awaitingApproval.length:t==="approval"?readyForApproval.length:t==="dist"?approvedPayments.length:t==="verify"?processedPayments.length:paidPayments.length}
              c={t==="history"?"green":t==="verify"?"indigo":t==="dist"?"orange":t==="approval"?"purple":"blue"}
              s={{marginLeft:6}}
            />
          </button>
        ))}
      </div>

      {/* ── EDIT & SUBMIT TAB (Accountant) ── */}
      {tab === "edit" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:15 }}>
            <h3 style={{ fontSize:14, margin:0 }}>Edit Payroll — Pending Records</h3>
            <span style={{ fontSize:11, color:C.txD }}>Accountant edits amount, bank charges & deductions, then submits to Admin</span>
          </div>
          {!awaitingApproval.length
            ? <div style={{ textAlign:"center", padding:40, color:C.txD }}>
                <div style={{ fontSize:32, marginBottom:10 }}>✓</div>
                <div>No pending payroll records</div>
              </div>
            : <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr>{["Crew","Vessel","Bill Ref","Auto Amount","Bank","Action"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                  <tbody>{awaitingApproval.map(p => (
                    <tr key={p.id} {...trHover}>
                      <td style={tdS}><b>{p.crewName}</b><br/><small style={{color:C.txD}}>{p.rank}</small></td>
                      <td style={tdS}>{p.vessel || "—"}</td>
                      <td style={{...tdS, fontSize:10, color:C.txD}}>{p.slipId}</td>
                      <td style={{...tdS, fontWeight:700, color:C.acc}}>${(p.total||0).toLocaleString()}</td>
                      <td style={tdS}><span style={{fontSize:10}}>{p.bankName || "—"}<br/>{p.bankAccNo || ""}</span></td>
                      <td style={tdS}>
                        <Btn v="sec" s={{fontSize:10}} onClick={() => openEditPayroll(p)}>✏️ Edit &amp; Submit</Btn>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
          }
        </div>
      )}

      {/* ── ADMIN APPROVAL TAB ── */}
      {tab === "approval" && (
        <div>
          <h3 style={{ fontSize: 14, margin: "0 0 15px" }}>Admin Approval Queue</h3>
          {!readyForApproval.length
            ? <p style={{ textAlign:"center", padding:30, color:C.txD }}>No payroll submitted by Accountant yet</p>
            : <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead><tr>{["Crew","Vessel","Gross","Bank Chg","Ded.","Bonus","Net Total","Bank","Remark","Action"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                  <tbody>{readyForApproval.map(p => (
                    <tr key={p.id} {...trHover}>
                      <td style={tdS}><b>{p.crewName}</b><br/><small style={{color:C.txD}}>{p.rank}</small></td>
                      <td style={tdS}>{p.vessel}</td>
                      <td style={{...tdS,color:C.txM}}>${(p.grossTotal||p.total||0).toLocaleString()}</td>
                      <td style={{...tdS,color:C.err}}>-${(p.bankCharge||0).toLocaleString()}</td>
                      <td style={{...tdS,color:C.err}}>-${(p.otherDed||0).toLocaleString()}</td>
                      <td style={{...tdS,color:C.ok}}>+${(p.bonus||0).toLocaleString()}</td>
                      <td style={{...tdS,fontWeight:700,color:C.acc}}>${(p.total||0).toLocaleString()}</td>
                      <td style={{...tdS,fontSize:10}}>{p.bankName}<br/>{p.bankAccNo}</td>
                      <td style={{...tdS,fontSize:10,color:C.txD,maxWidth:100}}>{p.remark||"—"}</td>
                      <td style={tdS}>
                        {userRole==="admin"
                          ? <Btn v="ok" s={{fontSize:10}} onClick={()=>approve(p.id)}>Approve</Btn>
                          : <Badge t="Admin only" c="orange"/>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
          }
        </div>
      )}

      {tab === "dist" && (
        <div>
          <h3 style={{ fontSize:14, marginBottom:15 }}>Distribution (Approved)</h3>
          {!approvedPayments.length ? <p style={{ textAlign:"center", padding:30, color:C.txD }}>Nothing to distribute.</p> : (
            <div style={{ overflowX:"auto" }}><table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["Crew","Amount","Method","Actions"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{approvedPayments.map(p=>(
                <tr key={p.id} {...trHover}>
                  <td style={tdS}><b>{p.crewName}</b></td>
                  <td style={{...tdS,fontWeight:700,color:C.acc}}>${(p.total||0).toLocaleString()}</td>
                  <td style={tdS}>{p.type==="bank"?`${p.bankName} (${p.bankAccNo})`:"Cash Pickup"}</td>
                  <td style={tdS}><div style={{ display:"flex", gap:6 }}>
                    <Btn v="sec" s={{fontSize:9}} onClick={()=>printPayslip(p, rate)}>🖨️ Slip</Btn>
                    {!p.isSplit && <Btn v="ghost" s={{fontSize:9}} onClick={()=>{ const c=crew.find(cr=>String(cr.id)===String(p.crewId))||{}; const banks=c.banks&&c.banks.length>0?c.banks:[{bankName:c.bankName,bankAccNo:c.bankAccNo,bankAccName:c.bankAccName,label:"Primary"}]; setSplitRows(banks.map((b,i)=>({...b,amount:i===0?p.total:0}))); setSplitT(p); }}>✂️ Split</Btn>}
                    <Btn s={{fontSize:9}} onClick={()=>markProcessed(p.id)}>Process Done</Btn>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {tab === "verify" && (
        <div>
          <h3 style={{ fontSize:14, marginBottom:15 }}>Verification (Signed Slips)</h3>
          {!processedPayments.length ? <p style={{ textAlign:"center", padding:30, color:C.txD }}>No slips to verify.</p> : (
            <div style={{ overflowX:"auto" }}><table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["Crew","Amount","Signed Slip","Action"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{processedPayments.map(p=>(
                <tr key={p.id} {...trHover}>
                  <td style={tdS}>{p.crewName}<br/><small style={{color:C.txD}}>{p.rank}</small></td>
                  <td style={{...tdS,fontWeight:700}}>${(p.total||0).toLocaleString()}</td>
                  <td style={tdS}>
                    {p.signedSlipUrl
                      ? <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <a href={p.signedSlipUrl} target="_blank" rel="noreferrer" style={{color:C.pri,fontSize:10}}>👁️ View Slip</a>
                          <span style={{fontSize:9,color:C.ok}}>✓ Uploaded</span>
                        </div>
                      : <span style={{fontSize:10,color:C.wrn}}>⚠ Missing</span>}
                  </td>
                  <td style={tdS}>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      {/* File upload button */}
                      {!p.signedSlipUrl && (
                        <label style={{
                          fontSize:9, padding:"4px 8px", borderRadius:5, cursor:"pointer",
                          background:`${C.inf}15`, border:`1px solid ${C.inf}40`, color:C.inf,
                          fontWeight:600, display:"inline-flex", alignItems:"center", gap:4,
                        }}>
                          📎 Upload Slip
                          <input type="file" accept="image/*,application/pdf" style={{display:"none"}}
                            onChange={async(e)=>{
                              const file=e.target.files[0]; if(!file) return;
                              showT("Uploading...","wrn");
                              try{
                                const url = await fsUploadFile(file,`signedSlips/${p.id}_${Date.now()}_${file.name}`);
                                if(url){ await markProcessed(p.id, url); showT("Signed slip uploaded ✓"); }
                                else showT("Upload failed","err");
                              }catch(err){ showT("Upload failed","err"); }
                            }}
                          />
                        </label>
                      )}
                      {/* Replace slip button if already uploaded */}
                      {p.signedSlipUrl && (
                        <label style={{
                          fontSize:9, padding:"4px 8px", borderRadius:5, cursor:"pointer",
                          background:`${C.txD}0a`, border:`1px solid ${C.bdr}`, color:C.txM,
                          fontWeight:600, display:"inline-flex", alignItems:"center", gap:4,
                        }}>
                          🔄 Replace
                          <input type="file" accept="image/*,application/pdf" style={{display:"none"}}
                            onChange={async(e)=>{
                              const file=e.target.files[0]; if(!file) return;
                              showT("Uploading...","wrn");
                              try{
                                const url = await fsUploadFile(file,`signedSlips/${p.id}_${Date.now()}_${file.name}`);
                                if(url){ await markProcessed(p.id, url); showT("Slip replaced ✓"); }
                                else showT("Upload failed","err");
                              }catch(err){ showT("Upload failed","err"); }
                            }}
                          />
                        </label>
                      )}
                      {/* Admin: Mark Paid */}
                      {userRole==="admin" && p.signedSlipUrl &&
                        <Btn v="ok" s={{fontSize:9}} onClick={()=>markPaid(p.id)}>✓ Mark Paid</Btn>}
                      {userRole!=="admin" && p.signedSlipUrl &&
                        <span style={{fontSize:9,color:C.txD}}>Waiting for admin</span>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div>
          <h3 style={{ fontSize:14, marginBottom:15 }}>Payment History</h3>
          {!paidPayments.length ? <p style={{ textAlign:"center", padding:30, color:C.txD }}>No history found.</p> : (
            <div style={{ overflowX:"auto" }}><table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["Crew Name","Amount","Paid Date"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{paidPayments.slice().reverse().map(p=>(
                <tr key={p.id} {...trHover}><td style={tdS}>{p.crewName}</td><td style={tdS}>${(p.total||0).toLocaleString()}</td><td style={tdS}>{p.paidAt?new Date(p.paidAt).toLocaleDateString():"—"}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {/* ── EDIT PAYROLL MODAL ── */}
      {editingPayroll && (
        <Mod title={`Edit & Submit Payroll — ${editingPayroll.crewName}`} onClose={() => setEditingPayroll(null)} w={620}>

          {/* Header info bar */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14, padding:"10px 12px", background:`${C.inf}0d`, borderRadius:8, border:`1px solid ${C.inf}25` }}>
            {[
              ["Bill Ref",    editingPayroll.slipId],
              ["Vessel",      editingPayroll.vessel  || "—"],
              ["Period",      editingPayroll.billFrom ? `${editingPayroll.billFrom} → ${editingPayroll.billTo}` : "—"],
              ["Days on Board", editingPayroll.daysOnBoard ? `${editingPayroll.daysOnBoard} / ${editingPayroll.daysOfMonth} days` : "—"],
            ].map(([l,v]) => (
              <div key={l}>
                <div style={{ fontSize:9, color:C.txD, marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:11, fontWeight:600, color:C.txt }}>{v}</div>
              </div>
            ))}
          </div>

          {/* ── EARNINGS (editable) ── */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.ok, letterSpacing:"0.8px", marginBottom:8 }}>EARNINGS — Crew Receives <span style={{fontWeight:400, color:C.txD}}>(editable)</span></div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {[
                ["Basic Salary",          "salary",             C.txt],
                ["Bonus",                 "bonus",              C.ok],
                ["PDE Fees",              "pdeFees",            C.ok],
                ["Visa Fees",             "visaFees",           C.ok],
                ["Working Gear",          "workingGear",        C.ok],
                ["Leave Pay (Refunded)",  "leavePayRefunded",   C.ok],
              ].map(([l, key, color]) => (
                <div key={key}>
                  <label style={{ fontSize:9, color:C.txD, display:"block", marginBottom:3 }}>{l}</label>
                  <input
                    type="number"
                    value={editForm[key] ?? 0}
                    onChange={e => setEditForm(f => ({...f, [key]: e.target.value}))}
                    style={{
                      width:"100%", background:C.bg,
                      border:`1px solid ${C.bdr}`, borderRadius:6,
                      color, padding:"6px 8px", fontSize:12,
                      fontWeight:600, outline:"none", boxSizing:"border-box",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── DEDUCTIONS (editable) ── */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.err, letterSpacing:"0.8px", marginBottom:8 }}>DEDUCTIONS <span style={{fontWeight:400, color:C.txD}}>(editable) &nbsp;&nbsp; Leave Pay = from Crew Registry</span></div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {[
                ["DEP Fees / Month",  "office",         C.txt],
                ["Paid DEP Fees",     "paidDepFees",    C.txM],
                ["Balance DEP Fees",  "balanceDepFees", C.wrn],
                ["DEP Fee Deducted",  "depFeeDed",      C.err],
                ["Leave Pay",         "actLeavePay",    C.inf],
              ].map(([l, key, color]) => (
                <div key={key}>
                  <label style={{ fontSize:9, color:C.txD, display:"block", marginBottom:3 }}>{l}</label>
                  <input
                    type="number"
                    value={editForm[key] ?? 0}
                    onChange={e => setEditForm(f => ({...f, [key]: e.target.value}))}
                    style={{
                      width:"100%", background:C.bg,
                      border:`1px solid ${C.bdr}`, borderRadius:6,
                      color, padding:"6px 8px", fontSize:12,
                      fontWeight:600, outline:"none", boxSizing:"border-box",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Auto net pay — computed dynamically from Earnings − Deductions */}
          {(() => {
            const earn = Number(editForm.salary||0) + Number(editForm.bonus||0) + Number(editForm.pdeFees||0)
                       + Number(editForm.visaFees||0) + Number(editForm.workingGear||0) + Number(editForm.leavePayRefunded||0);
            const ded  = Number(editForm.depFeeDed||0) + Number(editForm.actLeavePay||0);
            const autoNet = earn - ded;
            const finalNet = Math.max(0, autoNet + Number(editForm.extraBonus||0)
              - Number(editForm.bankCharge||0) - Number(editForm.otherDed||0));
            return (
              <>
                {/* Earnings/Deductions summary + auto net */}
                <div style={{ padding:"10px 14px", background:`${C.ok}0d`, borderRadius:7, border:`1px solid ${C.ok}30`, marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.txD, marginBottom:4 }}>
                    <span>Total Earnings (sum of green fields)</span>
                    <span style={{color:C.ok, fontWeight:600}}>+ ${earn.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.txD, marginBottom:6 }}>
                    <span>Total Deductions (DEP Fee + Leave Pay)</span>
                    <span style={{color:C.err, fontWeight:600}}>− ${ded.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                  </div>
                  <div style={{ borderTop:`1px solid ${C.ok}30`, paddingTop:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:11, color:C.txM, fontWeight:600 }}>Auto-calculated Net Crew Pay (from Bill)</span>
                    <span style={{ fontSize:15, fontWeight:700, color:C.ok }}>${autoNet.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                  </div>
                </div>

                {/* Adjust for actual payment */}
                <div style={{ fontSize:10, fontWeight:700, color:C.txM, letterSpacing:"0.8px", marginBottom:8 }}>
                  ADJUST FOR ACTUAL PAYMENT <span style={{fontWeight:400, color:C.txD}}>(optional bank / other adjustments)</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
                  {[
                    ["Bank Transfer Charge (deduct)",  "bankCharge",  C.err],
                    ["Other Deductions",               "otherDed",    C.err],
                    ["Extra Bonus / Allowance (add)",  "extraBonus",  C.ok],
                  ].map(([label, key, color]) => (
                    <div key={key}>
                      <label style={{ fontSize:10, color:C.txM, display:"block", marginBottom:4, fontWeight:600 }}>{label}</label>
                      <input
                        type="number"
                        value={editForm[key] ?? 0}
                        onChange={e => setEditForm(f => ({...f, [key]: e.target.value}))}
                        style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:6, color, padding:"7px 10px", fontSize:13, fontWeight:600, outline:"none", width:"100%", boxSizing:"border-box" }}
                      />
                    </div>
                  ))}
                </div>

                {/* Final preview */}
                <div style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"10px 14px", marginBottom:12 }}>
                  <div style={{ fontSize:10, color:C.txD, marginBottom:6, fontWeight:600 }}>FINAL NET PAY PREVIEW</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.txM }}>
                      <span>Auto Net (Earnings − Deductions)</span>
                      <span>${autoNet.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                    </div>
                    {Number(editForm.extraBonus||0)>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.ok  }}><span>+ Extra Bonus</span><span>+${Number(editForm.extraBonus||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
                    {Number(editForm.bankCharge||0)>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.err }}><span>− Bank Charge</span><span>−${Number(editForm.bankCharge||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
                    {Number(editForm.otherDed||0)>0   && <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:C.err }}><span>− Other Deductions</span><span>−${Number(editForm.otherDed||0).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>}
                    <div style={{ borderTop:`1px solid ${C.bdr}`, marginTop:4, paddingTop:6, display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:15 }}>
                      <span style={{color:C.txt}}>Net Total to Pay</span>
                      <span style={{color:C.ok}}>${finalNet.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Bank */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            {[["Bank Name","bankName"],["Account No","bankAccNo"],["Account Name","bankAccName"]].map(([l,k]) => (
              <div key={k} style={{ gridColumn: k==="bankAccName" ? "1/-1" : undefined }}>
                <label style={{ fontSize:10, color:C.txM, display:"block", marginBottom:3 }}>{l}</label>
                <input value={editForm[k]||""} onChange={e => setEditForm(f=>({...f,[k]:e.target.value}))} style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:5, color:C.txt, padding:"6px 9px", fontSize:11.5, outline:"none", width:"100%", boxSizing:"border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:10, color:C.txM, display:"block", marginBottom:3 }}>Remark / Notes</label>
            <input value={editForm.remark||""} onChange={e => setEditForm(f=>({...f,remark:e.target.value}))} placeholder="e.g. Bank charge deducted, extra allowance added..." style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:5, color:C.txt, padding:"6px 9px", fontSize:11.5, outline:"none", width:"100%", boxSizing:"border-box" }} />
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
            <Btn v="sec" onClick={() => setEditingPayroll(null)}>Cancel</Btn>
            <Btn v="ok" onClick={saveAndSubmit}>✓ Submit for Admin Approval</Btn>
          </div>
        </Mod>
      )}

      {/* ── MANUAL PAYMENT MODAL ── */}
      {isManualModalOpen && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(2px)" }}>
          <div style={{ background:C.card, padding:25, borderRadius:12, width:400, border:`1px solid ${C.bdr}`, boxShadow:"0 24px 60px rgba(0,0,0,0.4)", animation:"mu-modal-in 0.18s ease" }}>
            <h3 style={{ margin:"0 0 5px", fontSize:15, fontWeight:700 }}>Add Manual Payment</h3>
            <p style={{ fontSize:11, color:C.txD, marginBottom:20 }}>Use for ad-hoc distributions (e.g. emergency leave pay).</p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div><label style={{ fontSize:10, color:C.txM, fontWeight:600, display:"block", marginBottom:4 }}>Crew Member</label><select style={inp} value={manualData.crewId} onChange={e=>setManualData({...manualData,crewId:e.target.value})}><option value="">Select Crew</option>{crew.map(c=><option key={c.id} value={c.id}>{c.id} - {c.name}</option>)}</select></div>
              <div><label style={{ fontSize:10, color:C.txM, fontWeight:600, display:"block", marginBottom:4 }}>Amount (USD)</label><input type="number" style={inp} value={manualData.amount} onChange={e=>setManualData({...manualData,amount:e.target.value})} placeholder="0.00"/></div>
              <div><label style={{ fontSize:10, color:C.txM, fontWeight:600, display:"block", marginBottom:4 }}>Vessel (Override)</label><input style={inp} value={manualData.vessel} onChange={e=>setManualData({...manualData,vessel:e.target.value})} placeholder="Default vessel if empty"/></div>
              <div style={{ display:"flex", gap:8, marginTop:15 }}>
                <Btn onClick={handleManualSubmit} s={{flex:2}}>Create Payment</Btn>
                <Btn v="ghost" onClick={()=>setManualModalOpen(false)} s={{flex:1}}>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {splitT && <Mod title={`Split Payment: ${splitT.crewName}`} onClose={() => setSplitT(null)} w={600}>
        <div style={{ marginBottom:15, padding:12, background:`${C.acc}10`, borderRadius:8, border:`1px solid ${C.acc}30` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12 }}>Total: <b style={{ fontSize:14 }}>${(splitT.total||0).toLocaleString()}</b></span>
            <span style={{ fontSize:12 }}>Remaining: <b style={{ fontSize:14, color:(splitT.total-splitRows.reduce((a,b)=>a+(Number(b.amount)||0),0))===0?C.ok:C.err }}>${((splitT.total||0)-splitRows.reduce((a,b)=>a+(Number(b.amount)||0),0)).toLocaleString()}</b></span>
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {splitRows.map((row, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1.5fr 1.5fr 1fr 30px", gap:8, alignItems:"end", background:C.bgS, padding:8, borderRadius:6 }}>
              <div><label style={{ fontSize:9, color:C.txD }}>Bank / Account</label><div style={{ fontSize:11, fontWeight:500 }}>{row.bankName} - {row.bankAccNo}</div><div style={{ fontSize:10, color:C.txM }}>{row.bankAccName} {row.label&&`(${row.label})`}</div></div>
              <div><label style={{ fontSize:10, color:C.txM }}>USD Amount</label><input type="number" value={row.amount} onChange={e=>{
                const val = Number(e.target.value)||0;
                const nr = [...splitRows];
                nr[i].amount = val;
                // Auto-balance: if editing a row and there are exactly 2 rows, auto-fill the other one
                if (nr.length === 2) {
                  const otherIdx = i === 0 ? 1 : 0;
                  nr[otherIdx].amount = Math.max(0, Number((splitT.total - val).toFixed(2)));
                }
                // If editing row 0 with 3+ rows, distribute remainder to the last row
                else if (nr.length > 2 && i === 0) {
                  const otherSum = nr.slice(1, -1).reduce((a,b)=>a+(Number(b.amount)||0),0);
                  nr[nr.length - 1].amount = Math.max(0, Number((splitT.total - val - otherSum).toFixed(2)));
                }
                setSplitRows(nr);
              }} style={inp}/></div>
              <div style={{ display:"flex", alignItems:"center", height:38 }}><Btn v="ghost" s={{color:C.err,padding:0}} onClick={()=>setSplitRows(splitRows.filter((_,idx)=>idx!==i))}>✕</Btn></div>
            </div>
          ))}
          <Btn v="sec" size="sm" onClick={()=>setSplitRows([...splitRows,{bankName:"Other",bankAccNo:"",bankAccName:splitT.crewName,amount:0,label:"Additional"}])}>+ Add Custom Account</Btn>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:20 }}>
          <Btn v="sec" onClick={()=>setSplitT(null)}>Cancel</Btn>
          <Btn v="ok" disabled={((splitT.total||0)-splitRows.reduce((a,b)=>a+(Number(b.amount)||0),0))!==0} onClick={async()=>{
            const validRows=splitRows.filter(r=>r.amount>0); if(!validRows.length) return;
            const splitPayments=validRows.map((r,i)=>({...splitT,id:`${splitT.id}-S${i+1}`,total:Number(r.amount),bankAmount:Number(r.amount),bankName:r.bankName,bankAccNo:r.bankAccNo,bankAccName:r.bankAccName,label:r.label,isSplit:true,status:"Approved"}));
            const updated=[...crewPay.filter(p=>p.id!==splitT.id),...splitPayments]; setCrewPay(updated);
            if(fsOk){ await fs.delD("crewPayments",splitT.id); for(const sp of splitPayments) await fs.setD("crewPayments",sp.id,sp); }
            setSplitT(null); showT(`Payment split into ${splitPayments.length} parts ✓`);
          }}>Confirm Split</Btn>
        </div>
      </Mod>}

      {payrolls.length > 0 && (
        <div style={{ background:C.card, borderRadius:8, border:`1px solid ${C.bdr}`, padding:14, marginTop:14 }}>
          <h4 style={{ margin:"0 0 12px", fontSize:12.5, fontWeight:600 }}>🖨️ Payroll Reporting</h4>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {payrolls.map(pr => {
              const submitted = pr.payments.length;
              const total     = pr.totalInBill || submitted;
              const pct       = total > 0 ? Math.round((submitted / total) * 100) : 100;
              const complete  = total > 0 && submitted >= total;
              return (
                <div key={pr.bill.id} style={{
                  background: complete ? `${C.ok}08` : C.bg,
                  border: `1px solid ${complete ? C.ok+"35" : C.bdr}`,
                  borderRadius: 8, overflow:"hidden",
                }}>
                  {/* Bill header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", borderBottom:`1px solid ${C.bdr}40` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:C.txt }}>{pr.clientName}</div>
                        <div style={{ fontSize:9, color:C.txD }}>{pr.bill.month} · {pr.bill.id} · {pr.bill.vessel||""}</div>
                      </div>
                      {complete
                        ? <span style={{ fontSize:10, fontWeight:700, color:C.ok, background:`${C.ok}15`, padding:"2px 8px", borderRadius:10, border:`1px solid ${C.ok}30` }}>✓ Complete</span>
                        : <span style={{ fontSize:10, color:C.wrn, fontWeight:600 }}>{submitted}/{total} submitted</span>
                      }
                    </div>
                    <Btn v="ghost" s={{fontSize:10}} onClick={async()=>{ setCalc(pr); if(fsOk){ const saved=await fs.getD("payrollSettings",pr.bill.id); if(saved){setRate(saved.rate||3985);setExtra(saved.extraSettings||{});}else{setRate(3985);setExtra({});} } }}>View Report</Btn>
                  </div>
                  {/* Crew dot indicators */}
                  {(() => {
                    const submittedIds = new Set(pr.payments.map(p => String(p.crewId)));
                    const allBillCrew = pr.bill.crew || [];
                    return (
                      <div style={{ padding:"8px 14px", display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" }}>
                        {allBillCrew.map(c => {
                          const cId = String(c.id || c.crewId);
                          const pay = pr.payments.find(p => String(p.crewId) === cId);
                          const done = !!pay;
                          const col = pay?.status==="Paid"?C.ok : pay?.status==="Approved"||pay?.status==="Processed"?C.inf : done?C.acc:null;
                          return (
                            <div key={cId} title={`${c.name}${done?" — "+pay.status:" — Pending"}`} style={{
                              width:22, height:22, borderRadius:"50%",
                              background: done ? col : "transparent",
                              border: done ? `2px solid ${col}` : `2px dashed ${C.bdr}`,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:8, fontWeight:700,
                              color: done ? "#fff" : C.txD,
                              flexShrink:0,
                              transition:"all 0.2s",
                              boxShadow: done ? `0 0 6px ${col}50` : "none",
                            }}>
                              {(c.name||"?")[0].toUpperCase()}
                            </div>
                          );
                        })}
                        <span style={{ fontSize:9, color:C.txD, marginLeft:4 }}>
                          {pr.payments.length}/{allBillCrew.length || pr.payments.length}
                        </span>
                      </div>
                    );
                  })()}
                  {/* Per-crew rows: submitted + pending */}
                  <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:4 }}>
                    {/* Submitted crew chips */}
                    {pr.payments.length > 0 && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom: (pr.totalInBill > pr.payments.length) ? 6 : 0 }}>
                        {pr.payments.map(p => {
                          const statusCol = p.status==="Paid"?C.ok : p.status==="Approved"||p.status==="Processed"?C.inf : C.acc;
                          const statusLabel = p.status==="Paid"?"Paid" : p.status==="Approved"?"Approved" : p.status==="Processed"?"Processed" : "Submitted";
                          return (
                            <div key={p.id} style={{
                              display:"flex", alignItems:"center", gap:5,
                              background:`${statusCol}12`, border:`1px solid ${statusCol}35`,
                              borderRadius:6, padding:"4px 9px", fontSize:10,
                            }}>
                              <span style={{ width:5, height:5, borderRadius:"50%", background:statusCol, display:"inline-block", flexShrink:0 }} />
                              <span style={{ fontWeight:600, color:C.txt }}>{p.crewName}</span>
                              <span style={{ color:C.txD, fontSize:9 }}>{p.rank}</span>
                              <span style={{ color:statusCol, fontWeight:700 }}>${(p.total||0).toLocaleString()}</span>
                              <span style={{ color:statusCol, fontSize:9, opacity:0.8 }}>{statusLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Pending (not yet submitted) crew */}
                    {(() => {
                      const submittedIds = new Set(pr.payments.map(p => String(p.crewId)));
                      const pendingCrew = (pr.bill.crew || []).filter(c => !submittedIds.has(String(c.id || c.crewId)));
                      if (!pendingCrew.length) return null;
                      return (
                        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                          {pendingCrew.map(c => (
                            <div key={c.id||c.name} style={{
                              display:"flex", alignItems:"center", gap:5,
                              background:`${C.txD}0a`, border:`1px dashed ${C.bdr}`,
                              borderRadius:6, padding:"4px 9px", fontSize:10, opacity:0.65,
                            }}>
                              <span style={{ width:5, height:5, borderRadius:"50%", border:`1.5px solid ${C.txD}`, display:"inline-block", flexShrink:0 }} />
                              <span style={{ color:C.txM }}>{c.name}</span>
                              <span style={{ color:C.txD, fontSize:9 }}>{c.rank}</span>
                              <span style={{ color:C.txD, fontSize:9 }}>Pending</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {calc && <Mod title={`Payroll Report — ${calc.clientName} (${calc.bill.month})`} onClose={()=>setCalc(null)} w={1100}>
        {/* Header bar with exchange rate */}
        <div style={{ display:"flex", gap:16, alignItems:"center", background:C.bg, padding:"10px 14px", borderRadius:6, border:`1px solid ${C.bdr}`, marginBottom:16 }}>
          <div><label style={{ fontSize:10, color:C.txM, display:"block", marginBottom:3 }}>Exchange Rate (MMK/USD)</label><input type="number" value={rate} onChange={e=>setRate(e.target.value)} style={{...inp,width:110}}/></div>
          <div style={{ fontSize:10, color:C.txD }}>Bill: <b style={{color:C.acc}}>{calc.bill.id}</b> &nbsp;|&nbsp; Vessel: <b>{calc.bill.vessel||"—"}</b> &nbsp;|&nbsp; {calc.payments.length} crew</div>
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <Btn v="ghost" s={{fontSize:10}} onClick={()=>exportPayrollPDF(calc,rate,extra,crew)}>📄 PDF Summary</Btn>
            <Btn v="ghost" s={{fontSize:10}} onClick={()=>exportBankPDF(calc,rate,extra,crew)}>📄 Bank PDF</Btn>
            <Btn v="ghost" s={{fontSize:10}} onClick={()=>exportCashPDF(calc,rate,extra,crew)}>📄 Cash PDF</Btn>
            <Btn s={{fontSize:10}} onClick={async()=>{ const d={billId:calc.bill.id,vessel:calc.vessel,month:calc.bill.month,rate,extraSettings:extra,finalizedAt:new Date().toISOString()}; if(fsOk) await fs.setD("payrollSettings",calc.bill.id,d); showT("Settings saved ✓"); }}>💾 Save</Btn>
          </div>
        </div>

        {/* Per-crew cards */}
        <div style={{ maxHeight:"65vh", overflowY:"auto", display:"flex", flexDirection:"column", gap:12 }}>
          {calc.payments.map(p => {
            const c = crew.find(cr=>cr.id===p.crewId)||{};
            const ex = extra[p.crewId]||{bc:200,ref:0,ded:0};
            const mmk = (p.total * Number(rate)) - ex.bc + ex.ref - ex.ded;
            const fmt = v => `${(Number(v)||0).toLocaleString(undefined,{minimumFractionDigits:2})}`;
            const statusColor = p.status==="Paid"?C.ok:p.status==="Approved"||p.status==="Processed"?C.inf:C.wrn;
            return (
              <div key={p.id} style={{ background:C.bg, borderRadius:8, border:`1px solid ${C.bdr}`, padding:"12px 14px" }}>
                {/* Crew header row */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <b style={{ fontSize:13, color:C.txt }}>{p.crewName || c.name}</b>
                    <span style={{ fontSize:10, color:C.txD }}>{p.rank || c.rank}</span>
                    <Badge t={p.status} c={p.status==="Paid"?"green":p.status==="Approved"||p.status==="Processed"?"blue":"yellow"} />
                  </div>
                  <div style={{ fontSize:11, color:C.txD }}>
                    {p.bankName || c.bankName || "—"} &nbsp;|&nbsp; {p.bankAccNo || c.bankAccNo || "—"}
                  </div>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                  {/* EARNINGS */}
                  <div style={{ background:C.card, borderRadius:6, padding:"8px 10px" }}>
                    <div style={{ fontSize:9, fontWeight:700, color:C.ok, letterSpacing:"0.8px", marginBottom:6 }}>EARNINGS</div>
                    {[
                      ["Basic Salary",    p.salary,       C.txt],
                      ["Bonus",           p.bonus,        C.ok],
                      ["PDE Fees",        p.pdeFees,      C.ok],
                      ["Visa Fees",       p.visaFees,     C.ok],
                      ["Working Gear",    p.workingGear,  C.ok],
                      ["Leave Pay (Ref)", p.leavePayRefunded, C.ok],
                    ].map(([l,v,col]) => Number(v)>0 ? (
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:2 }}>
                        <span style={{color:C.txD}}>{l}</span>
                        <span style={{color:col, fontWeight:500}}>{fmt(v)}</span>
                      </div>
                    ) : null)}
                  </div>

                  {/* DEDUCTIONS */}
                  <div style={{ background:C.card, borderRadius:6, padding:"8px 10px" }}>
                    <div style={{ fontSize:9, fontWeight:700, color:C.err, letterSpacing:"0.8px", marginBottom:6 }}>DEDUCTIONS</div>
                    {[
                      ["DEP Fees/Mo",     p.office,           C.txt],
                      ["Paid DEP",        p.paidDepFees,      C.txM],
                      ["Bal DEP",         p.balanceDepFees,   p.balanceDepFees>0?C.wrn:C.txM],
                      ["DEP Deducted",    p.depFeeDed,        p.depFeeDed>0?C.err:C.txM],
                      ["Leave Pay",       p.actLeavePay,      p.actLeavePay>0?C.inf:C.txM],
                    ].map(([l,v,col]) => (
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:2 }}>
                        <span style={{color:C.txD}}>{l}</span>
                        <span style={{color:col, fontWeight:500}}>{fmt(v)}</span>
                      </div>
                    ))}
                  </div>

                  {/* NET PAY & MMK */}
                  <div style={{ background:C.card, borderRadius:6, padding:"8px 10px" }}>
                    <div style={{ fontSize:9, fontWeight:700, color:C.acc, letterSpacing:"0.8px", marginBottom:6 }}>NET PAY</div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:3 }}><span style={{color:C.txD}}>Gross Amount</span><span style={{color:C.txt}}>{fmt(p.grossTotal||p.total)}</span></div>
                    {Number(p.bankCharge)>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:3 }}><span style={{color:C.txD}}>− Bank Charge</span><span style={{color:C.err}}>{fmt(p.bankCharge)}</span></div>}
                    {Number(p.otherDed)>0   && <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:3 }}><span style={{color:C.txD}}>− Other Ded.</span><span style={{color:C.err}}>{fmt(p.otherDed)}</span></div>}
                    {Number(p.extraBonus)>0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:3 }}><span style={{color:C.txD}}>+ Extra Bonus</span><span style={{color:C.ok}}>{fmt(p.extraBonus)}</span></div>}
                    <div style={{ borderTop:`1px solid ${C.bdr}`, marginTop:4, paddingTop:5, display:"flex", justifyContent:"space-between", fontWeight:700, marginBottom:6 }}>
                      <span style={{color:C.txt, fontSize:11}}>Net USD</span>
                      <span style={{color:C.ok, fontSize:13}}>{fmt(p.total)}</span>
                    </div>
                    {/* MMK row with editable adjustments */}
                    <div style={{ fontSize:9, fontWeight:700, color:C.pri, letterSpacing:"0.8px", marginBottom:5 }}>MMK CONVERSION</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4 }}>
                      {[["B.Chg","bc"],["Ref.","ref"],["Ded.","ded"]].map(([l,k]) => (
                        <div key={k}>
                          <div style={{fontSize:8,color:C.txD,marginBottom:2}}>{l}</div>
                          <input type="number" value={ex[k]} onChange={e=>setExtra({...extra,[p.crewId]:{...ex,[k]:Number(e.target.value)}})} style={{...inp,padding:"2px 4px",fontSize:9,width:"100%"}}/>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, marginTop:6, padding:"4px 0", borderTop:`1px solid ${C.bdr}` }}>
                      <span style={{color:C.pri, fontSize:10}}>Total MMK</span>
                      <span style={{color:C.pri, fontSize:12}}>{mmk.toLocaleString()}</span>
                    </div>
                    {p.remark && <div style={{fontSize:9,color:C.txD,marginTop:4,fontStyle:"italic"}}>{p.remark}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grand total footer */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, padding:"10px 14px", background:`${C.pri}10`, borderRadius:7, border:`1px solid ${C.pri}30` }}>
          <span style={{ fontSize:12, fontWeight:600, color:C.txt }}>GRAND TOTAL ({calc.payments.length} crew)</span>
          <div style={{ display:"flex", gap:24 }}>
            <span style={{ fontSize:12 }}>USD: <b style={{color:C.ok}}>${calc.payments.reduce((s,p)=>s+(p.total||0),0).toLocaleString(undefined,{minimumFractionDigits:2})}</b></span>
            <span style={{ fontSize:12 }}>MMK: <b style={{color:C.pri}}>{calc.payments.reduce((s,p)=>{ const ex2=extra[p.crewId]||{bc:200,ref:0,ded:0}; return s+(p.total*Number(rate))-ex2.bc+ex2.ref-ex2.ded; },0).toLocaleString()}</b></span>
          </div>
        </div>
      </Mod>}
    </div>
  );
}

// ============== STATUS BOARD ==============
function BoardV({ userRole, crew, setCrew, crewPay, setCrewPay, slips, bills, payments, showT, fs, fsOk, selectedMonth, setSelectedMonth, fN, setFN, fV, setFV, fC, setFC, vessels, clients }) {
  const mBills = bills.filter(b => b.month === selectedMonth);
  const mBillIds = new Set(mBills.map(b => b.id));
  const mPayIds = new Set(payments.filter(p => mBillIds.has(p.billId)).map(p => p.id));
  const mSlips = slips.filter(s => mPayIds.has(s.payId));
  const ss = new Set(mSlips.flatMap(s => s.crewIds || []));
  const ps = new Set(crewPay.filter(p => { const slip = slips.find(s => s.id === p.slipId); return slip && mPayIds.has(slip.payId) && p.status === "Paid"; }).map(p => p.crewId));
  const gS = c => ps.has(c.id) ? "Paid" : ss.has(c.id) ? "Slip Received" : "Pending";
  const fl = crew.filter(c => {
    if (fN && !c.name.toLowerCase().includes(fN.toLowerCase()) && !(c.id||"").toLowerCase().includes(fN.toLowerCase())) return false;
    if (fV && c.vessel !== fV) return false;
    if (fC && c.client !== fC) return false;
    return true;
  });
  const pd = fl.filter(c => gS(c) === "Paid").length;
  const sr = fl.filter(c => gS(c) === "Slip Received").length;
  const pn = fl.filter(c => gS(c) === "Pending").length;
  const [sy, sm] = selectedMonth.split("-").map(Number);
  const salaryMonthLabel = new Date(sy, sm-1, 1).toLocaleString("en", { month:"long", year:"numeric" });
  const changeMonth = (delta) => { const d = new Date(sy, sm-1+delta, 1); setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`); };

  return <div>
    <div style={{ background:C.card, borderRadius:8, border:`1px solid ${C.bdr}`, padding:"10px 14px", marginBottom:12, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
      <div style={{ fontSize:10, color:C.txD }}>SALARY MONTH:</div>
      <button onClick={()=>changeMonth(-1)} style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:5, color:C.txt, cursor:"pointer", padding:"3px 8px", fontSize:13 }}>‹</button>
      <div style={{ position:"relative", display:"inline-flex", alignItems:"center" }}>
        <input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} onClick={e=>{try{e.target.showPicker()}catch(err){}}} style={{ background:"transparent", border:"none", color:C.acc, fontSize:13, fontWeight:700, cursor:"pointer", outline:"none", paddingRight:16 }} />
        <span style={{ position:"absolute", right:2, pointerEvents:"none", color:C.acc, fontSize:9 }}>▼</span>
      </div>
      <button onClick={()=>changeMonth(1)} style={{ background:C.bg, border:`1px solid ${C.bdr}`, borderRadius:5, color:C.txt, cursor:"pointer", padding:"3px 8px", fontSize:13 }}>›</button>
      <span style={{ fontSize:10, color:C.txD, marginLeft:4 }}>— {salaryMonthLabel} salary status</span>
    </div>
    <div style={{ display:"flex", gap:10, marginBottom:12, flexWrap:"wrap" }}>
      {[["Paid",pd,C.ok,C.okB],["Slip Rcv",sr,C.inf,C.infB],["Pending",pn,C.wrn,C.wrnB]].map(([l,v,c,bg]) => (
        <div key={l} style={{ background:bg, border:`1px solid ${c}30`, borderRadius:7, padding:"8px 14px", flex:"1 1 140px" }}>
          <div style={{ fontSize:18, fontWeight:700, color:c }}>{v}</div>
          <div style={{ fontSize:10, color:c }}>{l}</div>
        </div>
      ))}
    </div>
    <Filt {...{ fN, setFN, fV, setFV, fC, setFC, vessels, clients }} />
    <div style={{ overflowX:"auto", borderRadius:6, border:`1px solid ${C.bdr}` }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead><tr>{["No","ID","Name","Rank","Vessel","Client","Wages/M","Status"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
        <tbody>{fl.map(c => {
          const st = gS(c);
          const sc2 = st==="Paid"?C.ok:st==="Slip Received"?C.inf:C.wrn;
          return <tr key={c.id||c.no} {...trHover} style={{ background:`${sc2}06`, borderLeft:`3px solid ${sc2}` }}>
            <td style={tdS}>{c.no}</td>
            <td style={tdS}><span style={{ color:C.acc, fontWeight:600 }}>{c.id}</span></td>
            <td style={tdS}><span style={{ fontWeight:500 }}>{c.name}</span></td>
            <td style={tdS}>{c.rank}</td>
            <td style={tdS}>{c.vessel||"—"}</td>
            <td style={tdS}>{c.client}</td>
            <td style={{...tdS,fontWeight:600}}>${(c.ownerPaid||0).toLocaleString()}</td>
            <td style={tdS}><Badge t={st} c={st==="Paid"?"green":st==="Slip Received"?"purple":"yellow"}/></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </div>;
}

// ============== PDF HELPERS ==============
const exportPayrollPDF = (calc, rate, extra, crew) => {
  const w = window.open("", "_blank");
  let rows = ""; let totUSD = 0, totMMK = 0;
  calc.payments.forEach(p => {
    const c=crew.find(cr=>cr.id===p.crewId)||{}; const ex=extra[p.crewId]||{bc:200,ref:0,ded:0};
    const mmk=(p.total*rate)-ex.bc+ex.ref-ex.ded; totUSD+=(p.total||0); totMMK+=mmk;
    rows+=`<tr><td style="border:1px solid #ddd;padding:6px">${c.name}</td><td style="border:1px solid #ddd;padding:6px">${c.vessel||"—"}</td><td style="border:1px solid #ddd;padding:6px">${c.rank}</td><td style="border:1px solid #ddd;padding:6px;text-align:right">$${(p.total||0).toLocaleString()}</td><td style="border:1px solid #ddd;padding:6px;text-align:right">${ex.bc.toLocaleString()}</td><td style="border:1px solid #ddd;padding:6px;text-align:right">${ex.ref.toLocaleString()}</td><td style="border:1px solid #ddd;padding:6px;text-align:right">${ex.ded.toLocaleString()}</td><td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:bold">${mmk.toLocaleString()}</td></tr>`;
  });
  w.document.write(`<html><head><title>Payroll Summary - ${calc.clientName}</title><style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:20px;font-size:11px;} th{background:#f4f4f4;padding:8px;border:1px solid #ddd;text-align:left;}</style></head><body>${getLH()}<h2 style="text-align:center;margin:10px 0;font-size:16px;">PAYROLL SUMMARY REPORT</h2><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:10px"><span><b>Client:</b> ${calc.clientName}</span><span><b>Month:</b> ${calc.bill.month}</span><span><b>Exchange Rate:</b> ${rate} MMK/USD</span></div><table><thead><tr><th>Name</th><th>Vessel</th><th>Rank</th><th>USD</th><th>B.Chg</th><th>Ref.</th><th>Ded.</th><th>Total MMK</th></tr></thead><tbody>${rows}</tbody><tfoot><tr style="background:#f9f9f9;font-weight:bold"><td colspan="3" style="border:1px solid #ddd;padding:6px;text-align:right">GRAND TOTAL:</td><td style="border:1px solid #ddd;padding:6px;text-align:right">$${totUSD.toLocaleString()}</td><td colspan="3" style="border:1px solid #ddd;padding:6px;"></td><td style="border:1px solid #ddd;padding:6px;text-align:right">${totMMK.toLocaleString()} MMK</td></tr></tfoot></table><div style="margin-top:40px;display:flex;justify-content:space-between;font-size:12px"><div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:10px">Prepared By</div><div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:10px">Approved By</div></div></body></html>`);
  w.document.close(); setTimeout(() => w.print(), 500);
};

const exportBankPDF = (calc, rate, extra, crew) => {
  const w = window.open("", "_blank");
  let rows = ""; let totMMK = 0;
  calc.payments.filter(p=>(crew.find(cr=>cr.id===p.crewId)?.allotmentType||"bank")==="bank").forEach(p=>{
    const c=crew.find(cr=>cr.id===p.crewId)||{}; const ex=extra[p.crewId]||{bc:200,ref:0,ded:0};
    const mmk=(p.total*rate)-ex.bc+ex.ref-ex.ded; totMMK+=mmk;
    rows+=`<tr><td style="border:1px solid #ddd;padding:8px">${c.bankAccName}</td><td style="border:1px solid #ddd;padding:8px">${c.bankAccNo}</td><td style="border:1px solid #ddd;padding:8px">${c.bankName}</td><td style="border:1px solid #ddd;padding:8px;text-align:right;font-weight:bold">${mmk.toLocaleString()}</td></tr>`;
  });
  w.document.write(`<html><head><title>Bank Transfer List</title><style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px;} th{background:#f4f4f4;padding:10px;border:1px solid #ddd;text-align:left;}</style></head><body>${getLH()}<h2 style="text-align:center;margin:10px 0;font-size:16px;">BANK TRANSFER INSTRUCTIONS</h2><div style="font-size:12px;margin-bottom:15px"><b>Vessel:</b> ${calc.bill.vessel||"—"} | <b>Month:</b> ${calc.bill.month}</div><table><thead><tr><th>Account Name</th><th>Account Number</th><th>Bank</th><th>Amount (MMK)</th></tr></thead><tbody>${rows}</tbody><tr style="font-weight:bold;background:#f9f9f9"><td colspan="3" style="border:1px solid #ddd;padding:10px;text-align:right">TOTAL MMK:</td><td style="border:1px solid #ddd;padding:10px;text-align:right">${totMMK.toLocaleString()}</td></tr></table><div style="margin-top:50px;font-size:12px"><p>Please transfer the above amounts to the respective accounts.</p><div style="margin-top:40px;display:flex;justify-content:space-between"><div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:10px">Authorized Signatory</div><div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:10px">Date</div></div></div></body></html>`);
  w.document.close(); setTimeout(() => w.print(), 500);
};

const exportCashPDF = (calc, rate, extra, crew) => {
  const w = window.open("", "_blank");
  let rows = "";
  calc.payments.filter(p=>(crew.find(cr=>cr.id===p.crewId)?.allotmentType)==="cash").forEach(p=>{
    const c=crew.find(cr=>cr.id===p.crewId)||{}; const ex=extra[p.crewId]||{bc:200,ref:0,ded:0};
    const mmk=(p.total*rate)-ex.bc+ex.ref-ex.ded;
    rows+=`<tr><td style="border:1px solid #ddd;padding:10px">${c.name}</td><td style="border:1px solid #ddd;padding:10px">${c.rank}</td><td style="border:1px solid #ddd;padding:10px;text-align:right;font-weight:bold">${mmk.toLocaleString()}</td><td style="border:1px solid #ddd;padding:10px;width:150px"></td></tr>`;
  });
  w.document.write(`<html><head><title>Cash Pickup List</title><style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px;} th{background:#f4f4f4;padding:10px;border:1px solid #ddd;text-align:left;}</style></head><body>${getLH()}<h2 style="text-align:center;margin:10px 0;font-size:16px;">CASH PICKUP LIST</h2><div style="font-size:12px;margin-bottom:15px"><b>Vessel:</b> ${calc.bill.vessel||"—"} | <b>Month:</b> ${calc.bill.month}</div><table><thead><tr><th>Name</th><th>Rank</th><th>Amount (MMK)</th><th>Signature</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-top:50px;font-size:12px"><div style="margin-top:40px;display:flex;justify-content:space-between"><div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:10px">Paid By</div><div style="text-align:center;width:200px;border-top:1px solid #000;padding-top:10px">Date</div></div></div></body></html>`);
  w.document.close(); setTimeout(() => w.print(), 500);
};

// ============================================================
// EXPENSES & P&L MODULE
// ============================================================
const EXP_CATS = [
  {label:"🏢 Office & Admin",value:"Office & Admin"},
  {label:"✈️ Travel & Transport",value:"Travel & Transport"},
  {label:"⚓ Manning Operations",value:"Manning Operations"},
  {label:"📋 Gov & License",value:"Gov & License"},
  {label:"🏦 Bank & Finance",value:"Bank & Finance"},
  {label:"📱 Communication",value:"Communication"},
  {label:"🤝 PR & Entertainment",value:"PR & Entertainment"},
  {label:"💻 IT & Software",value:"IT & Software"},
  {label:"🚢 Vessel Operations",value:"Vessel Operations"},
  {label:"📦 Other",value:"Other"},
];
const INC_CATS = ["Document Fee","Port Charges Reimbursed","Visa Reimbursement","Medical Reimbursement","Other Income"];

function ExpensesV({bills,crewPay,expenses,setExpenses,income,setIncome,showT,fs,fsOk,userRole,selectedMonth,setSelectedMonth}) {
  const [subTab,setSubTab] = useState("pl");
  const [expRate,setExpRate] = useState(3985);
  const [showExpModal,setShowExpModal] = useState(false);
  const [showIncModal,setShowIncModal] = useState(false);
  const [expForm,setExpForm] = useState({date:new Date().toISOString().slice(0,10),category:"Office & Admin",description:"",currency:"MMK",amountMMK:0,amountUSD:0,remark:""});
  const [incForm,setIncForm] = useState({date:new Date().toISOString().slice(0,10),category:"Document Fee",description:"",currency:"USD",amountUSD:0,amountMMK:0,remark:""});
  const [fCat,setFCat] = useState("");
  const [fSt,setFSt] = useState("");
  const inp = {background:C.bg,border:`1px solid ${C.bdr}`,borderRadius:5,color:C.txt,padding:"6px 9px",fontSize:11.5,outline:"none",width:"100%",boxSizing:"border-box"};

  const rate = Number(expRate)||3985;
  const toUSD = e => Number(e.amountUSD||0) + (Number(e.amountMMK||0)/rate);
  const fmtU = v => `${(Number(v)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const fmtM = v => `${Math.round(Number(v)||0).toLocaleString()} MMK`;
  const [sy,sm] = selectedMonth.split("-").map(Number);
  const changeMonth = d => { const dt=new Date(sy,sm-1+d,1); setSelectedMonth(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`); };
  const monthLabel = new Date(sy,sm-1,1).toLocaleString("en",{month:"long",year:"numeric"});

  // Revenue calcs
  const paidBills = bills.filter(b=>b.status==="Paid"&&b.month===selectedMonth);
  const manningRev = paidBills.reduce((s,b)=>(b.crew||[]).reduce((ss,c)=>ss+(c.actManning||0),s),0);
  const depRev = crewPay.filter(p=>p.status==="Paid"&&p.month===selectedMonth).reduce((s,p)=>s+(p.depFeeDed||0),0);
  const extraInc = (income||[]).filter(i=>i.month===selectedMonth);
  const extraIncUSD = extraInc.reduce((s,i)=>s+toUSD(i),0);
  const totalRev = manningRev+depRev+extraIncUSD;

  // Expense calcs
  const mExp = (expenses||[]).filter(e=>e.month===selectedMonth);
  const appExp = mExp.filter(e=>e.status==="Approved");
  const pendExp = mExp.filter(e=>e.status==="Pending");
  const totalExp = appExp.reduce((s,e)=>s+toUSD(e),0);
  const netProfit = totalRev-totalExp;
  const byCat = {};
  appExp.forEach(e=>{const k=e.category||"Other";byCat[k]=(byCat[k]||0)+toUSD(e);});
  const catEntries = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const maxCat = Math.max(...catEntries.map(([,v])=>v),1);
  const filteredExp = mExp.filter(e=>(!fCat||e.category===fCat)&&(!fSt||e.status===fSt)).slice().sort((a,b)=>b.date.localeCompare(a.date));

  const saveExpense = async () => {
    if(!expForm.description) return showT("Description လိုအပ်သည်","wrn");
    if(!expForm.amountMMK&&!expForm.amountUSD) return showT("Amount လိုအပ်သည်","wrn");
    const nextNum=(expenses||[]).reduce((mx,e)=>{const n=parseInt((e.id||"").replace("EXP-",""),10);return n>mx?n:mx;},0)+1;
    const doc={id:`EXP-${String(nextNum).padStart(3,"0")}`,date:expForm.date,month:expForm.date.slice(0,7),category:expForm.category,description:expForm.description,currency:expForm.currency,amountMMK:expForm.currency==="MMK"?Number(expForm.amountMMK):0,amountUSD:expForm.currency==="USD"?Number(expForm.amountUSD):0,receiptUrl:"",status:"Pending",createdAt:new Date().toISOString(),remark:expForm.remark||""};
    if(fsOk) await fs.setD("expenses",doc.id,doc);
    setExpenses(prev=>[...prev,doc]);
    setShowExpModal(false);
    setExpForm({date:new Date().toISOString().slice(0,10),category:"Office & Admin",description:"",currency:"MMK",amountMMK:0,amountUSD:0,remark:""});
    showT(`${doc.id} submitted ✓`);
  };

  const approveExp = async id => {
    const up={status:"Approved",approvedAt:new Date().toISOString()};
    setExpenses(prev=>prev.map(e=>e.id===id?{...e,...up}:e));
    if(fsOk) await fs.upD("expenses",id,up);
    showT("Approved ✓");
  };

  const deleteExp = async id => {
    if(!window.confirm(`Delete ${id}?`)) return;
    setExpenses(prev=>prev.filter(e=>e.id!==id));
    if(fsOk) await fs.delD("expenses",id);
    showT("Deleted");
  };

  const saveIncome = async () => {
    if(!incForm.description) return showT("Description လိုအပ်သည်","wrn");
    if(!incForm.amountMMK&&!incForm.amountUSD) return showT("Amount လိုအပ်သည်","wrn");
    const nextNum=(income||[]).reduce((mx,i)=>{const n=parseInt((i.id||"").replace("INC-",""),10);return n>mx?n:mx;},0)+1;
    const doc={id:`INC-${String(nextNum).padStart(3,"0")}`,date:incForm.date,month:incForm.date.slice(0,7),category:incForm.category,description:incForm.description,currency:incForm.currency,amountUSD:incForm.currency==="USD"?Number(incForm.amountUSD):0,amountMMK:incForm.currency==="MMK"?Number(incForm.amountMMK):0,remark:incForm.remark||"",createdAt:new Date().toISOString()};
    if(fsOk) await fs.setD("income",doc.id,doc);
    setIncome(prev=>[...prev,doc]);
    setShowIncModal(false);
    setIncForm({date:new Date().toISOString().slice(0,10),category:"Document Fee",description:"",currency:"USD",amountUSD:0,amountMMK:0,remark:""});
    showT(`${doc.id} saved ✓`);
  };

  const deleteInc = async id => {
    if(!window.confirm(`Delete ${id}?`)) return;
    setIncome(prev=>prev.filter(i=>i.id!==id));
    if(fsOk) await fs.delD("income",id);
    showT("Deleted");
  };

  return (
    <div>
      {/* Month + Rate bar */}
      <div style={{background:C.card,borderRadius:8,border:`1px solid ${C.bdr}`,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <button onClick={()=>changeMonth(-1)} style={{background:C.bg,border:`1px solid ${C.bdr}`,borderRadius:5,color:C.txt,cursor:"pointer",padding:"3px 8px",fontSize:13}}>‹</button>
        <input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={{background:"transparent",border:"none",color:C.acc,fontSize:15,fontWeight:700,cursor:"pointer",outline:"none"}}/>
        <button onClick={()=>changeMonth(1)} style={{background:C.bg,border:`1px solid ${C.bdr}`,borderRadius:5,color:C.txt,cursor:"pointer",padding:"3px 8px",fontSize:13}}>›</button>
        <span style={{fontSize:11,color:C.txD}}>{monthLabel}</span>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,color:C.txM}}>MMK/USD Rate:</span>
          <input type="number" value={expRate} onChange={e=>setExpRate(e.target.value)} style={{background:C.bg,border:`1px solid ${C.bdr}`,borderRadius:5,color:C.acc,padding:"4px 8px",fontSize:12,fontWeight:700,outline:"none",width:90,textAlign:"right"}}/>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`,gap:20,marginBottom:16}}>
        {[["pl","📊 P&L Dashboard"],["exp","💳 Expenses"],["inc","💰 Income"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)} style={{paddingBottom:10,border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:subTab===id?C.pri:C.txD,borderBottom:subTab===id?`2px solid ${C.pri}`:"2px solid transparent"}}>{label}</button>
        ))}
      </div>

      {/* ── P&L DASHBOARD ── */}
      {subTab==="pl" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
            {/* Revenue card */}
            <div style={{background:C.card,border:`1px solid ${C.ok}30`,borderRadius:10,padding:14}}>
              <div style={{fontSize:10,fontWeight:700,color:C.ok,letterSpacing:"0.8px",marginBottom:10}}>💰 REVENUE</div>
              {[["Manning Fees",`${paidBills.length} paid bills`,manningRev],["DEP Fees Collected","from paid payroll",depRev],["Additional Income",`${extraInc.length} entries`,extraIncUSD]].map(([l,sub,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,paddingBottom:8,borderBottom:`1px solid ${C.bdr}40`}}>
                  <div><div style={{fontSize:11.5,color:C.txt}}>{l}</div><div style={{fontSize:9,color:C.txD}}>{sub}</div></div>
                  <span style={{fontSize:12,fontWeight:700,color:C.ok}}>{fmtU(v)}</span>
                </div>
              ))}
              <div style={{borderTop:`1px solid ${C.ok}40`,paddingTop:8,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,fontWeight:700,color:C.txt}}>Total Revenue</span>
                <span style={{fontSize:14,fontWeight:800,color:C.ok}}>{fmtU(totalRev)}</span>
              </div>
            </div>

            {/* Expenses card */}
            <div style={{background:C.card,border:`1px solid ${C.err}30`,borderRadius:10,padding:14}}>
              <div style={{fontSize:10,fontWeight:700,color:C.err,letterSpacing:"0.8px",marginBottom:10}}>💳 EXPENSES (Approved)</div>
              {catEntries.length===0
                ? <div style={{fontSize:11,color:C.txD,textAlign:"center",padding:"20px 0"}}>No approved expenses</div>
                : catEntries.map(([cat,usd])=>(
                  <div key={cat} style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10.5,marginBottom:3}}>
                      <span style={{color:C.txM}}>{cat}</span>
                      <span style={{color:C.err,fontWeight:600}}>{fmtU(usd)}</span>
                    </div>
                    <div style={{height:4,background:C.bg,borderRadius:2}}>
                      <div style={{height:"100%",width:`${(usd/maxCat)*100}%`,background:C.err,borderRadius:2,opacity:0.7}}/>
                    </div>
                  </div>
                ))
              }
              {pendExp.length>0 && <div style={{marginTop:8,padding:"5px 8px",background:`${C.wrn}15`,borderRadius:5,fontSize:10,color:C.wrn}}>⏳ {pendExp.length} pending ({fmtU(pendExp.reduce((s,e)=>s+toUSD(e),0))} awaiting approval)</div>}
              <div style={{borderTop:`1px solid ${C.err}40`,paddingTop:8,marginTop:8,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,fontWeight:700,color:C.txt}}>Total Expenses</span>
                <span style={{fontSize:14,fontWeight:800,color:C.err}}>{fmtU(totalExp)}</span>
              </div>
            </div>

            {/* Net Profit card */}
            <div style={{background:C.card,border:`2px solid ${netProfit>=0?C.ok:C.err}40`,borderRadius:10,padding:14,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.txM,letterSpacing:"0.8px",marginBottom:10}}>📈 NET PROFIT / LOSS</div>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:5}}><span style={{color:C.txD}}>Revenue</span><span style={{color:C.ok}}>{fmtU(totalRev)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:10}}><span style={{color:C.txD}}>Expenses</span><span style={{color:C.err}}>− {fmtU(totalExp)}</span></div>
                <div style={{borderTop:`2px solid ${netProfit>=0?C.ok:C.err}`,paddingTop:12,textAlign:"center"}}>
                  <div style={{fontSize:10,color:C.txD,marginBottom:4}}>NET</div>
                  <div style={{fontSize:28,fontWeight:800,color:netProfit>=0?C.ok:C.err}}>{netProfit>=0?"+":""}{fmtU(netProfit)}</div>
                  <div style={{fontSize:10,marginTop:4,color:netProfit>=0?C.ok:C.err}}>{netProfit>=0?"🟢 Profit":"🔴 Loss"}</div>
                </div>
              </div>
              <div style={{fontSize:9,color:C.txD,marginTop:10,textAlign:"center"}}>Rate: {rate.toLocaleString()} MMK/USD · Approved expenses only</div>
            </div>
          </div>

          {/* Paid bills breakdown */}
          {paidBills.length>0 && (
            <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:8,padding:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.txM,marginBottom:8}}>Manning Fee Breakdown — Paid Bills</div>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Bill ID","Client","Vessel","Crew","Manning Fees"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                <tbody>{paidBills.map(b=>{
                  const mf=(b.crew||[]).reduce((s,c)=>s+(c.actManning||0),0);
                  return <tr key={b.id} {...trHover}>
                    <td style={{...tdS,color:C.acc,fontWeight:600}}>{b.id}</td>
                    <td style={tdS}>{b.client}</td><td style={tdS}>{b.vessel}</td>
                    <td style={tdS}>{(b.crew||[]).length}</td>
                    <td style={{...tdS,color:C.ok,fontWeight:700}}>{fmtU(mf)}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── EXPENSES TAB ── */}
      {subTab==="exp" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:8}}>
              <select value={fCat} onChange={e=>setFCat(e.target.value)} style={{...inp,width:"auto"}}>
                <option value="">All Categories</option>
                {EXP_CATS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <select value={fSt} onChange={e=>setFSt(e.target.value)} style={{...inp,width:"auto"}}>
                <option value="">All Status</option>
                <option value="Pending">🟡 Pending</option>
                <option value="Approved">🟢 Approved</option>
              </select>
            </div>
            <Btn onClick={()=>setShowExpModal(true)}>+ Add Expense</Btn>
          </div>
          {filteredExp.length===0
            ? <div style={{textAlign:"center",padding:40,color:C.txD,border:`1px dashed ${C.bdr}`,borderRadius:8}}>No expense records for {monthLabel}.</div>
            : <div style={{overflowX:"auto",borderRadius:6,border:`1px solid ${C.bdr}`}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["ID","Date","Category","Description","Amount","≈ USD","Status","Action"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                  <tbody>{filteredExp.map(e=>(
                    <tr key={e.id} {...trHover}>
                      <td style={{...tdS,color:C.acc,fontWeight:600}}>{e.id}</td>
                      <td style={tdS}>{e.date}</td>
                      <td style={tdS}><span style={{fontSize:10,background:`${C.inf}15`,color:C.inf,padding:"2px 7px",borderRadius:10}}>{e.category}</span></td>
                      <td style={tdS}>{e.description}{e.remark&&<div style={{fontSize:9,color:C.txD}}>{e.remark}</div>}</td>
                      <td style={{...tdS,fontWeight:600}}>{e.currency==="MMK"?fmtM(e.amountMMK):fmtU(e.amountUSD)}</td>
                      <td style={{...tdS,color:C.txM}}>{fmtU(toUSD(e))}</td>
                      <td style={tdS}><Badge t={e.status} c={e.status==="Approved"?"green":"yellow"}/></td>
                      <td style={tdS}>
                        <div style={{display:"flex",gap:5}}>
                          {e.status==="Pending"&&userRole==="admin"&&<Btn v="ok" s={{fontSize:9}} onClick={()=>approveExp(e.id)}>✓ Approve</Btn>}
                          {e.status==="Pending"&&userRole!=="admin"&&<span style={{fontSize:9,color:C.txD}}>Waiting admin</span>}
                          {userRole==="admin"&&<Btn v="err" s={{fontSize:9}} onClick={()=>deleteExp(e.id)}>🗑️</Btn>}
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{background:C.bg}}>
                    <td colSpan={5} style={{...tdS,textAlign:"right",fontWeight:700}}>Total Approved:</td>
                    <td style={{...tdS,fontWeight:800,color:C.err,fontSize:13}}>{fmtU(totalExp)}</td>
                    <td colSpan={2}/>
                  </tr></tfoot>
                </table>
              </div>
          }
        </div>
      )}

      {/* ── INCOME TAB ── */}
      {subTab==="inc" && (
        <div>
          <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:8,padding:12,marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.txM,marginBottom:8}}>📥 Auto Income — from Payroll System</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:C.bg,borderRadius:7,padding:"10px 12px",border:`1px solid ${C.bdr}`}}>
                <div style={{fontSize:10,color:C.txD,marginBottom:3}}>Manning Fees (Paid Bills)</div>
                <div style={{fontSize:16,fontWeight:800,color:C.ok}}>{fmtU(manningRev)}</div>
                <div style={{fontSize:9,color:C.txD}}>{paidBills.length} bills reconciled</div>
              </div>
              <div style={{background:C.bg,borderRadius:7,padding:"10px 12px",border:`1px solid ${C.bdr}`}}>
                <div style={{fontSize:10,color:C.txD,marginBottom:3}}>DEP Fees (Paid Payroll)</div>
                <div style={{fontSize:16,fontWeight:800,color:C.ok}}>{fmtU(depRev)}</div>
                <div style={{fontSize:9,color:C.txD}}>from Mark Paid records</div>
              </div>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:C.txM}}>➕ Additional Income (Manual)</div>
            <Btn onClick={()=>setShowIncModal(true)}>+ Add Income</Btn>
          </div>
          {extraInc.length===0
            ? <div style={{textAlign:"center",padding:30,color:C.txD,border:`1px dashed ${C.bdr}`,borderRadius:8}}>No additional income entries for {monthLabel}.</div>
            : <div style={{overflowX:"auto",borderRadius:6,border:`1px solid ${C.bdr}`}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>{["ID","Date","Category","Description","Amount","≈ USD",""].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                  <tbody>{extraInc.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(i=>(
                    <tr key={i.id} {...trHover}>
                      <td style={{...tdS,color:C.acc,fontWeight:600}}>{i.id}</td>
                      <td style={tdS}>{i.date}</td>
                      <td style={tdS}><span style={{fontSize:10,background:`${C.ok}15`,color:C.ok,padding:"2px 7px",borderRadius:10}}>{i.category}</span></td>
                      <td style={tdS}>{i.description}{i.remark&&<div style={{fontSize:9,color:C.txD}}>{i.remark}</div>}</td>
                      <td style={{...tdS,fontWeight:600}}>{i.currency==="MMK"?fmtM(i.amountMMK):fmtU(i.amountUSD)}</td>
                      <td style={{...tdS,color:C.ok,fontWeight:700}}>{fmtU(toUSD(i))}</td>
                      <td style={tdS}>{userRole==="admin"&&<Btn v="err" s={{fontSize:9}} onClick={()=>deleteInc(i.id)}>🗑️</Btn>}</td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{background:C.bg}}>
                    <td colSpan={5} style={{...tdS,textAlign:"right",fontWeight:700}}>Total Additional:</td>
                    <td style={{...tdS,fontWeight:800,color:C.ok,fontSize:13}}>{fmtU(extraIncUSD)}</td>
                    <td/>
                  </tr></tfoot>
                </table>
              </div>
          }
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpModal && <Mod title="Add Expense" onClose={()=>setShowExpModal(false)} w={500}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={{fontSize:10,color:C.txM,display:"block",marginBottom:3}}>Date</label><input type="date" value={expForm.date} onChange={e=>setExpForm(f=>({...f,date:e.target.value}))} style={inp}/></div>
          <div><label style={{fontSize:10,color:C.txM,display:"block",marginBottom:3}}>Category</label>
            <select value={expForm.category} onChange={e=>setExpForm(f=>({...f,category:e.target.value}))} style={inp}>
              {EXP_CATS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"1/-1"}}><label style={{fontSize:10,color:C.txM,display:"block",marginBottom:3}}>Description *</label><input value={expForm.description} onChange={e=>setExpForm(f=>({...f,description:e.target.value}))} placeholder="e.g. April office rent" style={inp}/></div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:10,color:C.txM,display:"block",marginBottom:6}}>Currency & Amount *</label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {["MMK","USD"].map(cur=>(
                <button key={cur} onClick={()=>setExpForm(f=>({...f,currency:cur,amountMMK:0,amountUSD:0}))} style={{padding:"5px 16px",borderRadius:6,border:`1px solid ${expForm.currency===cur?C.pri:C.bdr}`,background:expForm.currency===cur?`${C.pri}20`:C.bg,color:expForm.currency===cur?C.pri:C.txM,fontWeight:expForm.currency===cur?700:400,cursor:"pointer",fontSize:12}}>{cur}</button>
              ))}
              <input type="number" value={expForm.currency==="MMK"?expForm.amountMMK:expForm.amountUSD} onChange={e=>setExpForm(f=>({...f,amountMMK:f.currency==="MMK"?Number(e.target.value):0,amountUSD:f.currency==="USD"?Number(e.target.value):0}))} placeholder="0" style={{...inp,width:160,fontWeight:700,fontSize:14,color:C.acc}}/>
              {expForm.currency==="MMK"&&expForm.amountMMK>0&&<span style={{fontSize:10,color:C.txD}}>≈ {fmtU(expForm.amountMMK/rate)}</span>}
              {expForm.currency==="USD"&&expForm.amountUSD>0&&<span style={{fontSize:10,color:C.txD}}>≈ {fmtM(expForm.amountUSD*rate)}</span>}
            </div>
          </div>
          <div style={{gridColumn:"1/-1"}}><label style={{fontSize:10,color:C.txM,display:"block",marginBottom:3}}>Remark</label><input value={expForm.remark} onChange={e=>setExpForm(f=>({...f,remark:e.target.value}))} placeholder="Optional notes..." style={inp}/></div>
        </div>
        <div style={{background:`${C.wrn}10`,border:`1px solid ${C.wrn}30`,borderRadius:6,padding:"8px 12px",marginTop:12,fontSize:10,color:C.wrn}}>⏳ Requires Admin approval before appearing in P&L.</div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}>
          <Btn v="sec" onClick={()=>setShowExpModal(false)}>Cancel</Btn>
          <Btn v="ok" onClick={saveExpense}>Submit for Approval</Btn>
        </div>
      </Mod>}

      {/* Add Income Modal */}
      {showIncModal && <Mod title="Add Additional Income" onClose={()=>setShowIncModal(false)} w={500}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={{fontSize:10,color:C.txM,display:"block",marginBottom:3}}>Date</label><input type="date" value={incForm.date} onChange={e=>setIncForm(f=>({...f,date:e.target.value}))} style={inp}/></div>
          <div><label style={{fontSize:10,color:C.txM,display:"block",marginBottom:3}}>Category</label>
            <select value={incForm.category} onChange={e=>setIncForm(f=>({...f,category:e.target.value}))} style={inp}>
              {INC_CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"1/-1"}}><label style={{fontSize:10,color:C.txM,display:"block",marginBottom:3}}>Description *</label><input value={incForm.description} onChange={e=>setIncForm(f=>({...f,description:e.target.value}))} placeholder="e.g. Crew document processing fee" style={inp}/></div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:10,color:C.txM,display:"block",marginBottom:6}}>Currency & Amount *</label>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {["USD","MMK"].map(cur=>(
                <button key={cur} onClick={()=>setIncForm(f=>({...f,currency:cur,amountMMK:0,amountUSD:0}))} style={{padding:"5px 16px",borderRadius:6,border:`1px solid ${incForm.currency===cur?C.ok:C.bdr}`,background:incForm.currency===cur?`${C.ok}20`:C.bg,color:incForm.currency===cur?C.ok:C.txM,fontWeight:incForm.currency===cur?700:400,cursor:"pointer",fontSize:12}}>{cur}</button>
              ))}
              <input type="number" value={incForm.currency==="USD"?incForm.amountUSD:incForm.amountMMK} onChange={e=>setIncForm(f=>({...f,amountUSD:f.currency==="USD"?Number(e.target.value):0,amountMMK:f.currency==="MMK"?Number(e.target.value):0}))} placeholder="0" style={{...inp,width:160,fontWeight:700,fontSize:14,color:C.ok}}/>
              {incForm.currency==="MMK"&&incForm.amountMMK>0&&<span style={{fontSize:10,color:C.txD}}>≈ {fmtU(incForm.amountMMK/rate)}</span>}
              {incForm.currency==="USD"&&incForm.amountUSD>0&&<span style={{fontSize:10,color:C.txD}}>≈ {fmtM(incForm.amountUSD*rate)}</span>}
            </div>
          </div>
          <div style={{gridColumn:"1/-1"}}><label style={{fontSize:10,color:C.txM,display:"block",marginBottom:3}}>Remark</label><input value={incForm.remark} onChange={e=>setIncForm(f=>({...f,remark:e.target.value}))} placeholder="Optional notes..." style={inp}/></div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}>
          <Btn v="sec" onClick={()=>setShowIncModal(false)}>Cancel</Btn>
          <Btn v="ok" onClick={saveIncome}>Save Income</Btn>
        </div>
      </Mod>}
    </div>
  );
}

export default App;
