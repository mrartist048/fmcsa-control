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
    "dispatchloadify": { maxLaptops: 5, expires: "2026-09-01" },     
};

const FIREBASE_DB_URL = "https://data-scrapper-eddcf-default-rtdb.firebaseio.com/"; 

let currentClient = "unknown";
let userLimit = 0;
let mySessionKey = ""; 
let dispatcherNickname = ""; // Stores user's real custom name

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
        let inputName = prompt("Welcome! Please enter your name for team synchronization (e.g., Nauman, Ali, Bilal):");
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
    panel.innerHTML = `👤 Active Dispatcher: <span style="color:#28a745;" id="scrDispCurrentName">${dispatcherNickname}</span> <a href="#" onclick="changeDispatcherName(); return false;" style="margin-left:8px; color:#17a2b8; text-decoration:none;">[✏️ Change Name]</a>`;
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
        checkGlobalSessions(); // Force metadata update on server
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

    checkGlobalSessions().then(() => {
        listenForIncomingLeads();
    });
    
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
        activeTabs = Object.keys(cleanData).map(key => ({ dbKey: key, id: cleanData[key].id, timestamp: data[key].timestamp, nickname: data[key].nickname }));
        
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

// ====== REAL-TIME INTER-LAPTOP LEAD SHARING SYSTEM ======
async function fetchActivePeerLaptops() {
    try {
        const res = await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}.json`);
        const data = await res.json() || {};
        return Object.keys(data).map(key => ({
            sessionKey: key,
            id: data[key].id,
            nickname: data[key].nickname || "Dispatcher"
        })).filter(peer => peer.id !== window.name);
    } catch (e) {
        return [];
    }
}

window.shareLeadWithPeerLaptop = async function(index, selectElement) {
    let targetSessionKey = selectElement.value;
    if (!targetSessionKey || targetSessionKey === "") return;
    
    let record = scrapedData[index];
    if (!record) return;

    selectElement.disabled = true;
    
    try {
        let payload = {
            sender: dispatcherNickname,
            timestamp: Date.now(),
            record: record
        };

        await fetch(`${FIREBASE_DB_URL}transfers/${currentClient}/${targetSessionKey}.json`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        
        alert(`Lead transferred successfully to ${selectElement.options[selectElement.selectedIndex].text}!`);
    } catch (err) {
        alert("Transfer failed. Please check network connectivity.");
    } finally {
        selectElement.value = "";
        selectElement.disabled = false;
    }
};

function listenForIncomingLeads() {
    if (!mySessionKey || currentClient === "unknown") return;
    
    setInterval(async () => {
        try {
            const url = `${FIREBASE_DB_URL}transfers/${currentClient}/${mySessionKey}.json`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (data && data.record) {
                await fetch(url, { method: 'DELETE' });
                
                let incomingRecord = data.record;
                incomingRecord.remarks = `[From ${data.sender}] ` + (incomingRecord.remarks || "");
                
                if (!scrapedData.some(r => r.mc === incomingRecord.mc)) {
                    scrapedData.unshift(incomingRecord); 
                    
                    showPremiumNotification(`📥 Incoming Lead! ${data.sender} sent you MC ${incomingRecord.mc}`, true, 6000);
                    
                    const tableBody = document.getElementById('resultsTable');
                    if (tableBody) {
                        let recordIndex = scrapedData.length - 1; 
                        let dialerCellHTML = buildDialerCellMarkup(incomingRecord.phone);
                        let emailCellHTML = buildEmailCellMarkup(incomingRecord.email, incomingRecord.name);
                        let peerOptionsHTML = await buildPeerSelectionOptionsMarkup(recordIndex);

                        let rowHTML = `<tr style="background: #fff3cd; transition: background 2s;">
                            <td><b>${incomingRecord.mc}</b></td>
                            <td>${incomingRecord.usdot}</td>
                            <td>${incomingRecord.name}</td>
                            <td>${incomingRecord.entityType}</td>
                            <td><span class="badge badge-active">${incomingRecord.status}</span></td>
                            ${dialerCellHTML}
                            <td>${incomingRecord.address}</td> 
                            ${emailCellHTML}
                            <td>${incomingRecord.powerUnits}</td>
                            <td class="remarks-cell-container"><input type="text" value="${incomingRecord.remarks}" class="remarks-input-field" oninput="syncRemarksData(${recordIndex}, this.value)" /></td>
                            <td>${peerOptionsHTML}</td>
                        </tr>`;
                        
                        tableBody.insertAdjacentHTML('afterbegin', rowHTML);
                        
                        setTimeout(() => {
                            let firstRow = tableBody.querySelector('tr');
                            if(firstRow) firstRow.style.background = "";
                        }, 3000);
                    }
                    updateRealTimeHistory(scrapedData, false);
                    executePremiumUIPipeline();
                }
            }
        } catch (e) {
            console.error("Error polling lead transfers:", e);
        }
    }, 3500);
}

async function buildPeerSelectionOptionsMarkup(index) {
    let peers = await fetchActivePeerLaptops();
    if (peers.length === 0) {
        return `<span style="color: #6c757d; font-size: 11px; font-style: italic;">No dispatchers online</span>`;
    }
    
    let options = `<option value="" selected disabled>Send to...</option>`;
    peers.forEach(p => {
        options += `<option value="${p.sessionKey}">👤 ${p.nickname}</option>`;
    });

    return `
        <select onchange="shareLeadWithPeerLaptop(${index}, this)" style="padding: 4px; font-size: 11px; font-weight: bold; border: 1px solid #b6ccfe; border-radius: 4px; background: #fff; max-width: 120px;">
            ${options}
        </select>
    `;
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
            table.table { width: 100% !important; min-width: 1300px !important; table-layout: auto !important; border-collapse: collapse !important; }
            table.table th, table.table td { padding: 10px 8px !important; vertical-align: middle !important; text-align: left !important; }
            .remarks-cell-container { min-width: 200px !important; width: 220px !important; }
            .remarks-input-field { width: 100% !important; border: 1px solid #b6ccfe !important; border-radius: 4px !important; padding: 8px 10px !important; font-size: 13px !important; box-sizing: border-box !important; color: #333 !important; background: #fafafa !important; transition: border-color 0.2s, background 0.2s; }
            .remarks-input-field:focus { border-color: #002d62 !important; background: #ffffff !important; outline: none !important; box-shadow: 0 0 4px rgba(0,45,98,0.15) !important; }
            .premium-copy-badge { position: absolute; background: #28a745; color: white; padding: 2px 6px; font-size: 10px; border-radius: 3px; top: -15px; left: 50%; transform: translateX(-50%); z-index: 100; font-weight: bold; }
            .premium-pitch-btn { display: inline-block; background: #17a2b8; color: white; text-decoration: none; font-size: 10px; font-weight: bold; padding: 4px 6px; border-radius: 3px; border: 1px solid #138496; margin-left: 5px; transition: background 0.2s; vertical-align: middle; }
            .premium-pitch-btn:hover { background: #138496; }
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

    let mainHeading = document.querySelector('h1, h2, .heading'); 
    if (!mainHeading) {
        const headings = document.querySelectorAll('div, h1, h2, h3');
        for (let h of headings) {
            if (h.textContent.includes("FMCSA SAFER")) {
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
        creditTag.style.cssText = `
            position: absolute;
            right: 0;
            bottom: 5px;
            font-size: 11px;
            color: #6c757d;
            font-family: sans-serif;
            font-weight: normal;
        `;
        mainHeading.appendChild(creditTag);
    }

    let startBtn = document.getElementById('startBtn');
    if (startBtn && !document.getElementById('openHistoryBtn')) {
        let historyBtn = document.createElement('button');
        historyBtn.id = 'openHistoryBtn';
        historyBtn.innerHTML = "📜 View History";
        historyBtn.style.cssText = `
            background: #002d62;
            color: white;
            border: 1px solid #001a3a;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: bold;
            font-family: sans-serif;
            border-radius: 4px;
            cursor: pointer;
            margin-left: 10px;
            display: inline-block;
            vertical-align: middle;
            transition: background 0.2s;
        `;
        historyBtn.onmouseover = () => historyBtn.style.background = "#001a3a";
        historyBtn.onmouseout = () => historyBtn.style.background = "#002d62";
        historyBtn.onclick = toggleHistoryDrawer;
        
        startBtn.parentNode.insertBefore(historyBtn, startBtn.nextSibling);
    }

    if (!document.getElementById('scraperHistoryDrawer')) {
        let drawer = document.createElement('div');
        drawer.id = 'scraperHistoryDrawer';
        drawer.style.cssText = `
            position: fixed;
            top: 0;
            right: -420px;
            width: 400px;
            height: 100%;
            background: #ffffff;
            box-shadow: -5px 0 15px rgba(0,0,0,0.15);
            z-index: 999999;
            transition: right 0.3s ease-in-out;
            padding: 20px;
            box-sizing: border-box;
            font-family: sans-serif;
            display: flex;
            flex-direction: column;
        `;
        
        drawer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #002d62; padding-bottom: 10px; margin-bottom: 15px;">
                <h3 style="color: #002d62; margin: 0; font-size: 18px;">Saved Sheets History</h3>
                <button onclick="toggleHistoryDrawer()" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #6c757d; font-weight: bold;">&times;</button>
            </div>
            <div id="drawerHistoryList" style="flex: 1; overflow-y: auto; padding-right: 5px;">
            </div>
        `;
        document.body.appendChild(drawer);
    }

    if (startBtn && !document.getElementById('shareContainerPanel')) {
        let downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            let shareWrap = document.createElement('div');
            shareWrap.id = 'shareContainerPanel';
            shareWrap.style.cssText = "display: none; position: relative; display: inline-block; vertical-align: middle; margin-left: 8px;";
            
            shareWrap.innerHTML = `
                <button id="mainShareTriggerBtn" style="background: #17a2b8; color: white; border: 1px solid #138496; padding: 8px 16px; font-size: 14px; font-weight: bold; font-family: sans-serif; border-radius: 4px; cursor: pointer; transition: background 0.2s;">📤 Share Sheet</button>
                <div id="shareMenuDropdown" style="display: none; position: absolute; top: 40px; left: 0; background: white; border: 1px solid #ccc; box-shadow: 0 4px 8px rgba(0,0,0,0.15); border-radius: 4px; width: 160px; z-index: 99999; font-family: sans-serif;">
                    <a href="#" onclick="executeGlobalSharing('whatsapp'); return false;" style="display: block; padding: 10px; color: #25D366; text-decoration: none; font-weight: bold; border-bottom: 1px solid #eee; font-size: 13px;">💬 WhatsApp File</a>
                    <a href="#" onclick="executeGlobalSharing('email'); return false;" style="display: block; padding: 10px; color: #ea4335; text-decoration: none; font-weight: bold; font-size: 13px;">📧 Email File</a>
                </div>
            `;
            downloadBtn.parentNode.insertBefore(shareWrap, downloadBtn.nextSibling);

            document.addEventListener('click', function(event) {
                let trigger = document.getElementById('mainShareTriggerBtn');
                let dropdown = document.getElementById('shareMenuDropdown');
                if (trigger && dropdown) {
                    if (trigger.contains(event.target)) {
                        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                    } else {
                        dropdown.style.display = 'none';
                    }
                }
            });
        }
    }

    let allHeaders = document.querySelectorAll('table th');
    allHeaders.forEach(th => {
        if (th.textContent.trim().toLowerCase() === 'drivers') {
            th.remove(); 
        }
    });

    let tableHeader = document.querySelector('table.table thead tr, table tr');
    if (tableHeader && !document.getElementById('remarksHeaderCol')) {
        let remTh = document.createElement('th');
        remTh.id = 'remarksHeaderCol';
        remTh.className = 'remarks-cell-container';
        remTh.innerText = "Remarks";
        remTh.style.cssText = "background: #002d62; color: white; padding: 10px; font-size: 14px; text-align: left;";
        tableHeader.appendChild(remTh);
        
        let shareTh = document.createElement('th');
        shareTh.id = 'peerShareHeaderCol';
        shareTh.innerText = "Send Lead To";
        shareTh.style.cssText = "background: #002d62; color: white; padding: 10px; font-size: 14px; text-align: left;";
        tableHeader.appendChild(shareTh);
    }
}

