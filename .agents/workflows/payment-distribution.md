---
description: How to process payments to individual crew members
---
# Payment Distribution Workflow

This workflow guides you through finalizing the payment process, converting processed Slips into finalized payments for individual Crew members. It utilizes strict Role-Based Access Control (RBAC).

## 1. Access Payment Distribution
- Open the **Payment Distribution** tab from the app sidebar.

## 2. Process Pending Slips (Accountant Role)
- Locate the **"Pending Slips"** section, which lists all slips previously uploaded but not yet distributed.
- Verify the details (e.g., SLIP-001 · Client Name · X pending).
- Click the **[Process]** button next to the relevant slip.

## 3. System Actions & Precise Tracking
- The system will automatically iterate through each crew member listed on the slip and generate individual CPAY-00X records for them.
- **Accurate Compensation Flow:** Instead of falling back on standard basic recurring wages (OwnerPaid), it dynamically traces back to the specific generated Monthly Bill that correlates to the payment and extracts the final calculated `totalPayment`. This includes accurate deductions and bonuses.
- It determines the payment method routing (Bank / Cash) dependent on allotment configuration, setting the status to **"Pending Approval"**.

## 4. Final Review & Authorization (Admin Role)
- Only users with the **Admin** role can finalize payments.
- Scroll to the "Crew Payments Table". Admins will see an **[Approve]** button next to any Pending CPAY records, alongside a master **[Approve All]** button at the top.
- Upon Admin approval, the status formally shifts to a finalized green **Paid**.
- The global Dashboard and Status Board will subsequently reflect this "Paid" state.
