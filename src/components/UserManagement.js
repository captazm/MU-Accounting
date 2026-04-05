import React, { useState, useEffect } from "react";
import { C, Btn, Badge } from "./UI";
import { fetchAllUsers, createUser, toggleUserActive } from "../services/auth";

const inp = {
  background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 6,
  color: C.txt, padding: "7px 10px", fontSize: 12, outline: "none",
  width: "100%", boxSizing: "border-box",
};

const ROLES = ["accountant", "admin"];

export default function UserManagement({ currentUser, showT }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ displayName: "", email: "", password: "", role: "accountant" });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    const all = await fetchAllUsers();
    // Sort: admins first, then by displayName
    all.sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (b.role === "admin" && a.role !== "admin") return 1;
      return (a.displayName || "").localeCompare(b.displayName || "");
    });
    setUsers(all);
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.displayName) { setFormError("အချက်အလက်အားလုံး ဖြည့်ပါ"); return; }
    if (form.password.length < 6) { setFormError("Password အနည်းဆုံး ၆ လုံး"); return; }
    setCreating(true);
    setFormError("");
    try {
      await createUser(form.email, form.password, form.role, form.displayName, currentUser.uid);
      showT(`${form.displayName} (${form.role}) account ဖန်တီးပြီး`, "ok");
      setForm({ displayName: "", email: "", password: "", role: "accountant" });
      setShowForm(false);
      await loadUsers();
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setFormError("ဤ email ဖြင့် account ရှိပြီးဖြစ်သည်");
      } else {
        setFormError("Error: " + err.message);
      }
    }
    setCreating(false);
  };

  const handleToggle = async (uid, currentActive) => {
    if (uid === currentUser.uid) { showT("မိမိ account ကိုယ်တိုင် disable မလုပ်နိုင်ပါ", "err"); return; }
    const ok = await toggleUserActive(uid, !currentActive);
    if (ok) {
      setUsers(users.map(u => u.uid === uid ? { ...u, active: !currentActive } : u));
      showT(`User ${!currentActive ? "activated" : "disabled"}`);
    }
  };

  const thS = { padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 600, color: C.txM, textTransform: "uppercase", letterSpacing: "0.5px", background: C.card, borderBottom: `1px solid ${C.bdr}`, whiteSpace: "nowrap" };
  const tdS = { padding: "8px 10px", borderBottom: `1px solid ${C.bdr}18`, fontSize: 11.5 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>System Users</div>
          <div style={{ fontSize: 11, color: C.txD, marginTop: 2 }}>{users.length} accounts registered</div>
        </div>
        <Btn onClick={() => { setShowForm(!showForm); setFormError(""); }}>
          {showForm ? "✕ Cancel" : "+ Add User"}
        </Btn>
      </div>

      {/* Add User Form */}
      {showForm && (
        <div style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 14, color: C.txM }}>New User</div>
          <form onSubmit={handleCreate}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 4, fontWeight: 600, letterSpacing: "0.5px" }}>DISPLAY NAME *</label>
                <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="e.g. Ko Aung" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 4, fontWeight: 600, letterSpacing: "0.5px" }}>ROLE *</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inp}>
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 4, fontWeight: 600, letterSpacing: "0.5px" }}>EMAIL *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.txM, display: "block", marginBottom: 4, fontWeight: 600, letterSpacing: "0.5px" }}>PASSWORD * (min 6)</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" style={inp} />
              </div>
            </div>
            {formError && (
              <div style={{ background: `${C.err}15`, border: `1px solid ${C.err}30`, borderRadius: 6, padding: "7px 11px", marginBottom: 12, fontSize: 11.5, color: C.err }}>
                ⚠ {formError}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn v="sec" onClick={() => setShowForm(false)}>Cancel</Btn>
              <Btn v="ok" disabled={creating} onClick={handleCreate}>{creating ? "Creating..." : "Create Account"}</Btn>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.txD }}>Loading users...</div>
      ) : (
        <div style={{ borderRadius: 8, border: `1px solid ${C.bdr}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Email", "Role", "Created", "Status", "Action"].map(h => (
                  <th key={h} style={thS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isMe = u.uid === currentUser.uid;
                return (
                  <tr key={u.uid} style={{ background: isMe ? `${C.pri}06` : "transparent" }}>
                    <td style={tdS}>
                      <div style={{ fontWeight: 600, color: C.txt }}>{u.displayName || "—"}</div>
                      {isMe && <div style={{ fontSize: 9.5, color: C.pri, marginTop: 1 }}>● You</div>}
                    </td>
                    <td style={{ ...tdS, color: C.txM }}>{u.email}</td>
                    <td style={tdS}>
                      <Badge t={u.role === "admin" ? "Admin" : "Accountant"} c={u.role === "admin" ? "purple" : "blue"} />
                    </td>
                    <td style={{ ...tdS, color: C.txD, fontSize: 10.5 }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td style={tdS}>
                      <Badge t={u.active !== false ? "Active" : "Disabled"} c={u.active !== false ? "green" : "red"} />
                    </td>
                    <td style={tdS}>
                      {!isMe && (
                        <Btn v={u.active !== false ? "err" : "ok"} s={{ fontSize: 10, padding: "3px 9px" }}
                          onClick={() => handleToggle(u.uid, u.active !== false)}>
                          {u.active !== false ? "Disable" : "Enable"}
                        </Btn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
