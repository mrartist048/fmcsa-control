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
const allowedUsers = {
    "Gslogisticsdispatch": { pass: "Gslogisticsdispatch", maxLaptops: 2, expires: "2026-07-28", dbUrl: FIREBASE_DB_URL_1 },    
    "precisionx": { pass: "precisionx123", maxLaptops: 1, expires: "2026-07-30", dbUrl: FIREBASE_DB_URL_1 },  
    "dispatchloadify": { pass: "admin789", maxLaptops: 5, expires: "2026-09-28", dbUrl: FIREBASE_DB_URL_2 }, 
    "baitstarlogistics": { pass: "baitstarlogistics123", maxLaptops: 10, expires: "2026-08-30", dbUrl: FIREBASE_DB_URL_2 },         
    "Skylinelogistics": { pass: "Skylinelogistics123", maxLaptops: 2, expires: "2026-08-30", dbUrl: FIREBASE_DB_URL_1 },  
    "Loadlink": { pass: "Loadlink#trial", maxLaptops: 3, expires: "2026-08-14", dbUrl: FIREBASE_DB_URL_2 },
    "Nexteklogistics": { pass: "Nexteklogistics#123", maxLaptops: 1, expires: "2026-09-22", dbUrl: FIREBASE_DB_URL_2 },
    "testinguser": { pass: "testinguser123", maxLaptops: 2, expires: "2026-08-30", dbUrl: FIREBASE_DB_URL_3 }, 
};

const MASTER_ADMIN_PASS = "admin890";

let currentClient = localStorage.getItem("dl_logged_client") || "";

// DYNAMIC FIREBASE URL SELECTOR
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
            <p style="color: #444; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
                ${message}
            </p>
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
        position: fixed;
        top: -100px;
        right: 20px;
        background: #002d62;
        color: #ffffff;
        padding: 14px 22px;
        border-radius: 6px;
        font-family: sans-serif;
        font-size: 13px;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(0,0,0,0.25);
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

