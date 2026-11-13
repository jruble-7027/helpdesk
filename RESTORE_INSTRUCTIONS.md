# Wesleyan Christian Academy (WCA) Helpdesk
## Complete Backup & Disaster Recovery Guide

This document provides step-by-step instructions for restoring the WCA Helpdesk ticketing platform, its Google Cloud / Firebase backend, email dispatch webhooks, and the Antigravity conversation history from backups.

---

### 1. Backup Location & Directory Structure

All backups are stored on Google Drive at:
`G:\Shared drives\INFOTECH\GOOGLE\AntiGravity Projects\Helpdesk\Backup`

```
Backup/
├── backup_helpdesk.ps1             # Automated PowerShell backup script
├── RESTORE_INSTRUCTIONS.md         # This restoration documentation
├── archives/                       # Timestamped compressed full backup archives
│   └── Helpdesk_Full_Backup_YYYY-MM-DD.zip
└── latest/                         # Uncompressed, ready-to-inspect mirror
    ├── project_source/             # Complete application source code & configs
    │   ├── src/                    # React components, contexts, services, styles
    │   ├── google-apps-script/     # Email notification webhook (Google Apps Script)
    │   ├── functions/              # Cloud Functions definitions
    │   ├── package.json            # Node.js dependencies and scripts
    │   ├── vite.config.js          # Vite configuration
    │   ├── tailwind.config.js      # Tailwind CSS configuration
    │   ├── firebase.json           # Firebase Hosting & Firestore configuration
    │   ├── firestore.rules         # Production Firestore security rules
    │   ├── storage.rules           # Cloud Storage security rules
    │   ├── .firebaserc             # Firebase project pointer (wca-tickets-58f6c)
    │   ├── .env                    # Active environment variables (Firebase API keys)
    │   └── *.csv                   # Campus and room CSV import templates
    └── conversation_brain/         # Antigravity AI Agent conversation history
        ├── transcript.jsonl        # Compact conversation history log
        ├── transcript_full.jsonl   # Complete unabridged conversation transcript
        ├── user_uploaded/          # User screenshots and reference images
        └── scratch/                # Diagnostic scripts and migration utilities
```

---

### 2. Scenario A: Restoring the Application Codebase

To restore the web application onto a new machine or working directory:

#### Step 1: Copy Source Code
Copy the files from `Backup/latest/project_source/` (or extract from `Backup/archives/Helpdesk_Full_Backup_*.zip`) into your target project directory:
```powershell
Copy-Item -Path "G:\Shared drives\INFOTECH\GOOGLE\AntiGravity Projects\Helpdesk\Backup\latest\project_source\*" -Destination "C:\Projects\Helpdesk" -Recurse -Force
```
*(Alternatively, clone the GitHub repository: `git clone https://github.com/jruble-7027/helpdesk.git`)*

#### Step 2: Verify Environment Configuration (`.env`)
Verify that `.env` is present in the project root with the Firebase credentials for `wca-tickets-58f6c`:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=wca-tickets-58f6c.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=wca-tickets-58f6c
VITE_FIREBASE_STORAGE_BUCKET=wca-tickets-58f6c.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=1:...
```

#### Step 3: Install Node.js Dependencies
Open a terminal in the restored project root and run:
```bash
npm install
```

#### Step 4: Run Development Server
To test locally:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

#### Step 5: Build for Production
To generate the production bundle in `dist/`:
```bash
npm run build
```

---

### 3. Scenario B: Restoring or Redeploying to Firebase Hosting & Rules

The production app is hosted on Firebase Hosting with project ID **`wca-tickets-58f6c`**.

#### Step 1: Log in to Firebase CLI
```bash
firebase login
```

#### Step 2: Confirm Target Project
Ensure Firebase is pointing to `wca-tickets-58f6c`:
```bash
firebase use wca-tickets-58f6c
```

#### Step 3: Deploy Firestore & Storage Rules
Deploy the hardened security rules included in the backup:
```bash
firebase deploy --only firestore:rules,storage
```

#### Step 4: Deploy Web Application to Firebase Hosting
Build and deploy the frontend:
```bash
npm run build
firebase deploy --only hosting
```
The application will be live at:
👉 **`https://wca-tickets-58f6c.web.app`** (or `https://wca-tickets-58f6c.firebaseapp.com`)

---

### 4. Scenario C: Restoring Firestore Database Collections

If setting up in a brand new Firebase project or recovering lost database documents:

1. **Authentication:**
   - In the Firebase Console &rarr; **Authentication** &rarr; **Sign-in method**, enable **Google** provider and configure authorized domains (`wca-tickets-58f6c.web.app`, `localhost`).