function injectPremiumFiltersUI() {
    let statusBox = document.getElementById('status');
    if (!statusBox || document.getElementById('premiumFilterWrapper')) return;

    let filterPanel = document.createElement('div');
    filterPanel.id = 'premiumFilterWrapper';
    filterPanel.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        align-items: center;
        background: #fdfdfd;
        padding: 15px;
        margin: 15px 0;
        border: 1px solid #e2eafc;
        border-radius: 6px;
        font-family: sans-serif;
    `;

    filterPanel.innerHTML = `
        <div style="flex: 1; min-width: 240px; position: relative;">
            <label style="font-size: 11px; font-weight: bold; color: #002d62; display: block; margin-bottom: 4px;">🔍 Live Text Filter (Search Name, MC, Phone)</label>
            <input type="text" id="premiumLiveSearch" placeholder="Type to filter rows instantly..." style="width: 100%; padding: 8px 12px; font-size: 13px; border: 1px solid #b6ccfe; border-radius: 4px; box-sizing: border-box;">
        </div>
        
        <div style="width: 180px;">
            <label style="font-size: 11px; font-weight: bold; color: #002d62; display: block; margin-bottom: 4px;">📍 Filter by US State</label>
            <select id="premiumStateFilter" style="width: 100%; padding: 8px; font-size: 13px; border: 1px solid #b6ccfe; border-radius: 4px; background: white;">
                <option value="ALL">All States (No Filter)</option>
                <option value="AL">AL - Alabama</option><option value="AK">AK - Alaska</option><option value="AZ">AZ - Arizona</option>
                <option value="AR">AR - Arkansas</option><option value="CA">CA - California</option><option value="CO">CO - Colorado</option>
                <option value="CT">CT - Connecticut</option><option value="DE">DE - Delaware</option><option value="FL">FL - Florida</option>
                <option value="GA">GA - Georgia</option><option value="HI">HI - Hawaii</option><option value="ID">ID - Idaho</option>
                <option value="IL">IL - Illinois</option><option value="IN">IN - Indiana</option><option value="IA">IA - Iowa</option>
                <option value="KS">KS - Kansas</option><option value="KY">KY - Kentucky</option><option value="LA">LA - Louisiana</option>
                <option value="ME">ME - Maine</option><option value="MD">MD - Maryland</option><option value="MA">MA - Massachusetts</option>
                <option value="MI">MI - Michigan</option><option value="MN">MN - Minnesota</option><option value="MS">MS - Mississippi</option>
                <option value="MO">MO - Missouri</option><option value="MT">MT - Montana</option><option value="NE">NE - Nebraska</option>
                <option value="NV">NV - Nevada</option><option value="NH">NH - New Hampshire</option><option value="NJ">NJ - New Jersey</option>
                <option value="NM">NM - New Mexico</option><option value="NY">NY - New York</option><option value="NC">NC - North Carolina</option>
                <option value="ND">ND - North Dakota</option><option value="OH">OH - Ohio</option><option value="OK">OK - Oklahoma</option>
                <option value="OR">OR - Oregon</option><option value="PA">PA - Pennsylvania</option><option value="RI">RI - Rhode Island</option>
                <option value="SC">SC - South Carolina</option><option value="SD">SD - South Dakota</option><option value="TN">TN - Tennessee</option>
                <option value="TX">TX - Texas</option><option value="UT">UT - Utah</option><option value="VT">VT - Vermont</option>
                <option value="VA">VA - Virginia</option><option value="WA">WA - Washington</option><option value="WV">WV - West Virginia</option>
                <option value="WI">WI - Wisconsin</option><option value="WY">WY - Wyoming</option>
            </select>
        </div>

        <div style="background: #e2eafc; padding: 8px 15px; border-radius: 4px; display: flex; gap: 15px; font-size: 12px; font-weight: bold; color: #001a3a; height: 35px; align-items: center; margin-top: 15px;">
            <div>Scraped: <span id="premiumCountTotal" style="color: #17a2b8;">0</span></div>
            <div style="border-left: 1px solid #b6ccfe; padding-left: 15px;">Visible: <span id="premiumCountVisible" style="color: #28a745;">0</span></div>
        </div>
    `;

    statusBox.parentNode.insertBefore(filterPanel, statusBox.nextSibling);

    document.getElementById('premiumLiveSearch').addEventListener('input', executePremiumUIPipeline);
    document.getElementById('premiumStateFilter').addEventListener('change', executePremiumUIPipeline);
}

// ====== DYNAMIC EMAIL PROPOSAL MANAGER INJECTION ======
function injectEmailProposalPanel() {
    let filterWrapper = document.getElementById('premiumFilterWrapper');
    if (!filterWrapper || document.getElementById('premiumProposalWrapper')) return;

    let savedSubject = localStorage.getItem(`scr_subj_${currentClient}`) || "Dispatch Service Proposal - Special Offer";
    let savedBody = localStorage.getItem(`scr_body_${currentClient}`) || "Hello,\n\nWe found your company profile via FMCSA. We are offering professional truck dispatching services at a 5% flat rate.\n\nBest Regards,\nDispatch Team";

    let proposalPanel = document.createElement('div');
    proposalPanel.id = 'premiumProposalWrapper';
    proposalPanel.style.cssText = `
        background: #f4f7fe;
        padding: 15px;
        margin-bottom: 15px;
        border: 1px solid #b6ccfe;
        border-radius: 6px;
        font-family: sans-serif;
    `;

    proposalPanel.innerHTML = `
        <div onclick="document.getElementById('proposalInputsBlock').style.display = document.getElementById('proposalInputsBlock').style.display === 'none' ? 'block' : 'none';" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 13px; color: #002d62;">📋 Setup Email Proposal Template (One-Click Cold Mail System)</strong>
            <span style="font-size: 12px; color: #002d62; font-weight: bold;">⚙️ Click to Edit</span>
        </div>
        
        <div id="proposalInputsBlock" style="display: none; margin-top: 12px; border-top: 1px dashed #b6ccfe; padding-top: 12px;">
            <div style="margin-bottom: 10px;">
                <label style="font-size: 11px; font-weight: bold; color: #333; display: block; margin-bottom: 4px;">Email Subject</label>
                <input type="text" id="propSubjectInput" value="${savedSubject}" style="width: 100%; padding: 8px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
            </div>
            <div style="margin-bottom: 10px;">
                <label style="font-size: 11px; font-weight: bold; color: #333; display: block; margin-bottom: 4px;">Email Body Content</label>
                <textarea id="propBodyInput" style="width: 100%; height: 100px; padding: 8px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; font-family: sans-serif; resize: vertical;">${savedBody}</textarea>
            </div>
            <button onclick="saveProposalTemplateSettings()" style="background: #002d62; color: white; border: none; padding: 6px 15px; font-size: 12px; font-weight: bold; border-radius: 4px; cursor: pointer;">💾 Save Proposal Template</button>
        </div>
    `;

    filterWrapper.parentNode.insertBefore(proposalPanel, filterWrapper.nextSibling);
}

window.saveProposalTemplateSettings = function() {
    let subj = document.getElementById('propSubjectInput').value;
    let body = document.getElementById('propBodyInput').value;
    localStorage.setItem(`scr_subj_${currentClient}`, subj);
    localStorage.setItem(`scr_body_${currentClient}`, body);
    alert("Proposal Template successfully saved for your company account!");
    document.getElementById('proposalInputsBlock').style.display = 'none';
};

window.triggerOneClickEmailPitch = function(emailAddress, companyName) {
    if (!emailAddress || emailAddress === 'N/A') return;
    
    let subj = localStorage.getItem(`scr_subj_${currentClient}`) || "Dispatch Service Proposal";
    let body = localStorage.getItem(`scr_body_${currentClient}`) || "Hello, We are offering dispatch services.";

    let customizedBody = body.replace(/{company}/gi, companyName);

    let mailtoUrl = `mailto:${emailAddress}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(customizedBody)}`;
    let gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${emailAddress}&su=${encodeURIComponent(subj)}&body=${encodeURIComponent(customizedBody)}`;

    let activeWindow = window.open(mailtoUrl, '_blank');
    
    setTimeout(() => {
        try {
            if (!activeWindow || activeWindow.location.href === 'about:blank' || activeWindow.document.body.innerHTML === '') {
                if (activeWindow) activeWindow.location.href = gmailUrl;
            }
        } catch (e) {
            console.log("Native email application triggered successfully.");
        }
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
        
        let stateMatch = (selectedState === "ALL");
        if (!stateMatch) {
            let stateRegex = new RegExp(`\\b${selectedState}\\b`);
            stateMatch = stateRegex.test(addressText);
        }

        if (textMatch && stateMatch) {
            row.style.display = "";
            visibleCounter++;
        } else {
            row.style.display = "none";
        }
    });

    document.getElementById('premiumCountTotal').innerText = scrapedData.length;
    document.getElementById('premiumCountVisible').innerText = visibleCounter;
}

