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
// Aap yahan har user ki Max Laptops limit aur Expiry Date (YYYY-MM-DD) set kar sakte hain
const allowedUsers = {
    "dispatcher_lahore": { maxLaptops: 1, expires: "2026-08-26" },   // Active till 26 August 2026
    "dispatcher_karachi": { maxLaptops: 0, expires: "2026-07-26" },  // Already Blocked/Expired
    "dispatchloadify": { maxLaptops: 2, expires: "2026-08-01" },     // Active till 1st Sept 2026
};

// Auto-configured URL from your Firebase console link
const FIREBASE_DB_URL = "https://data-scrapper-eddcf-default-rtdb.firebaseio.com/"; 

let currentClient = "unknown";
let userLimit = 0;

// Dynamic UI Notification Toast System Creator
function showPremiumNotification(message, duration = 4500) {
    let toast = document.createElement('div');
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="background: #28a745; width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 8px #28a745; animate: pulse 1s infinite;"></div>
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
    
    // Trigger Slide Down
    setTimeout(() => {
        toast.style.top = "20px";
        toast.style.opacity = "1";
    }, 100);

    // Trigger Fade Out & Remove
    setTimeout(() => {
        toast.style.top = "-100px";
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// Function to safely execute security check after DOM and variables load completely
function initializeAccessControl() {
    currentClient = window.scrClientID || "unknown";
    
    let isAccessValid = false;
    let clientConfig = allowedUsers[currentClient];

    if (clientConfig) {
        userLimit = clientConfig.maxLaptops || 0;
        
        // System date format (YYYY-MM-DD) me nikalte hain comparison k liye
        const todayStr = new Date().toISOString().split('T')[0]; 
        
        // Agar laptop limit 0 se bari hai aur aaj ki date expiry date se pehle ya barabar hai
        if (userLimit > 0 && todayStr <= clientConfig.expires) {
            isAccessValid = true;
        }
    }

    // Check if user is allowed at all or expired
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

    // Global Unique Tab/Laptop Identity
    if (!window.name || !window.name.startsWith("fmcsa_tab_")) {
        window.name = "fmcsa_tab_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    }

    // Success subscription message pop-up on start (With Expiry Alert)
    showPremiumNotification(`🚀 License Active: Verified for "${currentClient}" (Expires: ${clientConfig.expires})`);

    // Start network sync loop immediately after validation
    checkGlobalSessions();
    setInterval(checkGlobalSessions, 5000);
}

// Safely execute when script variable bindings are finished
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
        activeTabs = Object.keys(cleanData).map(key => ({ dbKey: key, id: cleanData[key].id, timestamp: cleanData[key].timestamp }));
        
        const currentTabRecord = activeTabs.find(tab => tab.id === window.name);
        
        if (!currentTabRecord && activeTabs.length >= userLimit) {
            document.body.innerHTML = `
                <div style="font-family:sans-serif; text-align:center; padding:50px; margin-top:100px;">
                    <h1 style="color:#dc3545; font-size:30px;">⚠️ Global License Limit Exceeded</h1>
                    <p style="font-size:16px; color:#333;">Your account is limited to a maximum of <b>${userLimit}</b> active Chrome instances or laptops.</p>
                    <p style="color:#6c757d;">Please close any open Chrome windows or tabs running on another laptop before continuing.</p>
                    <button onclick="window.location.reload()" style="background:#002d62; color:white; border:none; padding:10px 20px; border-radius:4px; font-weight:bold; cursor:pointer; margin-top:15px;">Retry Connection</button>
                </div>
            `;
            throw new Error("Global Session Limit Exceeded");
        }
        
        if (currentTabRecord) {
            await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${currentTabRecord.dbKey}/timestamp.json`, {
                method: 'PUT',
                body: JSON.stringify(now)
            });
        } else {
            await fetch(url, {
                method: 'POST',
                body: JSON.stringify({ id: window.name, timestamp: now })
            });
        }
        
    } catch (e) {
        console.error("Session sync failed:", e);
    }
}

window.addEventListener('beforeunload', function () {
    if (currentClient === "unknown") return;
    navigator.sendBeacon(`${FIREBASE_DB_URL}sessions/${currentClient}.json?_method=DELETE`);
    fetch(`${FIREBASE_DB_URL}sessions/${currentClient}.json`)
        .then(res => res.json())
        .then(data => {
            if (data) {
                Object.keys(data).forEach(key => {
                    if (data[key].id === window.name) {
                        fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${key}.json`, { method: 'DELETE' });
                    }
                });
            }
        });
});

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
}

