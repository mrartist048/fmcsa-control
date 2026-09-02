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
let currentThemeMode = localStorage.getItem("dl_theme_mode") || "light";

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
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.65); z-index: 99999999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    
    modal.innerHTML = `
        <div style="background: #ffffff; padding: 35px 30px; border-radius: 10px; width: 400px; box-shadow: 0 15px 40px rgba(0,0,0,0.4); text-align: center; border-top: 6px solid #dc3545;">
            <div style="font-size: 42px; margin-bottom: 10px;">⚠️</div>
            <h2 style="color: #dc3545; margin-top: 0; margin-bottom: 10px; font-size: 22px;">License Limit Exceeded!</h2>
            <p style="color: #444; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">${message}</p>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #ddd; font-size: 12px; color: #333; margin-bottom: 20px;">
                Contact Admin: <b>03700684849</b>
            </div>
            <button onclick="document.getElementById('dlLimitExceededModal').remove()" style="background: #0284c7; color: white; border: none; padding: 10px 20px; font-size: 13px; font-weight: bold; border-radius: 5px; cursor: pointer; width: 100%;">OK, Understood</button>
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
        position: fixed; top: -100px; right: 20px; background: #0f172a; color: #ffffff; padding: 14px 22px; border-radius: 6px; font-family: sans-serif; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.25); border-left: 5px solid #38bdf8; z-index: 1000000; transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s; opacity: 0;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => { toast.style.top = "20px"; toast.style.opacity = "1"; }, 100);
    setTimeout(() => { toast.style.top = "-100px"; toast.style.opacity = "0"; setTimeout(() => toast.remove(), 400); }, duration);
}

function renderLoginScreen() {
    if (document.getElementById('dlLoginOverlay')) return;

    let overlay = document.createElement('div');
    overlay.id = 'dlLoginOverlay';
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0f172a; z-index: 9999999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    overlay.innerHTML = `
        <div style="background: #1e293b; color: #f8fafc; padding: 35px 30px; border-radius: 12px; width: 380px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; border: 1px solid #334155;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 5px;">
                <img src="https://cdn.jsdelivr.net/gh/mrartist048/fmcsa-control@main/favicon.png" style="width: 36px; height: 36px; object-fit: contain;">
                <h2 style="color: #38bdf8; margin: 0; font-size: 24px;">Dispatch Link</h2>
            </div>
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

            <button onclick="processLogin()" style="width: 100%; background: #0284c7; color: white; border: none; padding: 12px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer;">Login to Portal</button>
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
    injectTopRightProfileBar();
    applyThemeMode();
}

