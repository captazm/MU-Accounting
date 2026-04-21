---
name: slip-verification
description: How to upload signed payment slips for verification before marking crew as Paid (Tab 4 of Payment Distribution Hub)
---
# Signed Slip Verification

After a payment is **Processed** (Distribution stage), you must upload the signed slip from the crew member as proof before Admin can mark it Paid.

> **Note:** This replaces the old standalone "Slip Upload" tab. The current app integrates signed slip upload into Tab 4 (Verification) of the Payment Distribution Hub.

## 1. Access Verification Tab

- Open **Payment Distribution** from the sidebar.
- Click the **Verification** tab (4th tab).
- All Processed records are listed.

## 2. Upload Signed Slip

For each record without a signed slip:
- The Slip column shows ⚠ Missing.
- Click **📎 Upload Slip** in the Action column.
- Native file picker opens — select an image (JPG/PNG) or PDF of the signed slip.
- File uploads to Firebase Storage at `signedSlips/{paymentId}_{timestamp}_{filename}`.
- The record's `signedSlipUrl` is updated automatically.
- Toast notification confirms "Signed slip uploaded ✓".

## 3. Replace an Uploaded Slip

If you uploaded the wrong file:
- Click **🔄 Replace** in the Action column.
- Select a new file. Old URL is overwritten.
- Toast confirms "Slip replaced ✓".

## 4. Verify and Mark Paid (Admin)

After a slip is uploaded:
- The Slip column shows 👁️ View Slip + ✓ Uploaded badge.
- **Admin** sees the **✓ Mark Paid** button.
- Click Mark Paid → status: `Paid`.
- The system automatically updates the crew's registry:
  - `paidDepFees += depFeeDed` (cumulative DEP paid)
  - `balanceDepFees -= depFeeDed` (remaining DEP)
  - `accumulatedLeavePay += actLeavePay` (returnable on sign-off)

## 5. Non-Admin Behavior

If you are an Accountant (non-admin):
- You can upload/replace slips.
- After upload, you'll see "Waiting for admin" instead of Mark Paid.
- Only Admin can complete the Paid transition.

## File Storage

- All signed slips are stored in Firebase Storage at `signedSlips/`.
- Filenames are namespaced: `{paymentId}_{timestamp}_{originalfilename}`.
- Public download URLs are kept in `crewPayments.signedSlipUrl`.
- Click 👁️ View Slip to open in new tab.

## Common Pitfalls

- Mark Paid is disabled if no slip uploaded — upload first.
- File size — Firebase Storage default rules limit upload size; very large PDFs may fail.
- Browser file picker can't be triggered programmatically — must be initiated by user click.
