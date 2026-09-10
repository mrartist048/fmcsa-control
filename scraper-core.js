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

// ====== MULTI-PROJECT FIREBASE URLS ======
const FIREBASE_DB_URL_1 = "https://data-scrapper-eddcf-default-rtdb.firebaseio.com/";
const FIREBASE_DB_URL_2 = "https://data-scraper-2-default-rtdb.firebaseio.com/";
const FIREBASE_DB_URL_3 = "https://data-scraper-3-default-rtdb.firebaseio.com/";

// ====== GLOBAL ACCESS CONTROL & LOGIN CREDENTIALS ======
let allowedUsers = {};
const MASTER_ADMIN_PASS = "admin890";
let currentClient = localStorage.getItem("dl_logged_client") || "";

async function fetchAllowedUsersFromFirebase() {
    try {
        let urls = [
            `${FIREBASE_DB_URL_1}allowedUsers.json`,
            `${FIREBASE_DB_URL_2}allowedUsers.json`,
            `${FIREBASE_DB_URL_3}allowedUsers.json`
        ];
        let responses = await Promise.all(urls.map(url => fetch(url).then(res => res.json()).catch(() => null)));
        allowedUsers = {};
        responses.forEach(firebaseUsers => {
            if (firebaseUsers) {
                allowedUsers = Object.assign({}, allowedUsers, firebaseUsers);
            }
        });
    } catch (e) {
        console.error("Could not fetch remote users from Firebase:", e);
    }
}

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

// ====== AUTOMATIC SHIFT-BASED DATA CLEANUP & RESET (USA TIMEZONE) ======
function getCurrentShiftDateKey() {
    let now = new Date();
    let options = { timeZone: "America/New_York", year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false };
    let formatter = new Intl.DateTimeFormat([], options);
    let parts = formatter.formatToParts(now);
    
    let year, month, day, hour;
    parts.forEach(p => {
        if (p.type === 'year') year = p.value;
        if (p.type === 'month') month = p.value;
        if (p.type === 'day') day = p.value;
        if (p.type === 'hour') hour = parseInt(p.value);
    });

    let targetDate = new Date(`${year}-${month}-${day}T00:00:00`);
    if (hour < 3) {
        targetDate.setDate(targetDate.getDate() - 1);
    }

    let uYear = targetDate.getFullYear();
    let uMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
    let uDay = String(targetDate.getDate()).padStart(2, '0');
    
    return `${uYear}-${uMonth}-${uDay}`;
}

