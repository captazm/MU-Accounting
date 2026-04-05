# 🚢 MAHAR UNITY SRPS — Accounting App သုံးစွဲနည်း လမ်းညွှန်

> **Mahar Unity (Thailand) Co., Ltd** — Seafarer Recruitment & Payroll System  
> Version: April 2026 | Platform: Web App (React + Firebase Firestore)

---

## 📋 မာတိကာ

1. [App Overview](#1-app-overview)
2. [ဘေးပြင် Sidebar နှင့် Navigation](#2-ဘေးပြင်-sidebar-နှင့်-navigation)
3. [Menu 1 — Dashboard](#3-menu-1--dashboard)
4. [Menu 2 — Crew Registry](#4-menu-2--crew-registry)
5. [Menu 3 — Monthly Billing](#5-menu-3--monthly-billing)
6. [Menu 4 — Reconciliation](#6-menu-4--reconciliation)
7. [Menu 5 — Slip Upload](#7-menu-5--slip-upload)
8. [Menu 6 — Payment Distribution](#8-menu-6--payment-distribution)
9. [Menu 7 — Status Board](#9-menu-7--status-board)
10. [App ၏ ငွေကြေး Workflow (End-to-End)](#10-app-၏-ငွေကြေး-workflow-end-to-end)
11. [Data Fields အသေးစိတ်](#11-data-fields-အသေးစိတ်)
12. [Firestore Database ဆက်သွယ်မှု](#12-firestore-database-ဆက်သွယ်မှု)

---

## 1. App Overview

**Mahar Unity SRPS Accounting App** သည် သင်္ဘောသားများ (Seafarers/Crew) ၏ လစာ၊ ငွေတောင်းခံလွှာ (Invoice/Billing) နှင့် ပေးချေမှုများကို စီမံခန့်ခွဲသော Web Application တစ်ခုဖြစ်သည်။

### App၏ အဓိက လုပ်ဆောင်ချက်များ

| အဆင့် | လုပ်ဆောင်ချက် | ရည်ရွယ်ချက် |
|--------|----------------|--------------|
| 1 | Crew Registry | သင်္ဘောသား အချက်အလက်များ သိမ်းဆည်းခြင်း |
| 2 | Monthly Billing | ဖောက်သည်ထံ လစဉ် Invoice ထုတ်ခြင်း |
| 3 | Reconciliation | ငွေလက်ခံပြီး Invoice နှင့် တိုက်ဆိုင်စစ်ဆေးခြင်း |
| 4 | Slip Upload | ငွေပေးချေမည့် Crew List ကို Confirm ခြင်း |
| 5 | Payment Distribution | Crew တစ်ဦးချင်းထံ လစာ ထုတ်ပေးမှတ်တမ်းတင်ခြင်း |
| 6 | Status Board | Crew အားလုံး၏ ငွေပေးချေမှု အခြေအနေ ကြည့်ရှုခြင်း |

---

## 2. ဘေးပြင် Sidebar နှင့် Navigation

App ဖွင့်လျှင် ဘယ်ဘက်တွင် **Sidebar** တစ်ခု တွေ့ရမည်။

```
┌─────────────────┐
│  [M] MAHAR UNITY│  ← Logo (နှိပ်လျှင် Sidebar ချုံ့/ဆန့်သည်)
│    SRPS ACCOUNTING│
├─────────────────┤
│  Dashboard       │
│  Crew Registry   │
│  Monthly Billing │
│  Reconciliation  │
│  Slip Upload     │
│  Payment Dist.   │
│  Status Board    │
├─────────────────┤
│  ● Firestore Connected │  ← Connection Status
│  145 crew              │  ← Crew စုစုပေါင်း
│  [Migrate to Firestore]│  ← (Local Mode တွင်သာ ပေါ်သည်)
└─────────────────┘
```

### Sidebar အသေးစိတ်

- **Logo (M)** ကို နှိပ်လျှင် Sidebar သည် ချုံ့ (collapsed, icon only) / ဆန့် (expanded) ပြောင်းသည်
- **● Firestore Connected** (အစိမ်းရောင်) = Cloud database နှင့် ချိတ်ဆက်ပြီး
- **● Local Mode** (လိမ္မော်ရောင်) = Offline mode, data ကို cloud တွင် မသိမ်းသေး
- **Migrate to Firestore** button = Local data ကို Firestore Cloud သို့ upload လုပ်သည်
- ညာဘက် **top bar** တွင် လက်ရှိ menu နာမည်နှင့် လ/နှစ် ပေါ်သည်

---

## 3. Menu 1 — Dashboard

**Tab ID:** `dashboard`  
**ရည်ရွယ်ချက်:** App တစ်ခုလုံး၏ အနှစ်ချုပ် Overview ကြည့်ရှုရန်

### Dashboard တွင် ဘာတွေပါသည်

#### 📊 Summary Stats (Cards 4 ခု)

| Card | ပြသသည် | နှိပ်လျှင် |
|------|---------|----------|
| 👥 **Total Crew** | Crew စုစုပေါင်း အရေအတွက် + Vessel အရေအတွက် | Crew Registry သို့ ပြောင်း |
| 📄 **Bills** | ထုတ်ထားသော Invoice အရေအတွက် | Monthly Billing သို့ ပြောင်း |
| 💰 **Billed** | Invoice စုစုပေါင်း ပမာဏ + လက်ခံပြီး ပမာဏ | — |
| ✅ **Paid** | ငွေထုတ်ပြီး Crew/စုစုပေါင်း | Status Board သို့ ပြောင်း |

#### 📈 Client Bar Chart

- **"Top Clients by Owner Paid"** — Client တစ်ဦး၏ Crew အားလုံး၏ Owner Paid ငွေ ပေါင်းပြသော Bar Chart
- Client 8 ဦးအထိ ပြသပြီး အများဆုံးငွေနှင့် Client ကို အသိနိမ့်ဆုံးသို့ စီပြသည်
- Bar တစ်ခုချင်းတွင် Client နာမည်၊ ငွေပမာဏ နှင့် Crew အရေအတွက် ပါသည်

### Dashboard — Workflow

```
App ဖွင့် → Firestore မှ Data Load → Dashboard Stats ပြသ
                                    ↗ Crew Card နှိပ် → Crew Registry
                                    ↗ Bills Card နှိပ် → Monthly Billing
                                    ↗ Paid Card နှိပ် → Status Board
```

---

## 4. Menu 2 — Crew Registry

**Tab ID:** `crew`  
**ရည်ရွယ်ချက်:** သင်္ဘောသား (Seafarer) အချက်အလက်များ ကြည့်ရှု၊ ထည့်သွင်း၊ ပြင်ဆင်ရန်

### Crew Registry တွင် ဘာတွေပါသည်

#### 🔍 Filter Bar (အပေါ်ဆုံး)

```
[Search name/ID...]  [All Vessels ▼]  [All Clients ▼]
```

- **Search** — Crew နာမည် သို့မဟုတ် ID (C001, C002...) ဖြင့် ရှာနိုင်သည်
- **All Vessels** — Vessel (သင်္ဘောနာမည်) ဖြင့် filter ခြင်း
- **All Clients** — Client (ဖောက်သည်) ဖြင့် filter ခြင်း

#### 📊 Crew Table

Table columns:

| Column | အဓိပ္ပါယ် |
|--------|----------|
| **No** | Crew နံပါတ် (1, 2, 3...) |
| **ID** | Unique ID (C001, C002...) |
| **Name** | Crew နာမည် |
| **Rank** | ရာထူး (2O, 3E, AB, OS...) |
| **Vessel** | တင်ထားသည့် သင်္ဘောနာမည် |
| **Client** | ဖောက်သည် (ကုမ္ပဏီ/agent) |
| **Join** | သင်္ဘောတက်သည့် ရက်စွဲ |
| **OwnerPaid** | Ship Owner မှ Mahar Unity ကို ပေးသော USD ပမာဏ |
| **Salary** | Crew ၏ လစာ (USD) |
| **Office** | Office fee (USD) — Training/document cost |
| **Manning** | Manning fee (USD) |
| **Remark** | မှတ်ချက် (Agent နာမည်၊ Cash Back info) |
| **Edit** | ပြင်ဆင်ရန် Button |

#### ➕ Crew ထည့်သွင်းခြင်း

1. **"+ Add"** button နှိပ်သည်
2. Modal popup ပေါ်လာသည်
3. Field များ ဖြည့်သည် — Name*, Rank, Vessel, Client, Join Date, OwnerPaid, Salary, Office, Manning, Remark
4. **"Save"** နှိပ်သည်
5. Firestore Connected ဆိုလျှင် **Firestore တွင် တိုက်ရိုက် သိမ်း**သည်

#### ✏️ Crew ပြင်ဆင်ခြင်း

1. Table ၌ Crew row တွင် **"Edit"** button နှိပ်သည်
2. Modal popup ပေါ်လာသည် (ID field disable — မပြင်နိုင်)
3. Data ပြင်ပြီး **"Save"** နှိပ်သည်

### Crew Registry — Workflow

```
Crew Registry ဖွင့် → Crew List ပြသ (Filter ဖြင့် ရှာနိုင်)
        ↓
   [+ Add] နှိပ် → Add Crew Modal → Data ဖြည့် → Save → Crew List Update
        ↓
   [Edit] နှိပ် → Edit Crew Modal → Data ပြင် → Save → Crew List Update
```

---

## 5. Menu 3 — Monthly Billing

**Tab ID:** `billing`  
**ရည်ရွယ်ချက်:** Client (ဖောက်သည်) ထံ လစဉ် Invoice (Bill) ထုတ်လုပ်ရန်

### Invoice ထုတ်ခြင်း

#### Generate Monthly Bill Section

```
[Client: Select ▼]  [Month: 2026-04]  [Generate]
```

**လုပ်ဆောင်ပုံ:**
1. **Client** ရွေးချယ်သည် (မည်သည့် ဖောက်သည်ထံ Invoice ထုတ်မည်နည်း)
2. **Month** ရွေးချယ်သည် (ဥပမာ — 2026-04)
3. **"Generate"** နှိပ်သည်

**System မှ အလိုအလျောက် တွက်ချက်သည်:**

```
အဆိုပါ Client ၏ Crew များကို ယူသည်
       ↓
Crew တစ်ဦးချင်း ဆိုလျှင်:
  - Join Date ကို စစ်ဆေးသည်
  - ၎င်းလ အတွင်း Join ဆိုရင် → (OwnerPaid ÷ လခန်းရက်) × တကယ်ရက်
  - ပုံမှန် Onboard ဆိုရင် → OwnerPaid အပြည့်
       ↓
HA (Hire Amount) တွက်ချက်သည်
       ↓
Bill ဖန်တီးသည် (Status: Draft)
```

#### Bill Status အဆင့်ဆင့်

```
Draft → [Send] → Sent → [Reconcile] → Paid
```

| Status | အဓိပ္ပါယ် |
|--------|----------|
| **Draft** | ထုတ်ထားပြီး၊ မပို့ရသေး |
| **Sent** | Client ထံ ပို့ပြီး၊ ငွေမရသေး |
| **Paid** | ငွေလက်ခံပြီး၊ Reconcile ဆင်းပြီး |

#### Bill Details Table

Bill တစ်ခုကို **"Details"** နှိပ်လျှင် ပေါ်လာသော columns:

| Column | အဓိပ္ပါယ် |
|--------|----------|
| **#** | Serial Number |
| **Vessel** | သင်္ဘောနာမည် |
| **Rank** | ရာထူး |
| **Name** | Crew နာမည် |
| **W/M** | OwnerPaid (Wages per Month) |
| **Days** | တကယ် Onboard ရက် |
| **D/M** | ထိုလ၏ စုစုပေါင်းရက် |
| **HA** | Actual Hire Amount (တွက်ထားပြီး) |
| **Shift** | Shift Change Fees (Draft တွင် ဖြည့်နိုင်) |
| **PDE** | PDE Fees (Draft တွင် ဖြည့်နိုင်) |
| **VISA** | Visa Fees (Draft တွင် ဖြည့်နိုင်) |
| **Gear** | Working Gear (Draft တွင် ဖြည့်နိုင်) |
| **Total** | HA + Extra Fees |

> **မှတ်ချက်:** Draft Status တွင်သာ Shift/PDE/VISA/Gear fees ကို ပြင်ဆင်နိုင်သည်။ Sent/Paid ဖြစ်ပြီးလျှင် read-only ဖြစ်သည်။

#### Bank Remittance Info

Bill ၏ အောက်တွင် ငွေလွှဲရမည့် Bank Info ပြသသည်:
- Account No: **840-096-0029-001674-501**
- Account Name: **Mahar Unity (Thailand) Company Limited**
- Bank: **Bangkok Bank**
- SWIFT: **BKKBTHBK**

### Monthly Billing — Workflow

```
Client & Month ရွေး → Generate နှိပ် → Bill (Draft) ဖန်တီး
        ↓
   Extra Fees ဖြည့် (Shift/PDE/VISA/Gear)
        ↓
   [Send] နှိပ် → Bill Status: Sent → Client ထံ ပေးပို့
        ↓
   Client မှ ငွေလွှဲ → Reconciliation page သို့ ...
```

---

## 6. Menu 4 — Reconciliation

**Tab ID:** `reconcile`  
**ရည်ရွယ်ချက်:** Client မှ ငွေလွှဲပြီးလာသည့်အခါ Invoice နှင့် တိုက်ဆိုင်စစ်ဆေးရန်

### Record Payment Section

```
[Bill: Select ▼]  [Amount: ...]  [Ref: ...]  [Date: ...]  [Reconcile]
```

**Field များ:**

| Field | အဓိပ္ပါယ် |
|-------|----------|
| **Bill** | Reconcile မည့် Bill ID ရွေး (Status: Sent သော Bills သာ ပေါ်သည်) |
| **Amount** | Client မှ လွှဲပေးသော ငွေပမာဏ (USD) |
| **Ref** | Bank Reference Number (Transaction Reference) |
| **Date** | ငွေလက်ခံသည့် ရက်စွဲ |

**Reconcile နှိပ်လျှင်:**

```
Client ပေးသော ပမာဏ vs Bill ၏ Total ကို နှိုင်းယှဉ်
         ↓
  ကွာဟချက် < $0.01    →  ✅ MATCH → Bill Status "Paid" ဖြစ်
  ကွာဟချက် >= $0.01   →  ⚠️ MISMATCH → Bill ကောင်ပြုတ်မဖြစ်
```

**Result Display:**
- **MATCH** (အစိမ်း) — "Matches BILL-001. PAID." ပြသ
- **MISMATCH** (လိမ္မော်) — "Mismatch on BILL-001. Difference: $XX" ပြသ

### Payment History Table

Reconcile ပြီးသော payments များ list ပြသသည်:

| Column | အဓိပ္ပါယ် |
|--------|----------|
| **ID** | Payment ID (PAY-001, PAY-002...) |
| **Bill** | ဆိုင်သော Bill ID |
| **Client** | Client နာမည် |
| **Amount** | ငွေပမာဏ |
| **Ref** | Bank Reference |
| **Date** | ရက်စွဲ |
| **Status** | Matched / Mismatch Badge |

### Reconciliation — Workflow

```
Client မှ ငွေလွှဲ (Bank Transfer)
        ↓
Reconcile Page ဖွင့် → Bill ရွေး → Amount ဖြည့် → Ref & Date ဖြည့်
        ↓
   [Reconcile] နှိပ်
        ↓
   MATCH    → PAY-00X ဖန်တီး → Bill Status "Paid" → Slip Upload သို့ ...
   MISMATCH → PAY-00X ဖန်တီး (မတိုက်ကိုက်) → Client ကို အကြောင်းကြား
```

---

## 7. Menu 5 — Slip Upload

**Tab ID:** `slip`  
**ရည်ရွယ်ချက်:** ငွေ Reconcile ပြီးသော Payment ကို ထုတ်ပေးမည့် Crew List နှင့် ချိတ်ဆက်မှတ်တမ်းတင်ရန်

> **သဘောတရား:** ဘဏ်မှ ငွေ Matched ဖြစ်ပြီးနောက် — မည်သည့် Crew တွေကို ငွေထုတ်ပေးမည်ဆိုတာ ချမှတ်ရသည်

### Upload Salary Slip Section

```
Payment: [Select ▼]          ← Matched Payment များသာ ပေါ်သည်
         ↓ (ရွေးပြီး)
[All] [Clear]                ← Crew အားလုံး/ကြဖြုတ်ရန်

[ ] Crew Name 1  3E  · MT.VESSEL
[ ] Crew Name 2  OS  · MT.VESSEL
[✓] Crew Name 3  AB  · MT.VESSEL

[Upload (2 crew)]
```

**လုပ်ဆောင်ပုံ:**

1. **Payment** dropdown မှ ငွေ Matched Payment ကို ရွေးသည်
2. အဆိုပါ Payment ၏ Client ၏ Crew List ပေါ်လာသည်
3. **Checkbox** ဖြင့် Crew တစ်ဦးချင်း ရွေးချယ်သည် (သို့) **"All"** နှိပ်သည်
4. **"Upload (N crew)"** နှိပ်သည် → SLIP-00X ဖန်တီးသည်

### Slip History

Upload ပြီးသော Slips များ list ပြသ:
- Slip ID, Payment ID, Client, Date
- Crew Names (tag/badge များဖြင့်)

### Slip Upload — Workflow

```
Reconciled (Matched) Payment ရွေး
        ↓
Crew List ပေါ်  → Checkbox ဖြင့် ရွေး
        ↓
[Upload] နှိပ် → SLIP-00X ဖန်တီး
        ↓
Payment Distribution သို့ ...
```

---

## 8. Menu 6 — Payment Distribution

**Tab ID:** `dist`  
**ရည်ရွယ်ချက်:** Slip မှ Crew တစ်ဦးချင်းကို ငွေထုတ်ပေးမှတ်တမ်းတင်ရန်

### Pending Slips

```
SLIP-001 · CHH/CATHY · 15 pending    [Process]
SLIP-002 · EGSS · 8 pending          [Process]
```

**Process နှိပ်လျှင်:**

System မှ ထိုကြှ Slip ၏ Crew တစ်ဦးချင်းကို:
```
CPAY-00X ဖန်တီး:
  - Crew ID, Name
  - Slip ID
  - Total = Crew ၏ OwnerPaid
  - Type = Bank (Allotment type)
  - Status = Paid
  - Date = ယနေ့ ရက်စွဲ
```

### Crew Payments Table

| Column | အဓိပ္ပါယ် |
|--------|----------|
| **ID** | CPAY-001, CPAY-002... |
| **Crew** | Crew နာမည် |
| **Slip** | ဆိုင်သော Slip ID |
| **Total** | ထုတ်ပေးသော ငွေပမာဏ |
| **Type** | Bank / Cash |
| **Status** | Paid (Badge) |
| **Date** | ထုတ်ပေးသည့် ရက်စွဲ |

### Payment Distribution — Workflow

```
Pending Slips list ကြည့် → [Process] နှိပ်
        ↓
Crew တစ်ဦးချင်းကို CPAY-00X Record ဖန်တီး
        ↓
Status Board တွင် Crew Status "Paid" ဖြစ်သွား
        ↓
Dashboard ၏ "Paid" count တိုးသွား
```

---

## 9. Menu 7 — Status Board

**Tab ID:** `board`  
**ရည်ရွယ်ချက်:** Crew အားလုံး၏ ငွေပေးချေမှု အခြေအနေကို တစ်နေရာတည်း ကြည့်ရှုရန်

### Status Summary Cards

```
┌─────────┐  ┌──────────┐  ┌─────────┐
│   45    │  │    23    │  │   77    │
│  Paid   │  │ Slip Rcv │  │ Pending │
└─────────┘  └──────────┘  └─────────┘
```

| Status | အဓိပ္ပါယ် | ရောင် |
|--------|----------|-------|
| **Paid** | CPAY record ဖန်တီးပြီး | 🟢 အစိမ်း |
| **Slip Received** | Slip Upload ပြီး၊ မထုတ်သေး | 🟣 ခရမ်း |
| **Pending** | မည်သည့် Step မှ မရောက်သေး | 🟡 လိမ္မော်/ဝါ |

### Filter Bar

Crew Registry ကဲ့သို့ Filter ပါသည်:
- Search by Name/ID
- Filter by Vessel
- Filter by Client

### Status Board Table

| Column | ဖော်ပြသည် |
|--------|----------|
| No / ID / Name / Rank | Crew အချက်အလက် |
| Vessel / Client | သင်္ဘောနှင့် ဖောက်သည် |
| **Paid** | OwnerPaid ပမာဏ |
| **Status** | Paid / Slip Received / Pending Badge |

> **Note:** Table row တစ်ကြောင်းချင်း တွင် Status အလိုက် **side bar color** ပြောင်းသည် (အစိမ်း/ခရမ်း/လိမ္မော်)

---

## 10. App ၏ ငွေကြေး Workflow (End-to-End)

App ၏ လိုင်ဖ်စိုင်ကယ် workflow ကို အောက်တွင် ဖော်ပြသည်:

```
╔══════════════════════════════════════════════════════════╗
║              MAHAR UNITY SRPS — Full Workflow            ║
╚══════════════════════════════════════════════════════════╝

STEP 1: Crew Setup
──────────────────
Crew Registry တွင် Crew Data ထည့်သွင်း
  ↓
  OwnerPaid | Salary | Office | Manning | Vessel | Client
  ↓

STEP 2: Monthly Billing  
────────────────────────
Client + Month ရွေး → Generate Bill (Auto Calculate HA)
  ↓
Bill Status: DRAFT
  ↓
Extra Fees (Shift/PDE/VISA/Gear) ဖြည့် (optional)
  ↓
[Send] → Bill Status: SENT → Client ထံ Invoice ပေးပို့

STEP 3: Client ငွေလွှဲ
───────────────────────
Client မှ Bangkok Bank (BKKBTHBK) ထံ ငွေလွှဲ

STEP 4: Reconciliation
───────────────────────
Reconcile Page → Bill ရွေး → Amount + Ref + Date ဖြည့်
  ↓
  MATCH?
  ↓ Yes                         ↓ No
PAY-00X ဖန်တီး              PAY-00X ဖန်တီး (Mismatch)
Bill → PAID                  Client ကို ကြောင်းကြား

STEP 5: Slip Upload
───────────────────
Matched Payment ရွေး → Crew List မှ ရွေး
  ↓
SLIP-00X ဖန်တီး
  ↓
Crew Status → "Slip Received"

STEP 6: Payment Distribution
────────────────────────────
Slip ကို Process → Crew တစ်ဦးချင်း CPAY-00X ဖန်တီး
  ↓
Crew Status → "PAID" ✅

STEP 7: Status Board
─────────────────────
ကြည့်ရှုရန်: Paid / Slip Received / Pending count
         + Crew တစ်ဦးချင်း status
```

---

## 11. Data Fields အသေးစိတ်

### Crew Record

| Field | Type | အဓိပ္ပါယ် | ဥပမာ |
|-------|------|----------|------|
| `id` | String | Unique ID | C001 |
| `no` | Number | Serial No | 1 |
| `name` | String | Crew နာမည် | MYO OO |
| `rank` | String | ရာထူး | 3E, 2O, AB, OS |
| `ownerPaid` | USD | Ship Owner → MU ပေးသောငွေ | 3800 |
| `salary` | USD | Crew ၏ Net Salary | 3700 |
| `office` | USD | Office/Document Fee | 400 |
| `manningFees` | USD | Manning Fee | 100 |
| `vessel` | String | သင်္ဘောနာမည် | MT. ES RIGHT |
| `client` | String | Broker/Client | CHH / CATHY |
| `joinDate` | Date | Join Date | 2025-03-19 |
| `remark` | String | မှတ်ချက် | VIP Agent |
| `status` | String | Onboard / Off | Onboard |

### Bill Record

| Field | Type | အဓိပ္ပါယ် |
|-------|------|----------|
| `id` | String | BILL-001, BILL-002 |
| `client` | String | Client နာမည် |
| `month` | String | 2026-04 |
| `from` / `to` | String | 1.APR.2026 — 30.APR.2026 |
| `status` | String | Draft / Sent / Paid |
| `total` | USD | Bill စုစုပေါင်း |
| `crew` | Array | Crew breakdown list |
| `bankInfo` | Object | Remittance bank details |

### Payment Record

| Field | Type | အဓိပ္ပါယ် |
|-------|------|----------|
| `id` | String | PAY-001 |
| `billId` | String | ဆိုင်သော Bill ID |
| `amount` | USD | ငွေထည့်ငွေ |
| `ref` | String | Bank Reference |
| `match` | Boolean | true = Matched |
| `diff` | USD | ကွာဟချက် |

### Slip Record

| Field | Type | အဓိပ္ပါယ် |
|-------|------|----------|
| `id` | String | SLIP-001 |
| `payId` | String | ဆိုင်သော Payment ID |
| `client` | String | Client |
| `crewIds` | Array | ရွေးထားသော Crew IDs |

### Crew Payment Record

| Field | Type | အဓိပ္ပါယ် |
|-------|------|----------|
| `id` | String | CPAY-001 |
| `crewId` | String | Crew ID |
| `crewName` | String | Crew နာမည် |
| `slipId` | String | ဆိုင်သော Slip ID |
| `total` | USD | ထုတ်ပေးသော ပမာဏ |
| `type` | String | bank / cash |
| `status` | String | Paid |

---

## 12. Firestore Database ဆက်သွယ်မှု

App သည် **Firebase Firestore** Cloud Database ကို အသုံးပြုသည်။

### Collections

```
Firestore
├── crew/           (Crew records)
│   └── C001: { name, rank, vessel, ... }
├── bills/          (Invoice records)
│   └── BILL-001: { client, month, crew[], ... }
├── payments/       (Reconciliation records)
│   └── PAY-001: { billId, amount, match, ... }
├── slips/          (Slip Upload records)
│   └── SLIP-001: { payId, crewIds[], ... }
└── crewPayments/   (Distribution records)
    └── CPAY-001: { crewId, total, status, ... }
```

### Connection Status

| Status | ပြသပုံ | အဓိပ္ပါယ် |
|--------|--------|----------|
| ● Firestore Connected | အစိမ်း | Cloud DB နှင့် ချိတ်ဆက်ပြီး၊ saves real-time |
| ● Local Mode | လိမ္မော် | Browser Memory တွင်သာ သိမ်း (refresh လုပ်ရင် data ပျောက်) |

### Local → Firestore Migration

**Local Mode** ဖြစ်နေပါက Sidebar ၏ အောက်တွင် **"Migrate to Firestore"** button ပေါ်သည်:
1. Button နှိပ်သည်
2. CSV Crew data (145 crew) ကို Firestore "crew" collection သို့ batch upload လုပ်သည်
3. ပြီးလျှင် "145 crew migrated to Firestore!" toast ပေါ်သည်
4. Status → "● Firestore Connected" ဖြစ်သွားသည်

---

## 🔄 Quick Reference — Menu Summary

| Menu | Tab ID | အဓိကလုပ်ဆောင်ချက် | Output |
|------|--------|-------------------|--------|
| Dashboard | dashboard | Overview stats ကြည့် | — |
| Crew Registry | crew | Crew Add/Edit | Crew Records |
| Monthly Billing | billing | Invoice Generate/Send | BILL-XXX |
| Reconciliation | reconcile | ငွေ Verify | PAY-XXX |
| Slip Upload | slip | Crew ရွေး Confirm | SLIP-XXX |
| Payment Dist. | dist | Crew ငွေ Process | CPAY-XXX |
| Status Board | board | ငွေပေးချေမှု Status | — |

---

*Document created: April 2026 | Mahar Unity SRPS Accounting App*