window.copyEmailToClipboard = function(element, emailAddress) {
    if (!emailAddress || emailAddress === 'N/A') return;
    
    navigator.clipboard.writeText(emailAddress).then(() => {
        if (element.querySelector('.premium-copy-badge')) return;

        let badge = document.createElement('span');
        badge.className = 'premium-copy-badge';
        badge.innerText = "Copied!";
        element.appendChild(badge);

        setTimeout(() => { badge.remove(); }, 1200);
    }).catch(err => {
        console.error("Failed to copy details", err);
    });
};

function buildEmailCellMarkup(emailAddress, companyName) {
    if (!emailAddress || emailAddress === 'N/A') return `<td style="color: #6c757d; font-style: italic;">N/A</td>`;
    
    let escapedName = companyName.replace(/'/g, "\\'");
    return `
        <td style="position: relative; vertical-align: middle;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                <span onclick="copyEmailToClipboard(this.parentNode, '${emailAddress}')" style="color: #002d62; font-weight: bold; cursor: pointer;" title="Click to Copy">${emailAddress}</span>
                <a href="#" onclick="triggerOneClickEmailPitch('${emailAddress}', '${escapedName}'); return false;" class="premium-pitch-btn" title="Send Proposal Template">
                    📩 Pitch
                </a>
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
        let currentRem = r.remarks || "";
        let cleanNum = r.phone ? r.phone.replace(/"/g, '""') : 'N/A';
        csv += `${r.mc},${r.usdot},"${r.name}","${r.entityType}","${r.status}","${cleanNum}","${r.address}","${r.email}","${r.powerUnits}","${currentRem.replace(/"/g, '""')}"\n`; 
    });
    return csv;
}

