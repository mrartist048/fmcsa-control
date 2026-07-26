// ====== DYNAMIC FAVICON INJECTOR ======
(function injectFavicon() {
    const faviconUrl = "https://cdn.jsdelivr.net/gh/mrartist048/fmcsa-control@main/fav.png";
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = faviconUrl;
})();

// ====== GLOBAL ACCESS CONTROL & SUBSCRIPTION MANAGEMENT ======
const allowedUsers = {
    "dispatcher_lahore": { maxLaptops: 2, expires: "2026-08-26" },   
    "dispatcher_karachi": { maxLaptops: 0, expires: "2026-05-10" },  
    "dispatchloadify": { maxLaptops: 2, expires: "2026-09-01" },     
};

const FIREBASE_DB_URL = "https://data-scrapper-eddcf-default-rtdb.firebaseio.com/"; 

let currentClient = "unknown";
let userLimit = 0;
let mySessionKey = ""; 
let dispatcherNickname = ""; 

function showPremiumNotification(message, isAlert = false, duration = 4500) {
    let toast = document.createElement('div');
    let bgColor = isAlert ? "#dc3545" : "#002d62";
    let borderColor = isAlert ? "#f8d7da" : "#17a2b8";
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="background: ${isAlert ? '#dc3545' : '#28a745'}; width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 8px ${isAlert ? '#dc3545' : '#28a745'}; animate: pulse 1s infinite;"></div>
            <span>${message}</span>
        </div>
    `;
    toast.style.cssText = `
        position: fixed;
        top: -100px;
        right: 20px;
        background: ${bgColor};
        color: #ffffff;
        padding: 14px 22px;
        border-radius: 6px;
        font-family: sans-serif;
        font-size: 13px;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(0,0,0,0.25);
        border-left: 5px solid ${borderColor};
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

function setupDispatcherIdentity() {
    dispatcherNickname = localStorage.getItem(`scr_nick_${currentClient}`) || "";
    if (!dispatcherNickname) {
        let inputName = prompt("Welcome! Please enter your name (e.g., Nauman, Ali, Bilal):");
        if (inputName && inputName.trim() !== "") {
            dispatcherNickname = inputName.trim();
        } else {
            dispatcherNickname = "User_" + Math.floor(100 + Math.random() * 900);
        }
        localStorage.setItem(`scr_nick_${currentClient}`, dispatcherNickname);
    }
    injectNicknameProfileUI();
}

function injectNicknameProfileUI() {
    if (document.getElementById('scrNickProfilePanel')) return;
    let heading = document.querySelector('h1, h2, .heading') || document.body;
    let panel = document.createElement('div');
    panel.id = 'scrNickProfilePanel';
    panel.style.cssText = "font-family: sans-serif; font-size: 12px; color: #002d62; margin-bottom: 10px; font-weight: bold; background: #e2eafc; padding: 6px 12px; border-radius: 4px; display: inline-block;";
    panel.innerHTML = `👤 User: <span style="color:#28a745;" id="scrDispCurrentName">${dispatcherNickname}</span> <a href="#" onclick="changeDispatcherName(); return false;" style="margin-left:8px; color:#17a2b8; text-decoration:none;">[✏️ Change]</a>`;
    heading.parentNode.insertBefore(panel, heading.nextSibling);
}

window.changeDispatcherName = function() {
    let oldName = localStorage.getItem(`scr_nick_${currentClient}`) || "";
    let newName = prompt("Enter your new display name:", oldName);
    if (newName && newName.trim() !== "") {
        dispatcherNickname = newName.trim();
        localStorage.setItem(`scr_nick_${currentClient}`, dispatcherNickname);
        let label = document.getElementById('scrDispCurrentName');
        if (label) label.innerText = dispatcherNickname;
        checkGlobalSessions(); 
    }
};

function initializeAccessControl() {
    currentClient = window.scrClientID || "unknown";
    
    let isAccessValid = false;
    let clientConfig = allowedUsers[currentClient];

    if (clientConfig) {
        userLimit = clientConfig.maxLaptops || 0;
        const todayStr = new Date().toISOString().split('T')[0]; 
        
        if (userLimit > 0 && todayStr <= clientConfig.expires) {
            isAccessValid = true;
        }
    }

    if (!isAccessValid) {
        document.getElementById('status').innerText = "ERROR: Subscription Expired Please contact the administrator. (Whatsapp 03037654849)";
        document.getElementById('status').style.background = "#f8d7da";
        document.getElementById('status').style.color = "#721c24";
        document.getElementById('status').style.borderLeft = "4px solid #d9534f";
        document.getElementById('startBtn').disabled = true;
        document.getElementById('startBtn').style.opacity = "0.5";
        alert("Your access has been revoked or expired. Contact admin for renewal.");
        throw new Error("Access Denied");
    }

    setupDispatcherIdentity();

    if (!window.name || !window.name.startsWith("fmcsa_tab_")) {
        window.name = "fmcsa_tab_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    }

    showPremiumNotification(`🚀 License Active: Verified for "${currentClient}" (Expires: ${clientConfig.expires})`);

    checkGlobalSessions();
    setInterval(checkGlobalSessions, 5000);
    
    injectHistoryUIFramework();
    injectLiveSupportSystem();
    injectPremiumFiltersUI(); 
    injectEmailProposalPanel(); 
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAccessControl);
} else {
    setTimeout(initializeAccessControl, 300);
}

async function checkGlobalSessions() {
    if (userLimit === 0 || currentClient === "unknown") return;
    const url = `${FIREBASE_DB_URL}sessions/${currentClient}.json`;
    const now = Date.now();
    
    try {
        const res = await fetch(url);
        const data = await res.json() || {};
        
        let activeTabs = Object.keys(data).map(key => ({ dbKey: key, id: data[key].id, timestamp: data[key].timestamp }));
        
        for (let tab of activeTabs) {
            if ((now - tab.timestamp) >= 20000 && tab.id !== window.name) {
                await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${tab.dbKey}.json`, { method: 'DELETE' });
            }
        }
        
        const cleanRes = await fetch(url);
        const cleanData = await cleanRes.json() || {};
        activeTabs = Object.keys(cleanData).map(key => ({ dbKey: key, id: cleanData[key].id, timestamp: data[key].timestamp, nickname: cleanData[key].nickname }));
        
        const currentTabRecord = activeTabs.find(tab => tab.id === window.name);
        
        if (!currentTabRecord && activeTabs.length >= userLimit) {
            document.body.innerHTML = `
                <div style="font-family:sans-serif; text-align:center; padding:50px; margin-top:100px;">
                    <h1 style="color:#dc3545; font-size:30px;">⚠️ Global License Limit Exceeded</h1>
                    <p style="font-size:16px; color:#333;">Your account is limited to a maximum of <b>${userLimit}</b> active instances.</p>
                    <button onclick="window.location.reload()" style="background:#002d62; color:white; border:none; padding:10px 20px; border-radius:4px; font-weight:bold; cursor:pointer; margin-top:15px;">Retry Connection</button>
                </div>
            `;
            throw new Error("Global Session Limit Exceeded");
        }
        
        if (currentTabRecord) {
            mySessionKey = currentTabRecord.dbKey;
            await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${mySessionKey}.json`, {
                method: 'PATCH',
                body: JSON.stringify({ timestamp: now, nickname: dispatcherNickname })
            });
        } else {
            let postRes = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({ id: window.name, timestamp: now, nickname: dispatcherNickname })
            });
            let postData = await postRes.json();
            mySessionKey = postData.name;
        }
        
    } catch (e) {
        console.error("Session sync failed:", e);
    }
}

