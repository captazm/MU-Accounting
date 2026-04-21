import React, { useState } from "react";
import { C } from "./UI";
import { authSignIn, setupFirstAdmin, resetUserPassword, emergencyCreateAdmin } from "../services/auth";

// ── Shared input style ─────────────────────────────────────────────────────
const inp = (focused) => ({
  width: "100%",
  boxSizing: "border-box",
  background: C.bg,
  border: `1px solid ${focused ? C.pri : C.bdr}`,
  borderRadius: 8,
  color: C.txt,
  padding: "10px 13px",
  fontSize: 13,
  outline: "none",
  transition: "border-color 0.2s",
});

// ── Gradient button ────────────────────────────────────────────────────────
const gradBtn = (disabled) => ({
  width: "100%",
  padding: "11px",
  background: disabled ? C.txD : `linear-gradient(135deg,${C.pri},${C.inf})`,
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "all 0.2s",
  letterSpacing: "0.5px",
  boxShadow: disabled ? "none" : `0 4px 20px ${C.pri}40`,
});

// ── Emergency Recovery Form (Temporary) ───────────────────────────────────
function RecoveryForm({ onBack }) {
  const [form, setForm] = useState({ key: "", email: "", password: "", displayName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocused] = useState("");
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleEmergency = async (e) => {
    e.preventDefault();
    if (form.key !== "MAHAR-UNITY-RECOVERY-2026") {
      setError("လုံခြုံရေး Key မမှန်ကန်ပါ။");
      return;
    }
    if (form.password.length < 6) {
      setError("Password အနည်းဆုံး ၆ လုံး ထည့်ပါ။");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await emergencyCreateAdmin(form.email, form.password, form.displayName);
      // Automatically logged in
    } catch (err) {
      setError("Recovery မအောင်မြင်ပါ: " + err.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleEmergency}>
      <div style={{ background: `${C.err}12`, border: `1px solid ${C.err}30`, borderRadius: 8, padding: "10px 13px", marginBottom: 18, fontSize: 11.5, color: C.err }}>
        ⚠️ Emergency Recovery Mode — Admin အကောင့်အသစ် ဖန်တီးပါ။
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: C.txM, display: "block", marginBottom: 4, fontWeight: 600 }}>RECOVERY KEY</label>
        <input type="password" value={form.key} onChange={set("key")} placeholder="Enter Secret Key" style={inp(focusedField === "key")} onFocus={() => setFocused("key")} onBlur={() => setFocused("")} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: C.txM, display: "block", marginBottom: 4, fontWeight: 600 }}>NEW ADMIN EMAIL</label>
        <input type="email" value={form.email} onChange={set("email")} placeholder="working@email.com" style={inp(focusedField === "email")} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: C.txM, display: "block", marginBottom: 4, fontWeight: 600 }}>PASSWORD</label>
        <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" style={inp(focusedField === "password")} onFocus={() => setFocused("password")} onBlur={() => setFocused("")} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: C.txM, display: "block", marginBottom: 4, fontWeight: 600 }}>DISPLAY NAME</label>
        <input type="text" value={form.displayName} onChange={set("displayName")} placeholder="e.g. Admin New" style={inp(focusedField === "displayName")} onFocus={() => setFocused("displayName")} onBlur={() => setFocused("")} />
      </div>
      {error && (
        <div style={{ background: `${C.err}15`, border: `1px solid ${C.err}35`, borderRadius: 7, padding: "9px 12px", marginBottom: 14, fontSize: 11, color: C.err }}>
          ⚠ {error}
        </div>
      )}
      <button type="submit" disabled={loading || !form.key || !form.email || !form.password} style={gradBtn(loading)}>
        {loading ? "Creating..." : "Create Emergency Admin →"}
      </button>
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <span onClick={onBack} style={{ fontSize: 11, color: C.pri, cursor: "pointer", fontWeight: 600 }}>← Back to Login</span>
      </div>
    </form>
  );
}

