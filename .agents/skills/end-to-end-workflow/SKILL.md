---
name: end-to-end-workflow
description: Mahar Unity SRPS Accounting App End-to-End Workflow (5-stage payment distribution)
---
# MAHAR UNITY SRPS — Full Workflow

This is the complete lifecycle of payroll processing in the Mahar Unity SRPS Accounting App.

## STEP 1: Crew Setup (Crew Registry)
- Go to the **Crew Registry** tab.
- Add or Edit Crew with all required fields:
  - Identity: Name, Rank, Vessel, Client, Join Date
  - **Salary** (USD) — actual crew monthly salary
  - **OwnerPaid** (USD) — what the owner pays MU (salary + manning combined)
  - **DEP Fees / Month** (`office`), **Paid Dep Fees**, **Balance Dep Fees**
  - **Manning Fees**, **Leave Pay** (per month)
  - Bank accounts (multi-bank supported — add additional accounts via "+ Add Bank")
  - Allotment Type (bank / cash)

## STEP 2: Monthly Billing
- Go to **Monthly Billing** tab.
- Select Client and Month, click **Generate**.
- The app auto-calculates HA, manning, leave pay (officer 5% / rating 10% of salary), and DEP deduction (= balanceDepFees by default).
- Bill is created in **Draft** status. Open Details to:
  - Adjust Days on Board (auto-recalculates HA/Manning/Leave Pay)
  - Add POB (deducts from Owner Total), Bonus, PDE Fees, Visa Fees, Working Gear
  - Adjust DEP Fee Deducted (e.g., split across multiple months if crew requests)
- Click **Send** → status changes to Sent → email PDF to Client.

## STEP 3: Client Wires Payment
- Client transfers money to MU's Bangkok Bank account.

## STEP 4: Reconciliation
- Go to **Reconciliation** page.
- Select the Sent Bill.
- Upload bank slip image — Tesseract.js OCR scans for the bill total.
  - ✅ Match: Amount auto-fills.
  - ❌ Mismatch: Manual entry required.
- Enter Bank Reference (Ref) and Date.
- Click **Reconcile & Generate Payroll**.
  - Match: PAY-XXX created, Bill → Paid, **crewPayments docs auto-generated** (status: Pending).
  - Mismatch: PAY-XXX created with diff, manual review needed.

## STEP 5: Payment Distribution Hub (5-stage workflow)

The Payment Distribution tab has 5 sub-tabs reflecting status progression:
`Pending → ReadyForApproval → Approved → Processed → Paid`

### Stage 1 — Edit & Submit (Accountant)
- Click ✏️ Edit & Submit on each Pending record.
- Modal opens with three editable sections:
  - **Earnings**: Basic Salary, Bonus, PDE Fees, Visa Fees, Working Gear, Leave Pay (Refunded)
  - **Deductions**: DEP Fees / Month, Paid DEP, Balance DEP, DEP Fee Deducted, Leave Pay
  - **Adjust for Actual Payment**: Actual Gross, Bank Charge, Other Deductions, Extra Bonus
- Final Net Pay Preview updates in real time.
- Click **Submit for Admin Approval** → status: ReadyForApproval.

### Stage 2 — Admin Approval
- Admin reviews submitted records.
- Click **Approve** (Admin only) → status: Approved.

### Stage 3 — Distribution
- Per-record actions:
  - 🖨️ **Slip** — Print full payslip (with crew salary breakdown, DEP fee summary, leave pay summary, and MMK conversion at current exchange rate).
  - ✂️ **Split** — Divide single payment across multiple registered bank accounts. Each split becomes a separate crewPayment doc with `-S1`, `-S2` suffix.
  - **Process Done** → status: Processed.

### Stage 4 — Verification (Signed Slip Upload)
- For each Processed record:
  - **📎 Upload Slip** — Native file picker (image or PDF). Uploads to Firebase Storage path `signedSlips/{paymentId}_{timestamp}_{filename}`.
  - 👁️ **View Slip** appears once uploaded; **🔄 Replace** allows re-upload.
  - Admin: **✓ Mark Paid** — only enabled after slip uploaded → status: Paid.
  - On Mark Paid, crew registry auto-updates:
    - `paidDepFees += depFeeDed`
    - `balanceDepFees -= depFeeDed`
    - `accumulatedLeavePay += actLeavePay`

### Stage 5 — Paid History
- Selected month's Paid records — read-only audit log.

## STEP 6: Payroll Reporting (Below tabs)
- Bill group cards display all crew in each bill with avatar dots:
  - 🟢 Paid · 🔵 Approved/Processed/Submitted · ⬜ Pending (dashed)
- Hover for tooltip; click **View Report** for full per-crew breakdown modal with:
  - Editable MMK exchange rate
  - Per-crew Earnings / Deductions / Net Pay & MMK columns
  - Editable per-crew adjustments (Bank Charge, Refund, Deduction)
  - Grand Total footer (USD + MMK)
  - Export buttons: PDF Summary, Bank PDF, Cash PDF
- 💾 **Save** persists rate + adjustments to `payrollSettings/{billId}` for reload.

## STEP 7: Status Tracking
- Use **Status Board** to view per-crew payment status by salary month.
- Color-coded rows: Paid / Slip Received / Pending.
- Filter by name/vessel/client.