function generateCSVString(recordsData) {
    let csv = "MC Number,USDOT Number,Company Name,Entity Type,Operating Status,Phone,Address,Email,Power Units,Drivers\n"; 
    recordsData.forEach(r => { 
        csv += `${r.mc},${r.usdot},"${r.name}","${r.entityType}","${r.status}","${r.phone}","${r.address}","${r.email}","${r.powerUnits}","${r.drivers}"\n`; 
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
            console.log("Native sharing failed, switching to text method.", err);
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
        fullText += `- MC: ${scrapedData[i].mc} | Email: ${scrapedData[i].email}\n`;
    }
    fullText += `\nFile share format issue, please download report directly.`;
    
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
                            <button onclick="downloadHistoryCSV(${item.id})" ${item.totalRecords === 0 ? 'disabled style="opacity:0.5; background:#6c757d;"' : 'style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold; margin-right: 4px;"'}>📥 Get CSV</button>
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

// ====== ONLY AUTHORIZED SCRAPING LOGIC ======
let scraping = false; let scrapedData = [];
window.stopScraping = function() { 
    scraping = false; 
    let statusBox = document.getElementById('status');
    if (statusBox) {
        statusBox.style.background = "#fff3cd";
        statusBox.style.color = "#856404";
        statusBox.style.padding = "10px 15px";
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
        statusBox.style.flexDirection = "row"; 
        statusBox.style.alignItems = "center";
        statusBox.style.justifyContent = "space-between"; 
        statusBox.style.padding = "10px 15px"; 
        statusBox.style.background = "#f8f9fa"; 
        statusBox.style.color = "#333";
        statusBox.style.border = "1px solid #e9ecef";
        statusBox.style.borderLeft = "5px solid #002d62";
        statusBox.style.borderRadius = "4px";
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
        if (startTime === null) {
            startTime = Date.now(); 
        }

        let percentage = Math.floor((totalProcessed / totalToScan) * 100);
        let elapsedSeconds = (Date.now() - startTime) / 1000;
        let avgTimePerMC = elapsedSeconds / totalProcessed;
        let remainingMCs = totalToScan - totalProcessed;
        let estimatedRemainingSeconds = remainingMCs * avgTimePerMC;

        let mins = Math.floor(estimatedRemainingSeconds / 60);
        let secs = Math.floor(estimatedRemainingSeconds % 60);

        let timeString = "";
        if (totalProcessed < 3) {
            timeString = "Calculating ETA..."; 
        } else {
            timeString = `Estimated Time Remaining: ${mins}m ${secs}s`;
        }

        let degrees = percentage * 3.6;

        if (statusBox) {
            statusBox.innerHTML = `
                <div style="font-family: sans-serif; display: flex; flex-direction: column; gap: 2px; text-align: left;">
                    <div style="font-size: 14px; font-weight: bold; color: #333;">Scanning MC <b>${mc}</b>...</div>
                    <div style="font-size: 12px; color: #6c757d; font-weight: bold;">${timeString}</div>
                </div>
                <div style="position: relative; width: 40px; height: 40px; border-radius: 50%; background: conic-gradient(#002d62 ${degrees}deg, #ddd ${degrees}deg); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <div style="position: absolute; width: 30px; height: 30px; background: #f8f9fa; border-radius: 50%;"></div>
                    <span style="position: relative; font-family: sans-serif; font-size: 11px; font-weight: bold; color: #002d62;">${percentage}%</span>
                </div>
            `;
        }

        try {
            const snapshotUrl = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mc}`;
            const response = await fetch(snapshotUrl);
            const htmlText = await response.text();
            
            if (htmlText.includes("Record not found") || htmlText.includes("No records found") || !htmlText.includes("USDOT Number:")) {
                continue;
            }

            let record = { mc: mc, usdot: 'N/A', name: 'N/A', entityType: 'N/A', status: 'N/A', phone: 'N/A', address: 'N/A', email: 'N/A', powerUnits: 'N/A', drivers: 'N/A' };
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
                if (text.startsWith("Drivers:")) { if(cells[i+1]) record.drivers = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
                if (text.startsWith("Phone:")) { if(cells[i+1]) record.phone = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
                if (text.startsWith("Physical Address:") || (text.startsWith("Address:") && !text.includes("Mailing"))) {
                    if(cells[i+1]) record.address = cells[i+1].textContent.trim().replace(/\s+/g, ' ');
                }
            }

            if (record.status !== "AUTHORIZED") {
                continue;
            }

            if (record.usdot !== 'N/A' && scraping) {
                if (statusBox) {
                    statusBox.innerHTML = `
                        <div style="font-family: sans-serif; display: flex; flex-direction: column; gap: 2px; text-align: left;">
                            <div style="font-size: 14px; font-weight: bold; color: #002d62;">Extracting Email for USDOT <b>${record.usdot}</b>...</div>
                            <div style="font-size: 12px; color: #6c757d; font-weight: bold;">${timeString}</div>
                        </div>
                        <div style="position: relative; width: 40px; height: 40px; border-radius: 50%; background: conic-gradient(#002d62 ${degrees}deg, #ddd ${degrees}deg); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <div style="position: absolute; width: 30px; height: 30px; background: #f8f9fa; border-radius: 50%;"></div>
                            <span style="position: relative; font-family: sans-serif; font-size: 11px; font-weight: bold; color: #002d62;">${percentage}%</span>
                        </div>
                    `;
                }

                try {
                    const smsUrl = `https://ai.fmcsa.dot.gov/SMS/Carrier/${record.usdot}/CarrierRegistration.aspx`;
                    const smsResponse = await fetch(smsUrl);
                    const smsHtml = await smsResponse.text();
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
                } catch (smsErr) { console.log(smsErr); }

                scrapedData.push(record);
                updateRealTimeHistory(scrapedData, false);

                tableBody.innerHTML += `<tr>
                    <td><b>${record.mc}</b></td>
                    <td>${record.usdot}</td>
                    <td>${record.name}</td>
                    <td>${record.entityType}</td>
                    <td><span class="badge badge-active">${record.status}</span></td>
                    <td>${record.phone}</td>
                    <td>${record.address}</td> 
                    <td style="color: #002d62; font-weight: bold;">${record.email}</td> 
                    <td>${record.powerUnits}</td>
                    <td>${record.drivers}</td>
                </tr>`;
            }
        } catch (e) { console.log(e); }
        await new Promise(r => setTimeout(r, 2000));
    }
    
    scraping = false;
    document.getElementById('startBtn').style.display = 'inline-block';
    if(document.getElementById('openHistoryBtn')) document.getElementById('openHistoryBtn').style.display = 'inline-block';
    document.getElementById('stopBtn').style.display = 'none';
    
    if (statusBox) {
        statusBox.style.padding = "15px";
        statusBox.style.display = "block";
        statusBox.style.borderLeft = "5px solid #28a745";
        statusBox.innerHTML = `<strong style="font-size: 16px; color: #28a745; font-family: sans-serif;">Done! Found ${scrapedData.length} active records.</strong>`;
    }
    
    if(scrapedData.length > 0) {
        document.getElementById('downloadBtn').style.display = 'inline-block';
        if(document.getElementById('shareContainerPanel')) document.getElementById('shareContainerPanel').style.display = 'inline-block';
        updateRealTimeHistory(scrapedData, true);
    } else {
        if(currentHistoryId !== null) {
            const tx = db.transaction("history", "readwrite");
            tx.objectStore("history").delete(currentHistoryId);
        }
    }
}

window.downloadCSV = function() {
    if(scrapedData.length > 0) {
        const start = document.getElementById('startMc').value;
        const end = document.getElementById('endMc').value;
        triggerCSVDownload(scrapedData, `SAFER_Clean_Data_${start}_to_${end}.csv`);
    }
}
