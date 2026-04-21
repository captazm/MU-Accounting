---
name: monthly-billing
description: How to generate, edit, and send monthly invoices to ship owners
---
# Monthly Billing

Generate, edit, and send monthly bills to clients (ship owners) for crew services.

## 1. Access Monthly Billing
- Click **Monthly Billing** in the sidebar.

## 2. Generate a Bill

```
[Client ▼]   [Month: 2026-04]   [Generate]
```

- Select Client from dropdown. Special groups:
  - `Mr.Xing & Mr.Zhong` — combines XING + MR.ZHONG crew
  - `CHH (All)` — combines all clients starting with "CHH"
- Pick Month (YYYY-MM).
- Click **Generate** — auto-creates bill in `Draft` status.

## 3. Auto-Calculation Logic

For each crew in the client:
```
Days in Month (DIM)        = days of selected month
Days on Board (DOB)        = DIM, OR pro-rated by joinDate
                             (skip crew if joinDate > monthEnd)
Officer? (regex match)      = master|chief|officer|engineer|cadet
Leave Pay rate              = 5% (Officer) | 10% (Rating)

Actual HA          = ownerPaid × DOB/DIM
Actual Manning     = manningFees × DOB/DIM
Actual Leave Pay   = (salary × leaveRate) × DOB/DIM
DEP Fee Deducted   = balanceDepFees (default — adjustable)
Total Payment      = HA + bonus + pdeFees + visaFees + workingGear − POB
Net Crew Pay       = TotalPayment − Manning − LeavePay − DepFeeDed
```

## 4. Edit Bill (Draft only)

Click **Details** to expand. In Draft mode, editable fields:
- **Days on Board** — auto-recalculates HA, Manning, Leave Pay
- **POB(-)** — Paid On Board (subtracted from Owner Total)
- **Bonus, PDE Fees, VISA, WG** — additions to Owner Total
- **DepFee(-)** — adjust DEP fee deduction (e.g., split across months)
- **Remark** — bill-specific note

Read-only fields auto-update: Actual HA, Owner Total, Manning, Leave, Crew Net.

## 5. Edit Bank Remittance (Draft only)

Bottom of Bill Details — editable fields:
- Account No (default: `840-096-0029-001674-501`)
- Account Name (default: `Mahar Unity (Thailand) Company Limited`)
- Bank Name (default: `Bangkok Bank`)
- SWIFT (default: `BKKBTHBK`)
- Remark

## 6. Remove Crew from Bill (Draft only)

- Click ✕ next to the crew row.
- Confirmation modal — click **Remove Crew** to confirm.
- Bill totals recalculate automatically.

## 7. Send Bill

- Click **Send** → status: Sent → all fields become read-only.
- If you need to edit after sending, click **Revise** → status returns to Draft.

## 8. Export

- **📊 Download Excel** — CSV with all crew rows.
- **📄 PDF Version** — Printable PDF with letterhead, totals, and bank info.

## Bill Status Flow

```
Draft → [Send] → Sent → [Reconcile in Reconciliation tab] → Paid
       ↑           |
       └──[Revise]─┘
```

| Status | Meaning |
|--------|---------|
| Draft | Editable, fees adjustable |
| Sent | Read-only, awaiting client payment |
| Paid | Reconciled (auto-set by Reconciliation matching) |
