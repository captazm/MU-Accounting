---
name: app-deployment
description: How to deploy the MU Accounting App to Firebase Hosting
---
# App Deployment Workflow

This workflow explains how to build the application and deploy it to Firebase Hosting for live production use.

## 1. Prerequisites
- Ensure you have the Firebase CLI installed. If not, install it via:
  `npm install -g firebase-tools`
- Ensure you are logged into the correct Firebase account:
  `firebase login`

## 2. Initialize Firebase (If not done already)
- Run `firebase init` in the project root.
- Select **Hosting: Configure files for Firebase Hosting and (optionally) set up GitHub Action deploys**.
- Select the `mu-accounting` project.
- Set the public directory to `build`.
- Configure as a single-page app: **Yes**.

## 3. Build the Application
- Run the build script to create the production-ready optimized bundle:
  `npm run build`
- This will generate the /build folder containing all the static assets.

## 4. Deploy to Firebase
- Run the deploy command:
  `firebase deploy`
- Once completed, the CLI will output the live Hosting URL (e.g., https://mu-accounting.web.app).
- Verify the deployed app by visiting the provided URL.