window.addEventListener('beforeunload', function () {
    if (currentClient === "unknown" || !mySessionKey) return;
    navigator.sendBeacon(`${FIREBASE_DB_URL}sessions/${currentClient}/${mySessionKey}.json?_method=DELETE`);
});

// ====== CORE FOLLOW-UP ENGINE WITH LIVE TEXT & CALENDAR DATE FILTER ======
window.addLeadToFollowUpList = function(index) {
    let record = scrapedData[index];
    if (!record) return;

    let followUpStore = JSON.parse(localStorage.getItem(`scr_followups_${currentClient}`)) || [];
    
    if (followUpStore.some(r => r.mc === record.mc)) {
        return alert("Yeh carrier pehle se hi Follow-Up list mein add hai.");
    }
    
    // Store precise timestamp and local date format
    let d = new Date();
    record.addedAt = d.toLocaleString();
    record.addedDateRaw = d.toISOString().split('T')[0]; // Format: YYYY-MM-DD for picker mapping
    
    followUpStore.push(record);
    localStorage.setItem(`scr_followups_${currentClient}`, JSON.stringify(followUpStore));
    
    showPremiumNotification(`⭐ Added MC ${record.mc} to Follow-Up Manager`, false, 3000);
    if (document.getElementById('scraperFollowUpDrawer').style.right === "0px") renderFollowUpItems();
};

window.toggleFollowUpDrawer = function() {
    let drawer = document.getElementById('scraperFollowUpDrawer');
    let historyDrawer = document.getElementById('scraperHistoryDrawer');
    if (!drawer) return;
    
    if(historyDrawer) historyDrawer.style.right = "-420px"; 
    
    if (drawer.style.right === "0px") {
        drawer.style.right = "-420px";
    } else {
        drawer.style.right = "0px";
        let searchInput = document.getElementById('followUpSearchInput');
        let dateInput = document.getElementById('followUpDateInput');
        if(searchInput) searchInput.value = ""; 
        if(dateInput) dateInput.value = ""; // Reset filters on open
        renderFollowUpItems(); 
    }
};

