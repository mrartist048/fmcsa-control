// ====== DYNAMIC FAVICON INCORPORATOR ======
(function injectFavicon() {
    const faviconUrl = "https://cdn.jsdelivr.net/gh/mrartist048/fmcsa-control@main/favicon.png";
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = faviconUrl;
})();

// ====== GOOGLE SHEETS API CONFIGURATION ======
const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbx18Pg5Uxn7grnQElHJ6dErltf6CKT1oJvj4C0ISXFI8X7OqsnE8jUOL5fqM1_2TRnWaA/exec";

// ====== MULTI-PROJECT FIREBASE URLS ======
const FIREBASE_DB_URL_1 = "https://data-scrapper-eddcf-default-rtdb.firebaseio.com/";
const FIREBASE_DB_URL_2 = "https://data-scraper-2-default-rtdb.firebaseio.com/";
const FIREBASE_DB_URL_3 = "https://data-scraper-3-default-rtdb.firebaseio.com/";

// ====== GLOBAL ACCESS CONTROL & LOGIN CREDENTIALS ======
const allowedUsers = {
    "Gslogisticsdispatch": { pass: "Gslogisticsdispatch", maxLaptops: 2, expires: "2026-07-28", dbUrl: FIREBASE_DB_URL_1 },    
    "precisionx": { pass: "precisionx123", maxLaptops: 1, expires: "2026-07-30", dbUrl: FIREBASE_DB_URL_1 },  
    "dispatchloadify": { pass: "admin789", maxLaptops: 5, expires: "2026-09-01", dbUrl: FIREBASE_DB_URL_2 }, 
    "baitstarlogistics": { pass: "baitstarlogistics123", maxLaptops: 10, expires: "2026-08-30", dbUrl: FIREBASE_DB_URL_2 },         
    "Skylinelogistics": { pass: "Skylinelogistics123", maxLaptops: 2, expires: "2026-08-30", dbUrl: FIREBASE_DB_URL_1 },  
    "Loadlink": { pass: "Loadlink#trial", maxLaptops: 3, expires: "2026-08-14", dbUrl: FIREBASE_DB_URL_2 },
    "Nexteklogistics": { pass: "Nexteklogistics#123", maxLaptops: 1, expires: "2026-09-22", dbUrl: FIREBASE_DB_URL_2 },
    "testinguser": { pass: "testinguser123", maxLaptops: 2, expires: "2026-08-30", dbUrl: FIREBASE_DB_URL_3 }, 
};

const MASTER_ADMIN_PASS = "admin890";
let currentClient = localStorage.getItem("dl_logged_client") || "";

const FIREBASE_DB_URL = (currentClient && allowedUsers[currentClient] && allowedUsers[currentClient].dbUrl) 
    ? allowedUsers[currentClient].dbUrl 
    : FIREBASE_DB_URL_1;

let userLimit = 0;
let dispatcherNickname = ""; 

if (!window.name || !window.name.startsWith("dl_inst_")) {
    window.name = "dl_inst_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
}
const tabUniqueId = window.name;

const usStatesMap = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
    "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
    "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
    "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming"
};