// ── Reset Password Form ───────────────────────────────────────────────────
function ResetForm({ onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocused] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    setMsg("");
    try {
      await resetUserPassword(email);
      setMsg("Password reset email ပို့လိုက်ပါပြီ။ သင့် Inbox ကို စစ်ဆေးကြည့်ပါ");
    } catch (err) {
      setError("Reset မအောင်မြင်ပါ: " + err.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleReset}>
      <div style={{ background: `${C.inf}10`, border: `1px solid ${C.inf}30`, borderRadius: 8, padding: "10px 13px", marginBottom: 18, fontSize: 11.5, color: C.inf }}>
        🔑 Password မေ့နေပါသလား? သင်၏ Email ထည့်ပေးပါ။
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: C.txM, display: "block", marginBottom: 5, fontWeight: 600, letterSpacing: "0.5px" }}>EMAIL</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          style={inp(focusedField === "email")}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused("")}
        />
      </div>
      {error && (
        <div style={{ background: `${C.err}15`, border: `1px solid ${C.err}35`, borderRadius: 7, padding: "9px 12px", marginBottom: 14, fontSize: 11, color: C.err }}>
          ⚠ {error}
        </div>
      )}
      {msg && (
        <div style={{ background: `${C.suc}15`, border: `1px solid ${C.suc}35`, borderRadius: 7, padding: "9px 12px", marginBottom: 14, fontSize: 11, color: C.suc }}>
          ✅ {msg}
        </div>
      )}
      <button type="submit" disabled={loading || !email} style={gradBtn(loading || !email)}>
        {loading ? "Sending..." : "Send Reset Link →"}
      </button>
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <span onClick={onBack} style={{ fontSize: 11, color: C.pri, cursor: "pointer", fontWeight: 600 }}>← Back to Login</span>
      </div>
    </form>
  );
}

// ── Login Form ─────────────────────────────────────────────────────────────
function LoginForm({ onLogin, onForgotPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocused] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await authSignIn(email, password);
      // App.js onAuthChange will handle the rest
    } catch (err) {
      const code = err.code || "";
      if (code.includes("wrong-password") || code.includes("user-not-found") || code.includes("invalid-credential") || code.includes("invalid-email")) {
        setError("Email သို့ Password မမှန်ကန်ပါ");
      } else if (code.includes("too-many-requests")) {
        setError("ကြိုးစားမှု အကြိမ်များလွန်းပါသည်။ ခဏစောင့်ပြီး ထပ်ကြိုးစားပါ");
      } else {
        setError("Login မအောင်မြင်ပါ: " + err.message);
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin}>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: C.txM, display: "block", marginBottom: 5, fontWeight: 600, letterSpacing: "0.5px" }}>EMAIL</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="username"
          style={inp(focusedField === "email")}
          onFocus={() => setFocused("email")}
          onBlur={() => setFocused("")}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: C.txM, display: "block", marginBottom: 5, fontWeight: 600, letterSpacing: "0.5px" }}>PASSWORD</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          style={inp(focusedField === "password")}
          onFocus={() => setFocused("password")}
          onBlur={() => setFocused("")}
        />
      </div>
      <div style={{ textAlign: "right", marginBottom: 18 }}>
        <span onClick={onForgotPassword} style={{ fontSize: 11, color: C.txD, cursor: "pointer", transition: "color 0.2s" }} onMouseEnter={e => e.target.style.color = C.pri} onMouseLeave={e => e.target.style.color = C.txD}>
          Forgot Password?
        </span>
      </div>
      {error && (
        <div style={{ background: `${C.err}15`, border: `1px solid ${C.err}35`, borderRadius: 7, padding: "9px 12px", marginBottom: 14, fontSize: 12, color: C.err }}>
          ⚠ {error}
        </div>
      )}
      <button type="submit" disabled={loading || !email || !password} style={gradBtn(loading || !email || !password)}>
        {loading ? "Signing in..." : "Sign In →"}
      </button>
    </form>
  );
}