window.clearFollowUpFilters = function() {
    let searchInput = document.getElementById('followUpSearchInput');
    let dateInput = document.getElementById('followUpDateInput');
    if(searchInput) searchInput.value = "";
    if(dateInput) dateInput.value = "";
    renderFollowUpItems();
};

window.deleteFollowUpItem = function(mcNumber) {
    if (confirm("Remove this carrier from Follow-Ups?")) {
        let followUpStore = JSON.parse(localStorage.getItem(`scr_followups_${currentClient}`)) || [];
        followUpStore = followUpStore.filter(r => r.mc !== mcNumber);
        localStorage.setItem(`scr_followups_${currentClient}`, JSON.stringify(followUpStore));
        renderFollowUpItems();
    }
};

window.downloadFollowUpsCSV = function() {
    let followUpStore = JSON.parse(localStorage.getItem(`scr_followups_${currentClient}`)) || [];
    if (followUpStore.length === 0) return alert("Follow-up list khali hai.");
    triggerCSVDownload(followUpStore, `FMCSA_FollowUps_${dispatcherNickname}.csv`);
};

function renderFollowUpItems() {
    const listContainer = document.getElementById('drawerFollowUpList');
    if (!listContainer) return;

    let data = JSON.parse(localStorage.getItem(`scr_followups_${currentClient}`)) || [];
    data = data.reverse(); 

    // Read pipeline parameters
    let filterQuery = (document.getElementById('followUpSearchInput')?.value || "").toLowerCase().trim();
    let filterDate = document.getElementById('followUpDateInput')?.value || ""; // Format: YYYY-MM-DD

    if (data.length === 0) {
        listContainer.innerHTML = `<p style="color: #6c757d; font-size: 13px; font-style: italic; text-align: center; margin-top: 30px;">No follow-up leads saved yet.</p>`;
        return;
    }

    let itemsHTML = "";
    let matchCount = 0;

    data.forEach(item => {
        let mcString = (item.mc || "").toString().toLowerCase();
        let nameString = (item.name || "").toLowerCase();
        let phoneString = (item.phone || "").toLowerCase();
        let itemDateRaw = item.addedDateRaw || ""; 

        // 1. Check Text Filter Constraints
        if (filterQuery !== "") {
            let textMatches = mcString.includes(filterQuery) || nameString.includes(filterQuery) || phoneString.includes(filterQuery);
            if (!textMatches) return;
        }

        // 2. Check Calendar Date Filter Constraints
        if (filterDate !== "") {
            if (itemDateRaw !== filterDate) return; // Skip if date block does not match picker value
        }

        matchCount++;
        itemsHTML += `
            <div style="background: #fdfdfd; border: 1px solid #e9ecef; border-left: 4px solid #17a2b8; padding: 12px; margin-bottom: 10px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); font-family:sans-serif;">
                <div style="font-size: 11px; color: #6c757d; font-weight: bold;">Saved: ${item.addedAt}</div>
                <div style="font-size: 14px; font-weight: bold; color: #002d62; margin: 4px 0;">${item.name}</div>
                <div style="font-size: 12px; color:#333;"><b>MC:</b> ${item.mc} | <b>Phone:</b> ${item.phone || 'N/A'}</div>
                <div style="font-size: 12px; color:#333; margin-top:3px;"><b>Email:</b> ${item.email || 'N/A'}</div>
                <div style="font-size: 12px; color: #555; background: #f1f3f4; padding: 4px 6px; margin-top: 6px; border-radius: 3px; font-style:italic;">
                    <b>Remarks:</b> ${item.remarks || 'No remarks added'}
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 5px; margin-top: 8px;">
                    <button onclick="triggerOneClickEmailPitch('${item.email}', '${item.name.replace(/'/g, "\\'")}')" style="background: #17a2b8; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: bold;">📩 Pitch</button>
                    <button onclick="deleteFollowUpItem(${item.mc})" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 11px; font-weight: bold;">🗑️ Drop</button>
                </div>
            </div>
        `;
    });

    if (matchCount === 0) {
        listContainer.innerHTML = `<p style="color: #6c757d; font-size: 13px; font-style: italic; text-align: center; margin-top: 30px;">No matching follow-up rows found.</p>`;
    } else {
        listContainer.innerHTML = itemsHTML;
    }
}

// ====== INDEXEDDB HISTORY SETUP ======
let db;
let currentHistoryId = null; 
const request = indexedDB.open("ScraperHistoryDB", 1);
request.onupgradeneeded = function(e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains("history")) {
        db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
    }
};
request.onsuccess = function(e) {
    db = e.target.result;
    injectHistoryUIFramework(); 
};

