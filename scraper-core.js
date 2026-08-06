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

// ====== GLOBAL ACCESS CONTROL & LOGIN CREDENTIALS ======
const allowedUsers = {
    "Gslogisticsdispatch": { pass: "Gslogisticsdispatch", maxLaptops: 2, expires: "2026-07-28" },    
    "precisionx": { pass: "precisionx123", maxLaptops: 1, expires: "2026-07-30" },  
    "dispatchloadify": { pass: "admin789", maxLaptops: 5, expires: "2026-09-01" }, 
    "baitstarlogistics": { pass: "baitstarlogistics123", maxLaptops: 10, expires: "2026-08-30" },  
    "testinguser": { pass: "testinguser123", maxLaptops: 5, expires: "2026-08-30" },  
    "Skylinelogistics": { pass: "Skylinelogistics123", maxLaptops: 1, expires: "2026-08-30" },  
};

const FIREBASE_DB_URL = "https://data-scrapper-eddcf-default-rtdb.firebaseio.com/"; 
const MASTER_ADMIN_PASS = "admin890";

let currentClient = localStorage.getItem("dl_logged_client") || "";
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

function showLimitExceededModal(message) {
    let existingModal = document.getElementById('dlLimitExceededModal');
    if (existingModal) existingModal.remove();

    let modal = document.createElement('div');
    modal.id = 'dlLimitExceededModal';
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.65); z-index: 99999999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    
    modal.innerHTML = `
        <div style="background: var(--dl-card-bg, #ffffff); color: var(--dl-text-color, #333); padding: 35px 30px; border-radius: 12px; width: 400px; box-shadow: 0 15px 40px rgba(0,0,0,0.4); text-align: center; border-top: 6px solid #dc3545;">
            <div style="font-size: 42px; margin-bottom: 10px;">⚠️</div>
            <h2 style="color: #dc3545; margin-top: 0; margin-bottom: 10px; font-size: 22px;">License Limit Exceeded!</h2>
            <p style="font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
                ${message}
            </p>
            <div style="background: var(--dl-sub-bg, #f8f9fa); padding: 12px; border-radius: 6px; border: 1px solid var(--dl-border-color, #ddd); font-size: 12px; margin-bottom: 20px;">
                Need to increase your active device/tab limit? <br>Contact Admin: <b>03037654849</b>
            </div>
            <button onclick="document.getElementById('dlLimitExceededModal').remove()" style="background: #002d62; color: white; border: none; padding: 10px 20px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%;">OK, Understood</button>
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
        position: fixed;
        top: -100px;
        right: 20px;
        background: #001a3a;
        color: #ffffff;
        padding: 14px 22px;
        border-radius: 8px;
        font-family: sans-serif;
        font-size: 13px;
        font-weight: bold;
        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        border-left: 5px solid #17a2b8;
        z-index: 1000000;
        transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s;
        opacity: 0;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.top = "20px";
        toast.style.opacity = "1";
    }, 100);

    setTimeout(() => {
        toast.style.top = "-100px";
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

function renderLoginScreen() {
    if (document.getElementById('dlLoginOverlay')) return;

    let overlay = document.createElement('div');
    overlay.id = 'dlLoginOverlay';
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000f24; z-index: 9999999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    overlay.innerHTML = `
        <div style="background: #001a3a; padding: 40px 30px; border-radius: 12px; width: 380px; box-shadow: 0 15px 40px rgba(0,0,0,0.5); text-align: center; border: 1px solid rgba(255,255,255,0.1);">
            <h2 style="color: #ffffff; margin-bottom: 5px; font-size: 26px; letter-spacing: 0.5px;">Dispatch Link</h2>
            <p style="color: #8ab4f8; font-size: 12px; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px;">Secure Dispatcher CRM Portal</p>
            
            <div style="margin-bottom: 15px; text-align: left;">
                <label style="font-size: 12px; font-weight: bold; color: #cbd5e1; display: block; margin-bottom: 5px;">Username</label>
                <input type="text" id="dlLoginUser" placeholder="Enter your username" style="width: 100%; padding: 12px; font-size: 13px; background: #000f24; border: 1px solid #1e3a8a; color: #fff; border-radius: 6px; box-sizing: border-box; outline: none;">
            </div>

            <div style="margin-bottom: 20px; text-align: left;">
                <label style="font-size: 12px; font-weight: bold; color: #cbd5e1; display: block; margin-bottom: 5px;">Password</label>
                <input type="password" id="dlLoginPass" placeholder="Enter your password" style="width: 100%; padding: 12px; font-size: 13px; background: #000f24; border: 1px solid #1e3a8a; color: #fff; border-radius: 6px; box-sizing: border-box; outline: none;">
            </div>

            <button onclick="processLogin()" style="width: 100%; background: #2563eb; color: white; border: none; padding: 12px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.2s; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">Login to Portal</button>
            <div id="dlLoginError" style="color: #f87171; font-size: 12px; font-weight: bold; margin-top: 12px; display: none;"></div>
            
            <div style="margin-top: 25px; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                Need access? Contact Admin: <b>03037654849</b><br>
                Email: <a href="mailto:info@dispatchlink.online" style="color: #8ab4f8; text-decoration: underline;">info@dispatchlink.online</a>
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

    initializeAccessControl();
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
    
    if (hour < 10) { 
        now.setDate(now.getDate() - 1);
    }
    
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
    panel.style.cssText = "display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 16px; font-family: sans-serif; flex-wrap: wrap; gap: 10px;";
    
    panel.innerHTML = `
        <div style="font-size: 13px; color: var(--dl-text-main, #ffffff); font-weight: bold; background: var(--dl-badge-bg, #001a3a); padding: 8px 14px; border-radius: 6px; display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--dl-border-color, #1e3a8a);">
            👤 User: <span style="color:#4ade80;" id="dlDispCurrentName">${dispatcherNickname}</span> 
            <a href="#" onclick="changeDispatcherName(); return false;" style="margin-left:4px; color:#38bdf8; text-decoration:none;">[✏️ Change]</a> 
            <a href="#" onclick="logoutUser(); return false;" style="margin-left:8px; color:#f87171; text-decoration:none;">[🚪 Logout]</a>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
            <button onclick="toggleDarkMode()" id="dlDarkModeToggleBtn" style="background: var(--dl-btn-bg, #001a3a); color: var(--dl-btn-text, #fff); border: 1px solid var(--dl-border-color, #1e3a8a); padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; transition: 0.2s;" title="Toggle Dark/Light Mode">
                🌙 Theme
            </button>
            <button onclick="openCallingDetailModal()" style="background: #d97706; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); transition: 0.2s;">
                📊 Calling Detail
            </button>
            <button onclick="openAdminPanelPrompt()" style="background: #2563eb; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); transition: 0.2s;">
                👑 Admin Panel
            </button>
        </div>
    `;
    heading.parentNode.insertBefore(panel, heading.nextSibling);
    applyStoredThemePreference();
}

window.toggleDarkMode = function() {
    let currentTheme = localStorage.getItem(`dl_theme_${currentClient}`) || 'dark';
    let newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(`dl_theme_${currentClient}`, newTheme);
    applyStoredThemePreference();
};