// ── First-Time Admin Setup Form ────────────────────────────────────────────
function SetupForm() {
  const [form, setForm] = useState({ displayName: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocused] = useState("");
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSetup = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Password မတူပါ"); return; }
    if (form.password.length < 6) { setError("Password အနည်းဆုံး ၆ လုံး ထည့်ပါ"); return; }
    setLoading(true);
    setError("");
    try {
      await setupFirstAdmin(form.email, form.password, form.displayName);
      // onAuthStateChanged will pick up the new login automatically
    } catch (err) {
      setError("Setup မအောင်မြင်ပါ: " + err.message);
    }
    setLoading(false);
  };

  const fields = [
    { k: "displayName", label: "YOUR NAME", placeholder: "e.g. Admin User", type: "text" },
    { k: "email", label: "EMAIL", placeholder: "admin@mu.com", type: "email" },
    { k: "password", label: "PASSWORD (min 6 chars)", placeholder: "••••••••", type: "password" },
    { k: "confirm", label: "CONFIRM PASSWORD", placeholder: "••••••••", type: "password" },
  ];

  return (
    <form onSubmit={handleSetup}>
      <div style={{ background: `${C.wrn}12`, border: `1px solid ${C.wrn}30`, borderRadius: 8, padding: "10px 13px", marginBottom: 18, fontSize: 11.5, color: C.wrn }}>
        🔐 First Time Setup — Admin Account ဖန်တီးပါ
      </div>
      {fields.map(({ k, label, placeholder, type }) => (
        <div key={k} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: C.txM, display: "block", marginBottom: 4, fontWeight: 600, letterSpacing: "0.5px" }}>{label}</label>
          <input
            type={type}
            value={form[k]}
            onChange={set(k)}
            placeholder={placeholder}
            style={inp(focusedField === k)}
            onFocus={() => setFocused(k)}
            onBlur={() => setFocused("")}
          />
        </div>
      ))}
      {error && (
        <div style={{ background: `${C.err}15`, border: `1px solid ${C.err}35`, borderRadius: 7, padding: "9px 12px", marginBottom: 14, fontSize: 12, color: C.err }}>
          ⚠ {error}
        </div>
      )}
      <button type="submit" disabled={loading || !form.email || !form.password || !form.displayName} style={gradBtn(loading || !form.email || !form.password || !form.displayName)}>
        {loading ? "Creating..." : "Create Admin Account →"}
      </button>
    </form>
  );
}

// ── Main LoginPage ─────────────────────────────────────────────────────────
export default function LoginPage({ isFirstTime }) {
  const [view, setView] = useState("login"); // "login" | "reset" | "recovery"

  return (
    <div style={{ height: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif", position: "relative", overflow: "hidden" }}>
      {/* Background glow orbs */}
      <div style={{ position: "absolute", top: "-20%", left: "-15%", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle,${C.pri}12,transparent 65%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-20%", right: "-15%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle,${C.inf}10,transparent 65%)`, pointerEvents: "none" }} />

      <div style={{ background: C.sf, border: `1px solid ${C.bdr}`, borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 400, position: "relative", zIndex: 1, boxShadow: "0 25px 80px rgba(0,0,0,0.5)" }}>
        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", margin: "0 auto 12px", boxShadow: `0 8px 28px ${C.pri}50, 0 0 0 3px ${C.pri}30` }}>
            <img src="/logo.jpg" alt="Mahar Unity" style={{ width: "100%", height: "100%", objectFit: "cover" }} onDoubleClick={() => setView("recovery")} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.txt, letterSpacing: "0.5px" }}>MAHAR UNITY</div>
          <div style={{ fontSize: 10, color: C.txD, letterSpacing: "2.5px", marginTop: 3, textTransform: "uppercase" }}>SRPS Accounting System</div>
        </div>

        {isFirstTime ? (
          <SetupForm />
        ) : (
          view === "login" ? (
            <LoginForm onForgotPassword={() => setView("reset")} />
          ) : view === "reset" ? (
            <ResetForm onBack={() => setView("login")} />
          ) : (
            <RecoveryForm onBack={() => setView("login")} />
          )
        )}

        <div style={{ textAlign: "center", marginTop: 22, fontSize: 10, color: C.txD }}>
          Mahar Unity (Thailand) Co., Ltd. © 2026
        </div>
      </div>
    </div>
  );
}