function injectHistoryUIFramework() {
    if (!document.getElementById('scrResponsiveLayoutTheme')) {
        let styleTag = document.createElement('style');
        styleTag.id = 'scrResponsiveLayoutTheme';
        styleTag.innerHTML = `
            .container, .container-fluid { width: 100% !important; max-width: 100% !important; padding: 15px !important; box-sizing: border-box !important; }
            .table-responsive { width: 100% !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; margin-bottom: 20px !important; border: 1px solid #ddd !important; border-radius: 4px !important; }
            table.table { width: 100% !important; min-width: 1200px !important; table-layout: auto !important; border-collapse: collapse !important; }
            table.table th, table.table td { padding: 10px 8px !important; vertical-align: middle !important; text-align: left !important; }
            .remarks-cell-container { min-width: 200px !important; width: 220px !important; }
            .remarks-input-field { width: 100% !important; border: 1px solid #b6ccfe !important; border-radius: 4px !important; padding: 8px 10px !important; font-size: 13px !important; box-sizing: border-box !important; color: #333 !important; background: #fafafa !important; transition: border-color 0.2s, background 0.2s; }
            .remarks-input-field:focus { border-color: #002d62 !important; background: #ffffff !important; outline: none !important; box-shadow: 0 0 4px rgba(0,45,98,0.15) !important; }
            .premium-copy-badge { position: absolute; background: #28a745; color: white; padding: 2px 6px; font-size: 10px; border-radius: 3px; top: -15px; left: 50%; transform: translateX(-50%); z-index: 100; font-weight: bold; }
            .premium-pitch-btn { display: inline-block; background: #17a2b8; color: white; text-decoration: none; font-size: 10px; font-weight: bold; padding: 4px 6px; border-radius: 3px; border: 1px solid #138496; margin-left: 5px; transition: background 0.2s; vertical-align: middle; }
            .premium-pitch-btn:hover { background: #138496; }
            .premium-followup-btn { display: inline-block; background: #ffc107; color: #212529; text-decoration: none; font-size: 10px; font-weight: bold; padding: 5px 8px; border-radius: 3px; border: 1px solid #e0a800; cursor: pointer; font-family: sans-serif; transition: background 0.2s; }
            .premium-followup-btn:hover { background: #e0a800; }
        `;
        document.head.appendChild(styleTag);
    }

    let coreTable = document.querySelector('table');
    if (coreTable && !coreTable.parentNode.classList.contains('table-responsive')) {
        let wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'table-responsive';
        coreTable.parentNode.insertBefore(wrapperDiv, coreTable);
        wrapperDiv.appendChild(coreTable);
    }

    let mainHeading = document.querySelector('h1, h2, .heading') || document.querySelector('div'); 
    if (mainHeading && !document.getElementById('devCreditTag')) {
        mainHeading.style.position = 'relative';
        let creditTag = document.createElement('span');
        creditTag.id = 'devCreditTag';
        creditTag.innerHTML = "Created by <b>Mr. Nauman (Ph: 03037654849)</b>";
        creditTag.style.cssText = "position: absolute; right: 0; bottom: 5px; font-size: 11px; color: #6c757d; font-family: sans-serif; font-weight: normal;";
        mainHeading.appendChild(creditTag);
    }

    let startBtn = document.getElementById('startBtn');
    if (startBtn && !document.getElementById('openHistoryBtn')) {
        let historyBtn = document.createElement('button');
        historyBtn.id = 'openHistoryBtn';
        historyBtn.innerHTML = "📜 View History";
        historyBtn.style.cssText = "background: #002d62; color: white; border: 1px solid #001a3a; padding: 8px 16px; font-size: 14px; font-weight: bold; font-family: sans-serif; border-radius: 4px; cursor: pointer; margin-left: 10px; display: inline-block; vertical-align: middle;";
        historyBtn.onclick = toggleHistoryDrawer;
        startBtn.parentNode.insertBefore(historyBtn, startBtn.nextSibling);
        
        let followUpBtn = document.createElement('button');
        followUpBtn.id = 'openFollowUpDrawerBtn';
        followUpBtn.innerHTML = "📅 View Follow-Ups";
        followUpBtn.style.cssText = "background: #17a2b8; color: white; border: 1px solid #138496; padding: 8px 16px; font-size: 14px; font-weight: bold; font-family: sans-serif; border-radius: 4px; cursor: pointer; margin-left: 8px; display: inline-block; vertical-align: middle;";
        followUpBtn.onclick = toggleFollowUpDrawer;
        startBtn.parentNode.insertBefore(followUpBtn, historyBtn.nextSibling);
    }

    if (!document.getElementById('scraperHistoryDrawer')) {
        let drawer = document.createElement('div');
        drawer.id = 'scraperHistoryDrawer';
        drawer.style.cssText = "position: fixed; top: 0; right: -420px; width: 400px; height: 100%; background: #ffffff; box-shadow: -5px 0 15px rgba(0,0,0,0.15); z-index: 999999; transition: right 0.3s ease-in-out; padding: 20px; box-sizing: border-box; font-family: sans-serif; display: flex; flex-direction: column;";
        drawer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #002d62; padding-bottom: 10px; margin-bottom: 15px;">
                <h3 style="color: #002d62; margin: 0; font-size: 18px;">Saved Sheets History</h3>
                <button onclick="toggleHistoryDrawer()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #6c757d; font-weight: bold;">&times;</button>
            </div>
            <div id="drawerHistoryList" style="flex: 1; overflow-y: auto; padding-right: 5px;"></div>
        `;
        document.body.appendChild(drawer);
    }

    // Dynamic Follow-Up Drawer Structural Injection with Dual Search/Calendar Row
    if (!document.getElementById('scraperFollowUpDrawer')) {
        let fDrawer = document.createElement('div');
        fDrawer.id = 'scraperFollowUpDrawer';
        fDrawer.style.cssText = "position: fixed; top: 0; right: -420px; width: 400px; height: 100%; background: #ffffff; box-shadow: -5px 0 15px rgba(0,0,0,0.15); z-index: 999999; transition: right 0.3s ease-in-out; padding: 20px; box-sizing: border-box; font-family: sans-serif; display: flex; flex-direction: column;";
        fDrawer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #17a2b8; padding-bottom: 10px; margin-bottom: 10px;">
                <h3 style="color: #17a2b8; margin: 0; font-size: 18px;">📅 Follow-Up Pipeline</h3>
                <button onclick="toggleFollowUpDrawer()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #6c757d; font-weight: bold;">&times;</button>
            </div>
            
            <!-- Dual Filtering Layout (Text Search + Calendar Input Node) -->
            <div style="display: flex; gap: 6px; margin-bottom: 10px; align-items: center;">
                <input type="text" id="followUpSearchInput" placeholder="🔍 Search MC, Name, Phone..." style="flex: 1; padding: 8px 10px; font-size: 12px; border: 1px solid #b6ccfe; border-radius: 4px; box-sizing: border-box;" oninput="renderFollowUpItems()">
                
                <div style="position: relative; display: flex; align-items: center; border: 1px solid #b6ccfe; border-radius: 4px; padding: 3px 6px; background: #fff;">
                    <span style="font-size: 14px; margin-right: 4px; cursor: pointer;" onclick="document.getElementById('followUpDateInput').showPicker()">📅</span>
                    <input type="date" id="followUpDateInput" style="border: none; font-size: 12px; font-family: sans-serif; outline: none; width: 105px; cursor: pointer;" onchange="renderFollowUpItems()">
                </div>

                <button onclick="clearFollowUpFilters()" style="background: #e2eafc; border: 1px solid #b6ccfe; color: #002d62; padding: 7px 10px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer;" title="Clear Filters">🔄</button>
            </div>

            <div style="margin-bottom: 12px;">
                <button onclick="downloadFollowUpsCSV()" style="background: #28a745; color: white; border: none; padding: 6px 14px; font-weight: bold; font-size: 12px; border-radius: 4px; cursor: pointer; width: 100%;">📥 Download Follow-Ups Sheet</button>
            </div>
            <div id="drawerFollowUpList" style="flex: 1; overflow-y: auto; padding-right: 5px;"></div>
        `;
        document.body.appendChild(fDrawer);
    }

    let tableHeader = document.querySelector('table.table thead tr, table tr');
    if (tableHeader && !document.getElementById('remarksHeaderCol')) {
        let remTh = document.createElement('th');
        remTh.id = 'remarksHeaderCol';
        remTh.className = 'remarks-cell-container';
        remTh.innerText = "Remarks";
        remTh.style.cssText = "background: #002d62; color: white; padding: 10px; font-size: 14px;";
        tableHeader.appendChild(remTh);
        
        let followTh = document.createElement('th');
        followTh.id = 'followUpHeaderCol';
        followTh.innerText = "Action";
        followTh.style.cssText = "background: #002d62; color: white; padding: 10px; font-size: 14px;";
        tableHeader.appendChild(followTh);
    }
}