function buildSharingTextContent() {
    const start = document.getElementById('startMc').value;
    const end = document.getElementById('endMc').value;
    return `FMCSA Report (Range: ${start} - ${end}). Total Active Records Found: ${scrapedData.length}.`;
}

window.executeGlobalSharing = async function(platform) {
    if (scrapedData.length === 0) return alert("Pehle data scan kar lein.");
    
    const start = document.getElementById('startMc').value;
    const end = document.getElementById('endMc').value;
    const fileName = `SAFER_Data_${start}_to_${end}.csv`;
    
    const csvContent = generateCSVString(scrapedData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], fileName, { type: 'text/csv' });
    
    const textHeadline = buildSharingTextContent();

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: 'FMCSA Scraper Report',
                text: textHeadline
            });
        } catch (err) {
            fallbackTextShare(platform, textHeadline);
        }
    } else {
        fallbackTextShare(platform, textHeadline);
    }
};

function fallbackTextShare(platform, basicText) {
    let fullText = `*${basicText}*\n\n*Top Preview:*\n`;
    let limit = Math.min(scrapedData.length, 3);
    for(let i=0; i<limit; i++) {
        let curRemStr = scrapedData[i].remarks ? ` | Remarks: ${scrapedData[i].remarks}` : '';
        fullText += `- MC: ${scrapedData[i].mc} | Phone: ${scrapedData[i].phone}${curRemStr}\n`;
    }
    
    const encoded = encodeURIComponent(fullText);
    if (platform === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    } else {
        window.open(`mailto:?subject=ScraperReport&body=${encoded}`, '_blank');
    }
}

