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

// ====== FOOLPROOF UNIQUE TAB INSTANCE ID (FIXED FOR DUPLICATE TABS) ======
const tabUniqueId = "dl_tab_inst_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000000) + "_" + performance.now();

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
}

function showLimitExceededModal(message) {
    let existingModal = document.getElementById('dlLimitExceededModal');
    if (existingModal) existingModal.remove();

    let modal = document.createElement('div');
    modal.id = 'dlLimitExceededModal';
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 999999999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    
    modal.innerHTML = `
        <div style="background: #ffffff; padding: 35px 30px; border-radius: 10px; width: 400px; box-shadow: 0 15px 40px rgba(0,0,0,0.4); text-align: center; border-top: 6px solid #dc3545;">
            <div style="font-size: 42px; margin-bottom: 10px;">⚠️</div>
            <h2 style="color: #dc3545; margin-top: 0; margin-bottom: 10px; font-size: 22px;">License Limit Exceeded!</h2>
            <p style="color: #444; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
                ${message}
            </p>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #ddd; font-size: 12px; color: #333; margin-bottom: 20px;">
                Need to increase your active device/tab limit? <br>Contact Admin: <b>03700684849</b>
            </div>
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
    if (passInput.type === 'password') { passInput.type = 'text'; eyeIcon.innerText = '👁️'; } 
    else { passInput.type = 'password'; eyeIcon.innerText = '👁️‍🗨️'; }
};

window.processLogin = async function() {
    let uInput = document.getElementById('dlLoginUser').value.trim();
    let pInput = document.getElementById('dlLoginPass').value.trim();
    let errBox = document.getElementById('dlLoginError');
    await fetchAllowedUsersFromFirebase();
    let userConfig = allowedUsers[uInput];
    if (!userConfig || userConfig.pass !== pInput) {
        errBox.style.display = "block"; errBox.innerText = "Invalid Username or Password!"; return;
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
        let inputName = prompt("Welcome! Please enter your name:");
        dispatcherNickname = (inputName && inputName.trim() !== "") ? inputName.trim() : "User_" + Math.floor(100 + Math.random() * 900);
        localStorage.setItem(`dl_nick_${currentClient}`, dispatcherNickname);
    }
    injectNicknameProfileUI();
}

function getCurrentShiftDateKey() {
    let now = new Date();
    let hour = now.getHours();
    if (hour < 10) now.setDate(now.getDate() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function injectNicknameProfileUI() {
    if (document.getElementById('dlNickProfilePanel')) return;
    let heading = document.querySelector('h1, h2, .heading') || document.body;
    let panel = document.createElement('div');
    panel.id = 'dlNickProfilePanel';
    panel.style.cssText = "display: flex; justify-content: space-between; align-items: center; width: 100%; margin: 15px 0; padding: 12px 18px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-family: sans-serif;";
    panel.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 36px; height: 36px; background: #002d62; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px;">${dispatcherNickname.charAt(0).toUpperCase()}</div>
            <div>
                <div style="font-size: 11px; color: #64748b; font-weight: bold;">ACTIVE AGENT</div>
                <div style="font-size: 14px; color: #0f172a; font-weight: bold;" id="dlDispCurrentName">${dispatcherNickname}</div>
            </div>
            <button onclick="changeDispatcherName()" style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">✏️ Edit</button>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
            <button onclick="openCallingDetailModal()" style="background: #f59e0b; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">📊 Calling Detail</button>
            <button onclick="openAdminPanelPrompt()" style="background: #002d62; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">👑 Admin Panel</button>
            <button onclick="logoutUser()" style="background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626; padding: 8px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">🚪 Logout</button>
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
        window.location.reload();
    }
};

window.logoutUser = function() {
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    navigator.sendBeacon(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json?_method=DELETE`);
    localStorage.removeItem("dl_logged_client");
    window.location.reload();
};