function injectPremiumFiltersUI() {
    let statusBox = document.getElementById('status');
    if (!statusBox || document.getElementById('premiumFilterWrapper')) return;

    let filterPanel = document.createElement('div');
    filterPanel.id = 'premiumFilterWrapper';
    filterPanel.style.cssText = "display: flex; flex-wrap: wrap; gap: 15px; align-items: center; background: #fdfdfd; padding: 15px; margin: 15px 0; border: 1px solid #e2eafc; border-radius: 6px; font-family: sans-serif;";
    filterPanel.innerHTML = `
        <div style="flex: 1; min-width: 240px;">
            <label style="font-size: 11px; font-weight: bold; color: #002d62; display: block; margin-bottom: 4px;">🔍 Live Text Filter</label>
            <input type="text" id="premiumLiveSearch" placeholder="Type to filter rows instantly..." style="width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid #b6ccfe; border-radius: 4px; box-sizing: border-box;">
        </div>
        <div style="width: 180px;">
            <label style="font-size: 11px; font-weight: bold; color: #002d62; display: block; margin-bottom: 4px;">📍 Filter by US State</label>
            <select id="premiumStateFilter" style="width: 100%; padding: 8px; font-size: 13px; border: 1px solid #b6ccfe; border-radius: 4px; background: white;">
                <option value="ALL">All States (No Filter)</option>
                <option value="AL">AL - Alabama</option><option value="CA">CA - California</option><option value="FL">FL - Florida</option><option value="GA">GA - Georgia</option><option value="IL">IL - Illinois</option><option value="NY">NY - New York</option><option value="TX">TX - Texas</option>
            </select>
        </div>
        <div style="background: #e2eafc; padding: 8px 15px; border-radius: 4px; display: flex; gap: 15px; font-size: 12px; font-weight: bold; color: #001a3a; height: 35px; align-items: center; margin-top: 15px;">
            <div>Scraped: <span id="premiumCountTotal">0</span></div>
            <div>Visible: <span id="premiumCountVisible">0</span></div>
        </div>
    `;
    statusBox.parentNode.insertBefore(filterPanel, statusBox.nextSibling);

    document.getElementById('premiumLiveSearch').addEventListener('input', executePremiumUIPipeline);
    document.getElementById('premiumStateFilter').addEventListener('change', executePremiumUIPipeline);
}

