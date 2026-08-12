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
            <p style="color: #444; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">${message}</p>
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
    toast.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><div style="background: #28a745; width: 10px; height: 10px; border-radius: 50%;"></div><span>${message}</span></div>`;
    toast.style.cssText = `position: fixed; top: -100px; right: 20px; background: #002d62; color: #ffffff; padding: 14px 22px; border-radius: 6px; font-family: sans-serif; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.25); border-left: 5px solid #17a2b8; z-index: 1000000; transition: top 0.4s; opacity: 0;`;
    document.body.appendChild(toast);
    
    setTimeout(() => { toast.style.top = "20px"; toast.style.opacity = "1"; }, 100);
    setTimeout(() => {
        toast.style.top = "-100px"; toast.style.opacity = "0";
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
        errBox.style.display = "block"; errBox.innerText = "Subscription has expired!"; return;
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
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function injectNicknameProfileUI() {
    if (document.getElementById('dlNickProfilePanel')) return;
    let heading = document.querySelector('h1, h2, .heading') || document.body;
    let panel = document.createElement('div');
    panel.id = 'dlNickProfilePanel';
    panel.style.cssText = "display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 12px; font-family: sans-serif;";
    panel.innerHTML = `
        <div style="font-size: 12px; color: #002d62; font-weight: bold; background: #e2eafc; padding: 6px 12px; border-radius: 4px;">
            👤 User: <span style="color:#28a745;" id="dlDispCurrentName">${dispatcherNickname}</span> 
            <a href="#" onclick="changeDispatcherName(); return false;" style="margin-left:8px; color:#17a2b8; text-decoration:none;">[✏️ Change]</a> 
            <a href="#" onclick="logoutUser(); return false;" style="margin-left:12px; color:#dc3545; text-decoration:none;">[🚪 Logout]</a>
        </div>
        <div style="display: flex; gap: 8px;">
            <button onclick="openCallingDetailModal()" style="background: #ff9800; color: white; border: none; padding: 8px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">📊 Calling Detail</button>
            <button onclick="openAdminPanelPrompt()" style="background: #002d62; color: white; border: none; padding: 8px 14px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px;">👑 Admin Panel</button>
        </div>
    `;
    heading.parentNode.insertBefore(panel, heading.nextSibling);
}

window.changeDispatcherName = function() {
    let newName = prompt("Enter your new display name:", dispatcherNickname);
    if (newName && newName.trim() !== "") {
        dispatcherNickname = newName.trim();
        localStorage.setItem(`dl_nick_${currentClient}`, dispatcherNickname);
        let label = document.getElementById('dlDispCurrentName');
        if (label) label.innerText = dispatcherNickname;
    }
};

window.logoutUser = function() {
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    navigator.sendBeacon(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json?_method=DELETE`);
    localStorage.removeItem("dl_logged_client");
    window.location.reload();
};

function initializeAccessControl() {
    if (!currentClient || !allowedUsers[currentClient]) { renderLoginScreen(); return; }
    userLimit = allowedUsers[currentClient].maxLaptops || 0;
    setupDispatcherIdentity();
    showPremiumNotification(`🚀 License Active: Verified for "${currentClient}"`);
    checkGlobalSessions();
    setInterval(checkGlobalSessions, 5000);
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

async function checkGlobalSessions() {
    if (userLimit === 0 || !currentClient) return;
    const url = `${FIREBASE_DB_URL}sessions/${currentClient}.json`;
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    try {
        const res = await fetch(url);
        const data = await res.json() || {};
        let now = Date.now();
        let activeCount = 0;
        Object.keys(data).forEach(key => {
            if (data[key] && (now - data[key].timestamp < 60000)) activeCount++;
        });
        if (!data[safeTabKey] && activeCount >= userLimit) {
            if (typeof scraping !== 'undefined' && scraping) stopScraping();
            showLimitExceededModal(`Max allowed active tabs/devices is <b>${userLimit}</b>.`);
            return;
        }
        await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json`, {
            method: 'PUT',
            body: JSON.stringify({ instanceId: tabUniqueId, nickname: dispatcherNickname, timestamp: now })
        });
    } catch (e) { console.error(e); }
}

window.addEventListener('beforeunload', () => {
    if (!currentClient) return;
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    navigator.sendBeacon(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json?_method=DELETE`);
});

// ====== DATABASE & UI FRAMEWORK INITIALIZATION ======
let db;
let currentHistoryId = null;
const req = indexedDB.open("DispatchLinkHistoryDB", 1);
req.onupgradeneeded = e => { db = e.target.result; if (!db.objectStoreNames.contains("history")) db.createObjectStore("history", { keyPath: "id", autoIncrement: true }); };
req.onsuccess = e => { db = e.target.result; injectHistoryUIFramework(); };

const DEFAULT_REMARKS_TEMPLATE = "Truck Type:\nLength:\nAccessories:\nLoad:\nZip Code:\nSummary:";

function injectHistoryUIFramework() {
    document.title = "Dispatch Link";
    let brandHeading = document.querySelector('h1, h2, .heading');
    if (brandHeading) brandHeading.innerHTML = "Dispatch Link <span style='font-size:14px; color:#6c757d; font-weight:normal;'>| Lead Processor & CRM</span>";

    if (!document.getElementById('dlResponsiveTheme')) {
        let styleTag = document.createElement('style');
        styleTag.id = 'dlResponsiveTheme';
        styleTag.innerHTML = `
            .table-responsive { width: 100% !important; overflow-x: auto !important; margin-bottom: 20px !important; border: 1px solid #ddd !important; border-radius: 6px !important; background: #fff; }
            table.table { width: 100% !important; min-width: 1100px !important; border-collapse: collapse !important; }
            table.table th, table.table td { padding: 10px 8px !important; vertical-align: middle !important; font-size: 13px !important; }
            .remarks-input-field { width: 100% !important; height: 38px !important; border: 1px solid #b6ccfe !important; border-radius: 6px !important; padding: 6px 10px !important; font-size: 12px !important; background: #fafafa !important; font-family: monospace !important; transition: height 0.2s; }
            .remarks-input-field:focus { height: 120px !important; outline: none !important; background: #fff !important; }
            .phone-clickable-cell { cursor: pointer !important; text-decoration: none !important; display: block; border-radius: 6px !important; padding: 6px; }
            .phone-clickable-cell:hover { background-color: #001a3a !important; color: #fff !important; }
            .phone-clickable-cell.active-called-cell { background-color: #d1ecf1 !important; font-weight: 900 !important; }
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
    }

    if (!document.getElementById('dlHistoryDrawer')) {
        let drawer = document.createElement('div');
        drawer.id = 'dlHistoryDrawer';
        drawer.style.cssText = "position: fixed; top: 0; right: -420px; width: 400px; height: 100%; background: #fff; box-shadow: -5px 0 15px rgba(0,0,0,0.15); z-index: 999999; transition: right 0.3s; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column;";
        drawer.innerHTML = `<div style="display: flex; justify-content: space-between; border-bottom: 2px solid #002d62; padding-bottom: 10px; margin-bottom: 15px;"><h3 style="margin:0; color:#002d62;">History</h3><button onclick="toggleHistoryDrawer()" style="background:none; border:none; font-size:22px; cursor:pointer;">&times;</button></div><div id="drawerHistoryList" style="flex:1; overflow-y:auto;"></div>`;
        document.body.appendChild(drawer);
    }

    let tableHeader = document.querySelector('table tr');
    if (tableHeader && !document.getElementById('remarksHeaderCol')) {
        let vehTh = document.createElement('th'); vehTh.innerText = "Vehicles";
        let remTh = document.createElement('th'); remTh.id = 'remarksHeaderCol'; remTh.innerText = "Remarks";
        let followTh = document.createElement('th'); followTh.innerText = "Action";
        tableHeader.appendChild(vehTh);
        tableHeader.appendChild(remTh);
        tableHeader.appendChild(followTh);
    }
}

window.toggleHistoryDrawer = function() {
    let drawer = document.getElementById('dlHistoryDrawer');
    if (drawer) drawer.style.right = drawer.style.right === "0px" ? "-420px" : "0px";
};

// ====== SCRAPING & CORE EXECUTION FUNCTIONS ======
let scraping = false;
let scrapedData = [];

window.stopScraping = function() {
    scraping = false;
    let statusBox = document.getElementById('status');
    if (statusBox) statusBox.innerHTML = "<strong>⏸️ Processing Paused Safely.</strong>";
};

async function processSingleMCWithDetailedError(mc, statusBox) {
    try {
        const snapshotUrl = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mc}`;
        const response = await fetch(snapshotUrl);
        if (!response.ok) return { status: "error" };
        const htmlText = await response.text();
        if (htmlText.includes("Record not found") || !htmlText.includes("USDOT Number:")) return { status: "not_found" };

        let record = { mc: mc, usdot: 'N/A', name: 'N/A', entityType: 'N/A', status: 'N/A', phone: 'N/A', address: 'N/A', email: 'N/A', powerUnits: 'N/A', vehicleType: 'N/A', remarks: '' };
        let el = document.createElement('html');
        el.innerHTML = htmlText;
        let cells = el.querySelectorAll('td, th');

        for (let i = 0; i < cells.length; i++) {
            let text = cells[i].textContent.trim();
            if (text.startsWith("Legal Name:") && cells[i+1]) record.name = cells[i+1].textContent.trim();
            if (text.startsWith("USDOT Number:") && cells[i+1]) record.usdot = cells[i+1].textContent.trim().split(/\s+/)[0];
            if (text.startsWith("Entity Type:") && cells[i+1]) record.entityType = cells[i+1].textContent.trim();
            if (text.startsWith("Operating Authority Status:") && cells[i+1]) record.status = cells[i+1].textContent.toUpperCase().includes("NOT AUTHORIZED") ? "NOT AUTHORIZED" : "AUTHORIZED";
            if (text.startsWith("Power Units:") && cells[i+1]) record.powerUnits = cells[i+1].textContent.trim();
            if (text.startsWith("Phone:") && cells[i+1]) record.phone = cells[i+1].textContent.trim();
            if ((text.startsWith("Physical Address:") || text.startsWith("Address:")) && cells[i+1]) record.address = cells[i+1].textContent.trim();
        }

        if (record.status !== "AUTHORIZED") return { status: "filtered_out" };
        return { status: "success", data: record };
    } catch (err) {
        return { status: "error" };
    }
}

window.startScraping = async function() {
    const start = parseInt(document.getElementById('startMc').value);
    const end = parseInt(document.getElementById('endMc').value);
    if (isNaN(start) || isNaN(end) || start > end) { alert("Please enter a valid MC range."); return; }

    scraping = true;
    scrapedData = [];
    document.getElementById('startBtn').style.display = 'none';
    let statusBox = document.getElementById('status');
    const tableBody = document.getElementById('resultsTable');
    tableBody.innerHTML = '';

    for (let mc = start; mc <= end; mc++) {
        if (!scraping) break;
        let result = await processSingleMCWithDetailedError(mc, statusBox);
        if (result.status === "success" && result.data) {
            let record = result.data;
            scrapedData.push(record);
            let idx = scrapedData.length - 1;

            tableBody.innerHTML += `<tr>
                <td><b>${record.mc}</b></td>
                <td>${record.usdot}</td>
                <td>${record.name}</td>
                <td>${record.entityType}</td>
                <td><span style="color:green">${record.status}</span></td>
                <td><a href="tel:${record.phone}" class="phone-clickable-cell">${record.phone}</a></td>
                <td>${record.address}</td>
                <td>${record.email}</td>
                <td>${record.powerUnits}</td>
                <td><b>${record.vehicleType}</b></td>
                <td><textarea class="remarks-input-field" onfocus="if(!this.value)this.value='${DEFAULT_REMARKS_TEMPLATE}'"></textarea></td>
                <td><button style="background:#17a2b8; color:#fff; border:none; padding:4px 8px; border-radius:3px;">⭐ Follow</button></td>
            </tr>`;
        }
        statusBox.innerHTML = `Scanning MC ${mc}... Found valid: ${scrapedData.length}`;
        await new Promise(r => setTimeout(r, 200));
    }

    scraping = false;
    document.getElementById('startBtn').style.display = 'inline-block';
    statusBox.innerHTML = `<strong>Completed! Found ${scrapedData.length} records.</strong>`;
};

console.log("Dispatch Link Complete Script Executed Successfully.");