window.toggleHistoryDrawer = function() {
    let drawer = document.getElementById('scraperHistoryDrawer');
    if (!drawer) return;
    
    if (drawer.style.right === "0px") {
        drawer.style.right = "-420px";
    } else {
        drawer.style.right = "0px";
        renderHistoryItems(); 
    }
};

function buildDialerCellMarkup(phoneNum) {
    if (!phoneNum || phoneNum === 'N/A') return `<td style="text-align: center; vertical-align: middle; color: #6c757d;">N/A</td>`;
    
    let rawDigits = phoneNum.replace(/[^0-9+]/g, '');
    
    return `
        <td style="padding: 4px !important; width: 140px; min-width: 130px; vertical-align: middle;">
            <a href="tel:${rawDigits}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: #e2eafc; color: #002d62; text-decoration: none; padding: 8px 4px; border-radius: 4px; border: 1px solid #b6ccfe; transition: background 0.2s, transform 0.1s; box-sizing: border-box; font-family: sans-serif; height: 100%; min-height: 52px;" 
               onmouseover="this.style.background='#d0dfff';" 
               onmouseout="this.style.background='#e2eafc';"
               onmousedown="this.style.transform='scale(0.96)';"
               onmouseup="this.style.transform='scale(1)';">
                <span style="font-size: 16px; margin-bottom: 2px; line-height: 1;">📞</span>
                <span style="font-size: 11px; font-weight: bold; color: #001a3a; text-align: center; letter-spacing: -0.2px; display: block; word-break: break-all;">${phoneNum}</span>
            </a>
        </td>
    `;
}

