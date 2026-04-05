---
description: How to set up and run the MU Accounting app locally for development
---
# Local Development Workflow

This workflow describes the process for starting the React application in your local development environment.

## 1. Prerequisites
- Ensure Node.js and NPM are installed on your machine.
- Verify you are in the project root directory (`mu-accounting/`).

## 2. Install Dependencies
- Run the following command to make sure all packages from `package.json` are installed:
  `npm install`

## 3. Start the Development Server
- Run the start script:
  `npm start`
- The development server will typically start and open automatically in your browser at `http://localhost:3000`.
- The local server supports hot-reloading, so any changes made to `src/` will instantly be reflected in the browser.

## 4. Notes on Local Mode vs Firestore
- Upon starting locally, if Firebase is not properly configured, the app will fall back to **Local Mode** using mock data from `src/data/crewData.js`.
- If you intend to test real data edits, follow the **Firestore Migration** workflow to push the local data up to the cloud.