2. **Firestore Collections:**
   - The application automatically initializes default catalogs if the `settings/catalog` document does not exist upon first admin login.
   - **`tickets`**: Stores all helpdesk tickets, messages, history, and status.
   - **`settings`**:
     - Document `catalog`: Stores department categories, issue types, campuses, buildings, rooms, priorities, and notification webhook URLs.
     - Document `announcements`: Stores system banners/alerts.
   - **`users`**: Stores user profiles, roles (`admin`, `agent`, `requester`), and notification preferences.
3. **Restoring Campus / Room Lists:**
   - Go to **Fields & Department Customizer** &rarr; **Campuses, Buildings & Rooms**.
   - Use the **Import CSV** button to re-import room lists using the included [rooms-import-WCA.csv](file:///G:/Shared%20drives/INFOTECH/GOOGLE/AntiGravity%20Projects/Helpdesk/rooms-import-WCA.csv) template.

---

### 5. Scenario D: Restoring the Google Apps Script Email Notification Webhook

The email dispatch system sends transactional HTML notifications (ticket creation, replies, status changes) directly from Google Workspace using Google Apps Script.

#### Step 1: Open Google Apps Script
1. Log into your Google Workspace admin account (`itsupport@wcatrojans.org` or `jruble@wcatrojans.org`).
2. Go to [https://script.google.com](https://script.google.com).
3. Open or create a project named **`WCA Helpdesk Email Dispatcher`**.

#### Step 2: Paste the Script Code
1. Open the file `google-apps-script/WCA_Helpdesk_Email_Dispatcher.gs` from the backup.
2. Replace all code in `Code.gs` in the Apps Script editor with the contents of `WCA_Helpdesk_Email_Dispatcher.gs`.

#### Step 3: Deploy as Web App
1. Click **Deploy** &rarr; **New deployment**.
2. Select type: **Web app**.
3. Configure settings:
   - **Description**: `WCA Helpdesk Email Notification Dispatcher`
   - **Execute as**: `Me (itsupport@wcatrojans.org)`
   - **Who has access**: `Anyone` *(required for CORS preflight and frontend webhook POSTs)*
4. Click **Deploy**. Authorize Google permissions when prompted.
5. Copy the **Web App URL** (e.g., `https://script.google.com/macros/s/AKfycb.../exec`).

#### Step 4: Link Webhook in Helpdesk UI
1. Open the Helpdesk app at `https://wca-tickets-58f6c.web.app`.
2. Log in as an Administrator.
3. Navigate to **Fields & Department Customizer** &rarr; **Email Notifications**.
4. Paste the Web App URL into the **Google Apps Script Webhook URL** field and click **Save Settings**.
5. Click **Send Test Email** to verify delivery to `jruble@wcatrojans.org`.

---

### 6. Scenario E: Restoring Conversation History in Antigravity Agent

To restore the AI conversation history and memory onto an Antigravity instance:

1. **Locate the Antigravity Brain Directory:**
   ```
   C:\Users\<username>\.gemini\antigravity\brain\7d203432-5439-4385-a24a-775a71111322
   ```
2. **Copy Conversation Artifacts from Backup:**
   Copy all files from `Backup/latest/conversation_brain/`:
   ```powershell
   $target = "$env:USERPROFILE\.gemini\antigravity\brain\7d203432-5439-4385-a24a-775a71111322"
   New-Item -ItemType Directory -Force -Path (Join-Path $target ".system_generated\logs") | Out-Null
   
   Copy-Item "Backup\latest\conversation_brain\transcript.jsonl" -Destination (Join-Path $target ".system_generated\logs\transcript.jsonl") -Force
   Copy-Item "Backup\latest\conversation_brain\transcript_full.jsonl" -Destination (Join-Path $target ".system_generated\logs\transcript_full.jsonl") -Force
   Copy-Item "Backup\latest\conversation_brain\user_uploaded" -Destination (Join-Path $target ".user_uploaded") -Recurse -Force
   Copy-Item "Backup\latest\conversation_brain\scratch" -Destination (Join-Path $target "scratch") -Recurse -Force
   ```
3. Resume conversation in Antigravity by linking or opening conversation ID `7d203432-5439-4385-a24a-775a71111322`.

---

### 7. Scenario F: Running Future Backups

To take a fresh backup at any time, run the automated PowerShell script:

```powershell
cd "G:\Shared drives\INFOTECH\GOOGLE\AntiGravity Projects\Helpdesk\Backup"
powershell -ExecutionPolicy Bypass -File .\backup_helpdesk.ps1
```

The script will automatically refresh `Backup/latest/` and create a new timestamped zip archive in `Backup/archives/`.