function getCurrentShiftDateKey() {
    let now = new Date();
    let hour = now.getHours();
    if (hour < 10) now.setDate(now.getDate() - 1);
    let year = now.getFullYear();
    let month = String(now.getMonth() + 1).padStart(2, '0');
    let day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function injectDarkSidebarUI() {
    if (document.getElementById('dlDarkSidebar')) return;

    let bodyChildren = Array.from(document.body.childNodes);
    let contentWrapper = document.createElement('div');
    contentWrapper.id = 'dlMainContentWrapper';
    contentWrapper.style.cssText = "margin-left: 260px; padding: 70px 20px 20px 20px; box-sizing: border-box; width: calc(100% - 260px); min-height: 100vh; transition: background 0.3s;";
    
    bodyChildren.forEach(node => contentWrapper.appendChild(node));
    document.body.appendChild(contentWrapper);
    document.body.style.cssText = "margin: 0; padding: 0; font-family: sans-serif; overflow-x: hidden;";

    let sidebar = document.createElement('div');
    sidebar.id = 'dlDarkSidebar';
    sidebar.style.cssText = "position: fixed; top: 0; left: 0; width: 260px; height: 100vh; background: #0f172a; color: #f8fafc; z-index: 999999; display: flex; flex-direction: column; box-shadow: 4px 0 15px rgba(0,0,0,0.3); border-right: 1px solid #1e293b; box-sizing: border-box;";

    sidebar.innerHTML = `
        <div style="padding: 20px 18px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 12px; background: #020617;">
            <img src="https://cdn.jsdelivr.net/gh/mrartist048/fmcsa-control@main/favicon.png" style="width: 36px; height: 36px; object-fit: contain;">
            <div>
                <div style="font-size: 15px; font-weight: bold; color: #f8fafc; letter-spacing: 0.5px;">Dispatch Link</div>
                <div style="font-size: 10px; color: #38bdf8; text-transform: uppercase; font-weight: bold;">CRM & Lead Processor</div>
            </div>
        </div>

        <div style="flex: 1; overflow-y: auto; padding: 18px 12px; display: flex; flex-direction: column; gap: 6px;" class="custom-dark-scrollbar">
            <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; padding: 4px 8px; margin-bottom: 2px;">Main Navigation</div>
            
            <button onclick="toggleHistoryDrawer()" style="width: 100%; background: transparent; border: none; color: #cbd5e1; padding: 10px 12px; border-radius: 6px; text-align: left; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px;" onmouseover="this.style.background='#1e293b'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'">
                <span>📜</span> Saved Sheets History
            </button>

            <button onclick="toggleFollowUpDrawer()" style="width: 100%; background: transparent; border: none; color: #cbd5e1; padding: 10px 12px; border-radius: 6px; text-align: left; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px;" onmouseover="this.style.background='#1e293b'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'">
                <span>📅</span> Follow-Up Pipeline
            </button>

            <button onclick="openCallingDetailModal()" style="width: 100%; background: transparent; border: none; color: #cbd5e1; padding: 10px 12px; border-radius: 6px; text-align: left; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px;" onmouseover="this.style.background='#1e293b'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'">
                <span>📊</span> Shift Calling Details
            </button>

            <button onclick="openEmailSetupDrawer()" style="width: 100%; background: transparent; border: none; color: #cbd5e1; padding: 10px 12px; border-radius: 6px; text-align: left; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px;" onmouseover="this.style.background='#1e293b'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'">
                <span>✉️</span> Email Setup & Template
            </button>

            <button onclick="openAdminPanelPrompt()" style="width: 100%; background: transparent; border: none; color: #cbd5e1; padding: 10px 12px; border-radius: 6px; text-align: left; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px;" onmouseover="this.style.background='#1e293b'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'">
                <span>👑</span> Admin Panel
            </button>

            <button onclick="openSettingsModal()" style="width: 100%; background: transparent; border: none; color: #cbd5e1; padding: 10px 12px; border-radius: 6px; text-align: left; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px;" onmouseover="this.style.background='#1e293b'; this.style.color='#fff'" onmouseout="this.style.background='transparent'; this.style.color='#cbd5e1'">
                <span>⚙️</span> Portal Settings
            </button>
        </div>

        <div style="padding: 15px 18px; border-top: 1px solid #1e293b; background: #020617; display: flex; flex-direction: column; gap: 8px;">
            <button onclick="logoutUser()" style="width: 100%; background: #7f1d1d; color: #fca5a5; border: 1px solid #991b1b; padding: 9px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;" onmouseover="this.style.background='#991b1b'; this.style.color='#fff'" onmouseout="this.style.background='#7f1d1d'; this.style.color='#fca5a5'">
                <span>🚪</span> Logout Portal
            </button>
            <div style="text-align: center; font-size: 10px; color: #64748b; margin-top: 4px;">Dev: <b>Mr. Nauman</b></div>
        </div>
    `;

    document.body.insertBefore(sidebar, contentWrapper);
}

function injectTopRightProfileBar() {
    if (document.getElementById('dlTopRightBar')) return;

    let topBar = document.createElement('div');
    topBar.id = 'dlTopRightBar';
    topBar.style.cssText = "position: fixed; top: 0; right: 0; width: calc(100% - 260px); height: 55px; border-bottom: 1px solid #e2e8f0; z-index: 999998; display: flex; align-items: center; justify-content: flex-end; padding: 0 25px; box-sizing: border-box; font-family: sans-serif; transition: background 0.3s, border-color 0.3s;";
    
    topBar.innerHTML = `
        <div style="position: relative;">
            <div onclick="toggleProfileDropdown(event)" id="dlProfileTriggerBox" style="display: flex; align-items: center; gap: 10px; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 20px; cursor: pointer;">
                <div style="width: 28px; height: 28px; background: #0284c7; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${dispatcherNickname.charAt(0).toUpperCase()}</div>
                <span id="topRightAgentName" style="font-size: 13px; font-weight: bold;">${dispatcherNickname}</span>
                <span style="font-size: 10px; color: #64748b;">▼</span>
            </div>

            <div id="dlProfileDropdownList" style="display: none; position: absolute; right: 0; top: 45px; background: #ffffff; border: 1px solid #cbd5e1; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border-radius: 8px; width: 180px; z-index: 1000000; padding: 6px; box-sizing: border-box;">
                <div onclick="changeDispatcherName(); closeProfileDropdown();" style="padding: 8px 12px; font-size: 12px; font-weight: bold; color: #334155; border-radius: 4px; cursor: pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">✏️ Edit Name</div>
                <div onclick="openEmailSetupDrawer(); closeProfileDropdown();" style="padding: 8px 12px; font-size: 12px; font-weight: bold; color: #334155; border-radius: 4px; cursor: pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">✉️ Email Setup</div>
                <div onclick="openSettingsModal(); closeProfileDropdown();" style="padding: 8px 12px; font-size: 12px; font-weight: bold; color: #334155; border-radius: 4px; cursor: pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">⚙️ Portal Settings</div>
                <div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>
                <div onclick="openAdminPanelPrompt(); closeProfileDropdown();" style="padding: 8px 12px; font-size: 12px; font-weight: bold; color: #0284c7; border-radius: 4px; cursor: pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">👑 Admin Panel</div>
                <div onclick="logoutUser();" style="padding: 8px 12px; font-size: 12px; font-weight: bold; color: #dc3545; border-radius: 4px; cursor: pointer;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='transparent'">🚪 Logout</div>
            </div>
        </div>
    `;

    document.body.appendChild(topBar);

    window.addEventListener('click', function(e) {
        let dropdown = document.getElementById('dlProfileDropdownList');
        let profileBox = document.querySelector('#dlTopRightBar > div');
        if (dropdown && dropdown.style.display === 'block' && profileBox && !profileBox.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

window.toggleProfileDropdown = function(e) {
    e.stopPropagation();
    let dropdown = document.getElementById('dlProfileDropdownList');
    if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
};

window.closeProfileDropdown = function() {
    let dropdown = document.getElementById('dlProfileDropdownList');
    if (dropdown) dropdown.style.display = 'none';
};

window.changeDispatcherName = function() {
    let oldName = localStorage.getItem(`dl_nick_${currentClient}`) || "";
    let newName = prompt("Enter your new display name:", oldName);
    if (newName && newName.trim() !== "") {
        dispatcherNickname = newName.trim();
        localStorage.setItem(`dl_nick_${currentClient}`, dispatcherNickname);
        let label = document.getElementById('topRightAgentName');
        if (label) label.innerText = dispatcherNickname;
        updateActiveSessionData();
        window.location.reload();
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
    showPremiumNotification(`🚀 License Active: Verified for "${currentClient}"`);
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
    } catch (e) {}
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
            showLimitExceededModal(`Global license limit reached. Max active allowed: <b>${userLimit}</b>, Active now: <b>${activeCount}</b>.`);
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
    } catch (e) {}
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
            lsBackup.forEach(item => store.put(item));
        } else if (dbRecords.length > 0) {
            localStorage.setItem(`dl_history_backup_${currentClient}`, JSON.stringify(dbRecords));
        }
    };
}

const DEFAULT_REMARKS_TEMPLATE = "Truck Type:\nLength:\nAccessories:\nLoad:\nZip Code:\nSummary:";

function injectHistoryUIFramework() {
    document.title = "Dispatch Link";

    if (!document.getElementById('dlResponsiveTheme')) {
        let styleTag = document.createElement('style');
        styleTag.id = 'dlResponsiveTheme';
        styleTag.innerHTML = `
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: var(--sb-track, #0b1120); }
            ::-webkit-scrollbar-thumb { background: var(--sb-thumb, #334155); border-radius: 3px; }
            
            .custom-dark-scrollbar::-webkit-scrollbar { width: 5px; }

            .container, .container-fluid { width: 100% !important; max-width: 100% !important; padding: 10px !important; box-sizing: border-box !important; }
            .table-responsive { width: 100% !important; overflow-x: auto !important; margin-bottom: 20px !important; border: 1px solid var(--border-color, #ddd) !important; border-radius: 6px !important; background: var(--card-bg, #fff); }
            table.table { width: 100% !important; min-width: 1100px !important; border-collapse: collapse !important; color: var(--text-color, #333) !important; }
            table.table th, table.table td { padding: 10px 8px !important; vertical-align: middle !important; text-align: left !important; font-size: 13px !important; white-space: nowrap !important; }
            table.table th:nth-child(4), table.table td:nth-child(4) { width: 90px !important; max-width: 90px !important; overflow: hidden !important; text-overflow: ellipsis !important; }
            
            .remarks-cell-container { min-width: 250px !important; width: 260px !important; position: relative; white-space: normal !important; }
            .remarks-input-field { 
                width: 100% !important; height: 38px !important; border: 1px solid #b6ccfe !important; border-radius: 6px !important; padding: 6px 10px !important; font-size: 12px !important; line-height: 1.4 !important; box-sizing: border-box !important; color: #222 !important; background: #fafafa !important; resize: none !important; font-family: monospace !important; overflow: hidden !important; transition: height 0.25s ease-in-out; 
            }
            .remarks-input-field:focus { height: 120px !important; border-color: #0284c7 !important; background: #ffffff !important; outline: none !important; overflow-y: auto !important; box-shadow: 0 4px 10px rgba(2,132,199,0.15) !important; }
            
            .premium-copy-badge { position: absolute; background: #28a745; color: white; padding: 2px 6px; font-size: 10px; border-radius: 3px; top: -15px; left: 50%; transform: translateX(-50%); z-index: 100; font-weight: bold; }
            .premium-pitch-btn { display: inline-block; background: #0284c7; color: white; text-decoration: none; font-size: 10px; font-weight: bold; padding: 4px 8px; border-radius: 3px; border: 1px solid #0369a1; margin-left: 5px; vertical-align: middle; cursor: pointer; }
            .premium-pitch-btn:hover { background: #0369a1; color: white; }
            .premium-followup-btn { display: inline-block; background: #f59e0b; color: #fff; text-decoration: none; font-size: 10px; font-weight: bold; padding: 5px 8px; border-radius: 3px; border: 1px solid #d97706; cursor: pointer; }
            .premium-followup-btn:hover { background: #d97706; }
            
            .phone-clickable-container { padding: 4px !important; text-align: center !important; position: relative !important; }
            .phone-clickable-cell { padding: 8px 10px !important; text-align: center !important; cursor: pointer !important; text-decoration: none !important; display: block; border-radius: 6px !important; }
            .phone-clickable-cell:hover { background-color: rgba(2,132,199,0.1) !important; }
            .phone-clickable-cell.active-called-cell { background-color: #d1ecf1 !important; border: 1px solid #bee5eb !important; }
            .phone-clickable-cell.active-called-cell .clickable-phone