// ====== GOOGLE SHEETS SYNC INTEGRATION ======
async function syncLeadToGoogleSheet(record, callStatus = "Scraped", remarksText = "") {
    if (!GOOGLE_SHEET_API_URL) return;
    try {
        let payload = {
            timestamp: new Date().toLocaleString(),
            company: currentClient || "N/A",
            agent: dispatcherNickname || "N/A",
            mc: record.mc || "N/A",
            companyName: record.name || "N/A",
            phone: record.phone || "N/A",
            email: record.email || "N/A",
            status: callStatus || record.status || "N/A",
            remarks: remarksText || record.remarks || "",
            shiftDate: getCurrentShiftDateKey()
        };

        await fetch(GOOGLE_SHEET_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("Google Sheet Sync Error:", e);
    }
}

// ====== AUTOMATIC 7-DAY DATA CLEANUP FUNCTION ======
async function performAutomaticDataCleanup() {
    if (!currentClient) return;
    let now = Date.now();
    let sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;

    let storageKey = `dl_call_logs_${currentClient}_${dispatcherNickname}`;
    let callLogs = JSON.parse(localStorage.getItem(storageKey)) || [];
    let filteredLogs = callLogs.filter(log => {
        let logTime = new Date(log.date).getTime();
        return !isNaN(logTime) && (now - logTime) < sevenDaysInMillis;
    });
    if (filteredLogs.length !== callLogs.length) {
        localStorage.setItem(storageKey, JSON.stringify(filteredLogs));
    }

    try {
        if (dispatcherNickname) {
            let safeUserKey = dispatcherNickname.replace(/[.#$\/\[\]]/g, "_");
            let callLogUrl = `${FIREBASE_DB_URL}call_logs/${currentClient}/${safeUserKey}.json`;
            let res = await fetch(callLogUrl);
            let remoteLogs = await res.json();
            if (Array.isArray(remoteLogs)) {
                let freshRemoteLogs = remoteLogs.filter(log => {
                    let logTime = new Date(log.date).getTime();
                    return !isNaN(logTime) && (now - logTime) < sevenDaysInMillis;
                });
                if (freshRemoteLogs.length !== remoteLogs.length) {
                    await fetch(callLogUrl, {
                        method: 'PUT',
                        body: JSON.stringify(freshRemoteLogs)
                    });
                }
            }
        }
    } catch (e) {
        console.error("Auto cleanup call logs failed:", e);
    }
}

function showLimitExceededModal(message) {
    let existingModal = document.getElementById('dlLimitExceededModal');
    if (existingModal) existingModal.remove();

    let modal = document.createElement('div');
    modal.id = 'dlLimitExceededModal';
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.65); z-index: 99999999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    
    modal.innerHTML = `
        <div style="background: #ffffff; padding: 35px 30px; border-radius: 10px; width: 400px; box-shadow: 0 15px 40px rgba(0,0,0,0.4); text-align: center; border-top: 6px solid #dc3545;">
            <div style="font-size: 42px; margin-bottom: 10px;">⚠️</div>
            <h2 style="color: #dc3545; margin-top: 0; margin-bottom: 10px; font-size: 22px;">License Limit Exceeded!</h2>
            <p style="color: #444; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">${message}</p>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #ddd; font-size: 12px; color: #333; margin-bottom: 20px;">
                Need to increase your active device/tab limit? <br>Contact Admin: <b>03700684849</b>
            </div>
            <button onclick="document.getElementById('dlLimitExceededModal').remove()" style="background: #002d62; color: white; border: none; padding: 10px 20px; font-size: 13px; font-weight: bold; border-radius: 5px; cursor: pointer; width: 100%;">OK, Understood</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function showPremiumNotification(message, duration = 4500) {
    let toast = document.createElement('div');
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="background: #28a745; width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 8px #28a745;"></div>
            <span>${message}</span>
        </div>
    `;
    toast.style.cssText = `
        position: fixed; top: -100px; right: 20px; background: #002d62; color: #ffffff; padding: 14px 22px; border-radius: 6px; font-family: sans-serif; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.25); border-left: 5px solid #17a2b8; z-index: 1000000; transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s; opacity: 0;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => { toast.style.top = "20px"; toast.style.opacity = "1"; }, 100);
    setTimeout(() => { toast.style.top = "-100px"; toast.style.opacity = "0"; setTimeout(() => toast.remove(), 400); }, duration);
}

function renderLoginScreen() {
    if (document.getElementById('dlLoginOverlay')) return;

    let overlay = document.createElement('div');
    overlay.id = 'dlLoginOverlay';
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #001a3a; z-index: 9999999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    overlay.innerHTML = `
        <div style="background: #ffffff; padding: 35px 30px; border-radius: 8px; width: 360px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center;">
            <h2 style="color: #002d62; margin-bottom: 5px; font-size: 24px;">Dispatch Link</h2>
            <p style="color: #6c757d; font-size: 12px; margin-bottom: 25px;">Secure Dispatcher CRM Portal</p>
            
            <div style="margin-bottom: 15px; text-align: left;">
                <label style="font-size: 12px; font-weight: bold; color: #333; display: block; margin-bottom: 5px;">Username</label>
                <input type="text" id="dlLoginUser" placeholder="Enter your username" style="width: 100%; padding: 10px; font-size: 13px; border: 1px solid #b6ccfe; border-radius: 4px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 20px; text-align: left;">
                <label style="font-size: 12px; font-weight: bold; color: #333; display: block; margin-bottom: 5px;">Password</label>
                <input type="password" id="dlLoginPass" placeholder="Enter your password" style="width: 100%; padding: 10px; font-size: 13px; border: 1px solid #b6ccfe; border-radius: 4px; box-sizing: border-box;">
            </div>

            <button onclick="processLogin()" style="width: 100%; background: #002d62; color: white; border: none; padding: 12px; font-size: 14px; font-weight: bold; border-radius: 4px; cursor: pointer;">Login to Portal</button>
            <div id="dlLoginError" style="color: #dc3545; font-size: 12px; font-weight: bold; margin-top: 12px; display: none;"></div>
            
            <div style="margin-top: 25px; font-size: 11px; color: #6c757d;">
                Need access? Contact Admin: <b>03700684849</b><br>
                Email: <a href="mailto:info@dispatchlink.online" style="color: #6c757d; text-decoration: underline;">info@dispatchlink.online</a>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

window.processLogin = function() {
    let uInput = document.getElementById('dlLoginUser').value.trim();
    let pInput = document.getElementById('dlLoginPass').value.trim();
    let errBox = document.getElementById('dlLoginError');

    let userConfig = allowedUsers[uInput];
    if (!userConfig || userConfig.pass !== pInput) {
        errBox.style.display = "block";
        errBox.innerText = "Invalid Username or Password!";
        return;
    }

    let todayStr = new Date().toISOString().split('T')[0];
    if (todayStr > userConfig.expires) {
        errBox.style.display = "block";
        errBox.innerText = "Subscription has expired! Contact Admin.";
        return;
    }

    localStorage.setItem("dl_logged_client", uInput);
    currentClient = uInput;
    let overlay = document.getElementById('dlLoginOverlay');
    if (overlay) overlay.remove();
    window.location.reload();
};

function setupDispatcherIdentity() {
    dispatcherNickname = localStorage.getItem(`dl_nick_${currentClient}`) || "";
    if (!dispatcherNickname) {
        let inputName = prompt("Welcome! Please enter your name (e.g., Nauman, Ali, Bilal):");
        if (inputName && inputName.trim() !== "") {
            dispatcherNickname = inputName.trim();
        } else {
            dispatcherNickname = "User_" + Math.floor(100 + Math.random() * 900);
        }
        localStorage.setItem(`dl_nick_${currentClient}`, dispatcherNickname);
    }
    injectNicknameProfileUI();
}

function getCurrentShiftDateKey() {
    let now = new Date();
    let hour = now.getHours();
    if (hour < 10) { now.setDate(now.getDate() - 1); }
    let year = now.getFullYear();
    let month = String(now.getMonth() + 1).padStart(2, '0');
    let day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function injectNicknameProfileUI() {
    if (document.getElementById('dlNickProfilePanel')) return;
    let heading = document.querySelector('h1, h2, .heading') || document.body;
    let panel = document.createElement('div');
    panel.id = 'dlNickProfilePanel';
    panel.style.cssText = "display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 12px; font-family: sans-serif;";
    
    panel.innerHTML = `
        <div style="font-size: 12px; color: #002d62; font-weight: bold; background: #e2eafc; padding: 6px 12px; border-radius: 4px; display: inline-block;">
            👤 User: <span style="color:#28a745;" id="dlDispCurrentName">${dispatcherNickname}</span> 
            <a href="#" onclick="changeDispatcherName(); return false;" style="margin-left:8px; color:#17a2b8; text-decoration:none;">[✏️ Change]</a> 
            <a href="#" onclick="logoutUser(); return false;" style="margin-left:12px; color:#dc3545; text-decoration:none;">[🚪 Logout]</a>
        </div>
        <div style="display: flex; gap: 8px;">
            <button onclick="openCallingDetailModal()" style="background: #ff9800; color: white; border: 1px solid #e68a00; padding: 8px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">📊 Calling Detail</button>
            <button onclick="openAdminPanelPrompt()" style="background: #002d62; color: white; border: 1px solid #001a3a; padding: 8px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">👑 Admin Panel</button>
        </div>
    `;
    heading.parentNode.insertBefore(panel, heading.nextSibling);
}

window.changeDispatcherName = function() {
    let oldName = localStorage.getItem(`dl_nick_${currentClient}`) || "";
    let newName = prompt("Enter your new display name:", oldName);
    if (newName && newName.trim() !== "") {
        dispatcherNickname = newName.trim();
        localStorage.setItem(`dl_nick_${currentClient}`, dispatcherNickname);
        let label = document.getElementById('dlDispCurrentName');
        if (label) label.innerText = dispatcherNickname;
        updateActiveSessionData();
    }
};

window.logoutUser = function() {
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    navigator.sendBeacon(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json?_method=DELETE`);
    localStorage.removeItem("dl_logged_client");
    localStorage.removeItem(`dl_fixed_login_time_${currentClient}_${dispatcherNickname}`);
    window.location.reload();
};

function initializeAccessControl() {
    if (!currentClient || !allowedUsers[currentClient]) {
        renderLoginScreen();
        return;
    }
    let clientConfig = allowedUsers[currentClient];
    userLimit = clientConfig.maxLaptops || 0;
    const todayStr = new Date().toISOString().split('T')[0]; 

    if (todayStr > clientConfig.expires) {
        alert("Your subscription has expired.");
        localStorage.removeItem("dl_logged_client");
        renderLoginScreen();
        return;
    }

    setupDispatcherIdentity();
    showPremiumNotification(`🚀 License Active: Verified for "${currentClient}" (Expires: ${clientConfig.expires})`);
    performAutomaticDataCleanup();
    checkGlobalSessions();
    setInterval(checkGlobalSessions, 30000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!currentClient || !allowedUsers[currentClient]) renderLoginScreen();
        else initializeAccessControl();
    });
} else {
    setTimeout(() => {
        if (!currentClient || !allowedUsers[currentClient]) renderLoginScreen();
        else initializeAccessControl();
    }, 300);
}

async function updateActiveSessionData() {
    if (!currentClient) return;
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    try {
        await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}/nickname.json`, {
            method: 'PUT',
            body: JSON.stringify(dispatcherNickname)
        });
    } catch (e) { console.error("Failed to update session nickname:", e); }
}

async function checkGlobalSessions() {
    if (userLimit === 0 || !currentClient) return;
    const url = `${FIREBASE_DB_URL}sessions/${currentClient}.json`;
    const now = Date.now();
    let timeKey = `dl_fixed_login_time_${currentClient}_${dispatcherNickname}`;
    let loginTimeString = localStorage.getItem(timeKey);
    let todayDateKey = getCurrentShiftDateKey();
    let storedDateKey = localStorage.getItem(`${timeKey}_date`);

    if (!loginTimeString || storedDateKey !== todayDateKey) {
        loginTimeString = new Date().toLocaleTimeString();
        localStorage.setItem(timeKey, loginTimeString);
        localStorage.setItem(`${timeKey}_date`, todayDateKey);
    }

    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    try {
        const res = await fetch(url);
        const data = await res.json() || {};
        let activeSessionsMap = {};
        const offlineThreshold = 60000;

        Object.keys(data).forEach(key => {
            let session = data[key];
            if (session && session.timestamp && (now - session.timestamp < offlineThreshold)) {
                activeSessionsMap[key] = session;
            }
        });

        let activeCount = Object.keys(activeSessionsMap).length;
        let isCurrentRegistered = !!activeSessionsMap[safeTabKey];

        if (!isCurrentRegistered && activeCount >= userLimit) {
            if (typeof scraping !== 'undefined' && scraping) stopScraping();
            showLimitExceededModal(`Your global license limit for "${currentClient}" has been reached. Max allowed active tabs/devices is <b>${userLimit}</b>.`);
            return;
        }

        await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json`, {
            method: 'PUT',
            body: JSON.stringify({ instanceId: tabUniqueId, nickname: dispatcherNickname, timestamp: now, loginTime: loginTimeString })
        });
    } catch (e) { console.error("Session sync failed:", e); }
}

window.addEventListener('beforeunload', function () {
    if (!currentClient) return;
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    navigator.sendBeacon(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json?_method=DELETE`);
});

let db;
let currentHistoryId = null;
const request = indexedDB.open("DispatchLinkHistoryDB", 1);
request.onupgradeneeded = function(e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains("history")) {
        db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
    }
};
request.onsuccess = function(e) {
    db = e.target.result;
    syncIndexedDBWithLocalStorage();
    injectHistoryUIFramework();
};

function syncIndexedDBWithLocalStorage() {
    if (!db) return;
    const tx = db.transaction("history", "readwrite");
    const store = tx.objectStore("history");
    const getAll = store.getAll();
    getAll.onsuccess = function() {
        let dbRecords = getAll.result || [];
        let lsBackup = JSON.parse(localStorage.getItem(`dl_history_backup_${currentClient}`)) || [];
        if (dbRecords.length === 0 && lsBackup.length > 0) {
            lsBackup.forEach(item => { store.put(item); });
        } else if (dbRecords.length > 0) {
            localStorage.setItem(`dl_history_backup_${currentClient}`, JSON.stringify(dbRecords));
        }
    };
}

const DEFAULT_REMARKS_TEMPLATE = "Truck Type:\nLength:\nAccessories:\nLoad:\nZip Code:\nSummary:";

function injectHistoryUIFramework() {
    document.title = "Dispatch Link";
    let brandHeading = document.querySelector('h1, h2, .heading');
    if (!brandHeading) {
        const headings = document.querySelectorAll('div, h1, h2, h3');
        for (let h of headings) { if (h.textContent.includes("FMCSA SAFER") || h.textContent.includes("SAFER")) { brandHeading = h; break; } }
    }
    if (brandHeading) {
        brandHeading.innerHTML = "Dispatch Link <span style='font-size:14px; color:#6c757d; font-weight:normal;'>| Lead Processor & CRM</span>";
    }

    if (!document.getElementById('dlResponsiveTheme')) {
        let styleTag = document.createElement('style');
        styleTag.id = 'dlResponsiveTheme';
        styleTag.innerHTML = `
            .container, .container-fluid { width: 100% !important; max-width: 100% !important; padding: 10px !important; box-sizing: border-box !important; }
            .table-responsive { width: 100% !important; overflow-x: auto !important; margin-bottom: 20px !important; border: 1px solid #ddd !important; border-radius: 6px !important; background: #fff; }
            table.table { width: 100% !important; min-width: 1300px !important; border-collapse: collapse !important; }
            table.table th, table.table td { padding: 10px 8px !important; vertical-align: middle !important; text-align: left !important; font-size: 13px !important; }
            
            /* Clean 1-line phone number layout styling */
            .phone-clickable-container { padding: 4px !important; text-align: center !important; position: relative !important; white-space: nowrap !important; }
            .phone-clickable-cell { padding: 6px 10px !important; text-align: center !important; cursor: pointer !important; display: inline-block !important; border-radius: 6px !important; white-space: nowrap !important; text-decoration: none !important; }
            .phone-clickable-cell:hover { background-color: #001a3a !important; color: #ffffff !important; }
            .phone-clickable-cell.active-called-cell { background-color: #d1ecf1 !important; border: 1px solid #bee5eb !important; }
            .phone-cell-content { display: inline-flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; white-space: nowrap !important; pointer-events: none; }
            .phone-icon-span { font-size: 13px !important; line-height: 1 !important; }
            .clickable-phone-text { color: #002d62 !important; font-weight: bold !important; font-size: 12px !important; white-space: nowrap !important; }
            .phone-hover-copy-icon { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font-size: 11px; opacity: 0; cursor: pointer; background: #e2eafc; padding: 2px 4px; border-radius: 3px; }
            .phone-clickable-container:hover .phone-hover-copy-icon { opacity: 1; }
            .phone-copy-badge { position: absolute; background: #28a745; color: white; padding: 2px 6px; font-size: 10px; border-radius: 3px; top: -18px; left: 50%; transform: translateX(-50%); z-index: 100; font-weight: bold; }

            /* Proper Remarks & Action Column layout to prevent overflow */
            .remarks-cell-container { min-width: 240px !important; width: 240px !important; position: relative; white-space: normal !important; }
            .remarks-input-field { width: 100% !important; height: 38px !important; border: 1px solid #b6ccfe !important; border-radius: 6px !important; padding: 6px 10px !important; font-size: 12px !important; box-sizing: border-box !important; color: #222 !important; background: #fafafa !important; resize: none !important; font-family: monospace !important; overflow: hidden !important; transition: height 0.25s ease-in-out; }
            .remarks-input-field:focus { height: 120px !important; border-color: #002d62 !important; background: #ffffff !important; outline: none !important; overflow-y: auto !important; box-shadow: 0 4px 10px rgba(0,45,98,0.15) !important; }
            
            .premium-copy-badge { position: absolute; background: #28a745; color: white; padding: 2px 6px; font-size: 10px; border-radius: 3px; top: -15px; left: 50%; transform: translateX(-50%); z-index: 100; font-weight: bold; }
            .premium-pitch-btn { display: inline-block; background: #17a2b8; color: white; text-decoration: none; font-size: 10px; font-weight: bold; padding: 4px 6px; border-radius: 3px; margin-left: 5px; }
            .premium-followup-btn { display: inline-block; background: #ffc107; color: #212529; text-decoration: none; font-size: 10px; font-weight: bold; padding: 5px 10px; border-radius: 3px; cursor: pointer; white-space: nowrap !important; }
        `;
        document.head.appendChild(styleTag);
    }

    let startBtn = document.getElementById('startBtn');
    if (startBtn && !document.getElementById('openHistoryBtn')) {
        let historyBtn = document.createElement('button');
        historyBtn.id = 'openHistoryBtn';
        historyBtn.innerHTML = "📜 View History";
        historyBtn.style.cssText = "background: #002d62; color: white; border: 1px solid #001a3a; padding: 8px 16px; font-size: 14px; font-weight: bold; border-radius: 4px; cursor: pointer; margin-left: 10px;";
        historyBtn.onclick = (e) => { e.stopPropagation(); toggleHistoryDrawer(); };
        startBtn.parentNode.insertBefore(historyBtn, startBtn.nextSibling);

        let followUpBtn = document.createElement('button');
        followUpBtn.id = 'openFollowUpDrawerBtn';
        followUpBtn.innerHTML = "📅 View Follow-Ups";
        followUpBtn.style.cssText = "background: #17a2b8; color: white; border: 1px solid #138496; padding: 8px 16px; font-size: 14px; font-weight: bold; border-radius: 4px; cursor: pointer; margin-left: 8px;";
        followUpBtn.onclick = (e) => { e.stopPropagation(); toggleFollowUpDrawer(); };
        startBtn.parentNode.insertBefore(followUpBtn, historyBtn.nextSibling);
    }

    if (!document.getElementById('dlHistoryDrawer')) {
        let drawer = document.createElement('div');
        drawer.id = 'dlHistoryDrawer';
        drawer.style.cssText = "position: fixed; top: 0; right: -420px; width: 400px; height: 100%; background: #ffffff; box-shadow: -5px 0 15px rgba(0,0,0,0.15); z-index: 999999; transition: right 0.3s ease-in-out; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column;";
        drawer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #002d62; padding-bottom: 10px; margin-bottom: 15px;">
                <h3 style="color: #002d62; margin: 0; font-size: 18px;">Saved Sheets History</h3>
                <button onclick="toggleHistoryDrawer()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #6c757d;">&times;</button>
            </div>
            <div id="drawerHistoryList" style="flex: 1; overflow-y: auto;"></div>
        `;
        document.body.appendChild(drawer);
    }

    if (!document.getElementById('dlFollowUpDrawer')) {
        let fDrawer = document.createElement('div');
        fDrawer.id = 'dlFollowUpDrawer';
        fDrawer.style.cssText = "position: fixed; top: 0; right: -420px; width: 400px; height: 100%; background: #ffffff; box-shadow: -5px 0 15px rgba(0,0,0,0.15); z-index: 999999; transition: right 0.3s ease-in-out; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column;";
        fDrawer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #17a2b8; padding-bottom: 10px; margin-bottom: 10px;">
                <h3 style="color: #17a2b8; margin: 0; font-size: 18px;">📅 Follow-Up Pipeline</h3>
                <button onclick="toggleFollowUpDrawer()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #6c757d;">&times;</button>
            </div>
            <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                <button onclick="filterFollowUpsByDate('today')" id="fubtnToday" style="flex: 1; background: #17a2b8; color: white; border: none; padding: 6px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer;">📅 Today</button>
                <button onclick="filterFollowUpsByDate('all')" id="fubtnAll" style="flex: 1; background: #e2eafc; color: #002d62; border: 1px solid #b6ccfe; padding: 6px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer;">📋 All</button>
            </div>
            <div style="margin-bottom: 12px;">
                <button onclick="downloadFollowUpsCSV()" style="background: #28a745; color: white; border: none; padding: 6px 14px; font-weight: bold; font-size: 12px; border-radius: 4px; cursor: pointer; width: 100%;">📥 Download Follow-Ups Sheet</button>
            </div>
            <div id="drawerFollowUpList" style="flex: 1; overflow-y: auto;"></div>
        `;
        document.body.appendChild(fDrawer);
    }

    if (!document.getElementById('dlDatePickerModal')) {
        let modal = document.createElement('div');
        modal.id = 'dlDatePickerModal';
        modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000000; display: none; align-items: center; justify-content: center;";
        modal.innerHTML = `
            <div style="background: white; padding: 25px; border-radius: 8px; width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                <h3 style="color: #002d62; margin-top: 0; font-size: 16px;">⏰ Schedule Follow-Up</h3>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; font-size: 12px; font-weight: bold; margin-bottom: 4px;">Select Date:</label>
                    <input type="date" id="dlModalDateInput" style="width: 100%; padding: 8px; font-size: 13px; border: 1px solid #b6ccfe; border-radius: 4px; box-sizing: border-box;">
                </div>
                <div style="margin-bottom: 18px;">
                    <label style="display: block; font-size: 12px; font-weight: bold; margin-bottom: 4px;">Select Time:</label>
                    <input type="time" id="dlModalTimeInput" style="width: 100%; padding: 8px; font-size: 13px; border: 1px solid #b6ccfe; border-radius: 4px; box-sizing: border-box;">
                </div>
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button onclick="closeFollowUpModal()" style="background: #6c757d; color: white; border: none; padding: 6px 14px; font-size: 12px; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button onclick="confirmFollowUpSchedule()" style="background: #28a745; color: white; border: none; padding: 6px 14px; font-size: 12px; border-radius: 4px; cursor: pointer;">Confirm Schedule</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    if (!document.getElementById('dlDispositionModal')) {
        let dModal = document.createElement('div');
        dModal.id = 'dlDispositionModal';
        dModal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.65); z-index: 100000000; display: none; align-items: center; justify-content: center;";
        dModal.innerHTML = `
            <div style="background: #ffffff; width: 380px; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.3); padding: 20px; box-sizing: border-box;">
                <h3 style="color: #002d62; margin-top: 0; font-size: 18px; text-align: center;">What is the Status of this call?</h3>
                <p style="font-size: 12px; color: #6c757d; text-align: center; margin-bottom: 15px;">Select call status for <b id="dispTargetPhoneNum" style="color: #002d62;"></b></p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div onclick="submitCallDisposition('Hung up')" style="background: #ff5252; color: white; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">📞 Hung up</div>
                    <div onclick="submitCallDisposition('Voicemail')" style="background: #9c27b0; color: white; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">📭 Voicemail</div>
                    <div onclick="submitCallDisposition('Not interested')" style="background: #ff9800; color: white; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">👎 Not interested</div>
                    <div onclick="submitCallDisposition('Do not Call')" style="background: #2196f3; color: white; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">🚫 Do not Call</div>
                    <div onclick="submitCallDisposition('Follow up')" style="background: #4caf50; color: white; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">📅 Follow up</div>
                    <div onclick="submitCallDisposition('Sale Closed')" style="background: #009688; color: white; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">🤝 Sale Closed</div>
                </div>
            </div>
        `;
        document.body.appendChild(dModal);
    }

    injectAdvancedFilterBar();

    let tableHeader = document.querySelector('table tr');
    if (tableHeader && !document.getElementById('remarksHeaderCol')) {
        let vehTh = document.createElement('th');
        vehTh.id = 'vehicleTypeHeaderCol'; vehTh.innerText = "Vehicles";
        let remTh = document.createElement('th');
        remTh.id = 'remarksHeaderCol'; remTh.className = 'remarks-cell-container'; remTh.innerText = "Remarks";
        let followTh = document.createElement('th');
        followTh.id = 'followUpHeaderCol'; followTh.innerText = "Action";

        let powerUnitsTh = tableHeader.children[8];
        if (powerUnitsTh && powerUnitsTh.nextSibling) {
            tableHeader.insertBefore(vehTh, powerUnitsTh.nextSibling);
        } else {
            tableHeader.appendChild(vehTh);
        }
        tableHeader.appendChild(remTh);
        tableHeader.appendChild(followTh);
    }

    injectEmailProposalPanel();
}

function injectAdvancedFilterBar() {
    let table = document.querySelector('table');
    if (!table || document.getElementById('advancedFilterWrapper')) return;

    let filterDiv = document.createElement('div');
    filterDiv.id = 'advancedFilterWrapper';
    filterDiv.style.cssText = "background: #f4f7fe; padding: 12px 15px; margin: 12px 0; border: 1px solid #b6ccfe; border-radius: 6px; font-family: sans-serif; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; justify-content: space-between;";
    filterDiv.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; flex: 1;">
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 13px; font-weight: bold; color: #002d62;">📍 State:</span>
                <select id="stateDropdownSelect" style="padding: 6px 10px; font-size: 12px; border: 1px solid #b6ccfe; border-radius: 4px; background: white; color: #002d62; font-weight: bold;" onchange="applyAdvancedFilters()">
                    <option value="">All States</option>
                </select>
            </div>
            <div style="position: relative; display: inline-block;">
                <button type="button" onclick="toggleVehicleDropdown(event)" style="background: white; border: 1px solid #b6ccfe; padding: 6px 12px; font-size: 12px; border-radius: 4px; color: #002d62; font-weight: bold; cursor: pointer;">Select Vehicle Types ▼</button>
                <div id="vehicleTypeDropdownContent" style="display: none; position: absolute; background: white; border: 1px solid #b6ccfe; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 10px 12px; border-radius: 6px; z-index: 1000; width: 170px; top: 100%; left: 0; margin-top: 4px;">
                    <div style="font-size: 11px; font-weight: bold; color: #666; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px;">Filter by Vehicle:</div>
                    <div id="vehicleCheckboxList"></div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 220px;">
                <span style="font-size: 13px; font-weight: bold; color: #002d62;">🔍 Search:</span>
                <input type="text" id="universalSearchInput" placeholder="Search by MC, Company Name, or Phone..." style="width: 100%; padding: 6px 10px; font-size: 12px; border: 1px solid #b6ccfe; border-radius: 4px;" oninput="applyAdvancedFilters()">
            </div>
            <button onclick="resetAdvancedFilters()" style="background: #002d62; color: white; border: none; padding: 6px 14px; font-size: 12px; font-weight: bold; border-radius: 4px; cursor: pointer;">🔄 Reset</button>
        </div>
        <div style="background: #002d62; color: white; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: bold; white-space: nowrap;">
            📊 Showing: <span id="visibleRecordCountBadge">0</span> Records
        </div>
    `;
    table.parentNode.insertBefore(filterDiv, table);
    populateStateDropdown();
    populateVehicleTypeCheckboxes();
}

window.toggleVehicleDropdown = function(e) {
    e.stopPropagation();
    let dropdown = document.getElementById('vehicleTypeDropdownContent');
    if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
};

function populateStateDropdown() {
    let select = document.getElementById('stateDropdownSelect');
    if (!select) return;
    let stateCounts = {};
    if (typeof scrapedData !== 'undefined' && scrapedData.length > 0) {
        scrapedData.forEach(r => {
            let addr = (r.address || "").toUpperCase();
            for (let code in usStatesMap) {
                let stateRegex = new RegExp(`\\b${code}\\b(?=\\s+\\d{5}(-\\d{4})?)`);
                if (stateRegex.test(addr)) {
                    stateCounts[code] = (stateCounts[code] || 0) + 1;
                    break;
                }
            }
        });
    }
    let currentVal = select.value;
    select.innerHTML = '<option value="">All States</option>';
    Object.keys(usStatesMap).forEach(code => {
        if (stateCounts[code]) {
            let opt = document.createElement('option');
            opt.value = code;
            opt.textContent = `${usStatesMap[code]} (${code}) - ${stateCounts[code]}`;
            select.appendChild(opt);
        }
    });
    select.value = currentVal;
}

function populateVehicleTypeCheckboxes() {
    let container = document.getElementById('vehicleCheckboxList');
    if (!container) return;
    let fixedTypes = ["Straight Trucks", "Truck Tractors", "Trailers"];
    let html = "";
    fixedTypes.forEach(vType => {
        html += `<label style="display:flex; align-items:center; gap:6px; font-size:12px; margin-bottom:6px; cursor:pointer;"><input type="checkbox" value="${vType}" onchange="applyAdvancedFilters()"> ${vType}</label>`;
    });
    container.innerHTML = html;
}

window.applyAdvancedFilters = function() {
    let selectedState = (document.getElementById('stateDropdownSelect')?.value || "").toUpperCase().trim();
    let searchQuery = (document.getElementById('universalSearchInput')?.value || "").toLowerCase().trim();
    let selectedVehicles = [];
    document.querySelectorAll('#vehicleCheckboxList input[type="checkbox"]:checked').forEach(cb => {
        selectedVehicles.push(cb.value.toLowerCase());
    });

    let rows = document.querySelectorAll('#resultsTable tr');
    let visibleCount = 0;
    rows.forEach(row => {
        let mcText = (row.cells[0]?.textContent || "").toLowerCase();
        let nameText = (row.cells[2]?.textContent || "").toLowerCase();
        let phoneText = (row.cells[5]?.textContent || "").toLowerCase();
        let addressText = (row.cells[6]?.textContent || "").toUpperCase();
        let vehicleText = (row.cells[9]?.textContent || "").toLowerCase();

        let matchesState = selectedState === "" || new RegExp(`\\b${selectedState}\\b`).test(addressText);
        let matchesSearch = searchQuery === "" || mcText.includes(searchQuery) || nameText.includes(searchQuery) || phoneText.includes(searchQuery);
        let matchesVehicle = selectedVehicles.length === 0 || selectedVehicles.some(sel => vehicleText.includes(sel));

        if (matchesState && matchesSearch && matchesVehicle) {
            row.style.display = "";
            visibleCount++;
        } else {
            row.style.display = "none";
        }
    });
    let badge = document.getElementById('visibleRecordCountBadge');
    if (badge) badge.innerText = visibleCount;
};

window.resetAdvancedFilters = function() {
    document.getElementById('stateDropdownSelect').value = "";
    document.getElementById('universalSearchInput').value = "";
    document.querySelectorAll('#vehicleCheckboxList input[type="checkbox"]').forEach(cb => cb.checked = false);
    applyAdvancedFilters();
};

function injectEmailProposalPanel() {
    let table = document.querySelector('table');
    if (!table || document.getElementById('premiumProposalWrapper')) return;

    let savedSubject = localStorage.getItem(`dl_subj_${currentClient}`) || "Dispatch Service Proposal";
    let savedBody = localStorage.getItem(`dl_body_${currentClient}`) || "Hello,\n\nWe found your profile via FMCSA. We offer dispatching services at 5% rate.\n\nBest Regards.";

    let proposalPanel = document.createElement('div');
    proposalPanel.id = 'premiumProposalWrapper';
    proposalPanel.style.cssText = "background: #f4f7fe; padding: 15px; margin: 15px 0; border: 1px solid #b6ccfe; border-radius: 6px; font-family: sans-serif;";
    proposalPanel.innerHTML = `
        <div onclick="document.getElementById('proposalInputsBlock').style.display = document.getElementById('proposalInputsBlock').style.display === 'none' ? 'block' : 'none';" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 13px; color: #002d62;">📋 Setup Email Proposal Template</strong>
            <span style="font-size: 12px; font-weight: bold;">⚙️ Click to Edit</span>
        </div>
        <div id="proposalInputsBlock" style="display: none; margin-top: 12px; border-top: 1px dashed #b6ccfe; padding-top: 12px;">
            <div style="margin-bottom: 10px;"><input type="text" id="propSubjectInput" value="${savedSubject}" style="width: 100%; padding: 8px; font-size: 13px;"></div>
            <div style="margin-bottom: 10px;"><textarea id="propBodyInput" style="width: 100%; height: 80px; font-size: 13px;">${savedBody}</textarea></div>
            <button onclick="saveProposalTemplateSettings()" style="background: #002d62; color: white; border: none; padding: 6px 15px; font-size: 12px; border-radius: 4px; cursor: pointer;">💾 Save Template</button>
        </div>
    `;
    table.parentNode.insertBefore(proposalPanel, table);
}

window.saveProposalTemplateSettings = function() {
    localStorage.setItem(`dl_subj_${currentClient}`, document.getElementById('propSubjectInput').value);
    localStorage.setItem(`dl_body_${currentClient}`, document.getElementById('propBodyInput').value);
    alert("Template saved successfully.");
    document.getElementById('proposalInputsBlock').style.display = 'none';
};

window.triggerOneClickEmailPitch = function(emailAddress, companyName) {
    if (!emailAddress || emailAddress === 'N/A') return;
    let subj = localStorage.getItem(`dl_subj_${currentClient}`) || "Dispatch Proposal";
    let body = localStorage.getItem(`dl_body_${currentClient}`) || "Hello";
    let customizedBody = body.replace(/{company}/gi, companyName);
    window.open(`mailto:${emailAddress}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(customizedBody)}`, '_blank');
};

function buildEmailCellMarkup(emailAddress, companyName) {
    if (!emailAddress || emailAddress === 'N/A') return `<td style="color: #6c757d;">N/A</td>`;
    let escapedName = companyName.replace(/'/g, "\\'");
    return `
        <td style="position: relative; vertical-align: middle;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <span style="color: #002d62; font-weight: bold;">${emailAddress}</span>
                <a href="#" onclick="triggerOneClickEmailPitch('${emailAddress}', '${escapedName}'); return false;" class="premium-pitch-btn">📤 Send</a>
            </div>
        </td>
    `;
}

let activeCallPhone = null;
let pendingReviewPhone = null;
let activeCallCellElement = null;

window.logCallCountWithDisposition = async function(phoneNum, cellElement, dispositionStatus) {
    if (!phoneNum || phoneNum === 'N/A') return;
    let storageKey = `dl_call_logs_${currentClient}_${dispatcherNickname}`;
    let callLogs = JSON.parse(localStorage.getItem(storageKey)) || [];
    let logEntry = { phone: phoneNum, dispatcher: dispatcherNickname, shiftDate: getCurrentShiftDateKey(), date: new Date().toLocaleString(), status: dispositionStatus };
    callLogs.push(logEntry);
    localStorage.setItem(storageKey, JSON.stringify(callLogs));

    let matchedRecord = scrapedData.find(r => r.phone === phoneNum);
    if (matchedRecord) {
        syncLeadToGoogleSheet(matchedRecord, dispositionStatus, matchedRecord.remarks);
    }
    showPremiumNotification(`✅ Call Logged [${dispositionStatus}] for ${phoneNum}`, 2500);
}

window.openDispositionModal = function(phoneNum) {
    pendingReviewPhone = phoneNum;
    let dispModal = document.getElementById('dlDispositionModal');
    let phoneSpan = document.getElementById('dispTargetPhoneNum');
    if (phoneSpan) phoneSpan.innerText = phoneNum;
    if (dispModal) dispModal.style.display = 'flex';
};

window.submitCallDisposition = function(statusType) {
    let dispModal = document.getElementById('dlDispositionModal');
    if (dispModal) dispModal.style.display = 'none';
    if (pendingReviewPhone) {
        logCallCountWithDisposition(pendingReviewPhone, activeCallCellElement, statusType);
        pendingReviewPhone = null;
        activeCallCellElement = null;
    }
};

window.openCallingDetailModal = function() {
    let existing = document.getElementById('dlCallingDetailModal');
    if (existing) existing.remove();
    let logs = JSON.parse(localStorage.getItem(`dl_call_logs_${currentClient}_${dispatcherNickname}`)) || [];
    let shiftDateStr = getCurrentShiftDateKey();
    let todayLogs = logs.filter(l => l.shiftDate === shiftDateStr);
    
    let modal = document.createElement('div');
    modal.id = 'dlCallingDetailModal';
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000000; display: flex; align-items: center; justify-content: center;";
    modal.innerHTML = `
        <div style="background: white; width: 360px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); overflow: hidden;">
            <div style="background: #ff9800; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 16px;">📊 Current Shift Details</h3>
                <button onclick="document.getElementById('dlCallingDetailModal').remove()" style="background: none; border: none; color: white; font-size: 22px; cursor: pointer;">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
                    <strong>Total Calls Logged:</strong> <span style="font-weight: bold; color: #002d62;">${todayLogs.length}</span>
                </div>
                <button onclick="document.getElementById('dlCallingDetailModal').remove()" style="background: #6c757d; color: white; border: none; padding: 10px; border-radius: 4px; font-weight: bold; width: 100%; cursor: pointer;">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.openAdminPanelPrompt = function() { window.open('admin.html', '_blank'); };

window.copyPhoneToClipboardDirect = function(event, containerElement, phoneNum) {
    event.stopPropagation();
    if (!phoneNum || phoneNum === 'N/A') return;
    activeCallPhone = phoneNum;
    activeCallCellElement = containerElement.closest('td').querySelector('.phone-clickable-cell');
    if (activeCallCellElement) {
        document.querySelectorAll('.phone-clickable-cell').forEach(el => el.classList.remove('active-called-cell'));
        activeCallCellElement.classList.add('active-called-cell');
    }
    navigator.clipboard.writeText(phoneNum).then(() => {
        let badge = document.createElement('span');
        badge.className = 'phone-copy-badge'; badge.innerText = "Copied!";
        containerElement.appendChild(badge);
        setTimeout(() => badge.remove(), 1200);
        setTimeout(() => { openDispositionModal(phoneNum); }, 3000);
    });
};

window.handlePhoneInteraction = function(cellElement, phoneNum) {
    if (!phoneNum || phoneNum === 'N/A') return;
    activeCallPhone = phoneNum;
    activeCallCellElement = cellElement;
    document.querySelectorAll('.phone-clickable-cell').forEach(el => el.classList.remove('active-called-cell'));
    cellElement.classList.add('active-called-cell');
    window.location.href = `tel:${phoneNum}`;
    navigator.clipboard.writeText(phoneNum).then(() => {
        setTimeout(() => { openDispositionModal(phoneNum); }, 3000);
    });
};

function buildPhoneCellMarkup(phoneNum) {
    if (!phoneNum || phoneNum === 'N/A') return `<td style="color: #6c757d; text-align: center;">N/A</td>`;
    return `
        <td class="phone-clickable-container">
            <a href="tel:${phoneNum}" onclick="handlePhoneInteraction(this, '${phoneNum}'); return false;" class="phone-clickable-cell">
                <div class="phone-cell-content">
                    <span class="phone-icon-span">📞</span>
                    <span class="clickable-phone-text">${phoneNum}</span>
                </div>
            </a>
            <span class="phone-hover-copy-icon" onclick="copyPhoneToClipboardDirect(event, this, '${phoneNum}')">📋</span>
        </td>
    `;
}

let pendingFollowUpIndex = null;
let pendingFollowUpRowBtn = null;

window.addLeadToFollowUpList = function(index, buttonElement) {
    let record = scrapedData[index];
    if (!record) return;
    let followUpStore = JSON.parse(localStorage.getItem(`dl_followups_${currentClient}`)) || [];
    if (followUpStore.some(r => r.mc === record.mc)) {
        return alert("This carrier is already added to your Follow-Up list.");
    }
    pendingFollowUpIndex = index;
    pendingFollowUpRowBtn = buttonElement;
    document.getElementById('dlModalDateInput').value = new Date().toISOString().split('T')[0];
    document.getElementById('dlModalTimeInput').value = new Date().toTimeString().substring(0, 5);
    document.getElementById('dlDatePickerModal').style.display = 'flex';
};

window.closeFollowUpModal = function() {
    document.getElementById('dlDatePickerModal').style.display = 'none';
    pendingFollowUpIndex = null; pendingFollowUpRowBtn = null;
};

window.confirmFollowUpSchedule = function() {
    if (pendingFollowUpIndex === null) return;
    let record = scrapedData[pendingFollowUpIndex];
    if (!record) return;

    let selectedDate = document.getElementById('dlModalDateInput').value;
    let selectedTime = document.getElementById('dlModalTimeInput').value;
    if (!selectedDate) { alert("Please select a valid date."); return; }

    record.addedAt = new Date().toLocaleString();
    record.followUpDate = selectedDate;
    record.followUpTime = selectedTime || "N/A";
    record.sharedBy = dispatcherNickname;

    let followUpStore = JSON.parse(localStorage.getItem(`dl_followups_${currentClient}`)) || [];
    followUpStore.push(record);
    localStorage.setItem(`dl_followups_${currentClient}`, JSON.stringify(followUpStore));
    
    syncLeadToGoogleSheet(record, "Follow up", record.remarks);
    showPremiumNotification(`⭐ Added MC ${record.mc} for Follow-Up`, 3500);

    closeFollowUpModal();
};

window.toggleFollowUpDrawer = function() {
    let drawer = document.getElementById('dlFollowUpDrawer');
    if (!drawer) return;
    drawer.style.right = drawer.style.right === "0px" ? "-420px" : "0px";
};

window.remarksFocus = function(index, textarea) {
    if (!textarea.value || textarea.value.trim() === "") {
        textarea.value = DEFAULT_REMARKS_TEMPLATE;
        if (scrapedData[index]) scrapedData[index].remarks = DEFAULT_REMARKS_TEMPLATE;
    }
};

window.remarksBlur = function(index, textarea) {
    let lines = textarea.value.split('\n');
    const linesCheck = ["Truck Type:", "Length:", "Accessories:", "Load:", "Zip Code:", "Summary:"];
    let hasData = false;
    for(let i = 0; i < 6; i++) {
        if (lines[i]) {
            let data = lines[i].replace(linesCheck[i], "").trim();
            if (data !== "") { hasData = true; break; }
        }
    }
    if (!hasData) {
        textarea.value = "";
        if (scrapedData[index]) { scrapedData[index].remarks = ""; }
    }
};

// FIXED: Using onchange instead of oninput to prevent duplicate row entries while typing!
window.syncRemarksData = function(index, textarea) {
    if (scrapedData[index]) {
        scrapedData[index].remarks = textarea.value;
        updateRealTimeHistory(scrapedData, false);
        syncLeadToGoogleSheet(scrapedData[index], scrapedData[index].status, textarea.value);
    }
};

window.toggleHistoryDrawer = function() {
    let drawer = document.getElementById('dlHistoryDrawer');
    if (!drawer) return;
    drawer.style.right = drawer.style.right === "0px" ? "-420px" : "0px";
};

function updateRealTimeHistory(recordsArray, isCompleted = false) {
    if (!db || currentHistoryId === null) return;
    const tx = db.transaction("history", "readwrite");
    const store = tx.objectStore("history");
    const req = store.get(currentHistoryId);
    req.onsuccess = function() {
        const data = req.result;
        if (data) {
            data.totalRecords = recordsArray.length;
            data.records = recordsArray;
            data.status = isCompleted ? "Completed" : "Interrupted (Auto-Saved)";
            store.put(data);
        }
    };
}

let scraping = false; 
let scrapedData = [];

window.stopScraping = function() {
    scraping = false;
    let statusBox = document.getElementById('status');
    if (statusBox) {
        statusBox.innerHTML = "<strong>⏸️ Processing Paused Safely.</strong>";
    }
    if (currentHistoryId) updateRealTimeHistory(scrapedData, false);
}

// FETCHING LOGIC WITH SMS PORTAL VEHICLE & EMAIL EXTRACTION
async function processSingleMCWithDetailedError(mc) {
    try {
        const snapshotUrl = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mc}`;
        const response = await fetch(snapshotUrl);
        if (!response.ok) return { status: "not_found" };
        const htmlText = await response.text();
        if (htmlText.includes("Record not found") || !htmlText.includes("USDOT Number:")) return { status: "not_found" };

        let record = { mc: mc, usdot: 'N/A', name: 'N/A', entityType: 'N/A', status: 'N/A', phone: 'N/A', address: 'N/A', email: 'N/A', powerUnits: 'N/A', vehicleType: 'N/A', remarks: '', followUpDate: '', followUpTime: '', sharedBy: dispatcherNickname };
        let el = document.createElement('html');
        el.innerHTML = htmlText;
        let cells = el.querySelectorAll('td, th');

        for (let i = 0; i < cells.length; i++) {
            let text = cells[i].textContent.trim();
            if (text.startsWith("Legal Name:") || text.startsWith("Entity Name:")) { if(cells[i+1]) record.name = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
            if (text.startsWith("USDOT Number:")) { if(cells[i+1]) record.usdot = cells[i+1].textContent.trim().split(/\s+/)[0]; }
            if (text.startsWith("Entity Type:")) { if(cells[i+1]) record.entityType = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
            if (text.startsWith("Operating Authority Status:")) {
                if (cells[i+1]) {
                    let rawStatus = cells[i+1].textContent.toUpperCase();
                    record.status = rawStatus.includes("AUTHORIZED") ? "AUTHORIZED" : rawStatus;
                }
            }
            if (text.startsWith("Power Units:")) { if(cells[i+1]) record.powerUnits = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
            if (text.startsWith("Phone:")) { if(cells[i+1]) record.phone = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
            if (text.startsWith("Physical Address:")) { if(cells[i+1]) record.address = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
        }

        if (record.status !== "AUTHORIZED") return { status: "filtered_out" };

        // Fetch SMS Portal (CarrierRegistration.aspx) for Vehicles Breakdown Table & Email
        if (record.usdot !== 'N/A') {
            try {
                const smsUrl = `https://ai.fmcsa.dot.gov/SMS/Carrier/${record.usdot}/CarrierRegistration.aspx`;
                const smsResponse = await fetch(smsUrl);
                if (smsResponse.ok) {
                    const smsHtml = await smsResponse.text();
                    let smsEl = document.createElement('html');
                    smsEl.innerHTML = smsHtml;
                    
                    let vehicleList = [];
                    // Parse Vehicle Breakdown table matching screenshot structure
                    let rows = smsEl.querySelectorAll('tr');
                    rows.forEach(tr => {
                        let cols = tr.querySelectorAll('td');
                        if (cols.length >= 2) {
                            let vName = cols[0].textContent.replace(/\s+/g, ' ').trim();
                            let ownedCount = parseInt(cols[1].textContent.trim()) || 0;
                            if (ownedCount > 0 && (vName.includes("Truck") || vName.includes("Tractor") || vName.includes("Trailer"))) {
                                vehicleList.push(`${vName} ${ownedCount}`);
                            }
                        }
                    });
                    if (vehicleList.length > 0) {
                        record.vehicleType = vehicleList.join(" | ");
                    }

                    // Extract Email from SMS Portal
                    let fullPageEmailMatch = smsHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
                    if (fullPageEmailMatch) {
                        let validEmail = fullPageEmailMatch.find(e => !e.toLowerCase().includes("fmcsa") && !e.toLowerCase().includes("dot.gov"));
                        if (validEmail) record.email = validEmail;
                    }
                }
            } catch (smsErr) { console.warn("SMS Portal error:", smsErr); }
        }

        return { status: "success", data: record };
    } catch (err) {
        return { status: "error", message: err.message };
    }
}

window.startScraping = async function() {
    const start = parseInt(document.getElementById('startMc').value);
    const end = parseInt(document.getElementById('endMc').value);
    if (isNaN(start) || isNaN(end) || start > end) return;

    scraping = true;
    scrapedData = [];
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-block';

    const tableBody = document.getElementById('resultsTable');
    if (tableBody) tableBody.innerHTML = '';

    for (let mc = start; mc <= end; mc++) {
        if (!scraping) break;
        let result = await processSingleMCWithDetailedError(mc);
        if (result.status === "success" && result.data) {
            let record = result.data;
            scrapedData.push(record);
            
            syncLeadToGoogleSheet(record, "AUTHORIZED", record.remarks);

            let recordIndex = scrapedData.length - 1;
            let emailCellMarkup = buildEmailCellMarkup(record.email, record.name);
            let phoneCellMarkup = buildPhoneCellMarkup(record.phone);

            let newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><b>${record.mc}</b></td>
                <td>${record.usdot}</td>
                <td>${record.name}</td>
                <td>${record.entityType}</td>
                <td><span class="badge badge-active">${record.status}</span></td>
                ${phoneCellMarkup}
                <td>${record.address}</td>
                ${emailCellMarkup}
                <td>${record.powerUnits}</td>
                <td><b>${record.vehicleType || 'N/A'}</b></td>
                <td class="remarks-cell-container">
                    <textarea class="remarks-input-field" placeholder="Click to add remarks..." onfocus="remarksFocus(${recordIndex}, this)" onblur="remarksBlur(${recordIndex}, this)" onchange="syncRemarksData(${recordIndex}, this)">${record.remarks}</textarea>
                </td>
                <td><button onclick="addLeadToFollowUpList(${recordIndex}, this)" class="premium-followup-btn">⭐ Follow</button></td>
            `;
            tableBody.appendChild(newRow);
        }
        populateStateDropdown();
        populateVehicleTypeCheckboxes();
        applyAdvancedFilters();
        await new Promise(r => setTimeout(r, 200));
    }
    scraping = false;
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('stopBtn').style.display = 'none';
};