async function initializeAccessControl() {
    await fetchAllowedUsersFromFirebase();
    if (!currentClient || !allowedUsers[currentClient]) { renderLoginScreen(); return; }
    let clientConfig = allowedUsers[currentClient];
    userLimit = clientConfig.maxLaptops || 0;
    if (new Date().toISOString().split('T')[0] > clientConfig.expires) {
        alert("Your subscription has expired."); renderLoginScreen(); return;
    }
    setupDispatcherIdentity();
    showPremiumNotification(`🚀 License Active: Verified for "${currentClient}" (Expires: ${clientConfig.expires})`);
    performAutomaticDataCleanup();
    await checkGlobalSessions();
    setInterval(checkGlobalSessions, 5000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => { await fetchAllowedUsersFromFirebase(); if (!currentClient || !allowedUsers[currentClient]) renderLoginScreen(); else initializeAccessControl(); });
} else {
    setTimeout(async () => { await fetchAllowedUsersFromFirebase(); if (!currentClient || !allowedUsers[currentClient]) renderLoginScreen(); else initializeAccessControl(); }, 200);
}

async function checkGlobalSessions() {
    if (userLimit === 0 || !currentClient) return;
    const url = `${FIREBASE_DB_URL}sessions/${currentClient}.json`;
    const now = Date.now();
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    
    try {
        const res = await fetch(url);
        const data = await res.json() || {};
        let activeSessionsMap = {};
        const offlineThreshold = 12000; // 12 seconds heartbeat threshold

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
            showLimitExceededModal(`Your global license limit for "<b>${currentClient}</b>" has been reached. Max allowed active tabs/devices is <b>${userLimit}</b>. Scraping has been paused safely.`);
            return;
        }

        await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json`, {
            method: 'PUT',
            body: JSON.stringify({ instanceId: tabUniqueId, nickname: dispatcherNickname, timestamp: now })
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

let db;
let currentHistoryId = null;
let availableCategories = new Set();

const request = indexedDB.open("DispatchLinkHistoryDB", 1);
request.onupgradeneeded = function(e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains("history")) db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
};
request.onsuccess = function(e) {
    db = e.target.result;
    injectHistoryUIFramework();
};

const DEFAULT_REMARKS_TEMPLATE = "Truck Type:\nLength:\nAccessories:\nLoad:\nZip Code:\nSummary:";

function injectHistoryUIFramework() {
    document.title = "Dispatch Link";
    let brandHeading = document.querySelector('h1, h2, .heading') || document.querySelector('div');
    if (brandHeading) brandHeading.innerHTML = "Dispatch Link <span style='font-size:14px; color:#6c757d; font-weight:normal;'>| Lead Processor & CRM</span>";

    if (!document.getElementById('dlResponsiveTheme')) {
        let styleTag = document.createElement('style');
        styleTag.id = 'dlResponsiveTheme';
        styleTag.innerHTML = `
            .table-responsive { width: 100% !important; overflow-x: auto !important; margin-bottom: 20px !important; border: 1px solid #ddd !important; border-radius: 6px !important; background: #fff; }
            table.table { width: 100% !important; min-width: 1100px !important; border-collapse: collapse !important; }
            table.table th, table.table td { padding: 10px 8px !important; vertical-align: middle !important; font-size: 13px !important; white-space: nowrap !important; }
            .remarks-cell-container { min-width: 250px !important; width: 260px !important; position: relative; white-space: normal !important; }
            .remarks-input-field { width: 100% !important; height: 38px !important; border: 1px solid #b6ccfe !important; border-radius: 6px !important; padding: 6px 10px !important; font-size: 12px !important; background: #fafafa !important; resize: none !important; font-family: monospace !important; transition: height 0.2s; }
            .remarks-input-field:focus { height: 120px !important; border-color: #002d62 !important; background: #ffffff !important; outline: none !important; overflow-y: auto !important; }
            .premium-pitch-btn { display: inline-block; background: #17a2b8; color: white; text-decoration: none; font-size: 10px; font-weight: bold; padding: 4px 6px; border-radius: 3px; }
            .premium-followup-btn { display: inline-block; background: #ffc107; color: #212529; font-size: 10px; font-weight: bold; padding: 5px 8px; border-radius: 3px; cursor: pointer; }
            .phone-clickable-cell { padding: 8px 10px !important; text-align: center !important; cursor: pointer !important; display: block; border-radius: 6px !important; }
            .phone-clickable-cell:hover { background-color: #001a3a !important; color: #fff !important; }
            
            .dropdown-check-list { display: inline-block; position: relative; }
            .dropdown-check-list .anchor { position: relative; cursor: pointer; display: inline-block; padding: 6px 12px; background: white; border: 1px solid #b6ccfe; border-radius: 4px; font-size: 12px; color: #002d62; font-weight: bold; }
            .dropdown-check-list ul.items { display: none; position: absolute; background: white; border: 1px solid #b6ccfe; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 10px 12px; border-radius: 6px; z-index: 1000; width: 220px; top: 100%; left: 0; margin-top: 4px; text-align: left; list-style: none; max-height: 220px; overflow-y: auto; }
            .dropdown-check-list.visible ul.items { display: block; }
            .dropdown-check-list ul.items li { margin-bottom: 8px !important; font-size: 12px !important; }
            .dropdown-check-list ul.items li label { display: flex !important; align-items: center !important; gap: 8px !important; cursor: pointer !important; color: #333 !important; width: 100% !important; }
        `;
        document.head.appendChild(styleTag);
    }

    let startBtn = document.getElementById('startBtn');
    if (startBtn && !document.getElementById('openHistoryBtn')) {
        let historyBtn = document.createElement('button');
        historyBtn.id = 'openHistoryBtn';
        historyBtn.innerHTML = "📜 View History";
        historyBtn.style.cssText = "background: #002d62; color: white; border: none; padding: 8px 16px; font-size: 14px; font-weight: bold; border-radius: 4px; cursor: pointer; margin-left: 10px;";
        historyBtn.onclick = (e) => { e.stopPropagation(); toggleHistoryDrawer(); };
        startBtn.parentNode.insertBefore(historyBtn, startBtn.nextSibling);

        let followUpBtn = document.createElement('button');
        followUpBtn.id = 'openFollowUpDrawerBtn';
        followUpBtn.innerHTML = "📅 View Follow-Ups";
        followUpBtn.style.cssText = "background: #17a2b8; color: white; border: none; padding: 8px 16px; font-size: 14px; font-weight: bold; border-radius: 4px; cursor: pointer; margin-left: 8px;";
        followUpBtn.onclick = (e) => { e.stopPropagation(); toggleFollowUpDrawer(); };
        startBtn.parentNode.insertBefore(followUpBtn, historyBtn.nextSibling);
    }

    if (!document.getElementById('dlHistoryDrawer')) {
        let drawer = document.createElement('div');
        drawer.id = 'dlHistoryDrawer';
        drawer.style.cssText = "position: fixed; top: 0; right: -420px; width: 400px; height: 100%; background: #ffffff; box-shadow: -5px 0 15px rgba(0,0,0,0.15); z-index: 999999; transition: right 0.3s ease-in-out; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column;";
        drawer.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #002d62; padding-bottom: 10px; margin-bottom: 15px;"><h3 style="color: #002d62; margin: 0;">History</h3><button onclick="toggleHistoryDrawer()" style="background:none; border:none; font-size:22px; cursor:pointer;">&times;</button></div><div id="drawerHistoryList" style="flex: 1; overflow-y: auto;"></div>`;
        document.body.appendChild(drawer);
    }

    if (!document.getElementById('dlFollowUpDrawer')) {
        let fDrawer = document.createElement('div');
        fDrawer.id = 'dlFollowUpDrawer';
        fDrawer.style.cssText = "position: fixed; top: 0; right: -420px; width: 400px; height: 100%; background: #ffffff; box-shadow: -5px 0 15px rgba(0,0,0,0.15); z-index: 999999; transition: right 0.3s ease-in-out; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column;";
        fDrawer.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #17a2b8; padding-bottom: 10px; margin-bottom: 10px;"><h3 style="color: #17a2b8; margin: 0;">Follow-Up Pipeline</h3><button onclick="toggleFollowUpDrawer()" style="background:none; border:none; font-size:22px; cursor:pointer;">&times;</button></div><div id="drawerFollowUpList" style="flex: 1; overflow-y: auto;"></div>`;
        document.body.appendChild(fDrawer);
    }

    injectAdvancedFilterBar();
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
            
            <div id="categoryDropdownCheckList" class="dropdown-check-list" tabindex="100">
                <span class="anchor" onclick="toggleCategoryDropdown(event)">Select Categories ▼</span>
                <ul id="checkboxListContainer" class="items"></ul>
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

    document.addEventListener('click', function(e) {
        let dropdown = document.getElementById('vehicleTypeDropdownContent');
        let btn = document.querySelector('button[onclick*="toggleVehicleDropdown"]');
        if (dropdown && dropdown.style.display === 'block' && !dropdown.contains(e.target) && btn && !btn.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

function toggleCategoryDropdown(e) {
    e.stopPropagation();
    let list = document.getElementById('categoryDropdownCheckList');
    if (list) list.classList.toggle('visible');
}

window.addEventListener('click', function(event) {
    if (!event.target.closest('#categoryDropdownCheckList')) {
        let list = document.getElementById('categoryDropdownCheckList');
        if (list) list.classList.remove('visible');
    }
});

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
                if (new RegExp(`\\b${code}\\b`).test(addr)) {
                    stateCounts[code] = (stateCounts[code] || 0) + 1;
                    break;
                }
            }
        });
    }
    let currentVal = select.value;
    select.innerHTML = '<option value="">All States</option>';
    Object.keys(usStatesMap).sort().forEach(code => {
        if (stateCounts[code]) {
            let opt = document.createElement('option');
            opt.value = code;
            opt.textContent = `${usStatesMap[code]} (${code}) - ${stateCounts[code]}`;
            select.appendChild(opt);
        }
    });
    select.value = currentVal;
    updateVisibleRecordCount();
}

function populateVehicleTypeCheckboxes() {
    let container = document.getElementById('vehicleCheckboxList');
    if (!container) return;
    let fixedTypes = ["Straight Trucks", "Truck Tractors", "Trailers"];
    let html = "";
    fixedTypes.forEach(vType => {
        html += `<label style="display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 6px; cursor: pointer;"><input type="checkbox" value="${vType}" onchange="applyAdvancedFilters()"> ${vType}</label>`;
    });
    container.innerHTML = html;
}

window.applyAdvancedFilters = function() {
    let selectedState = (document.getElementById('stateDropdownSelect')?.value || "").toUpperCase().trim();
    let searchQuery = (document.getElementById('universalSearchInput')?.value || "").toLowerCase().trim();
    let selectedVehicles = Array.from(document.querySelectorAll('#vehicleCheckboxList input:checked')).map(cb => cb.value.toLowerCase());
    let rows = document.querySelectorAll('#resultsTable tr');

    rows.forEach((row, index) => {
        let record = scrapedData[index];
        if (!record) return;
        let text = row.textContent.toLowerCase();
        let matchesState = selectedState === "" || (record.address || "").toUpperCase().includes(selectedState);
        let matchesSearch = searchQuery === "" || text.includes(searchQuery);
        let matchesVehicle = selectedVehicles.length === 0 || selectedVehicles.some(v => (record.vehicleType || "").toLowerCase().includes(v));
        row.style.display = (matchesState && matchesSearch && matchesVehicle) ? "" : "none";
    });
    updateVisibleRecordCount();
};

window.resetAdvancedFilters = function() {
    let stSel = document.getElementById('stateDropdownSelect');
    let srchInput = document.getElementById('universalSearchInput');
    if (stSel) stSel.value = "";
    if (srchInput) srchInput.value = "";
    document.querySelectorAll('#vehicleCheckboxList input').forEach(cb => cb.checked = false);
    applyAdvancedFilters();
};

function updateVisibleRecordCount() {
    let rows = document.querySelectorAll('#resultsTable tr');
    let visibleCount = Array.from(rows).filter(r => r.style.display !== 'none').length;
    let badge = document.getElementById('visibleRecordCountBadge');
    if (badge) badge.innerText = visibleCount;
}

let scraping = false; 
let scrapedData = [];

window.stopScraping = function() {
    scraping = false;
    let statusBox = document.getElementById('status');
    if (statusBox) statusBox.innerHTML = "<strong>⏸️ Processing Paused Safely. Click Start to resume.</strong>";
}

async function processSingleMCWithDetailedError(mc, statusBox) {
    let maxRetries = 2;
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            const snapshotUrl = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mc}`;
            const response = await fetch(snapshotUrl);
            if (!response.ok) { attempt++; await new Promise(r => setTimeout(r, 1000)); continue; }
            const htmlText = await response.text();
            if (htmlText.includes("Record not found") || !htmlText.includes("USDOT Number:")) return { status: "not_found" };

            let record = { mc: mc, usdot: 'N/A', name: 'N/A', entityType: 'N/A', status: 'N/A', phone: 'N/A', address: 'N/A', email: 'N/A', powerUnits: 'N/A', vehicleType: 'N/A', carrierDetails: '', remarks: '', followUpDate: '', followUpTime: '', sharedBy: dispatcherNickname };
            let el = document.createElement('html');
            el.innerHTML = htmlText;
            let cells = el.querySelectorAll('td, th');

            for (let i = 0; i < cells.length; i++) {
                let text = cells[i].textContent.trim();
                if (text.startsWith("Legal Name:") || text.startsWith("Entity Name:")) if(cells[i+1]) record.name = cells[i+1].textContent.trim().replace(/\s+/g, ' ');
                if (text.startsWith("USDOT Number:")) if(cells[i+1]) record.usdot = cells[i+1].textContent.trim().split(/\s+/)[0];
                if (text.startsWith("Entity Type:")) if(cells[i+1]) record.entityType = cells[i+1].textContent.trim().replace(/\s+/g, ' ');
                if (text.startsWith("Operating Authority Status:")) if (cells[i+1]) record.status = cells[i+1].textContent.toUpperCase().includes("AUTHORIZED") ? "AUTHORIZED" : cells[i+1].textContent.trim();
                if (text.startsWith("Power Units:")) if(cells[i+1]) record.powerUnits = cells[i+1].textContent.trim().replace(/\s+/g, ' ');
                if (text.startsWith("Phone:")) if(cells[i+1]) record.phone = cells[i+1].textContent.trim().replace(/\s+/g, ' ');
                if (text.startsWith("Physical Address:") || text.startsWith("Address:")) if(cells[i+1]) record.address = cells[i+1].textContent.trim().replace(/\s+/g, ' ');
            }

            if (record.status !== "AUTHORIZED") return { status: "filtered_out" }; 

            let fullText = el.textContent;
            let emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
            if (emailMatch) {
                let valid = emailMatch.find(e => !e.toLowerCase().includes("fmcsa") && !e.toLowerCase().includes("dot.gov"));
                if (valid) record.email = valid;
            }

            if (record.usdot !== 'N/A') {
                try {
                    const smsRes = await fetch(`https://ai.fmcsa.dot.gov/SMS/Carrier/${record.usdot}/CarrierRegistration.aspx`);
                    if (smsRes.ok) {
                        let smsEl = document.createElement('html');
                        smsEl.innerHTML = await smsRes.text();
                        let vehicleList = [];
                        smsEl.querySelectorAll('table tr').forEach(row => {
                            let cols = row.querySelectorAll('td');
                            if (cols.length >= 4) {
                                let vType = cols[0].textContent.trim().replace(/\*$/, "");
                                let count = (parseInt(cols[1].textContent) || 0) + (parseInt(cols[2].textContent) || 0) + (parseInt(cols[3].textContent) || 0);
                                if (count > 0 && ["Straight Trucks", "Truck Tractors", "Trailers"].includes(vType)) vehicleList.push(`${vType} ${count}`);
                            }
                        });
                        if (vehicleList.length > 0) record.vehicleType = vehicleList.join(" | ");
                    }
                } catch (e) {}
            }
            return { status: "success", data: record };
        } catch (err) {
            attempt++; await new Promise(r => setTimeout(r, 1000));
        }
    }
    return { status: "error" };
}

window.startScraping = async function(overrideStart = null, overrideEnd = null) {
    const start = overrideStart !== null ? overrideStart : parseInt(document.getElementById('startMc').value);
    const end = overrideEnd !== null ? overrideEnd : parseInt(document.getElementById('endMc').value);

    if (isNaN(start) || isNaN(end) || start > end) { alert("Please enter a valid MC range."); return; }

    scraping = true;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-block';

    let totalToScan = end - start + 1;
    let totalProcessed = 0;
    let statusBox = document.getElementById('status');

    for (let mc = start; mc <= end; mc++) {
        if (!scraping) break;
        totalProcessed++;

        let result = await processSingleMCWithDetailedError(mc, statusBox);
        if (result.status === "success" && result.data) {
            scrapedData.push(result.data);
            let tableBody = document.getElementById('resultsTable');
            if (tableBody) {
                let row = tableBody.insertRow(-1);
                row.innerHTML = `
                    <td><b>${result.data.mc}</b></td>
                    <td>${result.data.usdot}</td>
                    <td>${result.data.name}</td>
                    <td>${result.data.entityType}</td>
                    <td>${result.data.status}</td>
                    <td><a href="tel:${result.data.phone}" class="phone-clickable-cell">${result.data.phone}</a></td>
                    <td>${result.data.address}</td>
                    <td>${result.data.email}</td>
                    <td>${result.data.powerUnits}</td>
                    <td><b>${result.data.vehicleType}</b></td>
                    <td class="remarks-cell-container"><textarea class="remarks-input-field" placeholder="Remarks..."></textarea></td>
                    <td><button class="premium-followup-btn">⭐ Follow</button></td>
                `;
            }
        }
        if (statusBox) {
            let pct = Math.floor((totalProcessed / totalToScan) * 100);
            statusBox.innerHTML = `<strong>Scanning MC ${mc} (${totalProcessed}/${totalToScan}) - ${pct}% Completed</strong>`;
        }
        populateStateDropdown();
        applyAdvancedFilters();
        await new Promise(r => setTimeout(r, 100));
    }

    scraping = false;
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('stopBtn').style.display = 'none';
    if (statusBox) statusBox.innerHTML = `<strong>Completed! Scanned ${scrapedData.length} records.</strong>`;
};

window.downloadCSV = function() {
    if(scrapedData.length > 0) {
        let csv = "MC Number,USDOT Number,Company Name,Entity Type,Status,Phone,Address,Email,Power Units,Vehicle Type\n";
        scrapedData.forEach(r => {
            csv += `${r.mc},${r.usdot},"${r.name}","${r.entityType}","${r.status}","${r.phone}","${r.address}","${r.email}","${r.powerUnits}","${r.vehicleType}"\n`;
        });
        let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `DispatchLink_Data.csv`;
        link.click();
    }
}