function applyStoredThemePreference() {
    let theme = localStorage.getItem(`dl_theme_${currentClient}`) || 'dark';
    let root = document.documentElement;
    let toggleBtn = document.getElementById('dlDarkModeToggleBtn');

    if (theme === 'light') {
        root.style.setProperty('--dl-bg-color', '#f4f7fe');
        root.style.setProperty('--dl-card-bg', '#ffffff');
        root.style.setProperty('--dl-text-main', '#001a3a');
        root.style.setProperty('--dl-text-color', '#333333');
        root.style.setProperty('--dl-border-color', '#b6ccfe');
        root.style.setProperty('--dl-sub-bg', '#f8f9fa');
        root.style.setProperty('--dl-badge-bg', '#e2eafc');
        root.style.setProperty('--dl-btn-bg', '#ffffff');
        root.style.setProperty('--dl-btn-text', '#002d62');
        if (toggleBtn) toggleBtn.innerHTML = "🌙 Dark Mode";
    } else {
        root.style.setProperty('--dl-bg-color', '#000f24');
        root.style.setProperty('--dl-card-bg', '#001a3a');
        root.style.setProperty('--dl-text-main', '#ffffff');
        root.style.setProperty('--dl-text-color', '#f1f5f9');
        root.style.setProperty('--dl-border-color', '#1e3a8a');
        root.style.setProperty('--dl-sub-bg', '#000f24');
        root.style.setProperty('--dl-badge-bg', '#002d62');
        root.style.setProperty('--dl-btn-bg', '#001a3a');
        root.style.setProperty('--dl-btn-text', '#ffffff');
        if (toggleBtn) toggleBtn.innerHTML = "☀️ Light Mode";
    }
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

    checkGlobalSessions();
    setInterval(checkGlobalSessions, 4000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!currentClient || !allowedUsers[currentClient]) {
            renderLoginScreen();
        } else {
            initializeAccessControl();
        }
    });
} else {
    setTimeout(() => {
        if (!currentClient || !allowedUsers[currentClient]) {
            renderLoginScreen();
        } else {
            initializeAccessControl();
        }
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
    } catch (e) {
        console.error("Failed to update session nickname:", e);
    }
}

async function checkGlobalSessions() {
    if (userLimit === 0 || !currentClient) return;
    const url = `${FIREBASE_DB_URL}sessions/${currentClient}.json`;
    const now = Date.now();
    const loginTimeString = new Date().toLocaleTimeString();
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    
    try {
        const res = await fetch(url);
        const data = await res.json() || {};
        
        let activeSessionsMap = {};
        Object.keys(data).forEach(key => {
            let session = data[key];
            if (session && session.timestamp && (now - session.timestamp < 12000)) {
                activeSessionsMap[key] = session;
            } else if (key !== safeTabKey) {
                fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${key}.json`, { method: 'DELETE' });
            }
        });

        let activeCount = Object.keys(activeSessionsMap).length;
        let isCurrentRegistered = !!activeSessionsMap[safeTabKey];

        if (!isCurrentRegistered && activeCount >= userLimit) {
            if (typeof scraping !== 'undefined' && scraping) {
                stopScraping();
            }
            showLimitExceededModal(`Your global license limit for "${currentClient}" has been reached. Max allowed active tabs/devices is <b>${userLimit}</b>, but currently <b>${activeCount}</b> sessions are active.`);
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
    if (typeof scraping !== 'undefined' && scraping && currentHistoryId) {
        let currentRangeStr = window.activeScrapeRange || "1 - 100";
        let backupObj = {
            id: currentHistoryId,
            date: new Date().toLocaleString('en-US', { hour12: true }),
            range: currentRangeStr,
            totalRecords: scrapedData.length,
            status: "Interrupted (Auto-Saved)",
            records: scrapedData
        };
        let lsBackup = JSON.parse(localStorage.getItem(`dl_history_backup_${currentClient}`)) || [];
        let idx = lsBackup.findIndex(r => r.id === currentHistoryId);
        if (idx !== -1) lsBackup[idx] = backupObj;
        else lsBackup.push(backupObj);
        localStorage.setItem(`dl_history_backup_${currentClient}`, JSON.stringify(lsBackup));
    }
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
            lsBackup.forEach(item => {
                store.put(item);
            });
        } else if (dbRecords.length > 0) {
            localStorage.setItem(`dl_history_backup_${currentClient}`, JSON.stringify(dbRecords));
        }
    };
}

const DEFAULT_REMARKS_TEMPLATE = 
    "Truck Type:\n" +
    "Length:\n" +
    "Accessories:\n" +
    "Load:\n" +
    "Zip Code:\n" +
    "Summary:";

function injectHistoryUIFramework() {
    document.title = "Dispatch Link";

    let brandHeading = document.querySelector('h1, h2, .heading');
    if (!brandHeading) {
        const headings = document.querySelectorAll('div, h1, h2, h3');
        for (let h of headings) {
            if (h.textContent.includes("FMCSA SAFER") || h.textContent.includes("SAFER")) {
                brandHeading = h;
                break;
            }
        }
    }
    if (brandHeading) {
        brandHeading.innerHTML = "Dispatch Link <span style='font-size:14px; color:#94a3b8; font-weight:normal;'>| Lead Processor & CRM</span>";
    }

    if (!document.getElementById('dlResponsiveTheme')) {
        let styleTag = document.createElement('style');
        styleTag.id = 'dlResponsiveTheme';
        styleTag.innerHTML = `
            :root {
                --dl-bg-color: #000f24;
                --dl-card-bg: #001a3a;
                --dl-text-main: #ffffff;
                --dl-text-color: #f1f5f9;
                --dl-border-color: #1e3a8a;
                --dl-sub-bg: #000f24;
                --dl-badge-bg: #002d62;
                --dl-btn-bg: #001a3a;
                --dl-btn-text: #ffffff;
            }
            body { background-color: var(--dl-bg-color, #000f24) !important; color: var(--dl-text-color, #f1f5f9) !important; }
            .container, .container-fluid { width: 100% !important; max-width: 100% !important; padding: 10px !important; box-sizing: border-box !important; }
            .table-responsive { width: 100% !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; margin-bottom: 20px !important; border: 1px solid var(--dl-border-color, #1e3a8a) !important; border-radius: 8px !important; background: var(--dl-card-bg, #001a3a); }
            table.table { width: 100% !important; min-width: 1100px !important; border-collapse: collapse !important; color: var(--dl-text-color, #f1f5f9) !important; }
            table.table th { background: var(--dl-card-bg, #001a3a) !important; color: var(--dl-text-main, #fff) !important; border-bottom: 2px solid var(--dl-border-color, #1e3a8a) !important; }
            table.table td { border-bottom: 1px solid var(--dl-border-color, #1e3a8a) !important; }
            table.table th, table.table td { padding: 12px 10px !important; vertical-align: middle !important; text-align: left !important; font-size: 13px !important; white-space: nowrap !important; }
            table.table th:nth-child(4), table.table td:nth-child(4) { width: 90px !important; max-width: 90px !important; overflow: hidden !important; text-overflow: ellipsis !important; }
            
            .remarks-cell-container { min-width: 250px !important; width: 260px !important; position: relative; white-space: normal !important; }
            .remarks-input-field { 
                width: 100% !important; 
                height: 38px !important; 
                border: 1px solid var(--dl-border-color, #1e3a8a) !important; 
                border-radius: 6px !important; 
                padding: 6px 10px !important; 
                font-size: 12px !important; 
                line-height: 1.4 !important;
                box-sizing: border-box !important; 
                color: var(--dl-text-color, #222) !important; 
                background: var(--dl-sub-bg, #fafafa) !important; 
                resize: none !important;
                font-family: monospace !important;
                overflow: hidden !important;
                transition: height 0.25s ease-in-out, border-color 0.2s, background 0.2s, box-shadow 0.2s; 
            }
            .remarks-input-field:focus { 
                height: 120px !important; 
                border-color: #38bdf8 !important; 
                background: var(--dl-card-bg, #ffffff) !important; 
                outline: none !important; 
                overflow-y: auto !important;
                box-shadow: 0 4px 15px rgba(56,189,248,0.2) !important; 
            }
            .premium-copy-badge { position: absolute; background: #28a745; color: white; padding: 2px 6px; font-size: 10px; border-radius: 3px; top: -15px; left: 50%; transform: translateX(-50%); z-index: 100; font-weight: bold; }
            .premium-pitch-btn { display: inline-block; background: #0284c7; color: white; text-decoration: none; font-size: 10px; font-weight: bold; padding: 5px 8px; border-radius: 4px; border: none; margin-left: 5px; transition: background 0.2s; vertical-align: middle; }
            .premium-pitch-btn:hover { background: #0369a1; }
            .premium-followup-btn { display: inline-block; background: #eab308; color: #1e293b; text-decoration: none; font-size: 11px; font-weight: bold; padding: 6px 10px; border-radius: 4px; border: none; cursor: pointer; font-family: sans-serif; transition: background 0.2s; }
            .premium-followup-btn:hover { background: #ca8a04; }
            
            .phone-clickable-container { padding: 4px !important; text-align: center !important; position: relative !important; }
            .phone-clickable-cell { padding: 8px 10px !important; text-align: center !important; cursor: pointer !important; transition: background-color 0.2s ease-in-out; text-decoration: none !important; display: block; border-radius: 6px !important; }
            .phone-clickable-cell:hover { background-color: rgba(56,189,248,0.15) !important; }
            .phone-clickable-cell:hover .clickable-phone-text { color: #38bdf8 !important; }
            .phone-clickable-cell.active-called-cell { background-color: rgba(34,197,94,0.2) !important; border: 1px solid #22c55e !important; }
            .phone-clickable-cell.active-called-cell .clickable-phone-text { color: #4ade80 !important; font-weight: 900 !important; }
            .phone-cell-content { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; pointer-events: none; }
            .phone-icon-span { font-size: 14px; line-height: 1; }
            .clickable-phone-text { color: var(--dl-text-main, #ffffff); font-weight: bold; font-size: 12px; white-space: nowrap; transition: color 0.2s; }
            .phone-hover-copy-icon { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; opacity: 0; transition: opacity 0.2s; cursor: pointer; background: var(--dl-badge-bg, #002d62); padding: 3px 5px; border-radius: 3px; border: 1px solid var(--dl-border-color, #1e3a8a); color: #fff; }
            .phone-clickable-container:hover .phone-hover-copy-icon { opacity: 1; }
            .phone-copy-badge { position: absolute; background: #22c55e; color: white; padding: 2px 6px; font-size: 10px; border-radius: 3px; top: -18px; left: 50%; transform: translateX(-50%); z-index: 100; font-weight: bold; }
        `;
        document.head.appendChild(styleTag);
    }

    if (!document.getElementById('dlFloatingNavPanel')) {
        let navPanel = document.createElement('div');
        navPanel.id = 'dlFloatingNavPanel';
        navPanel.style.cssText = "position: fixed; bottom: 30px; right: 30px; z-index: 999999; display: flex; flex-direction: column; gap: 10px; transition: opacity 0.3s ease-in-out;";
        navPanel.innerHTML = `
            <button id="dlScrollUpBtn" onclick="scrollToTopScreen()" title="Scroll to Top" style="background: #2563eb; color: white; border: none; width: 45px; height: 45px; border-radius: 50%; box-shadow: 0 6px 16px rgba(37,99,235,0.4); cursor: pointer; font-size: 18px; font-weight: bold; display: none; align-items: center; justify-content: center; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">⬆️</button>
            <button id="dlScrollDownBtn" onclick="scrollToLastCalledLead()" title="Scroll to Last Called Lead" style="background: #0284c7; color: white; border: none; width: 45px; height: 45px; border-radius: 50%; box-shadow: 0 6px 16px rgba(2,132,199,0.4); cursor: pointer; font-size: 18px; font-weight: bold; display: none; align-items: center; justify-content: center; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">⬇️</button>
        `;
        document.body.appendChild(navPanel);

        window.addEventListener('scroll', function() {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            let upBtn = document.getElementById('dlScrollUpBtn');
            let downBtn = document.getElementById('dlScrollDownBtn');
            let hasActiveCalledCell = document.querySelector('.phone-clickable-cell.active-called-cell') !== null;

            if (upBtn) {
                upBtn.style.display = scrollTop > 250 ? 'flex' : 'none';
            }
            if (downBtn) {
                downBtn.style.display = (scrollTop < 300 && hasActiveCalledCell) ? 'flex' : 'none';
            }
        });
    }

    let coreTable = document.querySelector('table');
    if (coreTable && !coreTable.parentNode.classList.contains('table-responsive')) {
        let wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'table-responsive';
        coreTable.parentNode.insertBefore(wrapperDiv, coreTable);
        wrapperDiv.appendChild(coreTable);
    }

    let mainHeading = document.querySelector('h1, h2, .heading');
    if (!mainHeading) {
        const headings = document.querySelectorAll('div, h1, h2, h3');
        for (let h of headings) {
            if (h.textContent.includes("FMCSA SAFER") || h.textContent.includes("SAFER")) {
                mainHeading = h;
                break;
            }
        }
    }

    if (mainHeading && !document.getElementById('devCreditTag')) {
        mainHeading.style.position = 'relative';
        let creditTag = document.createElement('span');
        creditTag.id = 'devCreditTag';
        creditTag.innerHTML = "Created by <b>Mr. Nauman (Ph: 03037654849)</b>";
        creditTag.style.cssText = "position: absolute; right: 0; bottom: 5px; font-size: 11px; color: #94a3b8; font-family: sans-serif; font-weight: normal;";
        mainHeading.appendChild(creditTag);
    }

    let startBtn = document.getElementById('startBtn');
    if (startBtn && !document.getElementById('openHistoryBtn')) {
        let historyBtn = document.createElement('button');
        historyBtn.id = 'openHistoryBtn';
        historyBtn.innerHTML = "📜 View History";
        historyBtn.style.cssText = "background: #2563eb; color: white; border: none; padding: 10px 18px; font-size: 14px; font-weight: bold; font-family: sans-serif; border-radius: 6px; cursor: pointer; margin-left: 10px; display: inline-block; vertical-align: middle; box-shadow: 0 4px 12px rgba(37,99,235,0.25);";
        historyBtn.onclick = (e) => { e.stopPropagation(); toggleHistoryDrawer(); };
        startBtn.parentNode.insertBefore(historyBtn, startBtn.nextSibling);

        let followUpBtn = document.createElement('button');
        followUpBtn.id = 'openFollowUpDrawerBtn';
        followUpBtn.innerHTML = "📅 View Follow-Ups";
        followUpBtn.style.cssText = "background: #0284c7; color: white; border: none; padding: 10px 18px; font-size: 14px; font-weight: bold; font-family: sans-serif; border-radius: 6px; cursor: pointer; margin-left: 8px; display: inline-block; vertical-align: middle; box-shadow: 0 4px 12px rgba(2,132,199,0.25);";
        followUpBtn.onclick = (e) => { e.stopPropagation(); toggleFollowUpDrawer(); };
        startBtn.parentNode.insertBefore(followUpBtn, historyBtn.nextSibling);
    }

    if (!document.getElementById('dlHistoryDrawer')) {
        let drawer = document.createElement('div');
        drawer.id = 'dlHistoryDrawer';
        drawer.style.cssText = "position: fixed; top: 0; right: -420px; width: 400px; height: 100%; background: var(--dl-card-bg, #001a3a); color: var(--dl-text-color, #fff); box-shadow: -5px 0 25px rgba(0,0,0,0.5); z-index: 999999; transition: right 0.3s ease-in-out; padding: 20px; box-sizing: border-box; font-family: sans-serif; display: flex; flex-direction: column; border-left: 1px solid var(--dl-border-color, #1e3a8a);";
        drawer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 15px;">
                <h3 style="color: var(--dl-text-main, #ffffff); margin: 0; font-size: 18px;">Saved Sheets History</h3>
                <button onclick="toggleHistoryDrawer()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; font-weight: bold;">&times;</button>
            </div>
            <div id="drawerHistoryList" style="flex: 1; overflow-y: auto; padding-right: 5px;"></div>
        `;
        document.body.appendChild(drawer);
    }

    if (!document.getElementById('dlFollowUpDrawer')) {
        let fDrawer = document.createElement('div');
        fDrawer.id = 'dlFollowUpDrawer';
        fDrawer.style.cssText = "position: fixed; top: 0; right: -420px; width: 400px; height: 100%; background: var(--dl-card-bg, #001a3a); color: var(--dl-text-color, #fff); box-shadow: -5px 0 25px rgba(0,0,0,0.5); z-index: 999999; transition: right 0.3s ease-in-out; padding: 20px; box-sizing: border-box; font-family: sans-serif; display: flex; flex-direction: column; border-left: 1px solid var(--dl-border-color, #1e3a8a);";
        fDrawer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 12px;">
                <h3 style="color: var(--dl-text-main, #ffffff); margin: 0; font-size: 18px;">📅 Follow-Up Pipeline</h3>
                <button onclick="toggleFollowUpDrawer()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #94a3b8; font-weight: bold;">&times;</button>
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                <button onclick="filterFollowUpsByDate('today')" id="fubtnToday" style="flex: 1; background: #0284c7; color: white; border: none; padding: 8px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;">📅 Today</button>
                <button onclick="filterFollowUpsByDate('all')" id="fubtnAll" style="flex: 1; background: var(--dl-sub-bg, #000f24); color: var(--dl-text-main, #fff); border: 1px solid var(--dl-border-color, #1e3a8a); padding: 8px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;">📋 All</button>
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center;">
                <input type="text" id="followUpSearchInput" placeholder="🔍 Search MC, Name, Phone..." style="flex: 1; padding: 10px; font-size: 12px; background: var(--dl-sub-bg, #000f24); border: 1px solid var(--dl-border-color, #1e3a8a); color: var(--dl-text-color, #fff); border-radius: 6px; box-sizing: border-box; outline: none;" oninput="renderFollowUpItems()">
                <button onclick="clearFollowUpFilters()" style="background: var(--dl-sub-bg, #000f24); border: 1px solid var(--dl-border-color, #1e3a8a); color: var(--dl-text-main, #fff); padding: 9px 12px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;" title="Clear Filters">🔄</button>
            </div>
            <div style="margin-bottom: 15px;">
                <button onclick="downloadFollowUpsCSV()" style="background: #22c55e; color: white; border: none; padding: 10px; font-weight: bold; font-size: 13px; border-radius: 6px; cursor: pointer; width: 100%; box-shadow: 0 4px 12px rgba(34,197,94,0.25);">📥 Download Follow-Ups Sheet</button>
            </div>
            <div id="drawerFollowUpList" style="flex: 1; overflow-y: auto; padding-right: 5px;"></div>
        `;
        document.body.appendChild(fDrawer);
    }

    if (!document.getElementById('dlDatePickerModal')) {
        let modal = document.createElement('div');
        modal.id = 'dlDatePickerModal';
        modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000000; display: none; align-items: center; justify-content: center; font-family: sans-serif;";
        modal.innerHTML = `
            <div style="background: var(--dl-card-bg, #001a3a); color: var(--dl-text-color, #fff); padding: 30px; border-radius: 12px; width: 340px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); border: 1px solid var(--dl-border-color, #1e3a8a);">
                <h3 style="color: var(--dl-text-main, #ffffff); margin-top: 0; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">⏰ Schedule Follow-Up</h3>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 12px; font-weight: bold; color: var(--dl-text-main, #cbd5e1); margin-bottom: 6px;">Select Date:</label>
                    <input type="date" id="dlModalDateInput" style="width: 100%; padding: 10px; font-size: 13px; background: var(--dl-sub-bg, #000f24); border: 1px solid var(--dl-border-color, #1e3a8a); color: #fff; border-radius: 6px; box-sizing: border-box; outline: none;">
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 12px; font-weight: bold; color: var(--dl-text-main, #cbd5e1); margin-bottom: 6px;">Select Time:</label>
                    <input type="time" id="dlModalTimeInput" style="width: 100%; padding: 10px; font-size: 13px; background: var(--dl-sub-bg, #000f24); border: 1px solid var(--dl-border-color, #1e3a8a); color: #fff; border-radius: 6px; box-sizing: border-box; outline: none;">
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="closeFollowUpModal()" style="background: #475569; color: white; border: none; padding: 8px 16px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;">Cancel</button>
                    <button onclick="confirmFollowUpSchedule()" style="background: #22c55e; color: white; border: none; padding: 8px 16px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 12px rgba(34,197,94,0.3);">Confirm Schedule</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    if (!document.getElementById('dlTeamSelectModal')) {
        let tModal = document.createElement('div');
        tModal.id = 'dlTeamSelectModal';
        tModal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000000; display: none; align-items: center; justify-content: center; font-family: sans-serif;";
        tModal.innerHTML = `
            <div style="background: var(--dl-card-bg, #001a3a); color: var(--dl-text-color, #fff); padding: 30px; border-radius: 12px; width: 360px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); border: 1px solid var(--dl-border-color, #1e3a8a);">
                <h3 style="color: var(--dl-text-main, #ffffff); margin-top: 0; margin-bottom: 10px; font-size: 18px; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">👥 Share with Active Team Member</h3>
                <p style="font-size: 12px; color: #94a3b8; margin-bottom: 15px;">Select an active online laptop/user from your account group:</p>
                <div id="dlTeamMembersRadioList" style="max-height: 180px; overflow-y: auto; margin-bottom: 20px; border: 1px solid var(--dl-border-color, #1e3a8a); padding: 10px; border-radius: 6px; background: var(--dl-sub-bg, #000f24);"></div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="closeTeamSelectModal()" style="background: #475569; color: white; border: none; padding: 8px 16px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;">Cancel</button>
                    <button onclick="confirmTeamShareAction()" style="background: #2563eb; color: white; border: none; padding: 8px 16px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">Share Now</button>
                </div>
            </div>
        `;
        document.body.appendChild(tModal);
    }

    document.addEventListener('click', function(event) {
        let hDrawer = document.getElementById('dlHistoryDrawer');
        let fDrawer = document.getElementById('dlFollowUpDrawer');
        let hBtn = document.getElementById('openHistoryBtn');
        let fBtn = document.getElementById('openFollowUpDrawerBtn');

        if (hDrawer && hDrawer.style.right === "0px") {
            if (!hDrawer.contains(event.target) && (!hBtn || !hBtn.contains(event.target))) {
                hDrawer.style.right = "-420px";
            }
        }

        if (fDrawer && fDrawer.style.right === "0px") {
            if (!fDrawer.contains(event.target) && (!fBtn || !fBtn.contains(event.target))) {
                fDrawer.style.right = "-420px";
            }
        }
    });

    injectAdvancedFilterBar();

    let tableHeader = document.querySelector('table tr');
    if (tableHeader && !document.getElementById('remarksHeaderCol')) {
        let vehTh = document.createElement('th');
        vehTh.id = 'vehicleTypeHeaderCol';
        vehTh.innerText = "Vehicles";
        
        let remTh = document.createElement('th');
        remTh.id = 'remarksHeaderCol';
        remTh.className = 'remarks-cell-container';
        remTh.innerText = "Remarks";

        let followTh = document.createElement('th');
        followTh.id = 'followUpHeaderCol';
        followTh.innerText = "Action";

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

window.scrollToTopScreen = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    let startInput = document.getElementById('startMc');
    if (startInput) startInput.focus();
};

window.scrollToLastCalledLead = function() {
    let activeCalledCell = document.querySelector('.phone-clickable-cell.active-called-cell');
    if (activeCalledCell) {
        activeCalledCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showPremiumNotification("📍 Jumped to last called lead!", 2000);
    } else {
        showPremiumNotification("⚠️ No call logged yet in this session.", 2500);
    }
};

function injectAdvancedFilterBar() {
    let table = document.querySelector('table');
    if (!table || document.getElementById('advancedFilterWrapper')) return;

    let filterDiv = document.createElement('div');
    filterDiv.id = 'advancedFilterWrapper';
    filterDiv.style.cssText = "background: var(--dl-card-bg, #001a3a); color: var(--dl-text-color, #fff); padding: 15px; margin: 15px 0; border: 1px solid var(--dl-border-color, #1e3a8a); border-radius: 8px; font-family: sans-serif; display: flex; flex-wrap: wrap; align-items: center; gap: 15px; justify-content: space-between; box-shadow: 0 4px 15px rgba(0,0,0,0.2);";
    filterDiv.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 13px; font-weight: bold; color: var(--dl-text-main, #ffffff);">📍 State:</span>
                <select id="stateDropdownSelect" style="padding: 8px 12px; font-size: 12px; border: 1px solid var(--dl-border-color, #1e3a8a); border-radius: 6px; background: var(--dl-sub-bg, #000f24); color: var(--dl-text-main, #fff); font-weight: bold; font-family: monospace; outline: none;" onchange="applyAdvancedFilters()">
                    <option value="">All States</option>
                </select>
            </div>
            <div style="position: relative; display: inline-block;">
                <button type="button" onclick="toggleVehicleDropdown(event)" style="background: var(--dl-sub-bg, #000f24); border: 1px solid var(--dl-border-color, #1e3a8a); padding: 8px 14px; font-size: 12px; border-radius: 6px; color: var(--dl-text-main, #fff); font-weight: bold; cursor: pointer;">Select Vehicle Types ▼</button>
                <div id="vehicleTypeDropdownContent" style="display: none; position: absolute; background: var(--dl-card-bg, #001a3a); border: 1px solid var(--dl-border-color, #1e3a8a); box-shadow: 0 10px 30px rgba(0,0,0,0.5); padding: 12px; border-radius: 8px; z-index: 1000; width: 190px; top: 100%; left: 0; margin-top: 6px; text-align: left; box-sizing: border-box;">
                    <div style="font-size: 11px; font-weight: bold; color: #94a3b8; margin-bottom: 8px; border-bottom: 1px solid var(--dl-border-color, #1e3a8a); padding-bottom: 6px; text-align: left;">Filter by Vehicle:</div>
                    <div id="vehicleCheckboxList"></div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 240px;">
                <span style="font-size: 13px; font-weight: bold; color: var(--dl-text-main, #ffffff);">🔍 Search:</span>
                <input type="text" id="universalSearchInput" placeholder="Search by MC, Company Name, or Phone..." style="width: 100%; padding: 8px 12px; font-size: 12px; background: var(--dl-sub-bg, #000f24); border: 1px solid var(--dl-border-color, #1e3a8a); color: var(--dl-text-color, #fff); border-radius: 6px; outline: none;" oninput="applyAdvancedFilters()">
            </div>
            <button onclick="resetAdvancedFilters()" style="background: #2563eb; color: white; border: none; padding: 8px 16px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.2s;">🔄 Reset</button>
        </div>
        <div style="background: #2563eb; color: white; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 8px rgba(37,99,235,0.3);">
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

window.toggleVehicleDropdown = function(e) {
    e.stopPropagation();
    let dropdown = document.getElementById('vehicleTypeDropdownContent');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
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
    
    let sortedCodes = Object.keys(stateCounts).sort((a, b) => {
        let nameA = usStatesMap[a] || a;
        let nameB = usStatesMap[b] || b;
        return nameA.localeCompare(nameB);
    });

    let maxLabelLength = 0;
    sortedCodes.forEach(code => {
        let fullName = usStatesMap[code] || code;
        let label = `${fullName} (${code})`;
        if (label.length > maxLabelLength) maxLabelLength = label.length;
    });

    sortedCodes.forEach(code => {
        let fullName = usStatesMap[code] || code;
        let count = stateCounts[code];
        let label = `${fullName} (${code})`;
        let paddingLength = Math.max(2, maxLabelLength - label.length + 4);
        let spaces = "\u00A0".repeat(paddingLength);
        
        let opt = document.createElement('option');
        opt.value = code;
        opt.textContent = `${label}${spaces}${count}`;
        select.appendChild(opt);
    });
    select.value = currentVal;
    updateVisibleRecordCount();
}

function populateVehicleTypeCheckboxes() {
    let container = document.getElementById('vehicleCheckboxList');
    if (!container) return;

    let fixedTypes = ["Box Truck", "Power Only", "Trailers"];
    let checkedSet = new Set();
    container.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => checkedSet.add(cb.value));

    let html = "";
    fixedTypes.forEach(vType => {
        let isChecked = checkedSet.has(vType) ? "checked" : "";
        html += `
            <label style="display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: flex-start !important; gap: 8px !important; font-size: 12px !important; margin-bottom: 8px !important; cursor: pointer !important; color: var(--dl-text-color, #cbd5e1) !important; text-align: left !important; width: 100% !important; float: none !important;">
                <input type="checkbox" value="${vType}" ${isChecked} onchange="applyAdvancedFilters()" style="cursor: pointer !important; margin: 0 !important; flex-shrink: 0 !important; float: none !important; display: inline-block !important; width: 14px !important; height: 14px !important;"> 
                <span style="text-align: left !important; flex: 1 !important; white-space: nowrap !important; display: inline-block !important; visibility: visible !important; opacity: 1 !important; color: var(--dl-text-color, #cbd5e1) !important; font-size: 12px !important;">${vType}</span>
            </label>
        `;
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

    rows.forEach(row => {
        let mcText = (row.cells[0]?.textContent || "").toLowerCase();
        let nameText = (row.cells[2]?.textContent || "").toLowerCase();
        let phoneText = (row.cells[5]?.textContent || "").toLowerCase();
        let addressText = (row.cells[6]?.textContent || "").toUpperCase();
        let vehicleText = (row.cells[9]?.textContent || "").toLowerCase();

        let matchesState = true;
        if (selectedState !== "") {
            let stateRegex = new RegExp(`\\b${selectedState}\\b(?=\\s+\\d{5}(-\\d{4})?)`);
            matchesState = stateRegex.test(addressText);
        }

        let matchesSearch = true;
        if (searchQuery !== "") {
            matchesSearch = mcText.includes(searchQuery) || nameText.includes(searchQuery) || phoneText.includes(searchQuery);
        }

        let matchesVehicle = true;
        if (selectedVehicles.length > 0) {
            matchesVehicle = selectedVehicles.some(sel => {
                if (sel === "box truck") return vehicleText.includes("box truck");
                if (sel === "power only") return vehicleText.includes("power only");
                if (sel === "trailers") return vehicleText.includes("trailers");
                return vehicleText.includes(sel);
            });
        }

        row.style.display = (matchesState && matchesSearch && matchesVehicle) ? "" : "none";
    });
    updateVisibleRecordCount();
};

window.resetAdvancedFilters = function() {
    let stSel = document.getElementById('stateDropdownSelect');
    let srchInput = document.getElementById('universalSearchInput');
    if (stSel) stSel.value = "";
    if (srchInput) srchInput.value = "";
    document.querySelectorAll('#vehicleCheckboxList input[type="checkbox"]').forEach(cb => cb.checked = false);
    applyAdvancedFilters();
};

function updateVisibleRecordCount() {
    let rows = document.querySelectorAll('#resultsTable tr');
    let visibleCount = 0;
    if (rows.length > 0) {
        rows.forEach(r => {
            if (r.style.display !== 'none') visibleCount++;
        });
    }
    let badge = document.getElementById('visibleRecordCountBadge');
    if (badge) badge.innerText = visibleCount;
}

function injectEmailProposalPanel() {
    let table = document.querySelector('table');
    if (!table || document.getElementById('premiumProposalWrapper')) return;

    let savedSubject = localStorage.getItem(`dl_subj_${currentClient}`) || "Dispatch Service Proposal";
    let savedBody = localStorage.getItem(`dl_body_${currentClient}`) || "Hello,\n\nWe found your profile via FMCSA. We offer dispatching services at 5% rate.\n\nBest Regards.";

    let proposalPanel = document.createElement('div');
    proposalPanel.id = 'premiumProposalWrapper';
    proposalPanel.style.cssText = "background: var(--dl-card-bg, #001a3a); color: var(--dl-text-color, #fff); padding: 15px; margin: 15px 0; border: 1px solid var(--dl-border-color, #1e3a8a); border-radius: 8px; font-family: sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.2);";
    proposalPanel.innerHTML = `
        <div onclick="document.getElementById('proposalInputsBlock').style.display = document.getElementById('proposalInputsBlock').style.display === 'none' ? 'block' : 'none';" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 13px; color: var(--dl-text-main, #ffffff);">📋 Setup Email Proposal Template</strong>
            <span style="font-size: 12px; font-weight: bold; color: #38bdf8;">⚙️ Click to Edit</span>
        </div>
        <div id="proposalInputsBlock" style="display: none; margin-top: 12px; border-top: 1px dashed var(--dl-border-color, #1e3a8a); padding-top: 12px;">
            <div style="margin-bottom: 10px;"><input type="text" id="propSubjectInput" value="${savedSubject}" style="width: 100%; padding: 10px; font-size: 13px; background: var(--dl-sub-bg, #000f24); border: 1px solid var(--dl-border-color, #1e3a8a); color: var(--dl-text-color, #fff); border-radius: 6px; outline: none;"></div>
            <div style="margin-bottom: 10px;"><textarea id="propBodyInput" style="width: 100%; height: 90px; font-size: 13px; background: var(--dl-sub-bg, #000f24); border: 1px solid var(--dl-border-color, #1e3a8a); color: var(--dl-text-color, #fff); border-radius: 6px; outline: none; padding: 10px;">${savedBody}</textarea></div>
            <button onclick="saveProposalTemplateSettings()" style="background: #2563eb; color: white; border: none; padding: 8px 16px; font-size: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">💾 Save Template</button>
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

    let mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(customizedBody)}`;
    let gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${emailAddress}&su=${encodeURIComponent(subj)}&body=${encodeURIComponent(customizedBody)}`;

    let activeWindow = window.open(mailtoUrl, '_blank');
    setTimeout(() => {
        try {
            if (!activeWindow || activeWindow.location.href === 'about:blank' || activeWindow.document.body.innerHTML === '') {
                if (activeWindow) activeWindow.location.href = gmailUrl;
            }
        } catch (e) {}
    }, 500);
};

window.copyEmailToClipboard = function(element, emailAddress) {
    if (!emailAddress || emailAddress === 'N/A') return;
    navigator.clipboard.writeText(emailAddress).then(() => {
        let badge = document.createElement('span');
        badge.className = 'premium-copy-badge';
        badge.innerText = "Copied!";
        element.appendChild(badge);
        setTimeout(() => badge.remove(), 1200);
    });
};

function buildEmailCellMarkup(emailAddress, companyName) {
    if (!emailAddress || emailAddress === 'N/A') return `<td style="color: #64748b;">N/A</td>`;
    let escapedName = companyName.replace(/'/g, "\\'");
    return `
        <td style="position: relative; vertical-align: middle;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <span onclick="copyEmailToClipboard(this.parentNode, '${emailAddress}')" style="color: #38bdf8; font-weight: bold; cursor: pointer;">${emailAddress}</span>
                <a href="#" onclick="triggerOneClickEmailPitch('${emailAddress}', '${escapedName}'); return false;" class="premium-pitch-btn">📤 Send</a>
            </div>
        </td>
    `;
}

let activeCallPhone = null;

window.logCallCount = function(phoneNum, cellElement) {
    if (!phoneNum || phoneNum === 'N/A') return;
    
    let storageKey = `dl_call_logs_${currentClient}_${dispatcherNickname}`;
    let callLogs = JSON.parse(localStorage.getItem(storageKey)) || [];
    
    let logEntry = {
        phone: phoneNum,
        dispatcher: dispatcherNickname,
        shiftDate: getCurrentShiftDateKey(),
        date: new Date().toLocaleString(),
        status: 'Called'
    };
    
    callLogs.push(logEntry);
    localStorage.setItem(storageKey, JSON.stringify(callLogs));

    showPremiumNotification(`✅ Call Count Logged for ${phoneNum}`, 2500);

    document.querySelectorAll('.phone-clickable-cell').forEach(el => {
        el.classList.remove('active-called-cell');
    });
    if (cellElement) {
        cellElement.classList.add('active-called-cell');
    }

    let downBtn = document.getElementById('dlScrollDownBtn');
    if (downBtn) downBtn.style.display = 'none';
}

window.openCallingDetailModal = function() {
    let existing = document.getElementById('dlCallingDetailModal');
    if (existing) existing.remove();

    let logs = JSON.parse(localStorage.getItem(`dl_call_logs_${currentClient}_${dispatcherNickname}`)) || [];
    let shiftDateStr = getCurrentShiftDateKey();
    let todayLogs = logs.filter(l => l.shiftDate === shiftDateStr);
    
    let totalCallsCount = todayLogs.length;

    let modal = document.createElement('div');
    modal.id = 'dlCallingDetailModal';
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.65); z-index: 10000000; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    
    modal.innerHTML = `
        <div style="background: var(--dl-card-bg, #001a3a); color: var(--dl-text-color, #fff); width: 380px; border-radius: 12px; box-shadow: 0 15px 40px rgba(0,0,0,0.5); overflow: hidden; border: 1px solid var(--dl-border-color, #1e3a8a);">
            <div style="background: #2563eb; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 16px;">📊 Current Shift Details</h3>
                <button onclick="document.getElementById('dlCallingDetailModal').remove()" style="background: none; border: none; color: white; font-size: 22px; cursor: pointer; font-weight: bold;">&times;</button>
            </div>
            <div style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 15px; border-bottom: 1px solid var(--dl-border-color, #1e3a8a); padding-bottom: 12px;">
                    <strong>Total Calls Logged:</strong> <span style="font-weight: bold; color: #4ade80; font-size: 18px;">${totalCallsCount}</span>
                </div>
                
                <div style="margin-top: 25px; display: flex; gap: 10px;">
                    <button onclick="openShiftShareModal()" style="background: #2563eb; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; flex: 1; font-size: 13px; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">📤 Share Shift Report</button>
                    <button onclick="document.getElementById('dlCallingDetailModal').remove()" style="background: #475569; color: white; border: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.openAdminPanelPrompt = function() {
    let passInput = prompt("Enter Master Admin Password:");
    if (passInput === null) return;
    if (passInput !== MASTER_ADMIN_PASS) {
        alert("Incorrect Admin Password!");
        return;
    }
    renderAdvancedAdminModal();
};

async function renderAdvancedAdminModal() {
    let existing = document.getElementById('dlAdminReportsModal');
    if (existing) existing.remove();

    let modal = document.createElement('div');
    modal.id = 'dlAdminReportsModal';
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.65); z-index: 10000000; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    
    modal.innerHTML = `
        <div style="background: var(--dl-card-bg, #001a3a); color: var(--dl-text-color, #fff); width: 640px; max-height: 90vh; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--dl-border-color, #1e3a8a);">
            <div style="background: #000f24; color: white; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--dl-border-color, #1e3a8a);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <h3 style="margin: 0; font-size: 18px;">👑 Admin Dashboard & Team Monitoring</h3>
                    <button onclick="refreshAdminModalData()" id="adminRefreshBtn" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); padding: 5px 12px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer; transition: 0.2s;" title="Refresh Data">🔄 Refresh</button>
                </div>
                <button onclick="document.getElementById('dlAdminReportsModal').remove()" style="background: none; border: none; color: white; font-size: 22px; cursor: pointer; font-weight: bold;">&times;</button>
            </div>
            
            <div style="display: flex; background: #000f24; border-bottom: 1px solid var(--dl-border-color, #1e3a8a); padding: 12px 18px; gap: 10px;">
                <button onclick="switchAdminTab('online')" id="adminTabBtnOnline" style="flex: 1; background: #2563eb; color: white; border: none; padding: 10px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s;">🟢 Live Users</button>
                <button onclick="switchAdminTab('leaderboard')" id="adminTabBtnLeaderboard" style="flex: 1; background: var(--dl-sub-bg, #001a3a); color: var(--dl-text-main, #fff); border: 1px solid var(--dl-border-color, #1e3a8a); padding: 10px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s;">🏆 Team Calling</button>
                <button onclick="switchAdminTab('reports')" id="adminTabBtnReports" style="flex: 1; background: var(--dl-sub-bg, #001a3a); color: var(--dl-text-main, #fff); border: 1px solid var(--dl-border-color, #1e3a8a); padding: 10px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s;">📋 Shift Reports</button>
            </div>

            <div id="adminReportsModalBody" style="padding: 20px; overflow-y: auto; flex: 1; text-align: center; color: #94a3b8; background: var(--dl-sub-bg, #000f24);">
                Loading live team status and reports...
            </div>

            <div style="background: var(--dl-card-bg, #001a3a); padding: 14px 22px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--dl-border-color, #1e3a8a);">
                <button onclick="downloadAdminReportCSV()" style="background: #22c55e; color: white; border: none; padding: 10px 18px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(34,197,94,0.3);">📥 Export CSV Report</button>
                <button onclick="document.getElementById('dlAdminReportsModal').remove()" style="background: #475569; color: white; border: none; padding: 10px 20px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;">Close Panel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    await fetchAndRenderAdminData();
}

async function fetchAndRenderAdminData() {
    let bodyContainer = document.getElementById('adminReportsModalBody');
    if (bodyContainer) {
        bodyContainer.innerHTML = `<p style="color: #94a3b8; font-style: italic; padding: 30px;">Refreshing live team status and reports...</p>`;
    }

    try {
        let [sessionsRes, reportsRes] = await Promise.all([
            fetch(`${FIREBASE_DB_URL}sessions/${currentClient}.json`),
            fetch(`${FIREBASE_DB_URL}shift_reports/${currentClient}/${dispatcherNickname}.json`)
        ]);

        let sessionsData = await sessionsRes.json() || {};
        let reportsData = await reportsRes.json() || [];

        window.cachedAdminSessions = sessionsData;
        window.cachedAdminReports = Array.isArray(reportsData) ? reportsData : [];
        
        let activeTab = window.currentActiveAdminTab || 'online';
        renderAdminTabContent(activeTab);
    } catch (e) {
        console.error("Failed to load admin monitoring dashboard:", e);
        if (bodyContainer) bodyContainer.innerHTML = `<p style="color: #f87171;">Failed to load data from database.</p>`;
    }
}

window.refreshAdminModalData = async function() {
    let refBtn = document.getElementById('adminRefreshBtn');
    if (refBtn) {
        refBtn.innerText = "⏳ Updating...";
        refBtn.style.pointerEvents = "none";
    }
    
    await fetchAndRenderAdminData();
    showPremiumNotification("🔄 Admin dashboard refreshed successfully!", 2500);

    if (refBtn) {
        refBtn.innerText = "🔄 Refresh";
        refBtn.style.pointerEvents = "auto";
    }
};

window.switchAdminTab = function(tabName) {
    window.currentActiveAdminTab = tabName;
    let btnOnline = document.getElementById('adminTabBtnOnline');
    let btnLeaderboard = document.getElementById('adminTabBtnLeaderboard');
    let btnReports = document.getElementById('adminTabBtnReports');

    [btnOnline, btnLeaderboard, btnReports].forEach(b => {
        if (b) {
            b.style.background = "var(--dl-sub-bg, #001a3a)";
            b.style.color = "var(--dl-text-main, #fff)";
            b.style.border = "1px solid var(--dl-border-color, #1e3a8a)";
        }
    });

    let activeBtn = tabName === 'online' ? btnOnline : tabName === 'leaderboard' ? btnLeaderboard : btnReports;
    if (activeBtn) {
        activeBtn.style.background = "#2563eb";
        activeBtn.style.color = "white";
        activeBtn.style.border = "none";
    }

    renderAdminTabContent(tabName);
};

function renderAdminTabContent(tabName) {
    let bodyContainer = document.getElementById('adminReportsModalBody');
    if (!bodyContainer) return;

    let sessionsData = window.cachedAdminSessions || {};
    let reportsList = window.cachedAdminReports || [];
    let now = Date.now();

    if (tabName === 'online') {
        let activeUsersHtml = `<div style="display: flex; flex-direction: column; gap: 12px; text-align: left;">`;
        let activeCount = 0;

        Object.keys(sessionsData).forEach(key => {
            let s = sessionsData[key];
            if (s && s.nickname && s.timestamp) {
                let isOnline = (now - s.timestamp < 12000);
                if (isOnline) {
                    activeCount++;
                    let lastActiveTime = new Date(s.timestamp).toLocaleTimeString();
                    activeUsersHtml += `
                        <div style="background: var(--dl-card-bg, #001a3a); border: 1px solid var(--dl-border-color, #1e3a8a); border-left: 4px solid #22c55e; padding: 14px 18px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                            <div>
                                <div style="font-size: 15px; font-weight: bold; color: var(--dl-text-main, #ffffff); display: flex; align-items: center; gap: 8px;">
                                    🟢 <span>${s.nickname}</span> <span style="font-size: 10px; background: rgba(34,197,94,0.2); color: #4ade80; padding: 2px 8px; border-radius: 4px; border: 1px solid #22c55e;">Online</span>
                                </div>
                                <div style="color: #94a3b8; font-size: 11px; margin-top: 6px;">Login Time: <b>${s.loginTime || 'N/A'}</b></div>
                            </div>
                            <div style="color: #cbd5e1; font-size: 11px; background: var(--dl-sub-bg, #000f24); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--dl-border-color, #1e3a8a);">Last Heartbeat: <br><b>${lastActiveTime}</b></div>
                        </div>
                    `;
                }
            }
        });

        if (activeCount === 0) {
            activeUsersHtml += `<div style="text-align: center; color: #94a3b8; font-size: 13px; font-style: italic; padding: 30px;">No dispatchers currently online.</div>`;
        }
        activeUsersHtml += `</div>`;
        bodyContainer.innerHTML = activeUsersHtml;

    } else if (tabName === 'leaderboard') {
        let perfMap = {};
        reportsList.forEach(rep => {
            let name = rep.sender || "Unknown";
            if (!perfMap[name]) {
                perfMap[name] = { totalCalls: 0, shiftsCount: 0 };
            }
            perfMap[name].totalCalls += rep.totalCalls || 0;
            perfMap[name].shiftsCount += 1;
        });

        let sortedLeaderboard = Object.keys(perfMap).sort((a, b) => perfMap[b].totalCalls - perfMap[a].totalCalls);
        let leaderHtml = `<div style="display: flex; flex-direction: column; gap: 12px; text-align: left;">`;

        if (sortedLeaderboard.length === 0) {
            leaderHtml += `<div style="text-align: center; color: #94a3b8; font-size: 13px; font-style: italic; padding: 30px;">No team calling performance data available yet.</div>`;
        } else {
            sortedLeaderboard.forEach((name, idx) => {
                let stats = perfMap[name];
                let medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `<b>#${idx+1}</b>`;
                leaderHtml += `
                    <div style="background: var(--dl-card-bg, #001a3a); border: 1px solid var(--dl-border-color, #1e3a8a); border-left: 4px solid #eab308; padding: 14px 18px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <span style="font-size: 22px; width: 30px; text-align: center;">${medal}</span>
                            <div>
                                <b style="color: var(--dl-text-main, #ffffff); font-size: 16px;">${name}</b>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">Total Shifts Logged: ${stats.shiftsCount}</div>
                            </div>
                        </div>
                        <div style="background: #2563eb; color: white; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: bold; box-shadow: 0 2px 6px rgba(37,99,235,0.3);">
                            Total Calls: ${stats.totalCalls}
                        </div>
                    </div>
                `;
            });
        }
        leaderHtml += `</div>`;
        bodyContainer.innerHTML = leaderHtml;

    } else if (tabName === 'reports') {
        let reportsHtml = `<div style="display: flex; flex-direction: column; gap: 12px; text-align: left;">`;
        
        if (reportsList.length === 0) {
            reportsHtml += `<div style="text-align: center; color: #94a3b8; font-size: 13px; font-style: italic; padding: 30px;">No shift reports received yet.</div>`;
        } else {
            reportsList.slice().reverse().forEach(rep => {
                reportsHtml += `
                    <div style="background: var(--dl-card-bg, #001a3a); border: 1px solid var(--dl-border-color, #1e3a8a); border-left: 4px solid #0284c7; padding: 14px 18px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; color: var(--dl-text-main, #ffffff); margin-bottom: 6px;">
                            <span>👤 Agent: ${rep.sender}</span>
                            <span style="color: #94a3b8; font-weight: normal; font-size: 12px;">📅 Shift: ${rep.date}</span>
                        </div>
                        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 10px;">Submitted At: ${rep.timestamp}</div>
                        <div style="font-size: 12px; background: var(--dl-sub-bg, #000f24); padding: 10px 14px; border-radius: 6px; border: 1px solid var(--dl-border-color, #1e3a8a); display: flex; justify-content: space-between; align-items: center;">
                            <span>Total Calls Logged:</span>
                            <b style="color: #38bdf8; font-size: 15px;">${rep.totalCalls} Calls</b>
                        </div>
                    </div>
                `;
            });
        }
        reportsHtml += `</div>`;
        bodyContainer.innerHTML = reportsHtml;
    }
};

window.downloadAdminReportCSV = function() {
    let reports = window.cachedAdminReports || [];
    if (reports.length === 0) return alert("No reports available to export.");

    let csv = "Dispatcher Name,Shift Date,Submitted Timestamp,Total Calls\n";
    reports.forEach(r => {
        csv += `"${r.sender}","${r.date}","${r.timestamp}",${r.totalCalls}\n`;
    });

    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Team_Performance_Report_${getCurrentShiftDateKey()}.csv`;
    link.click();
};

window.openShiftShareModal = async function() {
    let modalBody = document.querySelector('#dlCallingDetailModal > div');
    if (!modalBody) return;

    modalBody.innerHTML = `
        <div style="background: #2563eb; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 16px;">📤 Share Shift Report</h3>
            <button onclick="document.getElementById('dlCallingDetailModal').remove()" style="background: none; border: none; color: white; font-size: 22px; cursor: pointer; font-weight: bold;">&times;</button>
        </div>
        <div style="padding: 24px;">
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">Select manager or team member to send shift report:</p>
            <div id="dlShiftMembersRadioList" style="max-height: 160px; overflow-y: auto; margin-bottom: 20px; border: 1px solid var(--dl-border-color, #1e3a8a); padding: 10px; border-radius: 6px; background: var(--dl-sub-bg, #000f24);">Loading active members...</div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="openCallingDetailModal()" style="background: #475569; color: white; border: none; padding: 8px 16px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;">Back</button>
                <button onclick="confirmSendShiftReport()" style="background: #22c55e; color: white; border: none; padding: 8px 16px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 12px rgba(34,197,94,0.3);">Send Report</button>
            </div>
        </div>
    `;

    try {
        let res = await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}.json`);
        let sessionsData = await res.json() || {};
        
        let activeMembers = [];
        let now = Date.now();

        Object.keys(sessionsData).forEach(key => {
            let s = sessionsData[key];
            if (s && s.nickname && s.timestamp && (now - s.timestamp < 12000)) {
                if (s.nickname !== dispatcherNickname && !activeMembers.includes(s.nickname)) {
                    activeMembers.push(s.nickname);
                }
            }
        });

        let radioListDiv = document.getElementById('dlShiftMembersRadioList');
        if (activeMembers.length === 0) {
            radioListDiv.innerHTML = `<div style="text-align: center; color: #f87171; font-size: 12px; padding: 15px; font-weight: bold;">No other online members/managers found.</div>`;
            return;
        }

        let html = "";
        activeMembers.forEach((name, idx) => {
            let checkedAttr = idx === 0 ? "checked" : "";
            html += `
                <label style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid var(--dl-border-color, #1e3a8a); cursor: pointer; font-size: 13px; color: var(--dl-text-color, #fff);">
                    <input type="radio" name="shiftTargetRadio" value="${name}" ${checkedAttr} style="cursor: pointer;">
                    <span>💻 <b>${name}</b> (Online)</span>
                </label>
            `;
        });
        radioListDiv.innerHTML = html;
    } catch (e) {
        console.error("Failed to load members for shift report:", e);
    }
};

window.confirmSendShiftReport = async function() {
    let selectedRadio = document.querySelector('input[name="shiftTargetRadio"]:checked');
    if (!selectedRadio) {
        return alert("Please select a recipient.");
    }

    let targetName = selectedRadio.value;
    let shiftDateStr = getCurrentShiftDateKey();
    let logs = JSON.parse(localStorage.getItem(`dl_call_logs_${currentClient}_${dispatcherNickname}`)) || [];
    let todayLogs = logs.filter(l => l.shiftDate === shiftDateStr);

    let reportData = {
        sender: dispatcherNickname,
        date: shiftDateStr,
        timestamp: new Date().toLocaleString(),
        totalCalls: todayLogs.length,
        logs: todayLogs
    };

    try {
        let reportUrl = `${FIREBASE_DB_URL}shift_reports/${currentClient}/${targetName}.json`;
        let res = await fetch(reportUrl);
        let reportsList = await res.json() || [];
        if (!Array.isArray(reportsList)) reportsList = [];

        reportsList = reportsList.filter(r => !(r.sender === dispatcherNickname && r.date === shiftDateStr));
        reportsList.push(reportData);

        await fetch(reportUrl, {
            method: 'PUT',
            body: JSON.stringify(reportsList)
        });

        showPremiumNotification(`✅ Shift report successfully sent to ${targetName}!`, 4000);
        document.getElementById('dlCallingDetailModal').remove();
    } catch (e) {
        console.error("Failed to send shift report:", e);
        alert("Failed to send report. Check internet connection.");
    }
};

window.copyPhoneToClipboardDirect = function(event, containerElement, phoneNum) {
    event.stopPropagation();
    if (!phoneNum || phoneNum === 'N/A') return;
    
    activeCallPhone = phoneNum;
    navigator.clipboard.writeText(phoneNum).then(() => {
        let badge = document.createElement('span');
        badge.className = 'phone-copy-badge';
        badge.innerText = "Copied!";
        containerElement.appendChild(badge);
        setTimeout(() => badge.remove(), 1200);

        let clickableCell = containerElement.closest('td').querySelector('.phone-clickable-cell');
        if (clickableCell) {
            logCallCount(phoneNum, clickableCell);
        }
    });
};

window.handlePhoneInteraction = function(cellElement, phoneNum) {
    if (!phoneNum || phoneNum === 'N/A') return;

    activeCallPhone = phoneNum;
    navigator.clipboard.writeText(phoneNum).then(() => {
        logCallCount(phoneNum, cellElement);
    });
};

function buildPhoneCellMarkup(phoneNum) {
    if (!phoneNum || phoneNum === 'N/A') return `<td style="color: #64748b; text-align: center;">N/A</td>`;
    return `
        <td class="phone-clickable-container">
            <a href="tel:${phoneNum}" onclick="handlePhoneInteraction(this, '${phoneNum}'); return true;" class="phone-clickable-cell" title="Click to Call & Log Count">
                <div class="phone-cell-content">
                    <span class="phone-icon-span">📞</span>
                    <span class="clickable-phone-text">${phoneNum}</span>
                </div>
            </a>
            <span class="phone-hover-copy-icon" onclick="copyPhoneToClipboardDirect(event, this, '${phoneNum}')" title="Copy Number">📋</span>
        </td>
    `;
}

let currentFollowUpFilterMode = 'today';
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

    let todayDateStr = new Date().toISOString().split('T')[0];
    let nowTimeStr = new Date().toTimeString().substring(0, 5);

    let dateInput = document.getElementById('dlModalDateInput');
    let timeInput = document.getElementById('dlModalTimeInput');
    if (dateInput) dateInput.value = todayDateStr;
    if (timeInput) timeInput.value = nowTimeStr;

    let modal = document.getElementById('dlDatePickerModal');
    if (modal) modal.style.display = 'flex';
};

window.closeFollowUpModal = function() {
    let modal = document.getElementById('dlDatePickerModal');
    if (modal) modal.style.display = 'none';
    pendingFollowUpIndex = null;
    pendingFollowUpRowBtn = null;
};

window.confirmFollowUpSchedule = function() {
    if (pendingFollowUpIndex === null) return;
    let record = scrapedData[pendingFollowUpIndex];
    if (!record) return;

    let selectedDate = document.getElementById('dlModalDateInput').value;
    let selectedTime = document.getElementById('dlModalTimeInput').value;

    if (!selectedDate) {
        alert("Please select a valid date.");
        return;
    }

    record.addedAt = new Date().toLocaleString();
    record.followUpDate = selectedDate;
    record.followUpTime = selectedTime ? formatTime12Hour(selectedTime) : "N/A";
    record.sharedBy = dispatcherNickname;

    let followUpStore = JSON.parse(localStorage.getItem(`dl_followups_${currentClient}`)) || [];
    followUpStore.push(record);
    localStorage.setItem(`dl_followups_${currentClient}`, JSON.stringify(followUpStore));
    
    showPremiumNotification(`⭐ Added MC ${record.mc} for Follow-Up on ${record.followUpDate}`, 3500);
    
    if (pendingFollowUpRowBtn) {
        let row = pendingFollowUpRowBtn.closest('tr');
        if (row) row.style.background = "rgba(34,197,94,0.15)";
    }

    closeFollowUpModal();
    if (document.getElementById('dlFollowUpDrawer').style.right === "0px") renderFollowUpItems();
};

function formatTime12Hour(time24) {
    let parts = time24.split(':');
    let hours = parseInt(parts[0]);
    let minutes = parts[1];
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
}

window.toggleFollowUpDrawer = function() {
    let drawer = document.getElementById('dlFollowUpDrawer');
    let historyDrawer = document.getElementById('dlHistoryDrawer');
    if (!drawer) return;
    
    if(historyDrawer) historyDrawer.style.right = "-420px"; 
    
    if (drawer.style.right === "0px") {
        drawer.style.right = "-420px";
    } else {
        drawer.style.right = "0px";
        let searchInput = document.getElementById('followUpSearchInput');
        if(searchInput) searchInput.value = ""; 
        currentFollowUpFilterMode = 'today';
        updateFollowUpFilterButtonsUI();
        renderFollowUpItems(); 
    }
};

window.filterFollowUpsByDate = function(mode) {
    currentFollowUpFilterMode = mode;
    updateFollowUpFilterButtonsUI();
    renderFollowUpItems();
};

function updateFollowUpFilterButtonsUI() {
    let btnToday = document.getElementById('fubtnToday');
    let btnAll = document.getElementById('fubtnAll');
    if (!btnToday || !btnAll) return;

    if (currentFollowUpFilterMode === 'today') {
        btnToday.style.background = "#0284c7";
        btnToday.style.color = "white";
        btnToday.style.border = "none";
        btnAll.style.background = "var(--dl-sub-bg, #001a3a)";
        btnAll.style.color = "var(--dl-text-main, #fff)";
        btnAll.style.border = "1px solid var(--dl-border-color, #1e3a8a)";
    } else {
        btnAll.style.background = "#0284c7";
        btnAll.style.color = "white";
        btnAll.style.border = "none";
        btnToday.style.background = "var(--dl-sub-bg, #001a3a)";
        btnToday.style.color = "var(--dl-text-main, #fff)";
        btnToday.style.border = "1px solid var(--dl-border-color, #1e3a8a)";
    }
}

window.clearFollowUpFilters = function() {
    let searchInput = document.getElementById('followUpSearchInput');
    if(searchInput) searchInput.value = "";
    currentFollowUpFilterMode = 'all';
    updateFollowUpFilterButtonsUI();
    renderFollowUpItems();
};

window.deleteFollowUpItem = function(mcNumber) {
    if (confirm("Remove carrier from Follow-Ups?")) {
        let followUpStore = JSON.parse(localStorage.getItem(`dl_followups_${currentClient}`)) || [];
        followUpStore = followUpStore.filter(r => r.mc !== mcNumber);
        localStorage.setItem(`dl_followups_${currentClient}`, JSON.stringify(followUpStore));
        renderFollowUpItems();
        
        let tableRows = document.querySelectorAll('#resultsTable tr');
        tableRows.forEach(row => {
            let cellMc = parseInt(row.cells[0]?.textContent);
            if (cellMc === mcNumber) row.style.background = "";
        });
    }
};

window.downloadFollowUpsCSV = function() {
    let followUpStore = JSON.parse(localStorage.getItem(`dl_followups_${currentClient}`)) || [];
    if (followUpStore.length === 0) return alert("The follow-up list is currently empty.");
    triggerCSVDownload(followUpStore, `DispatchLink_FollowUps_${dispatcherNickname}.csv`);
};

let pendingShareRecords = [];

window.openTeamShareModal = async function(recordsToShare) {
    if (!recordsToShare || recordsToShare.length === 0) return;
    pendingShareRecords = recordsToShare;

    let radioListDiv = document.getElementById('dlTeamMembersRadioList');
    if (!radioListDiv) return;
    radioListDiv.innerHTML = `<div style="text-align: center; color: #94a3b8; font-size: 12px; padding: 15px;">Loading active online laptops...</div>`;

    let tModal = document.getElementById('dlTeamSelectModal');
    if (tModal) tModal.style.display = 'flex';

    try {
        let res = await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}.json`);
        let sessionsData = await res.json() || {};
        
        let activeMembers = [];
        let now = Date.now();

        Object.keys(sessionsData).forEach(key => {
            let s = sessionsData[key];
            if (s && s.nickname && s.timestamp && (now - s.timestamp < 12000)) {
                if (s.nickname !== dispatcherNickname && !activeMembers.includes(s.nickname)) {
                    activeMembers.push(s.nickname);
                }
            }
        });

        if (activeMembers.length === 0) {
            radioListDiv.innerHTML = `<div style="text-align: center; color: #f87171; font-size: 12px; padding: 15px; font-weight: bold;">No other active team members online right now.</div>`;
            return;
        }

        let html = "";
        activeMembers.forEach((name, idx) => {
            let checkedAttr = idx === 0 ? "checked" : "";
            html += `
                <label style="display: flex; align-items: center; gap: 8px; padding: 8px; border-bottom: 1px solid var(--dl-border-color, #1e3a8a); cursor: pointer; font-size: 13px; color: var(--dl-text-color, #fff);">
                    <input type="radio" name="teamMemberRadio" value="${name}" ${checkedAttr} style="cursor: pointer;">
                    <span>💻 <b>${name}</b> (Online)</span>
                </label>
            `;
        });
        radioListDiv.innerHTML = html;
    } catch (e) {
        console.error("Failed to fetch active sessions:", e);
        radioListDiv.innerHTML = `<div style="text-align: center; color: #f87171; font-size: 12px; padding: 15px;">Error loading active laptops.</div>`;
    }
};

window.closeTeamSelectModal = function() {
    let tModal = document.getElementById('dlTeamSelectModal');
    if (tModal) tModal.style.display = 'none';
    pendingShareRecords = [];
};

window.confirmTeamShareAction = async function() {
    let selectedRadio = document.querySelector('input[name="teamMemberRadio"]:checked');
    if (!selectedRadio) {
        return alert("Please select a team member from the list.");
    }

    let targetName = selectedRadio.value;
    pendingShareRecords.forEach(r => r.sharedBy = dispatcherNickname);

    try {
        let shareUrl = `${FIREBASE_DB_URL}shared_leads/${currentClient}/${targetName}.json`;
        let res = await fetch(shareUrl);
        let existingList = await res.json() || [];
        if (!Array.isArray(existingList)) existingList = [];

        let addedCount = 0;
        pendingShareRecords.forEach(rec => {
            if (!existingList.some(r => r.mc === rec.mc)) {
                existingList.push(rec);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            await fetch(shareUrl, {
                method: 'PUT',
                body: JSON.stringify(existingList)
            });
            showPremiumNotification(`✅ Successfully shared ${addedCount} lead(s) with ${targetName}!`, 4000);
            
            document.querySelectorAll('.followup-select-checkbox:checked').forEach(cb => cb.checked = false);
        } else {
            alert(`Selected lead(s) are already present in ${targetName}'s shared inbox.`);
        }
        closeTeamSelectModal();
    } catch (e) {
        console.error("Team share action failed:", e);
        alert("Failed to share leads with team member. Check connection.");
    }
};

window.shareSingleFollowUpToTeam = function(record) {
    openTeamShareModal([record]);
};

window.shareSelectedFollowUpsToTeam = function() {
    let selectedCheckboxes = document.querySelectorAll('.followup-select-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        return alert("Please select at least one follow-up record to share with your team.");
    }

    let followUpStore = JSON.parse(localStorage.getItem(`dl_followups_${currentClient}`)) || [];
    let selectedMCs = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
    let selectedRecords = followUpStore.filter(r => selectedMCs.includes(r.mc));

    openTeamShareModal(selectedRecords);
};

async function pollIncomingSharedLeads() {
    if (!currentClient || !dispatcherNickname) return;
    try {
        let inboxUrl = `${FIREBASE_DB_URL}shared_leads/${currentClient}/${dispatcherNickname}.json`;
        let res = await fetch(inboxUrl);
        let sharedLeads = await res.json() || [];
        if (!Array.isArray(sharedLeads) || sharedLeads.length === 0) return;

        let localFollowUps = JSON.parse(localStorage.getItem(`dl_followups_${currentClient}`)) || [];
        let newLeadsAdded = false;

        sharedLeads.forEach(lead => {
            if (!localFollowUps.some(r => r.mc === lead.mc)) {
                localFollowUps.push(lead);
                newLeadsAdded = true;
            }
        });

        if (newLeadsAdded) {
            localStorage.setItem(`dl_followups_${currentClient}`, JSON.stringify(localFollowUps));
            showPremiumNotification(`📥 You received new shared follow-up leads from your team!`, 5000);
            if (document.getElementById('dlFollowUpDrawer') && document.getElementById('dlFollowUpDrawer').style.right === "0px") {
                renderFollowUpItems();
            }
            await fetch(inboxUrl, { method: 'DELETE' });
        }
    } catch (e) {
        console.error("Polling shared leads failed:", e);
    }
}

setInterval(pollIncomingSharedLeads, 10000);

function renderFollowUpItems() {
    const listContainer = document.getElementById('drawerFollowUpList');
    if (!listContainer) return;

    let data = JSON.parse(localStorage.getItem(`dl_followups_${currentClient}`)) || [];
    data = data.reverse(); 

    let filterQuery = (document.getElementById('followUpSearchInput')?.value || "").toLowerCase().trim();
    let todayDateStr = new Date().toISOString().split('T')[0];

    if (data.length === 0) {
        listContainer.innerHTML = `<p style="color: #94a3b8; font-size: 13px; font-style: italic; text-align: center; margin-top: 30px;">No follow-up leads saved yet.</p>`;
        return;
    }

    let itemsHTML = "";
    let matchCount = 0;

    data.forEach(item => {
        let fuDate = item.followUpDate || "N/A";
        let fuTime = item.followUpTime || "N/A";

        if (currentFollowUpFilterMode === 'today' && fuDate !== todayDateStr) {
            return;
        }

        let mcString = (item.mc || "").toString().toLowerCase();
        let nameString = (item.name || "").toLowerCase();
        let phoneString = (item.phone || "").toLowerCase();

        if (filterQuery !== "") {
            let textMatches = mcString.includes(filterQuery) || nameString.includes(filterQuery) || phoneString.includes(filterQuery);
            if (!textMatches) return;
        }

        matchCount++;
        let senderTag = item.sharedBy ? `<span style="background: #22c55e; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">👤 Sent by: ${item.sharedBy}</span>` : "";

        itemsHTML += `
            <div style="background: var(--dl-sub-bg, #000f24); border: 1px solid var(--dl-border-color, #1e3a8a); border-left: 4px solid #0284c7; padding: 14px; margin-bottom: 10px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); font-family:sans-serif;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8; font-weight: bold; margin-bottom: 6px;">
                    <span>Saved: ${item.addedAt}</span>
                    <span style="background: rgba(37,99,235,0.2); color: #38bdf8; padding: 2px 8px; border-radius: 4px; border: 1px solid #2563eb;">📅 ${fuDate} @ ${fuTime}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="font-size: 14px; font-weight: bold; color: var(--dl-text-main, #ffffff);">${item.name}</div>
                    ${senderTag}
                </div>
                <div style="font-size: 12px; color:var(--dl-text-color, #cbd5e1);"><b>MC:</b> ${item.mc} | <b>Phone:</b> ${item.phone || 'N/A'}</div>
                <div style="font-size: 12px; color:var(--dl-text-color, #cbd5e1); margin-top:3px;"><b>Email:</b> ${item.email || 'N/A'}</div>
                <div style="font-size: 12px; color: #cbd5e1; background: var(--dl-card-bg, #001a3a); padding: 8px; margin-top: 8px; border-radius: 4px; border: 1px solid var(--dl-border-color, #1e3a8a); font-style:italic;">
                    <b>Remarks:</b> ${item.remarks || 'No remarks added'}
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 10px;">
                    <button onclick="triggerOneClickEmailPitch('${item.email}', '${item.name.replace(/'/g, "\\'")}')" style="background: #0284c7; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">📤 Send</button>
                    <button onclick="deleteFollowUpItem(${item.mc})" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;">🗑️ Drop</button>
                </div>
            </div>
        `;
    });

    if (matchCount === 0) {
        listContainer.innerHTML = `<p style="color: #94a3b8; font-size: 13px; font-style: italic; text-align: center; margin-top: 30px;">No matching follow-up records found for ${currentFollowUpFilterMode === 'today' ? "Today" : "this filter"}.</p>`;
    } else {
        listContainer.innerHTML = itemsHTML;
    }

    if (!document.getElementById('dlBulkFollowUpActionBar')) {
        let actionBar = document.createElement('div');
        actionBar.id = 'dlBulkFollowUpActionBar';
        actionBar.style.cssText = "display: flex; gap: 8px; margin-bottom: 12px; align-items: center; background: var(--dl-sub-bg, #000f24); padding: 8px 12px; border: 1px solid var(--dl-border-color, #1e3a8a); border-radius: 6px; font-size: 11px;";
        actionBar.innerHTML = `
            <label style="cursor: pointer; font-weight: bold; color: var(--dl-text-main, #ffffff); display: flex; align-items: center; gap: 6px;">
                <input type="checkbox" id="selectAllFollowUpsCheckbox" onclick="toggleSelectAllFollowUps(this)"> Select All
            </label>
            <button onclick="shareSelectedFollowUpsToTeam()" style="background: #2563eb; color: white; border: none; padding: 6px 12px; font-weight: bold; border-radius: 4px; cursor: pointer; flex: 1; box-shadow: 0 2px 6px rgba(37,99,235,0.3);" title="Share Selected with Team">👥 Share Selected</button>
        `;
        listContainer.parentNode.insertBefore(actionBar, listContainer);
    }

    let itemDivs = listContainer.querySelectorAll('div[style*="border-left"]');
    itemDivs.forEach((div, idx) => {
        if (!div.querySelector('.followup-select-checkbox')) {
            let record = data[idx];
            if (!record) return;

            let topHeader = div.querySelector('div');
            if (topHeader) {
                let checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'followup-select-checkbox';
                checkbox.value = record.mc;
                checkbox.style.cssText = "margin-right: 8px; cursor: pointer;";
                topHeader.insertBefore(checkbox, topHeader.firstChild);
            }

            let btnContainer = div.querySelector('div[style*="justify-content: flex-end"]');
            if (btnContainer && !btnContainer.querySelector('.single-team-share-btn')) {
                let teamBtn = document.createElement('button');
                teamBtn.className = 'single-team-share-btn';
                teamBtn.innerHTML = "👥 Share";
                teamBtn.style.cssText = "background: #2563eb; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;";
                teamBtn.onclick = () => shareSingleFollowUpToTeam(record);
                btnContainer.insertBefore(teamBtn, btnContainer.firstChild);
            }
        }
    });
}

window.toggleSelectAllFollowUps = function(masterCheckbox) {
    let checkboxes = document.querySelectorAll('.followup-select-checkbox');
    checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
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
        if (scrapedData[index]) {
            scrapedData[index].remarks = "";
            updateRealTimeHistory(scrapedData, false);
        }
    }
};

window.syncRemarksData = function(index, textarea) {
    if (scrapedData[index]) {
        scrapedData[index].remarks = textarea.value;
        updateRealTimeHistory(scrapedData, false);
    }
};

function generateCSVString(recordsData) {
    let csv = "MC Number,USDOT Number,Company Name,Entity Type,Operating Status,Phone,Address,Email,Power Units,Vehicle Type,Follow-Up Date,Follow-Up Time,Shared By,Remarks\n";
    recordsData.forEach(r => {
        let safeRemarks = r.remarks || "";
        csv += `${r.mc},${r.usdot},"${r.name}","${r.entityType}","${r.status}","${r.phone}","${r.address}","${r.email}","${r.powerUnits}","${r.vehicleType || 'N/A'}","${r.followUpDate || 'N/A'}","${r.followUpTime || 'N/A'}","${r.sharedBy || dispatcherNickname}","${safeRemarks.replace(/"/g, '""')}"\n`;
    });
    return csv;
}

window.toggleHistoryDrawer = function() {
    let drawer = document.getElementById('dlHistoryDrawer');
    let followUpDrawer = document.getElementById('dlFollowUpDrawer');
    if (!drawer) return;
    
    if(followUpDrawer) followUpDrawer.style.right = "-420px"; 
    
    if (drawer.style.right === "0px") {
        drawer.style.right = "-420px";
    } else {
        drawer.style.right = "0px";
        renderHistoryItems();
    }
};

function renderHistoryItems() {
    if (!db) return;
    const listContainer = document.getElementById('drawerHistoryList');
    if (!listContainer) return;

    const tx = db.transaction("history", "readonly");
    const store = tx.objectStore("history");
    const getAll = store.getAll();

    getAll.onsuccess = function() {
        let data = getAll.result || [];
        if (data.length === 0) {
            data = JSON.parse(localStorage.getItem(`dl_history_backup_${currentClient}`)) || [];
        }
        data = data.reverse();

        if (data.length === 0) {
            listContainer.innerHTML = `<p style="color: #94a3b8; font-size: 13px; font-style: italic; text-align: center; margin-top: 30px;">No history records found yet.</p>`;
            return;
        }

        let itemsHTML = "";
        data.forEach(item => {
            let displayStatus = item.status === "Interrupted (Auto-Saved)"
                ? `<span style="color: #f87171; font-weight:bold;">⚠️ ${item.status}</span>`
                : `<span style="color: #4ade80; font-weight:bold;">✅ ${item.status}</span>`;

            let recordsCount = item.records ? item.records.length : (item.totalRecords || 0);

            let resumeBtnStyle = recordsCount === 0 
                ? "background: #334155; color: #64748b; border: none; padding: 6px 12px; border-radius: 4px; cursor: not-allowed; font-size: 12px; font-weight: bold;" 
                : "background: #d97706; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;";
            
            let csvBtnStyle = recordsCount === 0 
                ? "background: #334155; color: #64748b; border: none; padding: 6px 12px; border-radius: 4px; cursor: not-allowed; font-size: 12px; font-weight: bold;" 
                : "background: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;";

            let resumeActionAttr = recordsCount === 0 ? "" : `onclick="resumeHistorySheet(${item.id})"`;
            let csvActionAttr = recordsCount === 0 ? "" : `onclick="downloadHistoryCSV(${item.id})"`;

            itemsHTML += `
                <div style="background: var(--dl-sub-bg, #000f24); border: 1px solid var(--dl-border-color, #1e3a8a); border-left: 4px solid #2563eb; padding: 14px; margin-bottom: 12px; border-radius: 8px; font-family: sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    <div style="font-size: 11px; color: #94a3b8; font-weight: bold;">${item.date}</div>
                    <div style="font-size: 14px; font-weight: bold; color: var(--dl-text-main, #ffffff); margin: 6px 0;">Range: ${item.range}</div>
                    <div style="font-size: 12px; margin-bottom: 10px;">Status: ${displayStatus}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; border-top: 1px solid var(--dl-border-color, #1e3a8a); padding-top: 10px;">
                        <span style="background: rgba(37,99,235,0.2); color: #38bdf8; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 11px; border: 1px solid #2563eb;">${recordsCount} Active</span>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <button ${resumeActionAttr} style="${resumeBtnStyle}">Resume</button>
                            <button onclick="loadHistorySheetToTable(${item.id})" style="background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Open</button>
                            <button ${csvActionAttr} style="${csvBtnStyle}">CSV</button>
                            <button onclick="deleteHistoryItem(${item.id})" style="background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;" title="Delete">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
        listContainer.innerHTML = itemsHTML;
    };
}

window.loadHistorySheetToTable = async function(id) {
    const tx = db.transaction("history", "readonly");
    const req = tx.objectStore("history").get(id);

    req.onsuccess = async function() {
        let item = req.result;
        if (!item) {
            let lsBackup = JSON.parse(localStorage.getItem(`dl_history_backup_${currentClient}`)) || [];
            item = lsBackup.find(r => r.id === id);
        }
        if (!item || !item.records) return;
        
        scrapedData = item.records; 
        currentHistoryId = item.id;

        if (item.range) {
            let parts = item.range.split('-');
            if (parts.length === 2) {
                let startInput = document.getElementById('startMc');
                let endInput = document.getElementById('endMc');
                if (startInput) startInput.value = parts[0].trim();
                if (endInput) endInput.value = parts[1].trim();
            }
        }

        const tableBody = document.getElementById('resultsTable');
        tableBody.innerHTML = '';
        
        let followUpStore = JSON.parse(localStorage.getItem(`dl_followups_${currentClient}`)) || [];

        for (let index = 0; index < scrapedData.length; index++) {
            let record = scrapedData[index];
            let emailCellHTML = buildEmailCellMarkup(record.email, record.name);
            let phoneCellHTML = buildPhoneCellMarkup(record.phone);
            
            let isAlreadyFollowed = followUpStore.some(r => r.mc === record.mc);
            let rowStyleHTML = isAlreadyFollowed ? `style="background: rgba(34,197,94,0.15);"` : '';
            let activeRemarksValue = record.remarks || "";

            tableBody.innerHTML += `<tr ${rowStyleHTML}>
                <td><b>${record.mc}</b></td>
                <td>${record.usdot}</td>
                <td>${record.name}</td>
                <td>${record.entityType}</td>
                <td><span class="badge badge-active">${record.status}</span></td>
                ${phoneCellHTML}
                <td>${record.address}</td> 
                ${emailCellHTML}
                <td>${record.powerUnits}</td>
                <td style="white-space: nowrap !important;"><b>${record.vehicleType || 'N/A'}</b></td>
                <td class="remarks-cell-container">
                    <textarea class="remarks-input-field" placeholder="Click to add remarks..." onfocus="remarksFocus(${index}, this)" onblur="remarksBlur(${index}, this)" oninput="syncRemarksData(${index}, this)">${activeRemarksValue}</textarea>
                </td>
                <td><button onclick="addLeadToFollowUpList(${index}, this)" class="premium-followup-btn">⭐ Follow</button></td>
            </tr>`;
        }
        populateStateDropdown();
        populateVehicleTypeCheckboxes();
        toggleHistoryDrawer(); 
    };
};

window.resumeHistorySheet = async function(id) {
    const tx = db.transaction("history", "readonly");
    const req = tx.objectStore("history").get(id);

    req.onsuccess = async function() {
        let item = req.result;
        if (!item) {
            let lsBackup = JSON.parse(localStorage.getItem(`dl_history_backup_${currentClient}`)) || [];
            item = lsBackup.find(r => r.id === id);
        }
        if (!item || !item.range) return;

        let parts = item.range.split('-');
        let startRange = parseInt(parts[0].trim());
        let endRange = parseInt(parts[1].trim());

        let startInput = document.getElementById('startMc');
        let endInput = document.getElementById('endMc');
        if (startInput) startInput.value = startRange;
        if (endInput) endInput.value = endRange;

        scrapedData = item.records || [];
        currentHistoryId = item.id;
        window.activeScrapeRange = item.range;

        const tableBody = document.getElementById('resultsTable');
        tableBody.innerHTML = '';
        
        let followUpStore = JSON.parse(localStorage.getItem(`dl_followups_${currentClient}`)) || [];
        for (let index = 0; index < scrapedData.length; index++) {
            let record = scrapedData[index];
            let emailCellHTML = buildEmailCellMarkup(record.email, record.name);
            let phoneCellHTML = buildPhoneCellMarkup(record.phone);
            let isAlreadyFollowed = followUpStore.some(r => r.mc === record.mc);
            let rowStyleHTML = isAlreadyFollowed ? `style="background: rgba(34,197,94,0.15);"` : '';
            let activeRemarksValue = record.remarks || "";

            tableBody.innerHTML += `<tr ${rowStyleHTML}>
                <td><b>${record.mc}</b></td>
                <td>${record.usdot}</td>
                <td>${record.name}</td>
                <td>${record.entityType}</td>
                <td><span class="badge badge-active">${record.status}</span></td>
                ${phoneCellHTML}
                <td>${record.address}</td> 
                ${emailCellHTML}
                <td>${record.powerUnits}</td>
                <td style="white-space: nowrap !important;"><b>${record.vehicleType || 'N/A'}</b></td>
                <td class="remarks-cell-container">
                    <textarea class="remarks-input-field" placeholder="Click to add remarks..." onfocus="remarksFocus(${index}, this)" onblur="remarksBlur(${index}, this)" oninput="syncRemarksData(${index}, this)">${activeRemarksValue}</textarea>
                </td>
                <td><button onclick="addLeadToFollowUpList(${index}, this)" class="premium-followup-btn">⭐ Follow</button></td>
            </tr>`;
        }
        populateStateDropdown();
        populateVehicleTypeCheckboxes();
        toggleHistoryDrawer();
        
        let nextStartMc = startRange;
        if (scrapedData.length > 0) {
            let maxScannedMc = Math.max(...scrapedData.map(r => parseInt(r.mc)));
            if (!isNaN(maxScannedMc) && maxScannedMc >= startRange) {
                nextStartMc = maxScannedMc + 1;
            }
        }
        
        startScraping(nextStartMc, endRange);
    };
};

window.downloadHistoryCSV = function(id) {
    const tx = db.transaction("history", "readonly");
    const store = tx.objectStore("history");
    const req = store.get(id);
    req.onsuccess = function() {
        let item = req.result;
        if (!item) {
            let lsBackup = JSON.parse(localStorage.getItem(`dl_history_backup_${currentClient}`)) || [];
            item = lsBackup.find(r => r.id === id);
        }
        let recordsList = item && item.records ? item.records : [];
        if (recordsList.length > 0) {
            triggerCSVDownload(recordsList, `History_MC_${item.range.replace(/\s+/g, '_')}.csv`);
        }
    };
};

window.deleteHistoryItem = function(id) {
    if (confirm("Delete this sheet from history?")) {
        const tx = db.transaction("history", "readwrite");
        const store = tx.objectStore("history");
        store.delete(id);
        tx.oncomplete = function() {
            let lsBackup = JSON.parse(localStorage.getItem(`dl_history_backup_${currentClient}`)) || [];
            lsBackup = lsBackup.filter(r => r.id !== id);
            localStorage.setItem(`dl_history_backup_${currentClient}`, JSON.stringify(lsBackup));
            renderHistoryItems();
        };
    }
};

function triggerCSVDownload(recordsData, filename) {
    const csv = generateCSVString(recordsData);
    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

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
            
            tx.oncomplete = function() {
                let lsBackup = JSON.parse(localStorage.getItem(`dl_history_backup_${currentClient}`)) || [];
                let index = lsBackup.findIndex(r => r.id === currentHistoryId);
                if (index !== -1) {
                    lsBackup[index] = data;
                } else {
                    lsBackup.push(data);
                }
                localStorage.setItem(`dl_history_backup_${currentClient}`, JSON.stringify(lsBackup));
                
                if (document.getElementById('dlHistoryDrawer') && document.getElementById('dlHistoryDrawer').style.right === "0px") {
                    renderHistoryItems();
                }
            };
        }
    };
}

let scraping = false; 
let scrapedData = [];

window.stopScraping = function() {
    scraping = false;
    let statusBox = document.getElementById('status');
    if (statusBox) {
        statusBox.style.background = "rgba(234,179,8,0.15)";
        statusBox.style.color = "#facc15";
        statusBox.style.border = "1px solid #eab308";
        statusBox.style.padding = "12px 18px";
        statusBox.innerHTML = "<strong>⏸️ Processing Paused Safely. Click Start to resume/run again.</strong>";
    }
    if (currentHistoryId) {
        updateRealTimeHistory(scrapedData, false);
    }
}

async function processSingleMCWithDetailedError(mc, statusBox) {
    let maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const sessionUrl = `${FIREBASE_DB_URL}sessions/${currentClient}.json`;
            const sRes = await fetch(sessionUrl);
            const sData = await sRes.json() || {};
            let now = Date.now();
            
            let activeCount = 0;
            Object.keys(sData).forEach(k => {
                let session = sData[k];
                if (session && session.timestamp && (now - session.timestamp < 12000)) {
                    activeCount++;
                }
            });

            if (userLimit > 0 && activeCount > userLimit) {
                if (statusBox) {
                    statusBox.innerHTML = `<strong>⚠️ Global License Limit Exceeded (${activeCount}/${userLimit}). Pausing scraping...</strong>`;
                }
                return { status: "limit_exceeded" };
            }

            const snapshotUrl = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mc}`;
            const response = await fetch(snapshotUrl);
            
            if (!response.ok) {
                attempt++;
                if (statusBox) {
                    statusBox.innerHTML = `<strong>⚠️ Safer Server Issue (Attempt ${attempt}/${maxRetries}). Retrying...</strong>`;
                }
                await new Promise(r => setTimeout(r, 2000 * attempt));
                continue;
            }

            const htmlText = await response.text();

            if (htmlText.includes("Record not found") || htmlText.includes("No records found") || !htmlText.includes("USDOT Number:")) {
                return { status: "not_found" };
            }

            let record = { mc: mc, usdot: 'N/A', name: 'N/A', entityType: 'N/A', status: 'N/A', phone: 'N/A', address: 'N/A', email: 'N/A', powerUnits: 'N/A', vehicleType: 'N/A', remarks: '', followUpDate: '', followUpTime: '', sharedBy: dispatcherNickname };
            let el = document.createElement('html');
            el.innerHTML = htmlText;
            let cells = el.querySelectorAll('td, th');

            for (let i = 0; i < cells.length; i++) {
                let text = cells[i].textContent.trim();
                if (text.startsWith("Legal Name:") || text.startsWith("Entity Name:")) {
                    if(cells[i+1]) record.name = cells[i+1].textContent.trim().replace(/\s+/g, ' ');
                }
                if (text.startsWith("USDOT Number:")) {
                    if(cells[i+1]) record.usdot = cells[i+1].textContent.trim().split(/\s+/)[0];
                }
                if (text.startsWith("Entity Type:")) {
                    if(cells[i+1]) record.entityType = cells[i+1].textContent.trim().replace(/\s+/g, ' ');
                }
                if (text.startsWith("Operating Authority Status:")) {
                    if (cells[i+1]) {
                        let rawStatus = cells[i+1].textContent.toUpperCase();
                        if (rawStatus.includes("NOT AUTHORIZED")) {
                            record.status = "NOT AUTHORIZED";
                        } else if (rawStatus.includes("AUTHORIZED") || rawStatus.includes("ACTIVE")) {
                            record.status = "AUTHORIZED";
                        } else {
                            record.status = cells[i+1].textContent.replace(/\s+/g, ' ').trim();
                        }
                    }
                }
                if (text.startsWith("Power Units:")) { if(cells[i+1]) record.powerUnits = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
                if (text.startsWith("Phone:")) { if(cells[i+1]) record.phone = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
                if (text.startsWith("Physical Address:") || (text.startsWith("Address:") && !text.includes("Mailing"))) {
                    if(cells[i+1]) record.address = cells[i+1].textContent.trim().replace(/\s+/g, ' ');
                }
            }

            if (record.status !== "AUTHORIZED") { 
                return { status: "filtered_out" }; 
            }

            if (record.usdot !== 'N/A') {
                try {
                    const brokerSnapshotUrl = `https://brokersnapshot.com/Company?dot=${record.usdot}&prefix=MC&docket=${record.mc}`;
                    const brokerRes = await fetch(brokerSnapshotUrl);
                    
                    if (brokerRes.ok) {
                        const brokerHtml = await brokerRes.text();
                        let brokerEl = document.createElement('html');
                        brokerEl.innerHTML = brokerHtml;
                        
                        let vehicleList = [];
                        let textNodes = brokerEl.querySelectorAll('div, span, a, td, th, p');
                        
                        textNodes.forEach(node => {
                            let cleanText = node.textContent.replace(/\s+/g, ' ').trim();
                            
                            if (/^Tractors\s+\d+$/i.test(cleanText)) {
                                let num = cleanText.match(/\d+/)[0];
                                let formatted = `Power Only ${num}`;
                                if (!vehicleList.includes(formatted)) vehicleList.push(formatted);
                            } else if (/^Trucks\s+\d+$/i.test(cleanText)) {
                                let num = cleanText.match(/\d+/)[0];
                                let formatted = `Box Truck ${num}`;
                                if (!vehicleList.includes(formatted)) vehicleList.push(formatted);
                            } else if (/^Trailers\s+\d+$/i.test(cleanText)) {
                                let num = cleanText.match(/\d+/)[0];
                                let formatted = `Trailers ${num}`;
                                if (!vehicleList.includes(formatted)) vehicleList.push(formatted);
                            }
                        });

                        if (vehicleList.length > 0) {
                            record.vehicleType = vehicleList.join(" | ");
                        }
                    }
                } catch (bErr) {
                    console.warn(`BrokerSnapshot warning for MC ${mc}:`, bErr.message);
                }

                try {
                    const smsUrl = `https://ai.fmcsa.dot.gov/SMS/Carrier/${record.usdot}/CarrierRegistration.aspx`;
                    const smsResponse = await fetch(smsUrl);
                    if (smsResponse.ok) {
                        const smsHtml = await smsResponse.text();
                        let smsEl = document.createElement('html');
                        smsEl.innerHTML = smsHtml;
                        let smsCells = smsEl.querySelectorAll('td, th, span, label, a');
                        for (let j = 0; j < smsCells.length; j++) {
                            let smsText = smsCells[j].textContent.trim();
                            if (smsText.toLowerCase().includes("email") || smsText.includes("@")) {
                                let emailMatch = smsText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                                if (emailMatch && !emailMatch[0].includes("fmcsa") && !emailMatch[0].includes("dot.gov")) { 
                                    record.email = emailMatch[0]; 
                                    break; 
                                }
                            }
                        }
                        if (record.email === 'N/A') {
                            let fullPageEmailMatch = smsHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
                            if (fullPageEmailMatch) {
                                let validEmail = fullPageEmailMatch.find(e => !e.toLowerCase().includes("fmcsa") && !e.toLowerCase().includes("dot.gov"));
                                if (validEmail) record.email = validEmail;
                            }
                        }
                    }
                } catch (smsErr) { 
                    console.warn(`SMS Portal warning for USDOT ${record.usdot}:`, smsErr.message); 
                }
            }
            return { status: "success", data: record };

        } catch (err) {
            attempt++;
            if (statusBox) {
                statusBox.innerHTML = `<strong>⚠️ Safer Server Issue on MC ${mc}. Retrying (${attempt}/${maxRetries})...</strong>`;
            }
            await new Promise(r => setTimeout(r, 3000 * attempt));
        }
    }
    return { status: "error", message: `Failed after retries for MC ${mc}` };
}

window.startScraping = async function(overrideStart = null, overrideEnd = null) {
    const start = overrideStart !== null ? overrideStart : parseInt(document.getElementById('startMc').value);
    const end = overrideEnd !== null ? overrideEnd : parseInt(document.getElementById('endMc').value);

    if (isNaN(start) || isNaN(end) || start > end) {
        let stBox = document.getElementById('status');
        if (stBox) stBox.innerText = "Please enter a valid MC range.";
        return;
    }

    let currentRangeStr = `${start} - ${end}`;
    if (!currentHistoryId || window.activeScrapeRange !== currentRangeStr) {
        if (overrideStart === null) {
            currentHistoryId = null;
            scrapedData = [];
        }
        window.activeScrapeRange = currentRangeStr;
        if (overrideStart === null) {
            const tableBody = document.getElementById('resultsTable');
            if (tableBody) tableBody.innerHTML = '';
        }
    }

    scraping = true; 
    document.getElementById('startBtn').style.display = 'none';
    if(document.getElementById('openHistoryBtn')) document.getElementById('openHistoryBtn').style.display = 'none';
    if(document.getElementById('openFollowUpDrawerBtn')) document.getElementById('openFollowUpDrawerBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-block';
    document.getElementById('downloadBtn').style.display = 'none';

    let totalToScan = end - start + 1;
    let totalProcessed = 0;
    let errorDetailsList = [];
    let startTime = Date.now();

    let statusBox = document.getElementById('status');
    if (statusBox) {
        statusBox.style.display = "flex";
        statusBox.style.flexDirection = "row";
        statusBox.style.alignItems = "center";
        statusBox.style.justifyContent = "space-between";
        statusBox.style.padding = "14px 18px";
        statusBox.style.background = "var(--dl-card-bg, #001a3a)";
        statusBox.style.color = "var(--dl-text-color, #fff)";
        statusBox.style.border = "1px solid var(--dl-border-color, #1e3a8a)";
        statusBox.style.borderLeft = "5px solid #2563eb";
        statusBox.style.borderRadius = "8px";
        statusBox.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
    }

    if (!currentHistoryId && db) {
        const now = new Date();
        const formattedDate = now.toLocaleString('en-US', { hour12: true });

        const initialHistoryItem = {
            id: Date.now(),
            date: formattedDate,
            range: currentRangeStr,
            totalRecords: scrapedData.length,
            status: "Interrupted (Auto-Saved)",
            records: scrapedData
        };

        currentHistoryId = initialHistoryItem.id;
        const tx = db.transaction("history", "readwrite");
        const store = tx.objectStore("history");
        store.add(initialHistoryItem);
        
        tx.oncomplete = function() {
            let lsBackup = JSON.parse(localStorage.getItem(`dl_history_backup_${currentClient}`)) || [];
            lsBackup.push(initialHistoryItem);
            localStorage.setItem(`dl_history_backup_${currentClient}`, JSON.stringify(lsBackup));
        };
    }

    let effectiveStart = start;
    if (scrapedData.length > 0) {
        let maxScannedMc = Math.max(...scrapedData.map(r => parseInt(r.mc)));
        if (!isNaN(maxScannedMc) && maxScannedMc >= start && maxScannedMc < end) {
            effectiveStart = maxScannedMc + 1;
        }
    }

    for (let mc = effectiveStart; mc <= end; mc++) {
        if (!scraping) break;

        let result = await processSingleMCWithDetailedError(mc, statusBox);
        
        if (result.status === "limit_exceeded") {
            stopScraping();
            showLimitExceededModal(`Your global license limit for "${currentClient}" has been reached. Max allowed active tabs/devices is <b>${userLimit}</b>. Scraping has been paused safely.`);
            break;
        }

        totalProcessed++;

        if (result.status === "error") {
            errorDetailsList.push(result.message);
        } else {
            errorDetailsList = []; 
            if (result.status === "success" && result.data) {
                let record = result.data;
                scrapedData.push(record);
                let recordIndex = scrapedData.length - 1;
                updateRealTimeHistory(scrapedData, false);

                let emailCellMarkup = buildEmailCellMarkup(record.email, record.name);
                let phoneCellMarkup = buildPhoneCellMarkup(record.phone);
                let activeRemarksValue = record.remarks || "";

                const tableBody = document.getElementById('resultsTable');
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
                    <td style="white-space: nowrap !important;"><b>${record.vehicleType || 'N/A'}</b></td>
                    <td class="remarks-cell-container">
                        <textarea class="remarks-input-field" placeholder="Click to add remarks..." onfocus="remarksFocus(${recordIndex}, this)" onblur="remarksBlur(${recordIndex}, this)" oninput="syncRemarksData(${recordIndex}, this)">${activeRemarksValue}</textarea>
                    </td>
                    <td><button onclick="addLeadToFollowUpList(${recordIndex}, this)" class="premium-followup-btn">⭐ Follow</button></td>
                `;
                tableBody.appendChild(newRow);
            }
        }

        let percentage = Math.floor((totalProcessed / totalToScan) * 100);
        let elapsedSeconds = (Date.now() - startTime) / 1000;
        let avgTimePerMC = elapsedSeconds / (totalProcessed || 1);
        let remainingMCs = totalToScan - totalProcessed;
        let estimatedRemainingSeconds = remainingMCs * avgTimePerMC;

        let mins = Math.floor(estimatedRemainingSeconds / 60);
        let secs = Math.floor(estimatedRemainingSeconds % 60);
        let timeString = totalProcessed < 3 ? "Calculating ETA..." : `ETA: ${mins}m ${secs}s`;
        let degrees = percentage * 3.6;

        let latestErrorText = errorDetailsList.length > 0 ? `<span style="color:#f87171; font-size:11px;" title="${errorDetailsList[errorDetailsList.length - 1]}">⚠️ Retrying/Err</span>` : `<span style="color:#4ade80; font-size:11px; font-weight:bold;">Status: Stable</span>`;

        if (statusBox && scraping) {
            statusBox.innerHTML = `
                <div style="font-family: sans-serif; display: flex; flex-direction: column; gap: 4px; text-align: left;">
                    <div style="font-size: 13px; font-weight: bold; color: var(--dl-text-main, #fff);">Scanning MC ${mc} (${totalProcessed}/${totalToScan})</div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <span style="font-size: 11px; color: #94a3b8; font-weight: bold;">${timeString}</span>
                        ${latestErrorText}
                    </div>
                </div>
                <div style="position: relative; width: 42px; height: 42px; border-radius: 50%; background: conic-gradient(#2563eb ${degrees}deg, #1e293b ${degrees}deg); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <div style="position: absolute; width: 32px; height: 32px; background: var(--dl-sub-bg, #000f24); border-radius: 50%;"></div>
                    <span style="position: relative; font-family: sans-serif; font-size: 11px; font-weight: bold; color: var(--dl-text-main, #fff);">${percentage}%</span>
                </div>
            `;
        }
        populateStateDropdown();
        populateVehicleTypeCheckboxes();
        applyAdvancedFilters();

        await new Promise(r => setTimeout(r, 350));
    }

    scraping = false;
    document.getElementById('startBtn').style.display = 'inline-block';
    if(document.getElementById('openHistoryBtn')) document.getElementById('openHistoryBtn').style.display = 'inline-block';
    if(document.getElementById('openFollowUpDrawerBtn')) document.getElementById('openFollowUpDrawerBtn').style.display = 'inline-block';
    document.getElementById('stopBtn').style.display = 'none';

    if (statusBox) {
        statusBox.style.padding = "18px";
        statusBox.style.display = "flex";
        statusBox.style.borderLeft = "5px solid #22c55e";
        statusBox.innerHTML = `<strong style="font-size: 15px; color: #4ade80; font-family: sans-serif;">Completed! Found ${scrapedData.length} valid records.</strong>`;
    }

    if(scrapedData.length > 0) {
        document.getElementById('downloadBtn').style.display = 'inline-block';
        updateRealTimeHistory(scrapedData, true);
    }
}

window.downloadCSV = function() {
    if(scrapedData.length > 0) {
        const start = document.getElementById('startMc').value;
        const end = document.getElementById('endMc').value;
        triggerCSVDownload(scrapedData, `DispatchLink_Data_${start}_to_${end}.csv`);
    }
}
