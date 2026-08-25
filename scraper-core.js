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

// ====== MULTI-PROJECT FIREBASE URLS (USED FOR LOGIN, SESSIONS & TEAM SHARING) ======
const FIREBASE_DB_URL_1 = "https://data-scrapper-eddcf-default-rtdb.firebaseio.com/";
const FIREBASE_DB_URL_2 = "https://data-scraper-2-default-rtdb.firebaseio.com/";
const FIREBASE_DB_URL_3 = "https://data-scraper-3-default-rtdb.firebaseio.com/";

// ====== GOOGLE SHEETS WEB APP ENDPOINT (DATA STORAGE) ======
const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx18Pg5Uxn7grnQElHJ6dErltf6CKT1oJvj4C0ISXFI8X7OqsnE8jUOL5fqM1_2TRnWaA/exec";

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

async function syncDataToGoogleSheets(actionType, payload) {
    if (!GOOGLE_SHEETS_WEB_APP_URL || GOOGLE_SHEETS_WEB_APP_URL.includes("YOUR_GOOGLE_APPS_SCRIPT")) return null;
    try {
        let response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({ client: currentClient, action: actionType, data: payload })
        });
        return await response.json();
    } catch (e) {
        console.error("Google Sheets Sync Failed:", e);
        return null;
    }
}

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
                    await fetch(callLogUrl, { method: 'PUT', body: JSON.stringify(freshRemoteLogs) });
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
    toast.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><div style="background: #28a745; width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 8px #28a745;"></div><span>${message}</span></div>`;
    toast.style.cssText = `position: fixed; top: -100px; right: 20px; background: #002d62; color: #ffffff; padding: 14px 22px; border-radius: 6px; font-family: sans-serif; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.25); border-left: 5px solid #17a2b8; z-index: 1000000; transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s; opacity: 0;`;
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
        errBox.style.display = "block"; errBox.innerText = "Invalid Username or Password!"; return;
    }
    let todayStr = new Date().toISOString().split('T')[0];
    if (todayStr > userConfig.expires) {
        errBox.style.display = "block"; errBox.innerText = "Subscription has expired! Contact Admin."; return;
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
        dispatcherNickname = (inputName && inputName.trim() !== "") ? inputName.trim() : "User_" + Math.floor(100 + Math.random() * 900);
        localStorage.setItem(`dl_nick_${currentClient}`, dispatcherNickname);
    }
    injectNicknameProfileUI();
}

function getCurrentShiftDateKey() {
    let now = new Date();
    if (now.getHours() < 10) now.setDate(now.getDate() - 1);
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
    if (!currentClient || !allowedUsers[currentClient]) { renderLoginScreen(); return; }
    let clientConfig = allowedUsers[currentClient];
    userLimit = clientConfig.maxLaptops || 0;
    if (new Date().toISOString().split('T')[0] > clientConfig.expires) {
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
        if (!currentClient || !allowedUsers[currentClient]) renderLoginScreen(); else initializeAccessControl();
    });
} else {
    setTimeout(() => {
        if (!currentClient || !allowedUsers[currentClient]) renderLoginScreen(); else initializeAccessControl();
    }, 300);
}

