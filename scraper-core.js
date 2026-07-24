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

// ====== ACCESS CONTROL WITH CHROMES/TABS LIMIT CONFIGURATION ======
const allowedUsers = {
    "dispatcher_lahore": 2,    // Max 2 Chrome windows/tabs allowed anywhere
    "dispatcher_karachi": 0,   
    "dispatchloadify": 2,      
};

const currentClient = window.scrClientID || "unknown";
const userLimit = allowedUsers[currentClient] || 0;

// 1. Check if user is allowed at all
if (userLimit === 0) {
    document.getElementById('status').innerText = "ERROR: Subscription Expired Please contact the administrator. (Whatsapp 03037654849)";
    document.getElementById('status').style.background = "#f8d7da";
    document.getElementById('status').style.color = "#721c24";
    document.getElementById('status').style.borderLeft = "4px solid #d9534f";
    document.getElementById('startBtn').disabled = true;
    document.getElementById('startBtn').style.opacity = "0.5";
    alert("Your access has been revoked or expired. Contact admin for renewal.");
    throw new Error("Access Denied");
}

// Unique tab identity setup
if (!window.name || !window.name.startsWith("fmcsa_tab_")) {
    window.name = "fmcsa_tab_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
}

function checkActiveSessions() {
    let activeTabs = [];
    try {
        activeTabs = JSON.parse(localStorage.getItem(`active_sessions_${currentClient}`) || "[]");
    } catch(e) { activeTabs = []; }
    
    const now = Date.now();
    
    // STRICT CLEANUP: Jo tab 15 seconds se responsive nahi hai use dead samjho taake seats foran khali hon
    activeTabs = activeTabs.filter(tab => (now - tab.timestamp) < 15000 || tab.id === window.name);
    
    const isAlreadyRegistered = activeTabs.some(tab => tab.id === window.name);
    
    // Agar limit exceed ho chuki hai toh system tools hide karke page content freeze kar dega
    if (!isAlreadyRegistered && activeTabs.length >= userLimit) {
        document.body.innerHTML = `
            <div style="font-family:sans-serif; text-align:center; padding:50px; margin-top:100px;">
                <h1 style="color:#dc3545; font-size:30px;">⚠️ License Limit Exceeded</h1>
                <p style="font-size:16px; color:#333;">Aapke account par maximum <b>${userLimit}</b> Chrome instances chalane ki ijazat hai.</p>
                <p style="color:#6c757d;">Meharbani karke pehle se open windows ya tabs ko band karein.</p>
                <button onclick="window.location.reload()" style="background:#002d62; color:white; border:none; padding:10px 20px; border-radius:4px; font-weight:bold; cursor:pointer; margin-top:15px;">Retry Connection</button>
            </div>
        `;
        throw new Error("Session Limit Exceeded");
    }
    
    // Active state timestamp save/update karna
    const currentTabIdx = activeTabs.findIndex(tab => tab.id === window.name);
    if (currentTabIdx > -1) {
        activeTabs[currentTabIdx].timestamp = now;
    } else {
        activeTabs.push({ id: window.name, timestamp: now });
    }
    
    localStorage.setItem(`active_sessions_${currentClient}`, JSON.stringify(activeTabs));
}

// Pehla instantly run hoga aur phir har 3 seconds baad rapid tracking chalegi
checkActiveSessions();
setInterval(checkActiveSessions, 3000);

window.addEventListener('beforeunload', function () {
    let activeTabs = [];
    try {
        activeTabs = JSON.parse(localStorage.getItem(`active_sessions_${currentClient}`) || "[]");
    } catch(e) {}
    activeTabs = activeTabs.filter(tab => tab.id !== window.name);
    localStorage.setItem(`active_sessions_${currentClient}`, JSON.stringify(activeTabs));
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
    // === DEVELOPER TAG INJECTOR ===
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
        creditTag.innerHTML = "Created by <b>Nauman (Ph: 03037654849)</b>";
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

    // === HISTORY BUTTON INJECTOR ===
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

    // === RIGHT-SIDE DRAWER SETUP ===
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
    let csv = "MC Number,USDOT Number,Company Name,Entity Type,Operating Status,Phone,Address,Email,Power Units,Drivers\n"; 
    recordsData.forEach(r => { 
        csv += `${r.mc},${r.usdot},"${r.name}","${r.entityType}","${r.status}","${r.phone}","${r.address}","${r.email}","${r.powerUnits}","${r.drivers}"\n`; 
    }); 
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
