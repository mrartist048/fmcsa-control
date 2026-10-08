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


UPDATE (categories + loading + tick)
 - CRM > Categories: click it -> 3 groups (Operation Classification, Carrier Operation, Cargo Carried) -> click a group -> its full SAFER list with counts.
   Tick any items: a lead is shown when ANY ticked item is marked X on SAFER. Reset / "Clear all" clears the ticks. Works on old History data too.
 - Logo splash (Dispatch Link logo + loading bar) shows while login / CRM / DMS / Admin hub / Monitoring load.
 - Green tick animation after every save: sales agent create / password / remove / sign-out device, DMS carrier/load/settings/team/password/delete, licence field saves.
 - Speed: licence list cached for 15 s (was fetched twice per page), CRM no longer fetches it twice, device-lock check runs in parallel and is not repeated right after login.
 Nothing else was changed. Replace ALL files, then hard refresh (Ctrl+F5).

UPDATE 2 - Categories search: a search box at the top of the Categories menu searches ALL items of all 3 groups at once (type e.g. "freight" or "interstate", tick the result). Clearing the box returns to the 3 groups.
 Licence limit: the admin's own CRM tab is counted like any other tab (same sessions list, same maxLaptops limit).

UPDATE 3 - Power units filter (1 / 2 / 3 / more than 3 / more than 5, tick any); "Download Excel/CSV" now exports ONLY the leads currently shown by the filters (state, search, vehicle, categories, power units), and with a category filter the "Carrier Details" column lists only the ticked categories.

UPDATE 4
 - Admin panel (hub.html) sidebar: new "Configure Your GS" page = Google Sheet link box, Copy/Show Apps Script code, and the step-by-step guide (moved out of DMS > Settings; DMS now just points to it).
 - Sales team: new "Tabs allowed" field when creating an agent (default 1) and a Tabs dropdown per agent to change it later. The CRM enforces it per login (agent's own open tabs), on top of the company device/tab limit. Agents created before this update count as 1 tab until you change them. A changed value reaches an open CRM within ~1 minute.


UPDATE 5
 - Admin > Team monitoring > "Login history": every sales agent sign-in with login time, logout / session-end time (with seconds), duration and status
   (Online / Signed out / Session ended = browser closed or connection lost). Stored in Firebase node login_log/<company> (add "login_log" to the rules, see Firebase_Rules.txt).
   (retention: see UPDATE 6)
 - CRM > Email setup: the proposal template is now saved in IndexedDB (not wiped daily any more). Saving again deletes the old template and stores the new one.
 - CRM leads table: new "Owner name" column (left of Phone).

UPDATE 6 - Firebase keeps ONE day only (USA shift day, shift changes at 3 AM New York time)
 - call_logs, shift_reports and login_log: everything from a previous USA shift is deleted automatically (when an admin opens Team monitoring, when a sales agent signs in,
   and every 30 min while the CRM / monitoring page stays open). allowedUsers and sales_users (company licence + the sales agents the company created) are NEVER deleted.
 - Team monitoring: the "Last 7 days" filter is removed (only "Today (USA)" + custom date picker remain). Login history shows the current USA shift only.
