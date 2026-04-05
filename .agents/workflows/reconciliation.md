---
description: How to reconcile an invoice payment from a client
---
# Reconciliation Workflow

This workflow explains how to verify incoming bank payments against generated invoices.

## 1. Access Reconciliation Page
- Navigate to the **Reconciliation** tab from the app sidebar.

## 2. Record the Payment
- In the "Record Payment & Bank Slip Verification" section, first **Select the Bill** that corresponds to the client payment. (Only bills with a "Sent" status will be available).
- **Upload Bank Slip for OCR Validation** (Optional but recommended):
  - Upload the payment screenshot or image file provided by the owner.
  - The system will automatically use OCR (Optical Character Recognition) to scan the image for numbers entirely within your browser.
  - If the scanner extracts a number that perfectly matches the predicted total from the bill, the **Amount** field will be automatically populated, and a green `✅ OCR Verified` badge will appear.
  - If the numbers do not match, a red warning badge will appear showing the largest recognized value against the expected value. You can then investigate or manually input the amount.
- Enter the Bank **Reference Number** (Ref) for the transaction.
- Enter the **Date** the payment was received.
- Click **Reconcile & Create Resulting Slips**.

## 3. Verify the Outcome
- The system checks if the final entered amount matches the selected Bill.
- **MATCH (Difference < $0.01)**: The payment is perfectly matched. A PAY-XXX record will be generated, and the Bill's status shifts to **PAID**.
- **MISMATCH (Difference >= $0.01)**: If the amount is under or over, an orange warning will denote the mismatch. You'll see "Mismatch on BILL-XXX. Difference: $XX". A PAY-XXX record is generated but the invoice is not fully cleared. You must report this discrepancy to the client.

## 4. Next Steps
- For matched payments, proceed to the **Slip Upload** workflow to assign funds to specific crew members.