// ====== INTERACTIVE HISTORY RESTORATION LOGIC ======
window.loadHistorySheetToTable = async function(id) {
    const tx = db.transaction("history", "readonly");
    const store = tx.objectStore("history");
    const req = store.get(id);

    req.onsuccess = async function() {
        const item = req.result;
        if (!item || !item.records) return alert("Sheet record not found.");

        currentHistoryId = item.id; 
        scrapedData = item.records; 

        if (document.getElementById('startMc') && item.range) {
            let ranges = item.range.split('-');
            if (ranges.length === 2) {
                document.getElementById('startMc').value = ranges[0].trim();
                document.getElementById('endMc').value = ranges[1].trim();
            }
        }

        const tableBody = document.getElementById('resultsTable');
        if (!tableBody) return alert("Main Results Table view element missing.");

        tableBody.innerHTML = '';
        
        for (let index = 0; index < scrapedData.length; index++) {
            let record = scrapedData[index];
            let dialerCellHTML = buildDialerCellMarkup(record.phone);
            let existingRemarks = record.remarks || "";
            let emailCellHTML = buildEmailCellMarkup(record.email, record.name);
            let peerOptionsHTML = await buildPeerSelectionOptionsMarkup(index);

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
                <td class="remarks-cell-container"><input type="text" value="${existingRemarks}" class="remarks-input-field" placeholder="Add remarks here..." oninput="syncRemarksData(${index}, this.value)" /></td>
                <td>${peerOptionsHTML}</td>
            </tr>`;
        }

        document.getElementById('downloadBtn').style.display = 'inline-block';
        if (document.getElementById('shareContainerPanel')) document.getElementById('shareContainerPanel').style.display = 'inline-block';

        let statusBox = document.getElementById('status');
        if (statusBox) {
            statusBox.style.padding = "15px";
            statusBox.style.display = "block";
            statusBox.style.borderLeft = "5px solid #17a2b8";
            statusBox.innerHTML = `<strong style="font-size: 14px; color: #17a2b8; font-family: sans-serif;">📂 Loaded Sheet from History (${scrapedData.length} Records)</strong>`;
        }

        executePremiumUIPipeline(); 
        toggleHistoryDrawer(); 
    };
};

function renderHistoryItems() {
    if (!db) return;
    const listContainer = document.getElementById('drawerHistoryList');
    if (!listContainer) return;

    const tx = db.transaction("history", "readonly");
    const store = tx.objectStore("history");
    const getAll = store.getAll();

    getAll.onsuccess = function() {
        const data = getAll.result.reverse(); 
        
        if (data.length === 0) {
            listContainer.innerHTML = `<p style="color: #6c757d; font-size: 13px; font-style: italic; text-align: center; margin-top: 30px;">No history records found yet.</p>`;
            return;
        }

        let itemsHTML = "";
        data.forEach(item => {
            let displayStatus = item.status === "Interrupted (Auto-Saved)" 
                ? `<span style="color: #d9534f; font-weight:bold;">⚠️ ${item.status}</span>`
                : `<span style="color: #28a745; font-weight:bold;">✅ ${item.status}</span>`;

            itemsHTML += `
                <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-left: 4px solid #002d62; padding: 12px; margin-bottom: 10px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                    <div style="font-size: 11px; color: #6c757d; font-weight: bold;">${item.date}</div>
                    <div style="font-size: 14px; font-weight: bold; color: #333; margin: 4px 0;">Range: ${item.range}</div>
                    <div style="font-size: 12px; margin-bottom: 6px;">Status: ${displayStatus}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <span style="background: #e2eafc; color: #002d62; padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">${item.totalRecords} Active</span>
                        <div>
                            <button onclick="loadHistorySheetToTable(${item.id})" style="background: #002d62; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold; margin-right: 4px;">📂 Open</button>
                            <button onclick="downloadHistoryCSV(${item.id})" ${item.totalRecords === 0 ? 'disabled style="opacity:0.5; background:#6c757d;"' : 'style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold; margin-right: 4px;"'}>📥 CSV</button>
                            <button onclick="deleteHistoryItem(${item.id})" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold;">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
        listContainer.innerHTML = itemsHTML;
    };
}

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
        }
    };
}