function injectEmailProposalPanel() {
    let filterWrapper = document.getElementById('premiumFilterWrapper');
    if (!filterWrapper || document.getElementById('premiumProposalWrapper')) return;

    let savedSubject = localStorage.getItem(`scr_subj_${currentClient}`) || "Dispatch Service Proposal";
    let savedBody = localStorage.getItem(`scr_body_${currentClient}`) || "Hello,\n\nWe found your profile via FMCSA. We offer dispatching services at 5% rate.\n\nBest Regards.";

    let proposalPanel = document.createElement('div');
    proposalPanel.id = 'premiumProposalWrapper';
    proposalPanel.style.cssText = "background: #f4f7fe; padding: 15px; margin-bottom: 15px; border: 1px solid #b6ccfe; border-radius: 6px; font-family: sans-serif;";
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
    filterWrapper.parentNode.insertBefore(proposalPanel, filterWrapper.nextSibling);
}

window.saveProposalTemplateSettings = function() {
    localStorage.setItem(`scr_subj_${currentClient}`, document.getElementById('propSubjectInput').value);
    localStorage.setItem(`scr_body_${currentClient}`, document.getElementById('propBodyInput').value);
    alert("Template saved!");
    document.getElementById('proposalInputsBlock').style.display = 'none';
};

window.triggerOneClickEmailPitch = function(emailAddress, companyName) {
    if (!emailAddress || emailAddress === 'N/A') return;
    let subj = localStorage.getItem(`scr_subj_${currentClient}`) || "Dispatch Proposal";
    let body = localStorage.getItem(`scr_body_${currentClient}`) || "Hello";
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

function executePremiumUIPipeline() {
    let searchText = document.getElementById('premiumLiveSearch').value.toLowerCase().trim();
    let selectedState = document.getElementById('premiumStateFilter').value;
    let tableRows = document.querySelectorAll('#resultsTable tr');
    let visibleCounter = 0;

    tableRows.forEach(row => {
        let cells = row.getElementsByTagName('td');
        if (cells.length === 0) return;
        let mcText = cells[0]?.textContent.toLowerCase() || "";
        let nameText = cells[2]?.textContent.toLowerCase() || "";
        let phoneText = cells[5]?.textContent.toLowerCase() || "";
        let addressText = cells[6]?.textContent.toUpperCase() || ""; 

        let textMatch = mcText.includes(searchText) || nameText.includes(searchText) || phoneText.includes(searchText);
        let stateMatch = (selectedState === "ALL") || (new RegExp(`\\b${selectedState}\\b`)).test(addressText);

        if (textMatch && stateMatch) { row.style.display = ""; visibleCounter++; } else { row.style.display = "none"; }
    });
    document.getElementById('premiumCountTotal').innerText = scrapedData.length;
    document.getElementById('premiumCountVisible').innerText = visibleCounter;
}

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
    if (!emailAddress || emailAddress === 'N/A') return `<td style="color: #6c757d;">N/A</td>`;
    let escapedName = companyName.replace(/'/g, "\\'");
    return `
        <td style="position: relative; vertical-align: middle;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <span onclick="copyEmailToClipboard(this.parentNode, '${emailAddress}')" style="color: #002d62; font-weight: bold; cursor: pointer;">${emailAddress}</span>
                <a href="#" onclick="triggerOneClickEmailPitch('${emailAddress}', '${escapedName}'); return false;" class="premium-pitch-btn">📩 Pitch</a>
            </div>
        </td>
    `;
}

window.syncRemarksData = function(index, value) {
    if (scrapedData[index]) {
        scrapedData[index].remarks = value;
        updateRealTimeHistory(scrapedData, false);
    }
};

function generateCSVString(recordsData) {
    let csv = "MC Number,USDOT Number,Company Name,Entity Type,Operating Status,Phone,Address,Email,Power Units,Remarks\n"; 
    recordsData.forEach(r => { 
        csv += `${r.mc},${r.usdot},"${r.name}","${r.entityType}","${r.status}","${r.phone || 'N/A'}","${r.address}","${r.email}","${r.powerUnits}","${(r.remarks || '').replace(/"/g, '""')}"\n`; 
    });
    return csv;
}

window.toggleHistoryDrawer = function() {
    let drawer = document.getElementById('scraperHistoryDrawer');
    let followUpDrawer = document.getElementById('scraperFollowUpDrawer');
    if (!drawer) return;
    
    if(followUpDrawer) followUpDrawer.style.right = "-420px"; 
    
    if (drawer.style.right === "0px") { drawer.style.right = "-420px"; } else { drawer.style.right = "0px"; renderHistoryItems(); }
};

function buildDialerCellMarkup(phoneNum) {
    if (!phoneNum || phoneNum === 'N/A') return `<td>N/A</td>`;
    let rawDigits = phoneNum.replace(/[^0-9+]/g, '');
    return `
        <td style="padding: 4px !important; width: 140px; vertical-align: middle;">
            <a href="tel:${rawDigits}" style="display: flex; flex-direction: column; align-items: center; background: #e2eafc; color: #002d62; text-decoration: none; padding: 8px 4px; border-radius: 4px; border: 1px solid #b6ccfe; font-size: 11px; font-weight: bold; min-height: 52px; justify-content: center;">
                <span>📞</span><span>${phoneNum}</span>
            </a>
        </td>
    `;
}

// ====== INTERACTIVE HISTORY RESTORATION LOGIC ======
window.loadHistorySheetToTable = async function(id) {
    const tx = db.transaction("history", "readonly");
    const req = tx.objectStore("history").get(id);

    req.onsuccess = async function() {
        const item = req.result;
        if (!item || !item.records) return;
        scrapedData = item.records; 
        currentHistoryId = item.id;

        const tableBody = document.getElementById('resultsTable');
        tableBody.innerHTML = '';
        
        for (let index = 0; index < scrapedData.length; index++) {
            let record = scrapedData[index];
            let dialerCellHTML = buildDialerCellMarkup(record.phone);
            let emailCellHTML = buildEmailCellMarkup(record.email, record.name);

            tableBody.innerHTML += `<tr>
                <td><b>${record.mc}</b></td>
                <td>${record.usdot}</td>
                <td>${record.name}</td>
                <td>${record.entityType}</td>
                <td><span class="badge badge-active">${record.status}</span></td>
                ${dialerCellHTML}
                <td>${record.address}</td> 
                ${emailCellHTML}
                <td>${record.powerUnits}</td>
                <td class="remarks-cell-container"><input type="text" value="${record.remarks || ''}" class="remarks-input-field" oninput="syncRemarksData(${index}, this.value)" /></td>
                <td><button onclick="addLeadToFollowUpList(${index})" class="premium-followup-btn">⭐ Follow</button></td>
            </tr>`;
        }
        executePremiumUIPipeline(); 
        toggleHistoryDrawer(); 
    };
};

window.downloadHistoryCSV = function(id) {
    const tx = db.transaction("history", "readonly");
    const store = tx.objectStore("history");
    const req = store.get(id);
    req.onsuccess = function() {
        const item = req.result;
        if (item && item.records.length > 0) {
            triggerCSVDownload(item.records, `History_MC_${item.range.replace(/\s+/g, '_')}.csv`);
        }
    };
};

window.deleteHistoryItem = function(id) {
    if (confirm("Delete this sheet from history?")) {
        const tx = db.transaction("history", "readwrite");
        const store = tx.objectStore("history");
        store.delete(id);
        tx.oncomplete = function() {
            renderHistoryItems();
        };
    }
};

function renderHistoryItems() {
    if (!db) return;
    const tx = db.transaction("history", "readonly");
    const getAll = tx.objectStore("history").getAll();

    getAll.onsuccess = function() {
        const data = getAll.result.reverse(); 
        let itemsHTML = "";
        data.forEach(item => {
            itemsHTML += `
                <div style="background: #f8f9fa; border-left: 4px solid #002d62; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
                    <div style="font-size: 14px; font-weight: bold; color: #333; margin: 4px 0;">Range: ${item.range}</div>
                    <div style="font-size: 12px; margin-bottom: 6px;">Total Records: ${item.totalRecords}</div>
                    <div style="display: flex; gap: 5px; margin-top: 8px;">
                        <button onclick="loadHistorySheetToTable(${item.id})" style="background: #002d62; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold;">📂 Open</button>
                        <button onclick="downloadHistoryCSV(${item.id})" ${item.totalRecords === 0 ? 'disabled style="opacity:0.5; background:#6c757d;"' : 'style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold;"'}>📥 CSV</button>
                        <button onclick="deleteHistoryItem(${item.id})" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold;">🗑️ Delete</button>
                    </div>
                </div>`;
        });
        document.getElementById('drawerHistoryList').innerHTML = itemsHTML || '<p style="color:#6c757d; font-size:13px; text-align:center;">No history records found.</p>';
    };
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
        }
    };
}

