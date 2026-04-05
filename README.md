# Mahar Unity SRPS Accounting App

## Project Structure
```
mu-accounting/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── UI.js            # Shared UI components (Badge, Btn, Stat, etc.)
│   ├── data/
│   │   └── crewData.js      # 145 crew records from CSV
│   ├── services/
│   │   └── firebase.js      # Firebase config & Firestore helpers
│   ├── App.js               # Main app with all 7 modules
│   └── index.js             # Entry point
├── firebase.json            # Firebase Hosting config
├── firestore.rules           # Firestore security rules
├── package.json
└── README.md
```

## Setup & Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm start
```
App opens at http://localhost:3000

## Deploy to Firebase Hosting

```bash
# 1. Install Firebase CLI (one time)
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Initialize (select your project mu-accounting)
firebase init
# Choose: Hosting
# Public directory: build
# Single-page app: Yes

# 4. Build & Deploy
npm run build
firebase deploy
```

Your app will be live at: https://mu-accounting.web.app

## Firestore Collections
- `crew` - 145 seafarer records
- `bills` - Monthly billing documents
- `payments` - Owner payment records
- `slips` - Salary slip uploads
- `crewPayments` - Crew payment distribution

## Features
1. **Dashboard** - Overview stats, top clients
2. **Crew Registry** - Full CRUD, search/filter
3. **Monthly Billing** - Pro-rata calculation, editable fees
4. **Reconciliation** - Match payments against bills
5. **Slip Upload** - Link payments to crew
6. **Payment Distribution** - Generate bank/cash slips
7. **Status Board** - Color-coded payment status

## Important
- Set Firestore rules to allow read/write (see firestore.rules)
- Bank: Bangkok Bank, Acc: 840-096-0029-001674-501
- SWIFT: BKKBTHBK, Emporium Branch Bangkok
