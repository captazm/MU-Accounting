# 🚢 MAHAR UNITY SRPS — Accounting App Documentation

> **Mahar Unity Company Limited (Marine Services)** — Seafarer Recruitment & Payroll System
> Version: April 2026 | Stack: React + Firebase (Firestore, Auth, Storage, Hosting)

---

## 📋 မာတိကာ

1. [App Overview](#1-app-overview)
2. [Authentication & Roles](#2-authentication--roles)
3. [Sidebar Navigation](#3-sidebar-navigation)
4. [Menu 1 — Dashboard](#4-menu-1--dashboard)
5. [Menu 2 — Crew Registry](#5-menu-2--crew-registry)
6. [Menu 3 — Monthly Billing](#6-menu-3--monthly-billing)
7. [Menu 4 — Reconciliation](#7-menu-4--reconciliation)
8. [Menu 5 — Payment Distribution Hub (5-tab workflow)](#8-menu-5--payment-distribution-hub)
9. [Menu 6 — Status Board](#9-menu-6--status-board)
10. [Menu 7 — User Management](#10-menu-7--user-management)
11. [Business Logic — Salary, DEP Fees, Leave Pay](#11-business-logic--salary-dep-fees-leave-pay)
12. [End-to-End Workflow](#12-end-to-end-workflow)
13. [Data Schema](#13-data-schema)
14. [Firestore & Security](#14-firestore--security)

---

## 1. App Overview

**Mahar Unity SRPS Accounting App** သည် သင်္ဘောသား (Seafarers) များ၏ ငွေတောင်းခံမှုနှင့် လစာထုတ်ပေးခြင်းကို စီမံခန့်ခွဲသော web-based accounting system ဖြစ်သည်။

### Core Features

| # | Module | ရည်ရွယ်ချက် |
|---|--------|--------------|
| 1 | **Crew Registry** | Crew အချက်အလက် (salary, bank, DEP fees, leave pay) သိမ်းခြင်း |
| 2 | **Monthly Billing** | Client (ship owner) ထံ လစဉ် Invoice ထုတ်ခြင်း |
| 3 | **Reconciliation** | Bank slip OCR validation ဖြင့် Invoice ငွေ matching |
| 4 | **Payment Distribution Hub** | 5-stage workflow (Edit → Approve → Distribute → Verify → Paid) |
| 5 | **Status Board** | Crew တစ်ဦးချင်း payment status by month |
| 6 | **Dashboard** | KPI overview, top clients, payment progress |
| 7 | **User Management** | Admin / Accountant role assignment |

### Technology Stack

- **Frontend:** React 18 (CRA) — single `App.js`, inline styles, no Tailwind
- **Backend:** Firebase Firestore (real-time DB), Firebase Auth (email/password), Firebase Storage (slip uploads)
- **PDF Export:** Browser native `window.print()` with custom HTML templates
- **OCR:** Tesseract.js (in-browser) for bank slip amount validation
- **Hosting:** Firebase Hosting

---

## 2. Authentication & Roles

### Login

App ဖွင့်လျှင် Login Page ပေါ်လာသည်။ Firebase Auth ဖြင့် email/password login လုပ်ရသည်။

**First-time Setup:** Firestore မှာ user တစ်ဦးမှမရှိသေးပါက ပထမဆုံး user ကို **Admin** အဖြစ် auto-create လုပ်သည်။

### Role Types

| Role | Permission |
|------|------------|
| **Admin** | All actions: approve payroll, mark paid, delete records, user management |
| **Accountant** | Most read/write actions, EXCEPT: cannot approve, cannot mark paid, cannot delete |

### Role-based UI

- Admin only menu — **User Management** tab ပေါ်သည်
- Admin only buttons — **Approve**, **Mark Paid**, **Delete** buttons ပေါ်သည်
- Inactive users (Firestore `users/{uid}.active = false`) login ဝင်လို့မရ

---

## 3. Sidebar Navigation

```
┌─────────────────────────────┐
│  [M] MAHAR UNITY            │  ← Logo (နှိပ်ရင် sidebar collapse/expand)
│      SRPS ACCOUNTING        │
├─────────────────────────────┤
│  📊 Dashboard               │
│  👥 Crew Registry           │
│  📄 Monthly Billing         │
│  🔄 Reconciliation          │
│  💸 Payment Dist.           │
│  📋 Status Board            │
│  👤 User Management         │  ← Admin only
├─────────────────────────────┤
│  [Avatar] User Name         │
│  ● admin / accountant       │
│  ● Firestore Live · 145 crew│
│  → Sign Out                 │
└─────────────────────────────┘
```

- **Sidebar collapsed mode** — icons only, hover ဖြင့် label ပေါ်
- **Live status indicator** — အစိမ်း dot = Firestore connected, ဝါ = connecting
- **Top bar** — Active menu name + current date + connection status

---

## 4. Menu 1 — Dashboard

**Tab ID:** `dashboard`

### လုပ်ဆောင်ချက်

App overview ကို တစ်နေရာထဲ ကြည့်ရှုနိုင်သည် — month picker ဖြင့် မည်သည့် salary month ကို focus လုပ်မည်ကို ရွေးနိုင်သည်။

### Layout

**1. Month Selector Bar**
- `‹  2026-04 ▼  ›` — month picker
- `Salary: April 2026 → Payment expected: May 2026` (salary month vs payment month)

**2. Summary Stats (4 cards)**

| Card | ပြသသည် | Click |
|------|---------|-------|
| 👥 **Total Crew** | စုစုပေါင်း crew + vessel count | → Crew Registry |
| 📄 **Bills This Month** | လအတွင်း bill အရေအတွက် + total USD | → Monthly Billing |
| 💰 **Received** | လက်ခံပြီးသား USD + ကျန်ငွေ | — |
| ✅ **Salary Paid** | `paid/total` crew + `%` | → Status Board |

**3. Salary Payment Progress Bar**
- Linear progress bar (cyan→green gradient)
- Legend: 🟢 Paid · 🔵 Slip Received · 🟡 Pending

**4. Top Clients Bar Chart**
- Top 8 clients by `ownerPaid` total (descending)
- Horizontal bars with crew count per client

---

## 5. Menu 2 — Crew Registry

**Tab ID:** `crew`

### လုပ်ဆောင်ချက်

Crew (seafarer) တစ်ဦးချင်း၏ master data ကို စီမံခန့်ခွဲခြင်း — salary, DEP fees, leave pay, bank accounts, etc.

### Filter Bar

```
[🔍 Search name/ID...]   [All Vessels ▼]   [All Clients ▼]
```

### Crew Table — Columns

| Column | အဓိပ္ပါယ် |
|--------|----------|
| **No** | Sequential number |
| **ID** | Unique ID (C001, C002...) |
| **Name** | Crew full name |
| **Rank** | 2O, 3E, AB, OS, Master, Chief, etc. |
| **Vessel** | သင်္ဘောအမည် |
| **Client** | Ship owner / agent |
| **Join** | Sign-on date |
| **OwnerPaid** | Owner က MU ကို ပေးတဲ့ ငွေ (salary + manning fees ပေါင်း) |
| **Salary** | Crew ၏ actual monthly salary (USD) |
| **DEP FEES** | Departure fees per month |
| **Paid Dep** | သင်္ဘောမတက်ခင် ပေးခဲ့သော DEP fees |
| **Bal Dep** | ကျန်ရှိနေသော DEP fees balance |
| **Manning** | Manning fee (MU commission, owner side ဖြတ်) |
| **Leave Pay** | Leave pay per month (registry rate) |
| **Leave Pay (Acc)** | Auto-accumulated leave pay (ပေးရန်ကျန်) |
| **Bank/Acc No/Acc Name** | Primary bank details |
| **Type** | bank / cash |
| **Remark** | မှတ်ချက် |

### Crew တစ်ဦး Add/Edit လုပ်ခြင်း

**Add New** button နှိပ်ရင် modal ပေါ်လာသည်:

**Required field:** Name *

**Numerical fields:** ownerPaid, salary, office (DEP fees/month), paidDepFees, balanceDepFees, manningFees, leavePay

**Read-only field:** `accumulatedLeavePay` — payment process ပြီးတိုင်း auto-update ဖြစ်သည်

**Bank Accounts (Multi-bank support):**
- Crew တစ်ဦးတည်းမှာ bank account များစွာ register လုပ်နိုင်သည်
- ပထမဆုံး account က Primary (top-level fields ထဲကို sync ဖြစ်)
- KBZ, AYA, A Bank, CB, MAB, Yoma, Kpay, Aya Pay, Other တို့ ရှိသည်

**Bulk CSV Import:** CSV file တစ်ခုလုံးကို တစ်ခါတည်း import လုပ်နိုင်သည် (headers: name, rank, vessel, client, ownerpaid, salary, office, manningfees, leavepay, paiddepfees, balancedepfees, etc.)

---

## 6. Menu 3 — Monthly Billing

**Tab ID:** `billing`

### လုပ်ဆောင်ချက်

Client (ship owner) ထံ ပို့ရမည့် monthly invoice (bill) ကို generate, edit, send လုပ်ရန်။

### Generate Bill

```
[Client ▼]   [Month: 2026-04]   [Generate]
```

**Special client groups:**
- `Mr.Xing & Mr.Zhong` → XING + MR.ZHONG client list ပေါင်း
- `CHH (All)` → "CHH" ဖြင့် စသော client အားလုံး ပေါင်း

**Auto-calculation per crew:**

```
For each crew:
   Days in Month (DIM)        = day count of selected month
   Days on Board (DOB)        = DIM, OR pro-rated by joinDate
   Officer? (master|chief|officer|engineer|cadet)
       Leave pay rate         = 5% (Officer) | 10% (Rating)
   Actual HA (ha)             = ownerPaid × DOB/DIM
   Actual Manning             = manningFees × DOB/DIM
   Actual Leave Pay           = (salary × leaveRate) × DOB/DIM
   DEP Fee Deducted           = balanceDepFees (default — adjustable)
   Total Payment (Owner)      = HA + bonus + pdeFees + visaFees + workingGear − POB
   Net Crew Pay               = TotalPayment − Manning − LeavePay − DepFeeDed
```

### Bill Status Flow

```
Draft → [Send] → Sent → [Reconcile] → Paid
       ↑           |
       └──[Revise]─┘
```

| Status | အဓိပ္ပါယ် |
|--------|----------|
| **Draft** | Editable, fees ထည့်/ပြင်နိုင် |
| **Sent** | Client ထံ ပို့ပြီး — read-only (Revise နှိပ်ရင် Draft ပြန်ဖြစ်) |
| **Paid** | Reconciliation ပြီးသား |

### Bill Details Table — 19 columns

| Column | Edit (Draft) | Description |
|--------|--------------|-------------|
| Name, Sign On, Wages/M, From, To | ❌ | Crew + period info |
| Days on Board | ✏️ | Auto-recalc HA/Manning/LeavePay |
| Days of Month | ❌ | Read-only |
| Actual HA | ❌ | Auto-calculated |
| **POB(-)** | ✏️ | Paid On Board (deducts from Owner Total) |
| Bonus, PDE Fees, VISA, WG | ✏️ | Adjustable additions |
| **Owner Total** | ❌ | `HA + Bonus + PDE + VISA + WG − POB` |
| Manning(-) | ❌ | Auto from registry |
| Leave(-) | ❌ | Auto by officer/rating rate |
| **DepFee(-)** | ✏️ | DEP fee deduction this month |
| **Crew Net** | ❌ | `Owner Total − Manning − Leave − DepFee` |
| Remark | ✏️ | Bill-specific note |

### Export Options

- **📊 Download Excel** — CSV download
- **📄 PDF Version** — Printable PDF with letterhead, bank info

### Bank Remittance (Bottom of Bill)

Default values (editable in Draft):
- Account No: `840-096-0029-001674-501`
- Account Name: `Mahar Unity (Thailand) Company Limited`
- Bank: `Bangkok Bank`
- SWIFT: `BKKBTHBK`
- Remark: "Manning fee calculated upon 30 days, no overlap"

---

## 7. Menu 4 — Reconciliation

**Tab ID:** `reconcile`

### လုပ်ဆောင်ချက်

Client ဆီကရတဲ့ ငွေလွှဲ slip ကို OCR ဖြင့် validate လုပ်ပြီး Bill နဲ့ matching စစ်ဆေးခြင်း — match ဖြစ်ရင် auto-generate payroll records (Pending status).

### Workflow

```
1. Select Bill         → Sent status bill ရွေး
2. Upload Bank Slip    → Image upload → OCR scan
                          ✅ Match    → Amount auto-fill
                          ❌ Mismatch → Manual entry
3. Enter Ref + Date
4. [Reconcile & Generate Payroll]
```

### OCR Validation

- Tesseract.js ကို browser ထဲမှာ run လုပ်သည်
- Bank slip image ထဲက number အားလုံးကို scan
- Bill total (USD) နဲ့ exact match ရှိရင် ✅
- Match မရှိရင် largest number ကို warning ဖြင့် ပြ

### Matching Logic

```
Diff = ClientPaid − BillTotal
|Diff| < $0.01    → ✅ MATCH    → Bill: Paid + Generate payroll records
|Diff| >= $0.01   → ⚠️ MISMATCH → Hold for manual review
```

### Payroll Auto-Generation (on Match)

`genPayrollFromBill(bill, slipUrl)` — Bill ထဲက crew တစ်ဦးချင်းအတွက်:

- New `crewPayments` doc create လုပ်သည် (status = `Pending`)
- All bill fields copy: salary, ownerPaid, actualHA, manning, leavePay, depFeeDed, etc.
- Identity preserved: slipId (= bill.id), crewId, vessel, client, month
- → User is sent to **Payment Distribution Hub** for next steps

### Payment History Table

| Column | Description |
|--------|-------------|
| ID | PAY-001, PAY-002... |
| Bill | Linked bill ID |
| Client | Bill client |
| Amount | Received USD |
| Ref | Bank reference |
| Date | Receipt date |
| Status | Matched / Mismatch |
| Slip | View slip image |

---

## 8. Menu 5 — Payment Distribution Hub

**Tab ID:** `dist`

5-tab workflow ဖြင့် payroll lifecycle ကို စီမံ — Edit → Approve → Distribute → Verify → Paid

```
┌─────────┬───────────┬──────────────┬──────────────┬──────────────┐
│ Edit &  │   Admin   │ Distribution │ Verification │     Paid     │
│ Submit  │ Approval  │              │              │   History    │
└─────────┴───────────┴──────────────┴──────────────┴──────────────┘
   ↓          ↓             ↓              ↓
Pending → ReadyForApproval → Approved → Processed → Paid
```

### Tab 1 — ✏️ Edit & Submit (Accountant)

**Pending records** ကို edit လုပ်ရန် (auto-generated from Reconciliation).

**Edit Modal** ပါတဲ့ section ၃ ခု:

**A. Earnings (Crew Receives)** — editable
- Basic Salary (registry မှ default)
- Bonus, PDE Fees, Visa Fees, Working Gear, Leave Pay (Refunded)

**B. Deductions** — editable
- DEP Fees / Month, Paid DEP Fees, Balance DEP Fees, DEP Fee Deducted, Leave Pay

**C. Adjust for Actual Payment**
- Actual Gross Amount (USD), Bank Charge, Other Deductions, Extra Bonus

**Final Net Pay Preview** — real-time calculation:
```
Net = Gross + Bonus − BankCharge − OtherDed
```

**Submit:** `[✓ Submit for Admin Approval]` → status: `ReadyForApproval`

### Tab 2 — Admin Approval

**ReadyForApproval** records ကို Admin က review/approve လုပ်ရန်။

Table columns: Crew, Vessel, Gross, Bank Chg, Ded., Bonus, Net Total, Bank, Remark

**Action:** `[Approve]` (Admin only) → status: `Approved`

### Tab 3 — Distribution

**Approved** records ကို print/process လုပ်ရန်။

Per-row actions:
- **🖨️ Slip** — Generate full payslip PDF (full salary breakdown + MMK conversion)
- **✂️ Split** — Single payment ကို multiple bank accounts ထဲ chain split
- **Process Done** → status: `Processed`

**Split Payment Modal:**
- Crew ၏ registered banks ကို auto-load
- USD amount ကို account တစ်ခုချင်း ခွဲ assign
- Total verification (remaining = 0 ဖြစ်မှ confirm နိုင်)
- Each split → separate `crewPayments` doc with `-S1`, `-S2` suffix

### Tab 4 — Verification (Signed Slip Upload)

**Processed** records ကို signed slip ဖြင့် verify လုပ်ရန်။

Per-row UI:
- **Slip column** — `👁️ View Slip` link + `✓ Uploaded` badge (or `⚠ Missing`)
- **Action column:**
  - Slip မရှိရင်: **📎 Upload Slip** (file picker, image/PDF)
  - Slip ရှိပြီးရင်: **🔄 Replace** + (Admin: **✓ Mark Paid**)
  - Non-admin: "Waiting for admin"

**Upload location:** Firebase Storage `signedSlips/{paymentId}_{timestamp}_{filename}`

**Mark Paid (Admin only):**
- status → `Paid`
- Crew registry update:
  - `paidDepFees += depFeeDed`
  - `balanceDepFees -= depFeeDed`
  - `accumulatedLeavePay += actLeavePay`

### Tab 5 — Paid History

Selected month ၏ Paid records list — Crew Name, Amount, Paid Date.

### Bonus Features

**Manual Payment** — Top right `[➕ Manual Payment]`:
- Bill ကို သွားစရာမလို — emergency leave pay လို ad-hoc payment
- slipId = "AD-HOC", status = Pending → flows through normal workflow

### Payroll Reporting Section (Below tabs)

Bill group cards bills.id ဖြင့် group လုပ်ထား:
- **Header:** Client name, month, bill ID, vessel, `submitted/total` count
- **Crew Avatar Dots** — bill ထဲက crew တစ်ဦးချင်း 22px circle
  - Paid 🟢 | Approved/Processed 🔵 | Submitted 🔵 | Pending ⬜ (dashed)
  - Hover tooltip: name + status
- **Submitted crew chips** — name, rank, USD amount, status label
- **Pending crew chips** — dashed border, dim, "Pending" label
- **✓ Complete badge** — အားလုံး submit ပြီးရင် show
- **[View Report]** → opens detailed Payroll Report Modal

### Payroll Report Modal (Per-Crew Breakdown)

**Header:** Exchange Rate input + Bill info + Export buttons

**Per-Crew Card** (3-column):

| EARNINGS | DEDUCTIONS | NET PAY & MMK |
|----------|------------|---------------|
| Basic Salary | DEP Fees/Mo | Gross Amount |
| Bonus | Paid DEP | − Bank Charge |
| PDE Fees | Bal DEP | − Other Ded |
| Visa Fees | DEP Deducted | + Extra Bonus |
| Working Gear | Leave Pay | **Net USD** |
| Leave Pay (Ref) | | **MMK Conversion** (editable B.Chg/Ref/Ded) |
| | | **Total MMK** |

**Grand Total Footer:** USD + MMK across all crew

**Export Buttons:**
- 📄 PDF Summary (full payroll table)
- 📄 Bank PDF (bank transfer instruction list, MMK)
- 📄 Cash PDF (cash pickup signature list)

---

## 9. Menu 6 — Status Board

**Tab ID:** `board`

### လုပ်ဆောင်ချက်

Selected salary month အတွက် crew တစ်ဦးချင်း payment status ကို color-coded view ဖြင့် ကြည့်ရှုခြင်း။

### Layout

**1. Month Selector** — `‹ 2026-04 ▼ ›`

**2. Status Cards (3)**

| Card | အဓိပ္ပါယ် | Color |
|------|----------|-------|
| **Paid** | CPAY status = Paid | 🟢 Green |
| **Slip Rcv** | Bank slip uploaded | 🟣 Purple |
| **Pending** | No payment yet | 🟡 Yellow |

**3. Filter Bar** — Search/Vessel/Client

**4. Crew Table** — Each row colored by status (left border accent)

| No | ID | Name | Rank | Vessel | Client | Wages/M | Status |

---

## 10. Menu 7 — User Management

**Tab ID:** `users` (Admin only)

### လုပ်ဆောင်ချက်

User accounts ကို create, deactivate, role assign လုပ်ရန် (Admin သာ access ရ).

User fields:
- displayName, email, role (admin/accountant), active (true/false)

---

## 11. Business Logic — Salary, DEP Fees, Leave Pay

### A. OwnerPaid vs Salary

```
ownerPaid (Owner → MU)  =  salary (Crew receives)  +  manningFees (MU commission)
```

- **OwnerPaid** = Owner က MU ကို ပေးတဲ့ total (salary + manning bundled)
- **Salary** = Crew ၏ actual contract salary (payslip မှာ ဒါကို base ယူ)
- **Manning Fee** = MU ၏ commission, owner side မှာ ဖြတ်ပြီး crew payslip မှာ မပြ

### B. DEP Fees (Departure Fees)

One-time fee crew က MU ကို သင်္ဘောမတက်ခင် ပေးရတဲ့ fee:

```
ဥပမာ — DEP Fees = $600
Crew က $300 ပေးခဲ့ (paidDepFees = 300, balanceDepFees = 300)
       ↓
ပထမလ payroll တွင် depFeeDed = 300 (or partial if requested)
       ↓
Mark Paid လုပ်ရင် auto-update:
  paidDepFees    += 300  → 600
  balanceDepFees -= 300  → 0
```

**Multi-month split:** Crew က request လုပ်ရင် 1/2/3 လ ခွဲ ဖြတ်နိုင်သည် (depFeeDed ကို manually adjust လုပ်)

### C. Leave Pay

```
Officer (master|chief|officer|engineer|cadet)  →  5% of salary/month
Rating (other ranks)                            → 10% of salary/month

actLeavePay = (salary × rate) × DOB/DIM
```

**Accumulation:** Mark Paid လုပ်တိုင်း `accumulatedLeavePay += actLeavePay` → Crew sign-off လုပ်တဲ့အခါ ပြန်ပေး

### D. Bank Charges

```
Bank Charge (USD) = 5 USD       (default)
                  = 0 USD       (if salary < $200, exempted)
Bank Charge (MMK) = 200 MMK     (always, fixed)

Net MMK = (Net USD − BankChargeUSD) × ExchangeRate − 200
```

### E. Pro-Rata Calculation

```
joinDate က လအတွင်း ဖြစ်ရင်:
  Days on Board = monthEnd − joinDate.day + 1
joinDate က လနောက်ပိုင်း ဖြစ်ရင်:
  Days on Board = 0 (skip — bill ထဲ မပါ)
ပုံမှန် ဖြစ်ရင်:
  Days on Board = Days in Month (full month)

Actual HA / Manning / LeavePay = (Full Amount) × DOB/DIM
```

---

## 12. End-to-End Workflow

```
╔═══════════════════════════════════════════════════════════════════╗
║          MAHAR UNITY SRPS — Complete Lifecycle (Apr 2026)        ║
╚═══════════════════════════════════════════════════════════════════╝

[1] Crew Setup (Crew Registry)
    └─ Add crew with salary, DEP fees, manning fees, bank accounts

[2] Monthly Billing
    └─ Select Client + Month → Generate Bill (Draft)
    └─ Edit POB, bonus, PDE, visa, working gear, depFeeDed
    └─ [Send] → Status: Sent → Email PDF to Client

[3] Client Wires Money to Bangkok Bank

[4] Reconciliation
    └─ Select Bill → Upload bank slip → OCR validates amount
    └─ [Reconcile & Generate Payroll]
        ↓ MATCH
    └─ Bill: Paid + crewPayments docs created (Pending)
        ↓ MISMATCH
    └─ Manual review with Client

[5] Payment Distribution Hub — 5-stage workflow

    Stage 1 — Edit & Submit (Accountant)
       └─ Edit each Pending record → adjust earnings/deductions
       └─ [Submit] → status: ReadyForApproval

    Stage 2 — Admin Approval (Admin only)
       └─ Review submitted records
       └─ [Approve] → status: Approved

    Stage 3 — Distribution
       └─ [🖨️ Slip] — Print payslip with MMK conversion
       └─ [✂️ Split] — Distribute across multiple banks (optional)
       └─ [Process Done] → status: Processed

    Stage 4 — Verification (Signed Slip Upload)
       └─ [📎 Upload Slip] — Upload signed payment proof to Storage
       └─ Admin: [✓ Mark Paid] → status: Paid
       └─ AUTO: paidDepFees↑, balanceDepFees↓, accumulatedLeavePay↑

    Stage 5 — Paid History
       └─ Selected month ၏ paid records review

[6] Status Board
    └─ Per-crew payment status dashboard
```

---

## 13. Data Schema

### `crew` collection

| Field | Type | Description |
|-------|------|-------------|
| id, no | string, number | Unique ID, sequential |
| name, rank | string | Identity |
| vessel, client | string | Assignment |
| joinDate | date string | Sign-on date |
| **ownerPaid** | USD | Owner pays (salary + manning) |
| **salary** | USD | Crew's actual salary |
| office | USD | DEP fees / month |
| manningFees | USD | MU commission |
| leavePay | USD | Leave pay / month |
| paidDepFees | USD | Already paid DEP |
| balanceDepFees | USD | Remaining DEP |
| accumulatedLeavePay | USD | Total accrued (auto) |
| banks | array | `[{bankName, bankAccNo, bankAccName, label}]` |
| bankName, bankAccNo, bankAccName | string | Primary bank (synced from banks[0]) |
| allotmentType | string | `bank` / `cash` |
| status | string | `Onboard` / etc. |
| remark | string | Notes |

### `bills` collection

| Field | Type | Description |
|-------|------|-------------|
| id | string | BILL-001 |
| client, vessel, month | string | Identity |
| from, to | string | "1.APR.2026" — "30.APR.2026" |
| status | string | Draft / Sent / Paid |
| crew | array | Bill rows (full breakdown per crew) |
| totalHA, total | USD | Hire amount sum, owner total sum |
| date | date | Generation date |
| bankInfo | object | `{accNo, accName, bankName, swift, remark}` |

### `payments` collection

| Field | Type | Description |
|-------|------|-------------|
| id | string | PAY-001 |
| billId, client | string | Linked bill |
| amount | USD | Received |
| ref | string | Bank reference |
| date | date | Receipt date |
| match | boolean | true if matched |
| diff | USD | Difference |
| slipUrl | string | Storage URL |

### `crewPayments` collection

| Field | Type | Description |
|-------|------|-------------|
| id | string | P{timestamp}-{rand} |
| **slipId** | string | Bill ID (or "AD-HOC" for manual) |
| crewId, crewName, rank | identity | |
| vessel, client, month, joinDate | context | |
| billFrom, billTo | string | Service period |
| daysOnBoard, daysOfMonth | number | Pro-rata data |
| **Earnings:** ownerPaid, actualHA, pob, bonus, pdeFees, visaFees, workingGear | USD | |
| totalPayment | USD | Owner total |
| **Deductions:** actManning, actLeavePay, depFeeDed | USD | |
| leavePayRefunded | USD | Special refund (sign-off) |
| **Registry data:** salary, leavePay, office, paidDepFees, balanceDepFees, accumulatedLeavePay | USD | Snapshot |
| **Net:** netCrewPay, total, grossTotal | USD | |
| bankCharge, otherDed, extraBonus | USD | Adjustments |
| remark | string | Note |
| **Bank:** type, bankName, bankAccNo, bankAccName | | |
| isSplit | boolean | Split payment marker |
| label | string | Split label (Primary, Additional) |
| **Status:** `Pending` → `ReadyForApproval` → `Approved` → `Processed` → `Paid` | string | |
| signedSlipUrl | string | Storage URL of signed slip |
| date, createdAt, submittedAt, approvedAt, processedAt, paidAt | timestamp | Audit trail |

### `payrollSettings` collection

| Field | Type | Description |
|-------|------|-------------|
| id (= bill.id) | string | Per-bill settings |
| rate | number | MMK exchange rate |
| extraSettings | object | Per-crew adjustments (bc, ref, ded) |
| finalizedAt | timestamp | Save timestamp |

### `users` collection

| Field | Type | Description |
|-------|------|-------------|
| uid (doc id) | string | Firebase Auth UID |
| email, displayName | string | Identity |
| role | string | `admin` / `accountant` |
| active | boolean | Login allowed |
| createdAt | timestamp | |

---

## 14. Firestore & Security

### Real-time Listeners

App startup တွင် `fsListenCol()` ဖြင့် 5 collections ကို real-time subscribe လုပ်သည်:
- crew, bills, payments, slips, crewPayments

တစ်ယောက်ယောက်က Firestore မှာ data update လုပ်တာနဲ့ UI က instantly refresh ဖြစ်သည်။

### Security Rules Summary

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| users | Self / Admin | Admin (or first-setup) | Admin | Admin |
| crew, bills, payments, slips | Active user | Active user | Active user | **Admin only** |
| **crewPayments** | Active user | Active user | Active user (cannot self-promote to Approved/Paid) — Admin can | **Admin only** |
| payrollSettings | Active user | Active user | Active user | — |

**Key restriction:** Accountant cannot change `crewPayments` status to `Approved` or `Paid` — only Admin can.

### Firebase Storage Paths

```
slips/{timestamp}_{filename}              — Bank slips uploaded during Reconciliation
signedSlips/{paymentId}_{timestamp}_{filename}  — Signed payment slips uploaded during Verification
```

### Local Setup (env)

`.env` file တွင် Firebase config keys ထည့်ရသည်:
```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=mu-accounting
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
```

### Deploy

```bash
npm run build
firebase deploy
```

App is live at: `https://mu-accounting.web.app`

---

## 🔄 Quick Reference — Tab Summary

| Tab | ID | Primary Purpose | Output |
|-----|----|-----------------|--------|
| Dashboard | dashboard | KPIs + month overview | — |
| Crew Registry | crew | Crew CRUD + multi-bank | Crew records |
| Monthly Billing | billing | Generate/send invoices | BILL-XXX |
| Reconciliation | reconcile | OCR slip + match | PAY-XXX + auto Pending CPAY |
| Payment Distribution | dist | 5-stage workflow | CPAY-XXX → Paid |
| Status Board | board | Per-crew status | — |
| User Management | users | Role assignment (Admin) | User records |

---

## 📌 Status Flow Reference

```
crewPayments.status:
  Pending → ReadyForApproval → Approved → Processed → Paid
  (Edit)    (Submit)            (Approve) (Process)   (Mark Paid)
   ✏️         ✓                   👍        🖨️          ✅
```

---

*Last updated: April 2026 — reflects current 5-stage Payment Distribution workflow with file-based signed slip upload, OCR-validated reconciliation, multi-bank split payments, and MMK conversion in payslips.*
