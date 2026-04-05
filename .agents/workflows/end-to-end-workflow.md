---
description: Mahar Unity SRPS Accounting App End-to-End Workflow
---
# MAHAR UNITY SRPS — Full Workflow

This workflow describes the end-to-end lifecycle of the accounting process for the Mahar Unity Web App.

## STEP 1: Crew Setup
- Go to the **Crew Registry** tab.
- Add or Edit Crew Data: OwnerPaid, Salary, Office, Manning, Vessel, Client.

## STEP 2: Monthly Billing
- Go to the **Monthly Billing** tab.
- Select a Client and a Month.
- Click **Generate Bill** (The app will auto-calculate actual Hire Amount).
- Verify the Bill Status is DRAFT.
- Fill in Extra Fees like Shift change, PDE, VISA, or Gear if applicable.
- Click **Send** to transition the Bill Status to SENT.

## STEP 3: Client Payment
- Wait for the client to wire the money via bank transfer (e.g., to Bangkok Bank BKKBTHBK account).

## STEP 4: Reconciliation
- Go to the **Reconciliation** page.
- Choose the sent Bill.
- Enter the Amount, Bank Reference (Ref), and Date received.
- Click **Reconcile**.
- If the amount matches exactly, a PAY-00X record is created and the Bill status becomes PAID.
- If it mismatches, a PAY-00X record is created reflecting the discrepancy and the client must be notified.

## STEP 5: Slip Upload
- Go to **Slip Upload** page.
- Pick the Matched Payment from the dropdown.
- Check the boxes for the crew members involved.
- Click **Upload** to create a SLIP-00X record. Crew status is now "Slip Received".

## STEP 6: Payment Distribution
- Navigate to the **Payment Distribution** page.
- Choose a pending Slip and click **Process**.
- This creates CPAY-00X records for each selected crew member.
- Their individual status changes to "PAID".

## STEP 7: Status Tracking
- Use the **Status Board** to monitor metrics like Paid, Slip Received, and Pending counts per vessel or client.