function injectLiveSupportSystem() {
    if (document.getElementById('scrSupportFloatingBtn')) return;
    let btn = document.createElement('button');
    btn.id = 'scrSupportFloatingBtn'; btn.innerHTML = "💬 Help";
    btn.style.cssText = "position: fixed; bottom: 20px; left: 20px; background: #002d62; color: #fff; padding: 10px 18px; border-radius: 30px; cursor: pointer; z-index: 999998;";
    document.body.appendChild(btn);
}

async function fetchViaProxy(targetUrl) {
    try {
        let res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`);
        if (res.ok) return await res.text();
    } catch (e) {}
    let res2 = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`);
    return await res2.text();
}

let scraping = false; let scrapedData = [];
window.stopScraping = function() { scraping = false; }

window.startScraping = async function() {
    const start = parseInt(document.getElementById('startMc').value);
    const end = parseInt(document.getElementById('endMc').value);
    if (isNaN(start) || isNaN(end) || start > end) return;

    scraping = true; scrapedData = [];
    const tableBody = document.getElementById('resultsTable');
    tableBody.innerHTML = '';
    
    if (db) {
        const tx = db.transaction("history", "readwrite");
        tx.objectStore("history").add({
            date: new Date().toLocaleString(),
            range: `${start} - ${end}`,
            totalRecords: 0,
            status: "Running",
            records: []
        }).onsuccess = function(e) { currentHistoryId = e.target.result; };
    }

    for (let mc = start; mc <= end; mc++) {
        if (!scraping) break;
        try {
            const htmlText = await fetchViaProxy(`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mc}`);
            if (!htmlText || !htmlText.includes("USDOT Number:")) continue;

            let record = { mc: mc, usdot: 'N/A', name: 'N/A', entityType: 'N/A', status: 'N/A', phone: 'N/A', address: 'N/A', email: 'N/A', powerUnits: 'N/A', remarks: '' };
            let el = document.createElement('html'); el.innerHTML = htmlText;
            let cells = el.querySelectorAll('td, th');
            
            for (let i = 0; i < cells.length; i++) {
                let text = cells[i].textContent.trim();
                if (text.startsWith("Legal Name:")) record.name = cells[i+1]?.textContent.trim().replace(/\s+/g, ' ');
                if (text.startsWith("USDOT Number:")) record.usdot = cells[i+1]?.textContent.trim().split(/\s+/)[0];
                if (text.startsWith("Operating Authority Status:")) record.status = cells[i+1]?.textContent.includes("AUTHORIZED") ? "AUTHORIZED" : "NOT AUTHORIZED";
                if (text.startsWith("Phone:")) record.phone = cells[i+1]?.textContent.trim();
                if (text.startsWith("Physical Address:")) record.address = cells[i+1]?.textContent.trim().replace(/\s+/g, ' ');
            }

            if (record.status !== "AUTHORIZED") continue;

            let smsHtml = await fetchViaProxy(`https://ai.fmcsa.dot.gov/SMS/Carrier/${record.usdot}/CarrierRegistration.aspx`);
            if (smsHtml) {
                let m = smsHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (m) record.email = m[0];
            }

            scrapedData.push(record);
            let recordIndex = scrapedData.length - 1;
            updateRealTimeHistory(scrapedData, false);

            let dialerCellHTML = buildDialerCellMarkup(record.phone);
            let emailCellHTML = buildEmailCellMarkup(record.email, record.name);

            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${record.mc}</b></td>
                <td>${record.usdot}</td>
                <td>${record.name}</td>
                <td>${record.entityType}</td>
                <td><span class="badge badge-active">${record.status}</span></td>
                ${dialerCellHTML}
                <td>${record.address}</td> 
                ${emailCellHTML}
                <td>${record.powerUnits}</td>
                <td class="remarks-cell-container"><input type="text" class="remarks-input-field" placeholder="Add remarks..." oninput="syncRemarksData(${recordIndex}, this.value)" /></td>
                <td><button onclick="addLeadToFollowUpList(${recordIndex})" class="premium-followup-btn">⭐ Follow</button></td>
            `;
            tableBody.appendChild(tr);
            executePremiumUIPipeline();

        } catch (err) {}
        await new Promise(r => setTimeout(r, 2000));
    }
    scraping = false;
    if(scrapedData.length > 0) updateRealTimeHistory(scrapedData, true);
}

function triggerCSVDownload(recordsData, filename) {
    const csv = generateCSVString(recordsData);
    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

window.downloadCSV = function() {
    if(scrapedData.length > 0) {
        const start = document.getElementById('startMc').value;
        const end = document.getElementById('endMc').value;
        triggerCSVDownload(scrapedData, `SAFER_Data_${start}_to_${end}.csv`);
    }
}