// ====== PRE-INJECTED LIVE HELP & CHATBOX MODULE ======
function injectLiveSupportSystem() {
    if (document.getElementById('scrSupportFloatingBtn')) return;

    let btn = document.createElement('button');
    btn.id = 'scrSupportFloatingBtn';
    btn.innerHTML = "💬 Technical Support";
    btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #002d62;
        color: #fff;
        border: 2px solid #17a2b8;
        padding: 10px 18px;
        border-radius: 30px;
        font-family: sans-serif;
        font-weight: bold;
        font-size: 13px;
        cursor: pointer;
        z-index: 999998;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        transition: transform 0.2s;
    `;
    btn.onmouseover = () => btn.style.transform = "scale(1.05)";
    btn.onmouseout = () => btn.style.transform = "scale(1)";
    btn.onclick = toggleSupportChatbox;
    document.body.appendChild(btn);

    let chatBox = document.createElement('div');
    chatBox.id = 'scrSupportChatboxWindow';
    chatBox.style.cssText = `
        position: fixed;
        bottom: 75px;
        left: 20px;
        width: 330px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 5px 25px rgba(0,0,0,0.25);
        border: 1px solid #ddd;
        font-family: sans-serif;
        display: none;
        z-index: 999998;
        overflow: hidden;
    `;
    chatBox.innerHTML = `
        <div style="background: #002d62; color: white; padding: 12px 15px; font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center;">
            <span>🛡️ System Helpdesk</span>
            <span onclick="toggleSupportChatbox()" style="cursor: pointer; font-size: 18px;">&times;</span>
        </div>
        <div style="padding: 12px; background: #fdfdfd; font-size: 12px; color: #555; border-bottom: 1px solid #eee;">
            Assalam-o-Alaikum! Message likh kr send krein.
        </div>
        <div style="padding: 15px;">
            <textarea id="scrSupportMsgInput" placeholder="Apna masla yahan type krein..." style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; font-family: sans-serif; resize: none; box-sizing: border-box;"></textarea>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button onclick="sendSupportAlert('whatsapp')" style="flex: 1; background: #25D366; color: white; border: none; padding: 8px 0; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;">💬 WhatsApp</button>
                <button onclick="sendSupportAlert('email')" style="flex: 1; background: #ea4335; color: white; border: none; padding: 8px 0; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;">📧 Email Send</button>
            </div>
        </div>
    `;
    document.body.appendChild(chatBox);
}

window.toggleSupportChatbox = function() {
    let box = document.getElementById('scrSupportChatboxWindow');
    if (!box) return;
    box.style.display = box.style.display === 'block' ? 'none' : 'block';
};

window.sendSupportAlert = function(channel) {
    const textInput = document.getElementById('scrSupportMsgInput');
    if (!textInput || textInput.value.trim() === "") return alert("Meharbani karke pehle message type karein.");

    const userMsg = textInput.value.trim();
    const cleanClient = window.scrClientID || "unknown_user";
    
    const finalFormattedText = `*★ FMCSA Scraper Support Alert ★*\n\n*From User:* ${cleanClient}\n*Name:* ${dispatcherNickname}\n\n*Message:* ${userMsg}`;

    if (channel === 'whatsapp') {
        const targetPhone = "923037654849"; 
        const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(finalFormattedText)}`;
        window.open(waUrl, '_blank');
    } else {
        const targetEmail = "admin@example.com"; 
        const emailSubject = `Scraper Support Ticket from [${cleanClient}]`;
        const mailtoUrl = `mailto:${targetEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(finalFormattedText)}`;
        window.open(mailtoUrl, '_blank');
    }
    
    textInput.value = "";
    toggleSupportChatbox();
};

