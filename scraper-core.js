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
const FIREBASE_DB_URL_2 = "https://data-scrapper-2-default-rtdb.firebaseio.com/";

// ====== GLOBAL ACCESS CONTROL & LOGIN CREDENTIALS ======
const allowedUsers = {
    "Gslogisticsdispatch": { pass: "Gslogisticsdispatch", maxLaptops: 2, expires: "2026-07-28", dbUrl: FIREBASE_DB_URL_1 },    
    "precisionx": { pass: "precisionx123", maxLaptops: 1, expires: "2026-07-30", dbUrl: FIREBASE_DB_URL_1 },  
    "dispatchloadify": { pass: "admin789", maxLaptops: 5, expires: "2026-09-01", dbUrl: FIREBASE_DB_URL_1 }, 
    "baitstarlogistics": { pass: "baitstarlogistics123", maxLaptops: 10, expires: "2026-08-30", dbUrl: FIREBASE_DB_URL_2 },
    "testinguser": { pass: "testinguser123", maxLaptops: 5, expires: "2026-08-30", dbUrl: FIREBASE_DB_URL_2 },         
    "Skylinelogistics": { pass: "Skylinelogistics123", maxLaptops: 2, expires: "2026-08-30", dbUrl: FIREBASE_DB_URL_1 },
    "Loadlink": { pass: "Loadlink#trial", maxLaptops: 1, expires: "2026-08-14", dbUrl: FIREBASE_DB_URL_2 },
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
                Need to increase your active device/tab limit? <br>Contact Admin: <b>03037654849</b>
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
        position: fixed; top: -100px; right: 20px; background: #002d62; color: #ffffff;
        padding: 14px 22px; border-radius: 6px; font-family: sans-serif; font-size: 13px;
        font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.25); border-left: 5px solid #17a2b8;
        z-index: 1000000; transition: top 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s; opacity: 0;
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

            <button onclick="processLogin()" style="width: 100%; background: #002d62; color: white; border: none; padding: 12px; font-size: 14px; font-weight: bold; border-radius: 4px; cursor: pointer; transition: background 0.2s;">Login to Portal</button>
            <div id="dlLoginError" style="color: #dc3545; font-size: 12px; font-weight: bold; margin-top: 12px; display: none;"></div>
            
            <div style="margin-top: 25px; font-size: 11px; color: #6c757d;">
                Need access? Contact Admin: <b>03037654849</b><br>
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

    checkGlobalSessions();
    setInterval(checkGlobalSessions, 1000);
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
    } catch (e) { console.error(e); }
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
    } catch (e) { console.error(e); }
}

window.addEventListener('beforeunload', function () {
    if (!currentClient) return;
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    navigator.sendBeacon(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json?_method=DELETE`);
});

// Basic structure ready for integration and execution.
console.log("Dispatch Link Core Script Loaded Successfully.");
