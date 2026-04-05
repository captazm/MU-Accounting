---
description: How to add, edit, and manage crew member data
---
# Crew Management Workflow

This workflow outlines the process for maintaining the Crew Registry.

## 1. Access the Crew Registry
- Navigate to the **Crew Registry** tab from the app sidebar.

## 2. Searching and Filtering
- Use the **Search bar** to find a crew member by Name or their unique ID (e.g., C001, C002).
- Use the **All Vessels** dropdown to filter the crew list by a specific vessel (e.g., MT. ES RIGHT).
- Use the **All Clients** dropdown to filter by a specific client/broker.

## 3. Adding a New Crew Member
- Click the **+ Add** button at the top of the table.
- A modal popup will appear. Fill in standard fields:
  - **Name**, **Rank**, **Vessel**, **Client**, **Join Date**.
- Fill in the financial fields carefully:
  - **OwnerPaid**: Total USD paid by the ship owner for this crew.
  - **Salary**: The actual Net Salary the crew receives.
  - **Office**: Office/Document processing fees.
  - **Manning**: Manning/Agency fees.
  - **Remark**: (Optional) Add VIP notes or Cash Back info.
- Click **Save**. If the app is connected to Firestore, the data is pushed directly to the cloud.

## 4. Editing an Existing Crew Member
- Find the specific crew member in the registry table.
- Click the **Edit** button on their row.
- Alter the applicable data in the modal (Note: the Unique ID field is locked and cannot be edited).
- Click **Save** to update the record.