// ====== DYNAMIC BACKUP AUTO-PROXIES BYPASS SYSTEM ======
async function fetchViaProxy(targetUrl) {
    const fetchOptions = {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    };

    try {
        let directRes = await fetch(targetUrl, fetchOptions);
        if (directRes.ok) return await directRes.text();
    } catch (e) {}

    let proxy1 = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    try {
        let res1 = await fetch(proxy1);
        if (res1.ok) return await res1.text();
    } catch (err1) {}

    let proxy2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}&_cb=${Date.now()}`;
    try {
        let res2 = await fetch(proxy2);
        if (res2.ok) return await res2.text();
    } catch (err2) {
        throw new Error("FMCSA server throttling active.");
    }
}

// ====== ONLY AUTHORIZED SCRAPING LOGIC ======
let scraping = false; let scrapedData = [];
window.stopScraping = function() { 
    scraping = false; 
    let statusBox = document.getElementById('status');
    if (statusBox) {
        statusBox.style.background = "#fff3cd";
        statusBox.style.color = "#856404";
        statusBox.innerText = "Stopping..."; 
    }
}

window.startScraping = async function() {
    const start = parseInt(document.getElementById('startMc').value);
    const end = parseInt(document.getElementById('endMc').value);
    
    if (isNaN(start) || isNaN(end) || start > end) {
        document.getElementById('status').innerText = "Please enter a valid MC range.";
        return;
    }

    scraping = true; scrapedData = [];
    document.getElementById('startBtn').style.display = 'none';
    if(document.getElementById('openHistoryBtn')) document.getElementById('openHistoryBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-block';
    document.getElementById('downloadBtn').style.display = 'none';
    if(document.getElementById('shareContainerPanel')) document.getElementById('shareContainerPanel').style.display = 'none';
    
    const tableBody = document.getElementById('resultsTable');
    tableBody.innerHTML = '';
    
    let startTime = null;
    let totalToScan = end - start + 1;
    let totalProcessed = 0; 

    let statusBox = document.getElementById('status');
    if (statusBox) {
        statusBox.style.display = "flex";
        statusBox.style.background = "#f8f9fa"; 
        statusBox.style.color = "#333";
        statusBox.style.borderLeft = "5px solid #002d62";
    }

    if (db) {
        const now = new Date();
        const formattedDate = now.toLocaleString('en-US', { hour12: true });
        
        const initialHistoryItem = {
            date: formattedDate,
            range: `${start} - ${end}`,
            totalRecords: 0,
            status: "Interrupted (Auto-Saved)", 
            records: []
        };
        
        const tx = db.transaction("history", "readwrite");
        const store = tx.objectStore("history");
        const addReq = store.add(initialHistoryItem);
        addReq.onsuccess = function(e) {
            currentHistoryId = e.target.result; 
        };
    }

    for (let mc = start; mc <= end; mc++) {
        if (!scraping) break;
        
        totalProcessed++;
        if (startTime === null) startTime = Date.now(); 

        let percentage = Math.floor((totalProcessed / totalToScan) * 100);
        let degrees = percentage * 3.6;

        if (statusBox) {
            statusBox.innerHTML = `
                <div>Scanning MC <b>${mc}</b>...</div>
                <div style="position: relative; width: 40px; height: 40px; border-radius: 50%; background: conic-gradient(#002d62 ${degrees}deg, #ddd ${degrees}deg); display: flex; align-items: center; justify-content: center;">
                    <span style="position: relative; font-size: 11px; font-weight: bold;">${percentage}%</span>
                </div>
            `;
        }

        try {
            const snapshotUrl = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mc}`;
            const htmlText = await fetchViaProxy(snapshotUrl);
            
            if (!htmlText || htmlText.includes("Record not found") || htmlText.includes("No records found") || !htmlText.includes("USDOT Number:")) {
                continue;
            }

            let record = { mc: mc, usdot: 'N/A', name: 'N/A', entityType: 'N/A', status: 'N/A', phone: 'N/A', address: 'N/A', email: 'N/A', powerUnits: 'N/A', remarks: '' };
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

            if (record.status !== "AUTHORIZED") continue;

            if (record.usdot !== 'N/A' && scraping) {
                try {
                    const smsUrl = `https://ai.fmcsa.dot.gov/SMS/Carrier/${record.usdot}/CarrierRegistration.aspx`;
                    const smsHtml = await fetchViaProxy(smsUrl);
                    if (smsHtml) {
                        let smsEl = document.createElement('html');
                        smsEl.innerHTML = smsHtml;
                        let smsCells = smsEl.querySelectorAll('td, th, span, label');
                        for (let j = 0; j < smsCells.length; j++) {
                            let smsText = smsCells[j].textContent.trim();
                            if (smsText.toLowerCase().includes("email") || smsText.includes("@")) {
                                let emailMatch = smsText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                                if (emailMatch) { record.email = emailMatch[0]; break; }
                            }
                        }
                    }
                } catch (smsErr) {}

                scrapedData.push(record);
                let recordIndex = scrapedData.length - 1;
                updateRealTimeHistory(scrapedData, false);

                let dialerCellHTML = buildDialerCellMarkup(record.phone);
                let emailCellHTML = buildEmailCellMarkup(record.email, record.name);
                let peerOptionsHTML = await buildPeerSelectionOptionsMarkup(recordIndex);

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
                    <td class="remarks-cell-container"><input type="text" class="remarks-input-field" placeholder="Add remarks..." oninput="syncRemarksData(${recordIndex}, this.value)" /></td>
                    <td>${peerOptionsHTML}</td>
                </tr>`;
                
                executePremiumUIPipeline(); 
            }
        } catch (e) {}
        await new Promise(r => setTimeout(r, 2000));
    }
    
    scraping = false;
    document.getElementById('startBtn').style.display = 'inline-block';
    if(document.getElementById('openHistoryBtn')) document.getElementById('openHistoryBtn').style.display = 'inline-block';
    document.getElementById('stopBtn').style.display = 'none';
    
    if (statusBox) {
        statusBox.innerHTML = `<strong style="color: #28a745;">Done! Found ${scrapedData.length} records.</strong>`;
    }
    
    if(scrapedData.length > 0) {
        document.getElementById('downloadBtn').style.display = 'inline-block';
        if(document.getElementById('shareContainerPanel')) document.getElementById('shareContainerPanel').style.display = 'inline-block';
        updateRealTimeHistory(scrapedData, true);
    }
    executePremiumUIPipeline();
}

window.downloadCSV = function() {
    if(scrapedData.length > 0) {
        const start = document.getElementById('startMc').value;
        const end = document.getElementById('endMc').value;
        triggerCSVDownload(scrapedData, `SAFER_Data_${start}_to_${end}.csv`);
    }
}