function checkAndClearLocalStorageOnShiftChange() {
    let currentShiftKey = getCurrentShiftDateKey();
    let lastShiftKey = localStorage.getItem(`dl_shift_date_tracker_${currentClient}`);

    if (lastShiftKey && lastShiftKey !== currentShiftKey) {
        let keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if (key && (key.includes('dl_call_logs_') || key.includes('dl_subj_') || key.includes('dl_body_'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    }
    localStorage.setItem(`dl_shift_date_tracker_${currentClient}`, currentShiftKey);
}

async function cleanupOldFirebaseData() {
    if (!currentClient || !dispatcherNickname) return;
    try {
        let safeUserKey = dispatcherNickname.replace(/[.#$\/\[\]]/g, "_");
        let callLogUrl = `${FIREBASE_DB_URL}call_logs/${currentClient}/${safeUserKey}.json`;
        let res = await fetch(callLogUrl);
        let remoteLogs = await res.json();
        
        if (Array.isArray(remoteLogs)) {
            let sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            let filteredLogs = remoteLogs.filter(log => {
                if (!log.shiftDate) return false;
                let logDate = new Date(log.shiftDate);
                return logDate >= sevenDaysAgo;
            });
            
            if (filteredLogs.length !== remoteLogs.length) {
                await fetch(callLogUrl, {
                    method: 'PUT',
                    body: JSON.stringify(filteredLogs)
                });
            }
        }
    } catch (e) {
        console.error("Failed to cleanup old Firebase data:", e);
    }
}

function showLimitExceededModal(message) {
    let existingModal = document.getElementById('dlLimitExceededModal');
    if (existingModal) existingModal.remove();

    let modal = document.createElement('div');
    modal.id = 'dlLimitExceededModal';
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 999999999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    
    modal.innerHTML = `
        <div style="background: var(--dl-card-bg, #ffffff); color: var(--dl-text-color, #333); padding: 35px 30px; border-radius: 10px; width: 400px; box-shadow: 0 15px 40px rgba(0,0,0,0.4); text-align: center; border-top: 6px solid #dc3545;">
            <div style="font-size: 42px; margin-bottom: 10px;">⚠️</div>
            <h2 style="color: #dc3545; margin-top: 0; margin-bottom: 10px; font-size: 22px;">License Limit Exceeded!</h2>
            <p style="font-size: 13px; line-height: 1.5; margin-bottom: 20px;">${message}</p>
            <button onclick="window.location.reload();" style="background: #002d62; color: white; border: none; padding: 12px 20px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%;">OK, Understood</button>
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
        position: fixed; top: -100px; right: 20px; background: #002d62; color: #ffffff; padding: 14px 22px; border-radius: 6px; font-family: sans-serif; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.25); border-left: 5px solid #17a2b8; z-index: 100000; transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s; opacity: 0;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.top = "20px"; toast.style.opacity = "1"; }, 100);
    setTimeout(() => { toast.style.top = "-100px"; toast.style.opacity = "0"; setTimeout(() => toast.remove(), 400); }, duration);
}

// ====== PROFESSIONAL LOGIN SCREEN ======
function renderLoginScreen() {
    if (document.getElementById('dlLoginOverlay')) return;

    let overlay = document.createElement('div');
    overlay.id = 'dlLoginOverlay';
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #001a3a; z-index: 9999999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    overlay.innerHTML = `
        <div style="background: #ffffff; padding: 35px 30px; border-radius: 10px; width: 380px; box-shadow: 0 15px 35px rgba(0,0,0,0.4); text-align: center;">
            <h2 style="color: #002d62; margin-bottom: 5px; font-size: 24px;">Dispatch Link</h2>
            <p style="color: #6c757d; font-size: 12px; margin-bottom: 25px;">Secure Dispatcher CRM Portal</p>
            
            <div style="margin-bottom: 15px; text-align: left;">
                <label style="font-size: 12px; font-weight: bold; color: #333; display: block; margin-bottom: 5px;">Username</label>
                <input type="text" id="dlLoginUser" placeholder="Enter your username" style="width: 100%; padding: 10px; font-size: 13px; border: 1px solid #b6ccfe; border-radius: 6px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 20px; text-align: left; position: relative;">
                <label style="font-size: 12px; font-weight: bold; color: #333; display: block; margin-bottom: 5px;">Password</label>
                <div style="position: relative; display: flex; align-items: center;">
                    <input type="password" id="dlLoginPass" placeholder="Enter your password" style="width: 100%; padding: 10px 40px 10px 10px; font-size: 13px; border: 1px solid #b6ccfe; border-radius: 6px; box-sizing: border-box;">
                    <span onclick="togglePasswordVisibility()" id="dlEyeIcon" style="position: absolute; right: 12px; cursor: pointer; font-size: 16px; user-select: none;" title="Show/Hide Password">👁️‍🗨️</span>
                </div>
            </div>

            <button onclick="processLogin()" style="width: 100%; background: #002d62; color: white; border: none; padding: 12px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer;">Login to Portal</button>
            <div id="dlLoginError" style="color: #dc3545; font-size: 12px; font-weight: bold; margin-top: 12px; display: none;"></div>
        </div>
    `;
    document.body.appendChild(overlay);
}

window.togglePasswordVisibility = function() {
    let passInput = document.getElementById('dlLoginPass');
    let eyeIcon = document.getElementById('dlEyeIcon');
    if (!passInput) return;
    if (passInput.type === 'password') {
        passInput.type = 'text';
        eyeIcon.innerText = '👁️';
    } else {
        passInput.type = 'password';
        eyeIcon.innerText = '👁️‍🗨️';
    }
};

window.processLogin = async function() {
    let uInput = document.getElementById('dlLoginUser').value.trim();
    let pInput = document.getElementById('dlLoginPass').value.trim();
    let errBox = document.getElementById('dlLoginError');

    await fetchAllowedUsersFromFirebase();
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
    window.location.reload();
};

function setupDispatcherIdentity() {
    getAppDataFromIndexedDB("settings", "agent_nickname", function(savedNick) {
        dispatcherNickname = savedNick || "";
        if (!dispatcherNickname) {
            let inputName = prompt("Welcome! Please enter your name (e.g., Nauman, Ali, Bilal):");
            if (inputName && inputName.trim() !== "") {
                dispatcherNickname = inputName.trim();
            } else {
                dispatcherNickname = "User_" + Math.floor(100 + Math.random() * 900);
            }
            saveAppDataFromIndexedDB("settings", { key: "agent_nickname", value: dispatcherNickname });
        }
    });
}

async function initializeAccessControl() {
    await fetchAllowedUsersFromFirebase();
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
    showPremiumNotification(`License Active: Verified for "${currentClient}" (Expires: ${clientConfig.expires})`);

    checkAndClearLocalStorageOnShiftChange();
    cleanupOldFirebaseData();

    await checkGlobalSessions();
    setInterval(checkGlobalSessions, 5000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await fetchAllowedUsersFromFirebase();
        if (!currentClient || !allowedUsers[currentClient]) {
            renderLoginScreen();
        } else {
            initializeAccessControl();
        }
    });
} else {
    setTimeout(async () => {
        await fetchAllowedUsersFromFirebase();
        if (!currentClient || !allowedUsers[currentClient]) {
            renderLoginScreen();
        } else {
            initializeAccessControl();
        }
    }, 200);
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
        const offlineThreshold = 12000;

        Object.keys(data).forEach(key => {
            let session = data[key];
            if (session && session.timestamp && (now - session.timestamp < offlineThreshold)) {
                activeSessionsMap[key] = session;
            }
        });

        let activeCount = Object.keys(activeSessionsMap).length;
        let isCurrentRegistered = !!activeSessionsMap[safeTabKey];

        if (!isCurrentRegistered && activeCount >= userLimit) {
            if (typeof scraping !== 'undefined' && scraping) {
                stopScraping();
            }
            showLimitExceededModal(`Your global license limit for "<b>${currentClient}</b>" has been reached. Max allowed active tabs/devices is <b>${userLimit}</b>. Scraping has been paused safely.`);
            return;
        }

        await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json`, {
            method: 'PUT',
            body: JSON.stringify({
                instanceId: tabUniqueId,
                nickname: dispatcherNickname,
                timestamp: now,
                loginTime: loginTimeString
            })
        });

    } catch (e) {
        console.error("Session sync failed:", e);
    }
}

window.addEventListener('beforeunload', function () {
    if (!currentClient) return;
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    navigator.sendBeacon(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json?_method=DELETE`);
});

// ====== INDEXEDDB SETUP ======
let db;
let currentHistoryId = null;
let availableCategories = new Set();

const request = indexedDB.open("DispatchLinkHistoryDB", 2);
request.onupgradeneeded = function(e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains("history")) {
        db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("followups")) {
        db.createObjectStore("followups", { keyPath: "mc" });
    }
    if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
    }
};

request.onsuccess = function(e) {
    db = e.target.result;
    injectProfessionalSidebarUI();
};

function saveAppDataToIndexedDB(storeName, dataObj) {
    if (!db) return;
    try {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        store.put(dataObj);
    } catch(e) {
        console.error("IndexedDB save error:", e);
    }
}

function getAppDataFromIndexedDB(storeName, key, callback) {
    if (!db) { callback(null); return; }
    try {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = function() {
            callback(req.result ? req.result.value : null);
        };
        req.onerror = function() { callback(null); };
    } catch(e) {
        callback(null);
    }
}

function getAllAppDataFromIndexedDB(storeName, callback) {
    if (!db) { callback([]); return; }
    try {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = function() {
            callback(req.result || []);
        };
        req.onerror = function() { callback([]); };
    } catch(e) {
        callback([]);
    }
}

const DEFAULT_REMARKS_TEMPLATE = 
    "Truck Type:\n" +
    "Length:\n" +
    "Accessories:\n" +
    "Load:\n" +
    "Zip Code:\n" +
    "Summary:";

// ====== PROFESSIONAL SIDEBAR & FULL DARK/LIGHT THEME ENGINE ======
function injectProfessionalSidebarUI() {
    document.title = "Dispatch Link | CRM";

    // Theme state setup
    let savedTheme = localStorage.getItem("dl_app_theme") || "light";
    applyThemeMode(savedTheme, false);

    // Hide original small buttons if any
    let oldHistBtn = document.getElementById('openHistoryBtn');
    let oldFuBtn = document.getElementById('openFollowUpDrawerBtn');
    if(oldHistBtn) oldHistBtn.remove();
    if(oldFuBtn) oldFuBtn.remove();

    if (!document.getElementById('dlResponsiveTheme')) {
        let styleTag = document.createElement('style');
        styleTag.id = 'dlResponsiveTheme';
        styleTag.innerHTML = `
            :root {
                --dl-bg: #f8fafc;
                --dl-card-bg: #ffffff;
                --dl-text-color: #0f172a;
                --dl-text-muted: #64748b;
                --dl-border: #cbd5e1;
                --dl-primary: #002d62;
                --dl-sidebar-bg: #001a3a;
                --dl-table-bg: #ffffff;
                --dl-input-bg: #f8fafc;
            }
            [data-theme="dark"] {
                --dl-bg: #0b0f19 !important;
                --dl-card-bg: #111827 !important;
                --dl-text-color: #f3f4f6 !important;
                --dl-text-muted: #9ca3af !important;
                --dl-border: #374151 !important;
                --dl-primary: #3b82f6 !important;
                --dl-sidebar-bg: #030712 !important;
                --dl-table-bg: #111827 !important;
                --dl-input-bg: #1f2937 !important;
            }

            body {
                background-color: var(--dl-bg) !important;
                color: var(--dl-text-color) !important;
                margin: 0 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            }

            /* Main Layout Adjustments for Sidebar */
            #dlMainSidebar {
                position: fixed; top: 0; left: 0; width: 260px; height: 100vh;
                background: var(--dl-sidebar-bg); color: #ffffff; z-index: 99999;
                display: flex; flex-direction: column; box-shadow: 4px 0 15px rgba(0,0,0,0.1);
                transition: background 0.3s;
            }

            .dl-app-wrapper {
                margin-left: 260px; padding: 25px; box-sizing: border-box; min-height: 100vh;
                background: var(--dl-bg); color: var(--dl-text-color); transition: background 0.3s, color 0.3s;
            }

            @media (max-width: 900px) {
                #dlMainSidebar { width: 70px; }
                #dlMainSidebar .dl-sidebar-text, #dlMainSidebar .dl-brand-title { display: none; }
                .dl-app-wrapper { margin-left: 70px; padding: 10px; }
            }

            .container, .container-fluid { width: 100% !important; max-width: 100% !important; padding: 0 !important; }
            .table-responsive { width: 100% !important; overflow-x: auto !important; margin-bottom: 20px !important; border: 1px solid var(--dl-border) !important; border-radius: 8px !important; background: var(--dl-table-bg); }
            table.table { width: 100% !important; min-width: 1100px !important; border-collapse: collapse !important; color: var(--dl-text-color) !important; }
            table.table th, table.table td { padding: 12px 10px !important; vertical-align: middle !important; text-align: left !important; font-size: 13px !important; white-space: nowrap !important; border-bottom: 1px solid var(--dl-border) !important; background: var(--dl-table-bg) !important; color: var(--dl-text-color) !important; }
            table.table th { background: var(--dl-primary) !important; color: white !important; font-weight: bold !important; }
            
            .remarks-cell-container { min-width: 250px !important; width: 260px !important; position: relative; white-space: normal !important; }
            .remarks-input-field { 
                width: 100% !important; height: 38px !important; border: 1px solid var(--dl-border) !important; border-radius: 6px !important; 
                padding: 6px 10px !important; font-size: 12px !important; box-sizing: border-box !important; color: var(--dl-text-color) !important; 
                background: var(--dl-input-bg) !important; resize: none !important; font-family: monospace !important; overflow: hidden !important;
                transition: height 0.25s ease-in-out, border-color 0.2s, background 0.2s; 
            }
            .remarks-input-field:focus { height: 120px !important; border-color: var(--dl-primary) !important; background: var(--dl-card-bg) !important; outline: none !important; overflow-y: auto !important; }

            .premium-copy-badge { position: absolute; background: #28a745; color: white; padding: 2px 6px; font-size: 10px; border-radius: 3px; top: -15px; left: 50%; transform: translateX(-50%); z-index: 100; font-weight: bold; }
            .premium-pitch-btn { display: inline-block; background: #17a2b8; color: white; text-decoration: none; font-size: 10px; font-weight: bold; padding: 4px 6px; border-radius: 3px; border: 1px solid #138496; margin-left: 5px; vertical-align: middle; }
            .premium-followup-btn { display: inline-block; background: #ffc107; color: #212529; text-decoration: none; font-size: 10px; font-weight: bold; padding: 5px 8px; border-radius: 3px; border: 1px solid #e0a800; cursor: pointer; }

            .phone-clickable-container { padding: 4px !important; text-align: center !important; position: relative !important; }
            .phone-clickable-cell { padding: 8px 10px !important; text-align: center !important; cursor: pointer !important; text-decoration: none !important; display: block; border-radius: 6px !important; }
            .phone-clickable-cell:hover { background-color: rgba(0,45,98,0.15) !important; }
            .phone-clickable-cell.active-called-cell { background-color: #d1ecf1 !important; border: 1px solid #bee5eb !important; }
            .phone-clickable-cell.active-called-cell .clickable-phone-text { color: #0c5460 !important; font-weight: 900 !important; }
            .phone-cell-content { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; pointer-events: none; }
            .clickable-phone-text { color: var(--dl-primary); font-weight: bold; font-size: 12px; white-space: nowrap; }
            .phone-hover-copy-icon { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; opacity: 0; transition: opacity 0.2s; cursor: pointer; background: var(--dl-card-bg); padding: 3px 5px; border-radius: 3px; border: 1px solid var(--dl-border); z-index: 5; }
            .phone-clickable-container:hover .phone-hover-copy-icon { opacity: 1; }
            .phone-copy-badge { position: absolute; background: #28a745; color: white; padding: 2px 6px; font-size: 10px; border-radius: 3px; top: -18px; left: 50%; transform: translateX(-50%); z-index: 100; font-weight: bold; }

            /* Universal Overrides for Complete Dark/Light Mode Sync */
            input, select, textarea {
                background-color: var(--dl-input-bg) !important;
                color: var(--dl-text-color) !important;
                border: 1px solid var(--dl-border) !important;
            }
        `;
        document.head.appendChild(styleTag);
    }

    // Wrap body content inside app wrapper
    if (!document.getElementById('dlAppContentWrapper')) {
        let wrapper = document.createElement('div');
        wrapper.id = 'dlAppContentWrapper';
        wrapper.className = 'dl-app-wrapper';
        
        while (document.body.firstChild) {
            wrapper.appendChild(document.body.firstChild);
        }
        document.body.appendChild(wrapper);
    }

    // Build Professional Sidebar
    if (!document.getElementById('dlMainSidebar')) {
        let sidebar = document.createElement('div');
        sidebar.id = 'dlMainSidebar';
        sidebar.innerHTML = `
            <div style="padding: 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <img src="https://cdn.jsdelivr.net/gh/mrartist048/fmcsa-control@main/favicon.png" alt="Logo" style="width: 32px; height: 32px; object-fit: contain;">
                <span class="dl-brand-title" style="font-size: 18px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px;">Dispatch Link</span>
            </div>
            
            <div style="flex: 1; padding: 15px 10px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto;">
                <div onclick="toggleHistoryDrawer()" class="dl-sidebar-item" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
                    <span style="font-size: 16px;">📜</span>
                    <span class="dl-sidebar-text" style="font-size: 13px; font-weight: 600; color: #e2e8f0;">View History</span>
                </div>
                <div onclick="toggleFollowUpDrawer()" class="dl-sidebar-item" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
                    <span style="font-size: 16px;">📅</span>
                    <span class="dl-sidebar-text" style="font-size: 13px; font-weight: 600; color: #e2e8f0;">Follow Ups</span>
                </div>
                <div onclick="openEmailProposalModal()" class="dl-sidebar-item" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
                    <span style="font-size: 16px;">✉️</span>
                    <span class="dl-sidebar-text" style="font-size: 13px; font-weight: 600; color: #e2e8f0;">Email Proposal</span>
                </div>
                <div onclick="openSettingsModal()" class="dl-sidebar-item" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 8px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
                    <span style="font-size: 16px;">⚙️</span>
                    <span class="dl-sidebar-text" style="font-size: 13px; font-weight: 600; color: #e2e8f0;">Settings</span>
                </div>
            </div>

            <div style="padding: 15px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 8px;">
                <button onclick="openCallingDetailModal()" style="background: #f59e0b; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; width: 100%;">📞 Today Calls</button>
                <button onclick="logoutUser()" style="background: #dc2626; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; width: 100%;">🔒 Logout</button>
            </div>
        `;
        document.body.insertBefore(sidebar, document.body.firstChild);
    }

    // Inject Modals & Drawers Framework
    buildModalsAndDrawers();
    injectAdvancedFilterBar();
    injectEmailProposalPanel();
}

// ====== THEME TOGGLER ENGINE ======
window.applyThemeMode = function(theme, save = true) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    if (save) {
        localStorage.setItem("dl_app_theme", theme);
    }
};

// ====== SETTINGS MODAL (Name Change & Dark/Light Toggle) ======
function openSettingsModal() {
    let existing = document.getElementById('dlSettingsModal');
    if (existing) existing.remove();

    let currentTheme = localStorage.getItem("dl_app_theme") || "light";
    let isDarkChecked = currentTheme === 'dark' ? 'checked' : '';

    let modal = document.createElement('div');
    modal.id = 'dlSettingsModal';
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.65); z-index: 10000000; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    modal.innerHTML = `
        <div style="background: var(--dl-card-bg); color: var(--dl-text-color); width: 380px; border-radius: 10px; box-shadow: 0 15px 35px rgba(0,0,0,0.3); overflow: hidden; padding: 25px; box-sizing: border-box; position: relative;">
            <button onclick="document.getElementById('dlSettingsModal').remove()" style="position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 22px; color: var(--dl-text-muted); cursor: pointer; font-weight: bold;">&times;</button>
            <h3 style="color: var(--dl-primary); margin-top: 0; margin-bottom: 20px; font-size: 18px; border-bottom: 2px solid var(--dl-primary); padding-bottom: 8px;">⚙️ CRM Settings</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; font-size: 12px; font-weight: bold; margin-bottom: 5px;">Agent Display Name:</label>
                <input type="text" id="dlSettingsAgentName" value="${dispatcherNickname}" style="width: 100%; padding: 10px; font-size: 13px; border-radius: 6px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; background: var(--dl-input-bg); padding: 12px; border-radius: 6px;">
                <span style="font-size: 13px; font-weight: bold;">Dark Theme Mode</span>
                <input type="checkbox" id="dlThemeToggleCheckbox" ${isDarkChecked} onchange="toggleThemeFromSettings(this)" style="width: 18px; height: 18px; cursor: pointer;">
            </div>

            <div style="display: flex; gap: 10px;">
                <button onclick="saveSettingsChanges()" style="background: var(--dl-primary); color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; flex: 1; font-size: 13px;">Save Changes</button>
                <button onclick="document.getElementById('dlSettingsModal').remove()" style="background: #6c757d; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; flex: 1; font-size: 13px;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.toggleThemeFromSettings = function(checkbox) {
    let mode = checkbox.checked ? 'dark' : 'light';
    applyThemeMode(mode, true);
};

window.saveSettingsChanges = function() {
    let newNameInput = document.getElementById('dlSettingsAgentName').value.trim();
    if (newNameInput && newNameInput !== dispatcherNickname) {
        dispatcherNickname = newNameInput;
        saveAppDataToIndexedDB("settings", { key: "agent_nickname", value: dispatcherNickname });
        showPremiumNotification("Agent name updated successfully!");
    }
    let isDark = document.getElementById('dlThemeToggleCheckbox').checked;
    applyThemeMode(isDark ? 'dark' : 'light', true);
    document.getElementById('dlSettingsModal').remove();
    window.location.reload();
};

window.openEmailProposalModal = function() {
    let wrapper = document.getElementById('proposalInputsBlock');
    if (wrapper) {
        wrapper.style.display = 'block';
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

// ====== BUILD MODALS AND DRAWERS ======
function buildModalsAndDrawers() {
    if (!document.getElementById('dlHistoryDrawer')) {
        let drawer = document.createElement('div');
        drawer.id = 'dlHistoryDrawer';
        drawer.style.cssText = "position: fixed; top: 0; right: -420px; width: 400px; height: 100%; background: var(--dl-card-bg); color: var(--dl-text-color); box-shadow: -5px 0 15px rgba(0,0,0,0.25); z-index: 999999; transition: right 0.3s ease-in-out; padding: 20px; box-sizing: border-box; font-family: sans-serif; display: flex; flex-direction: column;";
        drawer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--dl-primary); padding-bottom: 10px; margin-bottom: 15px;">
                <h3 style="color: var(--dl-primary); margin: 0; font-size: 18px;">Saved Sheets History</h3>
                <button onclick="toggleHistoryDrawer()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--dl-text-muted); font-weight: bold;">&times;</button>
            </div>
            <div id="drawerHistoryList" style="flex: 1; overflow-y: auto; padding-right: 5px;"></div>
        `;
        document.body.appendChild(drawer);
    }

    if (!document.getElementById('dlFollowUpDrawer')) {
        let fDrawer = document.createElement('div');
        fDrawer.id = 'dlFollowUpDrawer';
        fDrawer.style.cssText = "position: fixed; top: 0; right: -420px; width: 400px; height: 100%; background: var(--dl-card-bg); color: var(--dl-text-color); box-shadow: -5px 0 15px rgba(0,0,0,0.25); z-index: 999999; transition: right 0.3s ease-in-out; padding: 20px; box-sizing: border-box; font-family: sans-serif; display: flex; flex-direction: column;";
        fDrawer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #17a2b8; padding-bottom: 10px; margin-bottom: 10px;">
                <h3 style="color: #17a2b8; margin: 0; font-size: 18px;">📅 Follow-Up Pipeline</h3>
                <button onclick="toggleFollowUpDrawer()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: var(--dl-text-muted); font-weight: bold;">&times;</button>
            </div>
            <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                <button onclick="filterFollowUpsByDate('today')" id="fubtnToday" style="flex: 1; background: #17a2b8; color: white; border: none; padding: 6px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer;">📅 Today</button>
                <button onclick="filterFollowUpsByDate('all')" id="fubtnAll" style="flex: 1; background: var(--dl-input-bg); color: var(--dl-text-color); border: 1px solid var(--dl-border); padding: 6px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer;">📋 All</button>
            </div>
            <div style="display: flex; gap: 6px; margin-bottom: 10px; align-items: center;">
                <input type="text" id="followUpSearchInput" placeholder="🔍 Search MC, Name, Phone..." style="flex: 1; padding: 8px 10px; font-size: 12px; border-radius: 4px; box-sizing: border-box;" oninput="renderFollowUpItems()">
                <button onclick="clearFollowUpFilters()" style="background: var(--dl-input-bg); border: 1px solid var(--dl-border); color: var(--dl-text-color); padding: 7px 10px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer;" title="Clear Filters">🔄</button>
            </div>
            <div style="margin-bottom: 12px;">
                <button onclick="downloadFollowUpsCSV()" style="background: #28a745; color: white; border: none; padding: 6px 14px; font-weight: bold; font-size: 12px; border-radius: 4px; cursor: pointer; width: 100%;">📥 Download Follow-Ups Sheet</button>
            </div>
            <div id="drawerFollowUpList" style="flex: 1; overflow-y: auto; padding-right: 5px;"></div>
        `;
        document.body.appendChild(fDrawer);
    }
}

// Ensure core helper elements & tables format properly
let coreTable = document.querySelector('table');
if (coreTable && !coreTable.parentNode.classList.contains('table-responsive')) {
    let wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'table-responsive';
    coreTable.parentNode.insertBefore(wrapperDiv, coreTable);
    wrapperDiv.appendChild(coreTable);
}

// Universal filter bar and proposal panel definitions as before
function injectAdvancedFilterBar() {
    let table = document.querySelector('table');
    if (!table || document.getElementById('advancedFilterWrapper')) return;
    let wrapperDiv = table.closest('.table-responsive') || table.parentNode;

    let filterDiv = document.createElement('div');
    filterDiv.id = 'advancedFilterWrapper';
    filterDiv.style.cssText = "background: var(--dl-card-bg); color: var(--dl-text-color); padding: 12px 15px; margin: 12px 0; border: 1px solid var(--dl-border); border-radius: 6px; font-family: sans-serif; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; justify-content: space-between; width: 100%; box-sizing: border-box;";
    filterDiv.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; flex: 1;">
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 13px; font-weight: bold;">State:</span>
                <select id="stateDropdownSelect" style="padding: 6px 10px; font-size: 12px; border-radius: 4px; font-family: monospace;" onchange="applyAdvancedFilters()">
                    <option value="">All States</option>
                </select>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 220px;">
                <span style="font-size: 13px; font-weight: bold;">Search:</span>
                <input type="text" id="universalSearchInput" placeholder="Search MC, Company Name..." style="width: 100%; padding: 6px 10px; font-size: 12px; border-radius: 4px;" oninput="applyAdvancedFilters()">
            </div>
            <button onclick="resetAdvancedFilters()" style="background: var(--dl-primary); color: white; border: none; padding: 6px 14px; font-size: 12px; font-weight: bold; border-radius: 4px; cursor: pointer;">Reset</button>
        </div>
        <div style="background: var(--dl-primary); color: white; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: bold; white-space: nowrap;">
            Showing: <span id="visibleRecordCountBadge">0</span> Records
        </div>
    `;
    wrapperDiv.parentNode.insertBefore(filterDiv, wrapperDiv);
    populateStateDropdown();
}

function injectEmailProposalPanel() {
    let table = document.querySelector('table');
    if (!table || document.getElementById('premiumProposalWrapper')) return;
    let wrapperDiv = table.closest('.table-responsive') || table.parentNode;

    let savedSubject = localStorage.getItem(`dl_subj_${currentClient}`) || "Dispatch Service Proposal";
    let savedBody = localStorage.getItem(`dl_body_${currentClient}`) || "Hello,\n\nWe found your profile via FMCSA. We offer dispatching services at 5% rate.\n\nBest Regards.";

    let proposalPanel = document.createElement('div');
    proposalPanel.id = 'premiumProposalWrapper';
    proposalPanel.style.cssText = "background: var(--dl-card-bg); color: var(--dl-text-color); padding: 15px; margin: 15px 0; border: 1px solid var(--dl-border); border-radius: 6px; font-family: sans-serif; width: 100%; box-sizing: border-box;";
    proposalPanel.innerHTML = `
        <div onclick="document.getElementById('proposalInputsBlock').style.display = document.getElementById('proposalInputsBlock').style.display === 'none' ? 'block' : 'none';" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 13px;">Setup Email Proposal Template</strong>
            <span style="font-size: 12px; font-weight: bold; color: var(--dl-text-muted);">Click to Edit</span>
        </div>
        <div id="proposalInputsBlock" style="display: none; margin-top: 12px; border-top: 1px dashed var(--dl-border); padding-top: 12px;">
            <div style="margin-bottom: 10px;"><input type="text" id="propSubjectInput" value="${savedSubject}" style="width: 100%; padding: 8px; font-size: 13px; border-radius: 4px;"></div>
            <div style="margin-bottom: 10px;"><textarea id="propBodyInput" style="width: 100%; height: 80px; font-size: 13px; border-radius: 4px;">${savedBody}</textarea></div>
            <button onclick="saveProposalTemplateSettings()" style="background: var(--dl-primary); color: white; border: none; padding: 6px 15px; font-size: 12px; border-radius: 4px; cursor: pointer;">Save Template</button>
        </div>
    `;
    wrapperDiv.parentNode.insertBefore(proposalPanel, wrapperDiv);
}

window.saveProposalTemplateSettings = function() {
    localStorage.setItem(`dl_subj_${currentClient}`, document.getElementById('propSubjectInput').value);
    localStorage.setItem(`dl_body_${currentClient}`, document.getElementById('propBodyInput').value);
    alert("Template saved successfully.");
    document.getElementById('proposalInputsBlock').style.display = 'none';
};

// Toggle Drawers logic
window.toggleHistoryDrawer = function() {
    let drawer = document.getElementById('dlHistoryDrawer');
    if (!drawer) return;
    drawer.style.right = drawer.style.right === "0px" ? "-420px" : "0px";
    if (drawer.style.right === "0px") renderHistoryItems();
};

window.toggleFollowUpDrawer = function() {
    let drawer = document.getElementById('dlFollowUpDrawer');
    if (!drawer) return;
    drawer.style.right = drawer.style.right === "0px" ? "-420px" : "0px";
    if (drawer.style.right === "0px") renderFollowUpItems();
};

window.logoutUser = function() {
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    navigator.sendBeacon(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json?_method=DELETE`);
    localStorage.removeItem("dl_logged_client");
    window.location.reload();
};

// Include other necessary table building, scraping, and follow-up handlers cleanly
