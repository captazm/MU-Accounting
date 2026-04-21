---
name: reconciliation
description: How to reconcile incoming bank payments against generated bills using OCR validation
---
# Reconciliation Workflow

Verify incoming client bank payments against generated invoices, using OCR to validate the slip amount. On successful match, the system auto-generates payroll records (Pending status) for distribution.

## 1. Access Reconciliation
- Navigate to the **Reconciliation** tab.

## 2. Select Bill
- In "Record Payment & Bank Slip Verification" section.
- The Bill dropdown lists only bills with status `Sent`.
- Selecting a bill auto-fills the Amount field with bill total.

## 3. OCR Bank Slip Validation (Recommended)

- Click the file input under "Upload Bank Slip for OCR Validation".
- Select an image of the bank slip (JPG/PNG).
- The slip uploads to Firebase Storage at `slips/{timestamp}_{filename}`.
- Tesseract.js scans the image in-browser for numbers.
- A live preview of the slip is displayed.
- Outcome:
  - ✅ **Match found** — amount auto-fills, green badge: "OCR Verified".
  - ❌ **No match** — orange warning shows largest number found vs expected total. You can manually correct or override.

## 4. Enter Reference & Date
- **Ref** — Bank transaction reference number.
- **Date** — receipt date (defaults to today).

## 5. Reconcile

Click **Reconcile & Generate Payroll**.

```
Diff = ClientAmount − BillTotal
|Diff| < $0.01    → ✅ MATCH
|Diff| >= $0.01   → ⚠️ MISMATCH
```

### MATCH

- New `payments` doc created (PAY-XXX).
- Bill status → `Paid`.
- **Auto-generates `crewPayments` records** (one per crew in the bill) with status `Pending`.
- Each new crewPayment carries: salary, ownerPaid, actualHA, manning, leavePay, depFeeDed, paidDepFees, balanceDepFees, accumulatedLeavePay, bank info.
- Toast: "Matched!" — proceed to **Payment Distribution → Edit & Submit**.

### MISMATCH

- New PAY-XXX created with `match: false` and `diff` recorded.
- Bill remains Sent. Notify client.
- Tip: If owner intentionally paid different amount, **Revise** the bill in Monthly Billing first to match.

## 6. Payment History Table

Below the form. Lists all PAY-XXX records:
- ID, Bill, Client, Amount, Ref, Date, Status (Matched/Mismatch), Slip view link.

## OCR Notes

- Tesseract.js runs entirely in the browser — no backend OCR service.
- Works best with clear, high-contrast slips.
- If OCR fails, just enter amount manually and proceed.

## What Happens After a Match

The Reconciliation match is the trigger that creates `Pending` payroll records. Next steps:
1. Go to **Payment Distribution** tab.
2. Click **Edit & Submit** sub-tab — you'll see new Pending records.
3. Edit each record's earnings/deductions, then submit for Admin approval.