async function updateActiveSessionData() {
    if (!currentClient) return;
    try {
        await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${tabUniqueId.replace(/[.#$\/\[\]]/g, "_")}/nickname.json`, {
            method: 'PUT', body: JSON.stringify(dispatcherNickname)
        });
    } catch (e) { console.error(e); }
}

async function checkGlobalSessions() {
    if (userLimit === 0 || !currentClient) return;
    const url = `${FIREBASE_DB_URL}sessions/${currentClient}.json`;
    const now = Date.now();
    let timeKey = `dl_fixed_login_time_${currentClient}_${dispatcherNickname}`;
    let loginTimeString = localStorage.getItem(timeKey);
    let todayDateKey = getCurrentShiftDateKey();
    if (!loginTimeString || localStorage.getItem(`${timeKey}_date`) !== todayDateKey) {
        loginTimeString = new Date().toLocaleTimeString();
        localStorage.setItem(timeKey, loginTimeString);
        localStorage.setItem(`${timeKey}_date`, todayDateKey);
    }
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    try {
        const res = await fetch(url);
        const data = await res.json() || {};
        let activeCount = 0;
        let isCurrentRegistered = false;
        Object.keys(data).forEach(key => {
            let session = data[key];
            if (session && session.timestamp && (now - session.timestamp < 60000)) {
                activeCount++;
                if (key === safeTabKey) isCurrentRegistered = true;
            }
        });
        if (!isCurrentRegistered && activeCount >= userLimit) {
            if (typeof scraping !== 'undefined' && scraping) stopScraping();
            showLimitExceededModal(`Your global license limit for "${currentClient}" has been reached. Max allowed active tabs/devices is <b>${userLimit}</b>.`);
            return;
        }
        await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json`, {
            method: 'PUT',
            body: JSON.stringify({ instanceId: tabUniqueId, nickname: dispatcherNickname, timestamp: now, loginTime: loginTimeString })
        });
    } catch (e) { console.error(e); }
}

window.addEventListener('beforeunload', function () {
    if (!currentClient) return;
    navigator.sendBeacon(`${FIREBASE_DB_URL}sessions/${currentClient}/${tabUniqueId.replace(/[.#$\/\[\]]/g, "_")}.json?_method=DELETE`);
});

let db, currentHistoryId = null;
const request = indexedDB.open("DispatchLinkHistoryDB", 1);
request.onupgradeneeded = function(e) { db = e.target.result; if (!db.objectStoreNames.contains("history")) db.createObjectStore("history", { keyPath: "id", autoIncrement: true }); };
request.onsuccess = function(e) { db = e.target.result; injectHistoryUIFramework(); };

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
            table.table th, table.table td { padding: 10px 8px !important; vertical-align: middle !important; text-align: left !important; font-size: 13px !important; white-space: nowrap !important; }
            .remarks-cell-container { min-width: 250px !important; width: 260px !important; position: relative; white-space: normal !important; }
            .remarks-input-field { width: 100% !important; height: 38px !important; border: 1px solid #b6ccfe !important; border-radius: 6px !important; padding: 6px 10px !important; font-size: 12px !important; font-family: monospace !important; resize: none !important; transition: height 0.25s ease-in-out; background: #fafafa !important; }
            .remarks-input-field:focus { height: 120px !important; background: #ffffff !important; outline: none !important; overflow-y: auto !important; }
            .phone-clickable-cell { padding: 8px 10px !important; text-align: center !important; cursor: pointer !important; text-decoration: none !important; display: block; border-radius: 6px !important; }
            .phone-clickable-cell:hover { background-color: #001a3a !important; color: #fff !important; }
            .phone-clickable-cell.active-called-cell { background-color: #d1ecf1 !important; border: 1px solid #bee5eb !important; color: #0c5460 !important; font-weight: 900 !important; }
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

    if (!document.getElementById('dlDispositionModal')) {
        let dModal = document.createElement('div');
        dModal.id = 'dlDispositionModal';
        dModal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.65); z-index: 100000000; display: none; align-items: center; justify-content: center; font-family: sans-serif;";
        dModal.innerHTML = `
            <div style="background: #ffffff; width: 380px; border-radius: 12px; box-shadow: 0 15px 35px rgba(0,0,0,0.3); overflow: hidden; padding: 20px;">
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
}

let activeCallPhone = null, pendingReviewPhone = null, activeCallCellElement = null, currentLeadDataRef = null;

// Helper to grab full row details for the target phone number
function findLeadDataByPhone(phoneNum) {
    if (typeof scrapedData === 'undefined') return {};
    return scrapedData.find(r => r.phone === phoneNum) || {};
}

window.logCallCountWithDisposition = async function(phoneNum, cellElement, dispositionStatus) {
    if (!phoneNum || phoneNum === 'N/A') return;
    
    let lead = findLeadDataByPhone(phoneNum);
    let storageKey = `dl_call_logs_${currentClient}_${dispatcherNickname}`;
    let callLogs = JSON.parse(localStorage.getItem(storageKey)) || [];
    
    let logEntry = {
        timestamp: new Date().toLocaleString(),
        company: currentClient,
        agent: dispatcherNickname,
        mc: lead.mc || 'N/A',
        companyName: lead.name || 'N/A',
        phone: phoneNum,
        email: lead.email || 'N/A',
        status: dispositionStatus,
        remarks: lead.remarks || '',
        shiftDate: getCurrentShiftDateKey()
    };
    
    callLogs.push(logEntry);
    localStorage.setItem(storageKey, JSON.stringify(callLogs));

    // Send complete data package to Google Sheets
    syncDataToGoogleSheets('logCall', logEntry);

    showPremiumNotification(`✅ Call Logged [${dispositionStatus}] for ${phoneNum}`, 2500);

    if (cellElement) {
        document.querySelectorAll('.phone-clickable-cell').forEach(el => el.classList.remove('active-called-cell'));
        cellElement.classList.add('active-called-cell');
    }
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

window.handlePhoneInteraction = function(cellElement, phoneNum) {
    if (!phoneNum || phoneNum === 'N/A') return;
    activeCallPhone = phoneNum;
    activeCallCellElement = cellElement;
    window.location.href = `tel:${phoneNum}`;
    navigator.clipboard.writeText(phoneNum).then(() => {
        setTimeout(() => { openDispositionModal(phoneNum); }, 3000);
    });
};

function buildPhoneCellMarkup(phoneNum) {
    if (!phoneNum || phoneNum === 'N/A') return `<td style="color: #6c757d; text-align: center;">N/A</td>`;
    return `
        <td style="padding: 4px; text-align: center;">
            <a href="tel:${phoneNum}" onclick="handlePhoneInteraction(this, '${phoneNum}'); return false;" class="phone-clickable-cell" title="Click to Call">
                📞 <span style="font-weight: bold; font-size: 12px;">${phoneNum}</span>
            </a>
        </td>
    `;
}

function buildEmailCellMarkup(emailAddress, companyName) {
    if (!emailAddress || emailAddress === 'N/A') return `<td style="color: #6c757d;">N/A</td>`;
    return `<td><span style="color: #002d62; font-weight: bold; cursor: pointer;" onclick="navigator.clipboard.writeText('${emailAddress}');alert('Email Copied!')">${emailAddress}</span></td>`;
}

// Basic placeholder functions to prevent reference errors if triggered
window.toggleHistoryDrawer = function() { alert("History Drawer"); };
window.toggleFollowUpDrawer = function() { alert("FollowUp Drawer"); };
