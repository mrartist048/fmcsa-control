DISPATCH LINK - UNIFIED (CRM + DMS)   keep ALL files in one folder, open index.html via Live Server / hosting

FILES
 index.html   login page (CRM Login | DMS Login tabs + "Create your password")
 auth.js      shared login, licence/expiry check, roles (used by every page)
 hub.html     ADMIN panel: open CRM / DMS / Team monitoring, licence status, create sales agents
 crm.html + scraper-core.js + style.css      CRM (old index.html)
 dms.html                                    Dispatch Management (old dispatch-module.html) + Code.gs (Google Sheet backend, unchanged)
 admin.html + admin.js + admin.css           Team monitoring (online users, leaderboard, shift reports)

HOW YOU ADD A NEW CLIENT (Firebase console, any of the 3 CRM databases)
 allowedUsers / <companyusername> :  { "expires": "2026-12-31", "maxLaptops": 5 }
 - NO password needed. Give the client the username only.
 - Client opens index.html > "Create your password" > sets his own password. Works until "expires".
 - To reset a forgotten admin password: delete "salt" and "hash" under that company; client creates a new one.
   (If a Google Sheet is already linked, also clear owner_u / owner_h rows in the Sheet's Settings tab.)

WHO GOES WHERE
 Admin            username + password (Company ID blank)  -> hub.html -> CRM / DMS / Monitoring
 Sales agent      CRM Login: username + password + Company ID -> crm.html only
 Dispatcher       DMS Login: username + password + Company ID -> dms.html only
 Admin creates sales agents in hub.html; dispatchers in DMS > Settings > Dispatch team access (as before).
 Wrong role opening a wrong page is sent back to its own page. Expired/removed users are signed out within 1 minute.

DMS SETUP (unchanged): admin opens DMS > Settings > Configure Google Sheet and pastes the Apps Script URL.


NEW IN THIS VERSION
 - Mobile responsive: login, CRM, DMS, admin hub and monitoring.
 - One device per user: admin-created sales agents and dispatchers can be signed in on ONE device at a time.
   A second login is refused ("already signed in on another device"). Admin can press "Sign out device" (hub Sales team / DMS Settings team list).
   A lock expires by itself ~90 s after the browser is closed. Needs "device_locks" in Firebase rules (see Firebase_Rules.txt).
 - CRM header: "Email setup" replaces Today's calls (calls details still open by clicking the Calls card). Proposal subject/body is saved there, {company} is replaced per lead.
 - CRM leads: address shows only STATE + ZIP; click it for the full address. Copy icon sits beside the phone number.
 - History: select sheets and download them as ONE csv (duplicates removed by MC, "Source Sheet" column added).
 - Follow-ups drawer redesigned (Due today / All saved, search, select, CSV / share).
 - DMS > Settings: step-by-step Google Sheet guide + hidden Apps Script code (Show code / Copy Apps Script code).
 - Admin hub redesigned (sidebar dashboard).
 After uploading to GitHub: hard refresh (Ctrl+F5). Code.gs is unchanged: no need to redeploy it.

NOT YET DONE: MOTUS (daily FMCSA register PDFs -> leads). Needs the real data source (see message).
