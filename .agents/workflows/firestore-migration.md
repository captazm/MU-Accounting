---
description: How to migrate local mock data to Firestore Database
---
# Local Data to Firestore Migration Workflow

The Mahar Unity App works in two modes: Local (Offline) and Firestore Connected. This workflow explains how to export local mock data to the cloud.

## 1. Check Connection Status
- Look at the bottom of the left Sidebar.
- If it says **● Local Mode** (in orange), the application is currently running strictly within the browser memory using mock data. Any page refresh would lose new input.

## 2. Initiate Migration
- Click the **[Migrate to Firestore]** button located at the bottom of the sidebar.
- The app will batch process the mock data (e.g., 145 crew members).
- This will automatically construct the required `crew` collection documents in your Firebase instance.

## 3. Verify Migration
- A confirmation toast will appear stating "145 crew migrated to Firestore!".
- The connection status dot in the sidebar will turn green and say **● Firestore Connected**.
- From this point forward, directly saving Crew records or Bills will write to the active `crew`, `bills`, `payments`, `slips`, and `crewPayments` collections in Firestore.