// ====== PROFESSIONAL LOGIN SCREEN WITH SHOW/HIDE PASSWORD ======
function renderLoginScreen() {
    if (document.getElementById('dlLoginOverlay')) return;

    let overlay = document.createElement('div');
    overlay.id = 'dlLoginOverlay';
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0f172a; z-index: 9999999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    overlay.innerHTML = `
        <div style="background: #1e293b; color: #f8fafc; padding: 35px 30px; border-radius: 12px; width: 380px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; border: 1px solid #334155;">
            <h2 style="color: #38bdf8; margin-bottom: 5px; font-size: 24px;">Dispatch Link</h2>
            <p style="color: #94a3b8; font-size: 12px; margin-bottom: 25px;">Secure Dispatcher CRM Portal</p>
            
            <div style="margin-bottom: 15px; text-align: left;">
                <label style="font-size: 12px; font-weight: bold; color: #cbd5e1; display: block; margin-bottom: 5px;">Username</label>
                <input type="text" id="dlLoginUser" placeholder="Enter your username" style="width: 100%; padding: 10px; font-size: 13px; background: #0f172a; border: 1px solid #475569; color: white; border-radius: 6px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 20px; text-align: left; position: relative;">
                <label style="font-size: 12px; font-weight: bold; color: #cbd5e1; display: block; margin-bottom: 5px;">Password</label>
                <div style="position: relative; display: flex; align-items: center;">
                    <input type="password" id="dlLoginPass" placeholder="Enter your password" style="width: 100%; padding: 10px 40px 10px 10px; font-size: 13px; background: #0f172a; border: 1px solid #475569; color: white; border-radius: 6px; box-sizing: border-box;">
                    <span onclick="togglePasswordVisibility()" id="dlEyeIcon" style="position: absolute; right: 12px; cursor: pointer; font-size: 16px; user-select: none;" title="Show/Hide Password">👁️‍🗨️</span>
                </div>
            </div>

            <button onclick="processLogin()" style="width: 100%; background: #0284c7; color: white; border: none; padding: 12px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background 0.2s;">Login to Portal</button>
            <div id="dlLoginError" style="color: #f87171; font-size: 12px; font-weight: bold; margin-top: 12px; display: none;"></div>
            
            <div style="margin-top: 25px; font-size: 11px; color: #94a3b8;">
                Need access? Contact Admin: <b>03700684849</b><br>
                Email: <a href="mailto:info@dispatchlink.online" style="color: #38bdf8; text-decoration: underline;">info@dispatchlink.online</a>
            </div>
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
    injectDarkSidebarUI();
    applyThemeMode();
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

// ====== PROFESSIONAL DARK SIDEBAR UI & TOP-RIGHT AGENT DROPDOWN ======
function injectDarkSidebarUI() {
    if (document.getElementById('dlDarkSidebar')) return;

    // Apply custom dark theme scrollbar and styling across the page
    let globalStyle = document.createElement('style');
    globalStyle.id = 'dlGlobalDarkScrollbarStyle';
    globalStyle.innerHTML = `
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
    `;
    document.head.appendChild(globalStyle);

    // Wrap body contents in a main content wrapper to push it right
    let bodyChildren = Array.from(document.body.childNodes);
    let contentWrapper = document.createElement('div');
    contentWrapper.id = 'dlMainContentWrapper';
    contentWrapper.style.cssText = "margin-left: 260px; padding: 20px; box-sizing: border-box; width: calc(100% - 260px); min-height: 100vh; background: #f8fafc; transition: background 0.3s;";
    
    bodyChildren.forEach(node => contentWrapper.appendChild(node));
    document.body.appendChild(contentWrapper);
    document.body.style.cssText = "margin: 0; padding: 0; background: #f8fafc; font-family: sans-serif; overflow-x: hidden;";

    // Create Dark Sidebar
    let sidebar = document.createElement('div');
    sidebar.id = 'dlDarkSidebar';
    sidebar.style.cssText = "position: fixed; top: 0; left: 0; width: 260px; height: 100vh; background: #0f172a; color: #f8fafc; z-index: 999999; display: flex; flex-direction: column; box-shadow: 4px 0 15px rgba(0,0,0,0.3); border-right: 1px solid #1e293b; box-sizing: border-box;";

    sidebar.innerHTML = `
        <div style="padding: 20px 18px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 12px; background: #020617;">
            <div style="width: 38px; height: 38px; background: #0284c7; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; box-shadow: 0 4px 10px rgba(2,132,199,0.3);">DL</div>
            <div>
                <div style="font-size: 15px; font-weight: bold; color: #f8fafc; letter-spacing: 0.5px;">Dispatch Link</div>
                <div style="font-size: 10px; color: #38bdf8; text-transform: uppercase; font-weight: bold;">CRM & Lead Processor</div>
            </div>
        </div>

        <div style="flex: 1; overflow-y: auto; padding: 20px 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; padding: 4px 8px; margin-bottom: 2px;">Main Navigation</div>
            
            <button onclick="scrollToTopScreen()" style="width: 100%; background: transparent; border: none; color: #cbd5e1; padding: 11px 14px; border-radius: 8px; text-align: left; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: 0.2s;" onmouseover="this.style.background='#1e293b'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'">
                <span>🏠</span> Dashboard
            </button>

            <button onclick="toggleHistoryDrawer()" style="width: 100%; background: transparent; border: none; color: #cbd5e1; padding: 11px 14px; border-radius: 8px; text-align: left; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: 0.2s;" onmouseover="this.style.background='#1e293b'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'">
                <span>📜</span> Saved Sheets History
            </button>

            <button onclick="toggleFollowUpDrawer()" style="width: 100%; background: transparent; border: none; color: #cbd5e1; padding: 11px 14px; border-radius: 8px; text-align: left; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: 0.2s;" onmouseover="this.style.background='#1e293b'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'">
                <span>📅</span> Follow-Up Pipeline
            </button>

            <button onclick="openEmailDrawer()" style="width: 100%; background: transparent; border: none; color: #cbd5e1; padding: 11px 14px; border-radius: 8px; text-align: left; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: 0.2s;" onmouseover="this.style.background='#1e293b'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'">
                <span>✉️</span> Email Templates
            </button>

            <button onclick="openSettingsDrawer()" style="width: 100%; background: transparent; border: none; color: #cbd5e1; padding: 11px 14px; border-radius: 8px; text-align: left; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: 0.2s;" onmouseover="this.style.background='#1e293b'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'">
                <span>⚙️</span> Settings & Profile
            </button>

            <button onclick="openCallingDetailModal()" style="width: 100%; background: transparent; border: none; color: #cbd5e1; padding: 11px 14px; border-radius: 8px; text-align: left; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: 0.2s;" onmouseover="this.style.background='#1e293b'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'">
                <span>📊</span> Shift Reports
            </button>
        </div>

        <div style="padding: 15px 18px; border-top: 1px solid #1e293b; background: #020617; display: flex; flex-direction: column; gap: 8px;">
            <button onclick="logoutUser()" style="width: 100%; background: #7f1d1d; color: #fca5a5; border: 1px solid #991b1b; padding: 10px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s;" onmouseover="this.style.background='#991b1b'; this.style.color='#fff'" onmouseout="this.style.background='#7f1d1d'; this.style.color='#fca5a5'">
                <span>🚪</span> Logout Portal
            </button>
            <div style="text-align: center; font-size: 10px; color: #64748b; margin-top: 4px;">
                Dev: <b>Mr. Nauman</b> (03700684849)
            </div>
        </div>
    `;

    document.body.insertBefore(sidebar, contentWrapper);
    injectTopRightAgentProfileUI();
}

// ====== TOP-RIGHT AGENT PROFILE UI & DROPDOWN ======
function injectTopRightAgentProfileUI() {
    if (document.getElementById('dlTopRightAgentContainer')) return;

    let headerContainer = document.querySelector('h1, h2, .heading') || document.body;
    let topProfileDiv = document.createElement('div');
    topProfileDiv.id = 'dlTopRightAgentContainer';
    topProfileDiv.style.cssText = "position: fixed; top: 15px; right: 25px; z-index: 999999; font-family: sans-serif;";

    topProfileDiv.innerHTML = `
        <div style="position: relative;">
            <div onclick="toggleTopProfileDropdown(event)" style="background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 30px; display: flex; align-items: center; gap: 10px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#ffffff'">
                <div style="width: 30px; height: 30px; background: #0284c7; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px;">
                    ${dispatcherNickname.charAt(0).toUpperCase()}
                </div>
                <div style="text-align: left;">
                    <div id="dlTopAgentDisplayLabel" style="font-size: 13px; font-weight: bold; color: #0f172a;">${dispatcherNickname}</div>
                    <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold;">Active Agent ▼</div>
                </div>
            </div>

            <div id="dlTopProfileDropdownMenu" style="display: none; position: absolute; right: 0; top: 115%; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); width: 200px; padding: 6px; z-index: 10000; box-sizing: border-box;">
                <button onclick="openSettingsDrawer(); closeTopProfileDropdown();" style="width: 100%; background: none; border: none; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: bold; color: #334155; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 8px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">⚙️ Settings & Profile</button>
                <button onclick="openAdminPanelPrompt(); closeTopProfileDropdown();" style="width: 100%; background: none; border: none; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: bold; color: #334155; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 8px;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">👑 Admin Panel</button>
                <div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>
                <button onclick="logoutUser();" style="width: 100%; background: none; border: none; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: bold; color: #dc2626; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 8px;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='none'">🚪 Logout Portal</button>
            </div>
        </div>
    `;

    document.body.appendChild(topProfileDiv);

    document.addEventListener('click', function(e) {
        let menu = document.getElementById('dlTopProfileDropdownMenu');
        let container = document.getElementById('dlTopRightAgentContainer');
        if (menu && menu.style.display === 'block' && container && !container.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
}

window.toggleTopProfileDropdown = function(e) {
    e.stopPropagation();
    let menu = document.getElementById('dlTopProfileDropdownMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
};

window.closeTopProfileDropdown = function() {
    let menu = document.getElementById('dlTopProfileDropdownMenu');
    if (menu) menu.style.display = 'none';
};

// ====== EMAIL TEMPLATE DRAWER (LIKE FOLLOW-UPS) ======
function injectEmailDrawerAndSettingsUI() {
    if (!document.getElementById('dlEmailDrawer')) {
        let eDrawer = document.createElement('div');
        eDrawer.id = 'dlEmailDrawer';
        eDrawer.style.cssText = "position: fixed; top: 0; right: -450px; width: 420px; height: 100%; background: #ffffff; box-shadow: -5px 0 20px rgba(0,0,0,0.2); z-index: 9999999; transition: right 0.3s ease-in-out; padding: 25px; box-sizing: border-box; font-family: sans-serif; display: flex; flex-direction: column;";
        
        let savedSubject = localStorage.getItem(`dl_subj_${currentClient}`) || "Dispatch Service Proposal";
        let savedBody = localStorage.getItem(`dl_body_${currentClient}`) || "Hello,\n\nWe found your profile via FMCSA. We offer dispatching services at 5% rate.\n\nBest Regards.";

        eDrawer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 15px;">
                <h3 style="color: #0284c7; margin: 0; font-size: 18px;">✉️ Email Setup Template</h3>
                <button onclick="openEmailDrawer()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; font-weight: bold;">&times;</button>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 15px;">Customize the automated proposal email template used when pitching carriers directly.</p>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; font-size: 12px; font-weight: bold; color: #0f172a; margin-bottom: 5px;">Email Subject:</label>
                <input type="text" id="modalPropSubject" value="${savedSubject}" style="width: 100%; padding: 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box;">
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 12px; font-weight: bold; color: #0f172a; margin-bottom: 5px;">Email Body (Use {company} for dynamic name):</label>
                <textarea id="modalPropBody" style="width: 100%; height: 160px; padding: 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; resize: vertical;">${savedBody}</textarea>
            </div>

            <button onclick="saveModalProposalSettings()" style="background: #0284c7; color: white; border: none; padding: 12px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%;">💾 Save Template Settings</button>
        `;
        document.body.appendChild(eDrawer);
    }

    if (!document.getElementById('dlSettingsDrawer')) {
        let sDrawer = document.createElement('div');
        sDrawer.id = 'dlSettingsDrawer';
        sDrawer.style.cssText = "position: fixed; top: 0; right: -450px; width: 420px; height: 100%; background: #ffffff; box-shadow: -5px 0 20px rgba(0,0,0,0.2); z-index: 9999999; transition: right 0.3s ease-in-out; padding: 25px; box-sizing: border-box; font-family: sans-serif; display: flex; flex-direction: column;";
        
        let currentTheme = localStorage.getItem(`dl_theme_${currentClient}`) || "light";

        sDrawer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 12px; margin-bottom: 15px;">
                <h3 style="color: #0f172a; margin: 0; font-size: 18px;">⚙️ Settings & Agent Profile</h3>
                <button onclick="openSettingsDrawer()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; font-weight: bold;">&times;</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-size: 12px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">Agent Nickname / Display Name:</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="settingsAgentNameInput" value="${dispatcherNickname}" style="flex: 1; padding: 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box;">
                    <button onclick="saveSettingsAgentName()" style="background: #0284c7; color: white; border: none; padding: 0 14px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;">Save</button>
                </div>
            </div>

            <div style="margin-bottom: 25px;">
                <label style="display: block; font-size: 12px; font-weight: bold; color: #0f172a; margin-bottom: 6px;">Interface Theme Mode:</label>
                <select id="settingsThemeSelect" onchange="switchThemeMode(this.value)" style="width: 100%; padding: 10px; font-size: 13px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; font-weight: bold;">
                    <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>☀️ Light Mode</option>
                    <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>🌙 Dark Mode</option>
                </select>
            </div>

            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; color: #334155;">
                <div><b>Active Client ID:</b> ${currentClient}</div>
                <div style="margin-top: 4px;"><b>Max Devices Limit:</b> ${userLimit}</div>
            </div>
        `;
        document.body.appendChild(sDrawer);
    }
}

window.openEmailDrawer = function() {
    injectEmailDrawerAndSettingsUI();
    let drawer = document.getElementById('dlEmailDrawer');
    let followUpDrawer = document.getElementById('dlFollowUpDrawer');
    let historyDrawer = document.getElementById('dlHistoryDrawer');
    let settingsDrawer = document.getElementById('dlSettingsDrawer');

    if (followUpDrawer) followUpDrawer.style.right = "-450px";
    if (historyDrawer) historyDrawer.style.right = "-450px";
    if (settingsDrawer) settingsDrawer.style.right = "-450px";

    if (drawer.style.right === "0px") {
        drawer.style.right = "-450px";
    } else {
        drawer.style.right = "0px";
    }
};

window.openSettingsDrawer = function() {
    injectEmailDrawerAndSettingsUI();
    let drawer = document.getElementById('dlSettingsDrawer');
    let followUpDrawer = document.getElementById('dlFollowUpDrawer');
    let historyDrawer = document.getElementById('dlHistoryDrawer');
    let emailDrawer = document.getElementById('dlEmailDrawer');

    if (followUpDrawer) followUpDrawer.style.right = "-450px";
    if (historyDrawer) historyDrawer.style.right = "-450px";
    if (emailDrawer) emailDrawer.style.right = "-450px";

    if (drawer.style.right === "0px") {
        drawer.style.right = "-450px";
    } else {
        drawer.style.right = "0px";
    }
};

window.saveModalProposalSettings = function() {
    let subj = document.getElementById('modalPropSubject')?.value || "";
    let body = document.getElementById('modalPropBody')?.value || "";
    localStorage.setItem(`dl_subj_${currentClient}`, subj);
    localStorage.setItem(`dl_body_${currentClient}`, body);
    showPremiumNotification("✅ Email template saved successfully!", 2500);
    openEmailDrawer();
};

window.saveSettingsAgentName = function() {
    let inputVal = document.getElementById('settingsAgentNameInput')?.value.trim();
    if (inputVal) {
        dispatcherNickname = inputVal;
        localStorage.setItem(`dl_nick_${currentClient}`, dispatcherNickname);
        let topLabel = document.getElementById('dlTopAgentDisplayLabel');
        if (topLabel) topLabel.innerText = dispatcherNickname;
        updateActiveSessionData();
        showPremiumNotification("✅ Agent name updated successfully!", 2500);
        window.location.reload();
    }
};

window.switchThemeMode = function(mode) {
    localStorage.setItem(`dl_theme_${currentClient}`, mode);
    applyThemeMode();
};

function applyThemeMode() {
    let mode = localStorage.getItem(`dl_theme_${currentClient}`) || "light";
    let wrapper = document.getElementById('dlMainContentWrapper');
    if (!wrapper) return;

    if (mode === 'dark') {
        wrapper.style.background = "#0f172a";
        wrapper.style.color = "#f8fafc";
    } else {
        wrapper.style.background = "#f8fafc";
        wrapper.style.color = "#0f172a";
    }
}

window.changeDispatcherName = function() {
    openSettingsDrawer();
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
let availableCategories = new Set();

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

    if (!document.getElementById('dlResponsiveTheme')) {
        let styleTag = document.createElement('style');
        styleTag.id = 'dlResponsiveTheme';
        styleTag.innerHTML = `
            .container, .container-fluid { width: 100% !important; max-width: 100% !important; padding: 10px !important; box-sizing: border-box !important; }
            .table-responsive { width: 100% !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; margin-bottom: 20px !important; border: 1px solid #ddd !important; border-radius: 6px !important; background: #fff; }
            table.table { width: 100% !important; min-width: 1100px !important; border-collapse: collapse !important; }
            table.table th, table.table td { padding: 10px 8px !important; vertical-align: middle !important; text-align: left !important; font-size: 13px !important; white-space: nowrap !important; }
            table.table th:nth-child(4), table.table td:nth-child(4) { width: 90px !important; max-width: 90px !important; overflow: hidden !important; text-overflow: ellipsis !important; }
            
            .remarks-cell-container { min-width: 250px !important; width: 260px !important; position: relative; white-space: normal !important; }
            .remarks-input-field { 
                width: 100% !important; 
                height: 38px !important; 
                border: 1px solid #b6ccfe !important; 
                border-radius: 6px !important; 
                padding: 6px 10px !important; 
                font-size: 12px !important; 
                line-height: 1.4 !important;
                box-sizing: border-box !important; 
                color: #222 !important; 
                background: #fafafa !important; 
                resize: none !important;
                font-family: monospace !important;
                overflow: hidden !important;
                transition: height 0.25s ease-in-out, border-color 0.2s, background 0.2s, box-shadow 0.2s; 
            }
            .remarks-input-field:focus { 
                height: 120px !important; 
                border-color: #002d62 !important; 
                background: #ffffff !important; 
                outline: none !important; 
                overflow-y: auto !important;
                box-shadow: 0 4px 10px rgba(0,45,98,0.15) !important; 
            }
            .premium-copy-badge { position: absolute; background: #28a745; color: white; padding: 2px 6px; font-size: 10px; border-radius: 3px; top: -15px; left: 50%; transform: translateX(-50%); z-index: 100; font-weight: bold; }
            .premium-pitch-btn { display: inline-block; background: #17a2b8; color: white; text-decoration: none; font-size: 10px; font-weight: bold; padding: 4px 8px; border-radius: 3px; border: 1px solid #138496; margin-left: 5px; transition: background 0.2s; vertical-align: middle; cursor: pointer; }
            .premium-pitch-btn:hover { background: #138496; color: white; }
            .premium-followup-btn { display: inline-block; background: #ffc107; color: #212529; text-decoration: none; font-size: 10px; font-weight: bold; padding: 5px 8px; border-radius: 3px; border: 1px solid #e0a800; cursor: pointer; font-family: sans-serif; transition: background 0.2s; }
            .premium-followup-btn:hover { background: #e0a800; }
            
            .phone-clickable-container { padding: 4px !important; text-align: center !important; position: relative !important; }
            .phone-clickable-cell { padding: 8px 10px !important; text-align: center !important; cursor: pointer !important; transition: none !important; text-decoration: none !important; display: block; border-radius: 6px !important; }
            .phone-clickable-cell:hover { background-color: #001a3a !important; }
            .phone-clickable-cell:hover .clickable-phone-text { color: #ffffff !important; }
            .phone-clickable-cell.active-called-cell { background-color: #d1ecf1 !important; border: 1px solid #bee5eb !important; }
            .phone-clickable-cell.active-called-cell .clickable-phone-text { color: #0c5460 !important; font-weight: 900 !important; }
            .phone-cell-content { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; pointer-events: none; }
            .phone-icon-span { font-size: 14px; line-height: 1; }
            .clickable-phone-text { color: #002d62; font-weight: bold; font-size: 12px; white-space: nowrap; transition: color 0.2s; }
            .phone-hover-copy-icon { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; opacity: 0; transition: opacity 0.2s; cursor: pointer; background: #e2eafc; padding: 3px 5px; border-radius: 3px; border: 1px solid #b6ccfe; z-index: 5; }
            .phone-clickable-container:hover .phone-hover-copy-icon { opacity: 1; }
            .phone-copy-badge { position: absolute; background: #28a745; color: white; padding: 2px 6px; font-size: 10px; border-radius: 3px; top: -18px; left: 50%; transform: translateX(-50%); z-index: 100; font-weight: bold; }
            
            .dropdown-check-list { display: inline-block; position: relative; }
            .dropdown-check-list .anchor { position: relative; cursor: pointer; display: inline-block; padding: 6px 12px; background: white; border: 1px solid #b6ccfe; border-radius: 4px; font-size: 12px; user-select: none; color: #002d62; font-weight: bold; }
            .dropdown-check-list .anchor:active { background-color: #f1f1f1; }
            .dropdown-check-list ul.items { display: none; position: absolute; background: white; border: 1px solid #b6ccfe; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 10px 12px; border-radius: 6px; z-index: 1000; width: 220px; top: 100%; left: 0; margin-top: 4px; text-align: left; list-style: none; max-height: 220px; overflow-y: auto; box-sizing: border-box; }
            .dropdown-check-list.visible ul.items { display: block; }
            .dropdown-check-list ul.items li { margin-bottom: 8px !important; font-size: 12px !important; white-space: nowrap !important; }
            .dropdown-check-list ul.items li label { display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: flex-start !important; gap: 8px !important; cursor: pointer !important; color: #333 !important; line-height: 1.3 !important; width: 100% !important; }
            .dropdown-check-list ul.items li input[type="checkbox"] { margin: 0 !important; cursor: pointer !important; flex-shrink: 0 !important; width: 14px !important; height: 14px !important; }
        `;
        document.head.appendChild(styleTag);
    }

    if (!document.getElementById('dlFloatingNavPanel')) {
        let navPanel = document.createElement('div');
        navPanel.id = 'dlFloatingNavPanel';
        navPanel.style.cssText = "position: fixed; bottom: 30px; right: 30px; z-index: 999999; display: flex; flex-direction: column; gap: 10px; transition: opacity 0.3s ease-in-out;";
        navPanel.innerHTML = `
            <button id="dlScrollUpBtn" onclick="scrollToTopScreen()" title="Scroll to Top" style="background: #002d62; color: white; border: none; width: 45px; height: 45px; border-radius: 50%; box-shadow: 0 6px 16px rgba(0,45,98,0.35); cursor: pointer; font-size: 18px; font-weight: bold; display: none; align-items: center; justify-content: center; transition: transform 0.2s, background 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">⬆️</button>
            <button id="dlScrollDownBtn" onclick="scrollToLastCalledLead()" title="Scroll to Last Called Lead" style="background: #17a2b8; color: white; border: none; width: 45px; height: 45px; border-radius: 50%; box-shadow: 0 6px 16px rgba(23,162,184,0.35); cursor: pointer; font-size: 18px; font-weight: bold; display: none; align-items: center; justify-content: center; transition: transform 0.2s, background 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">⬇️</button>
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

    if (!document.getElementById('dlHistoryDrawer')) {
        let drawer = document.createElement('div');
        drawer.id = 'dlHistoryDrawer';
        drawer.style.cssText = "position: fixed; top: 0; right: -450px; width: 420px; height: 100%; background: #ffffff; box-shadow: -5px 0 20px rgba(0,0,0,0.2); z-index: 9999999; transition: right 0.3s ease-in-out; padding: 25px; box-sizing: border-box; font-family: sans-serif; display: flex; flex-direction: column;";
        drawer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid
