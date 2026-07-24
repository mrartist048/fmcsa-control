// ====== ACCESS CONTROL CONFIGURATION ======
const allowedUsers = {
    "dispatcher_lahore": true,   
    "dispatcher_karachi": false, 
    "dispatchloadify": true,
};

const currentClient = window.scrClientID || "unknown";

if (!allowedUsers[currentClient]) {
    document.getElementById('status').innerText = "ERROR: Subscription Expired Please contact the administrator. (Whatsapp 03037654849)";
    document.getElementById('status').style.background = "#f8d7da";
    document.getElementById('status').style.color = "#721c24";
    document.getElementById('status').style.borderLeft = "4px solid #d9534f";
    document.getElementById('startBtn').disabled = true;
    document.getElementById('startBtn').style.opacity = "0.5";
    alert("Your access has been revoked or expired. Contact admin for renewal.");
    throw new Error("Access Denied");
}

// ====== INDEXEDDB HISTORY SETUP ======
let db;
const request = indexedDB.open("ScraperHistoryDB", 1);
request.onupgradeneeded = function(e) {
    db = e.target.result;
    if (!db.objectStoreNames.contains("history")) {
        db.createObjectStore("history", { keyPath: "id", autoIncrement: true });
    }
};
request.onsuccess = function(e) {
    db = e.target.result;
    renderHistoryTable(); // Database khulte hi purani history screen par show ho jayegi
};

// History Table ko HTML mein inject karne ka function
function renderHistoryTable() {
    if (!db) return;
    
    // Check karein agar pehle se history container bana hua hai, nahi to create karein
    let historyContainer = document.getElementById('scraperHistoryContainer');
    if (!historyContainer) {
        historyContainer = document.createElement('div');
        historyContainer.id = 'scraperHistoryContainer';
        historyContainer.style.marginTop = "30px";
        historyContainer.style.fontFamily = "sans-serif";
        
        // Pura table framework main container ke bahar inject kar rahe hain
        const mainBox = document.getElementById('status').parentElement;
        mainBox.appendChild(historyContainer);
    }

    const tx = db.transaction("history", "readonly");
    const store = tx.objectStore("history");
    const getAll = store.getAll();

    getAll.onsuccess = function() {
        const data = getAll.result.reverse(); // Nayi files sab se upar aayengi
        
        if (data.length === 0) {
            historyContainer.innerHTML = `
                <h3 style="color: #002d62; border-bottom: 2px solid #002d62; padding-bottom: 5px; font-size: 16px;">Saved Sheets History</h3>
                <p style="color: #6c757d; font-size: 13px; font-style: italic;">No history available yet. Complete a scan to save sheets automatically.</p>
            `;
            return;
        }

        let tableRows = "";
        data.forEach(item => {
            tableRows += `
                <tr style="border-bottom: 1px solid #e9ecef;">
                    <td style="padding: 10px; font-size: 13px;"><b>${item.date}</b></td>
                    <td style="padding: 10px; font-size: 13px; color: #555;">${item.range}</td>
                    <td style="padding: 10px; font-size: 13px; text-align: center;"><span style="background: #e2eafc; color: #002d62; padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 11px;">${item.totalRecords} Records</span></td>
                    <td style="padding: 10px; text-align: right;">
                        <button onclick="downloadHistoryCSV(${item.id})" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; margin-right: 5px;">📥 Download</button>
                        <button onclick="deleteHistoryItem(${item.id})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">🗑️ Delete</button>
                    </td>
                </tr>
            `;
        });

        historyContainer.innerHTML = `
            <h3 style="color: #002d62; border-bottom: 2px solid #002d62; padding-bottom: 5px; font-size: 16px; margin-bottom: 15px;">Saved Sheets History</h3>
            <table style="width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden;">
                <thead>
                    <tr style="background: #002d62; color: white; text-align: left;">
                        <th style="padding: 10px; font-size: 13px;">Date & Time</th>
                        <th style="padding: 10px; font-size: 13px;">MC Range</th>
                        <th style="padding: 10px; font-size: 13px; text-align: center;">Total Active</th>
                        <th style="padding: 10px; font-size: 13px; text-align: right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;
    };
}

// Purani sheet database se download karne ka function
window.downloadHistoryCSV = function(id) {
    const tx = db.transaction("history", "readonly");
    const store = tx.objectStore("history");
    const req = store.get(id);
    req.onsuccess = function() {
        const item = req.result;
        if (item) {
            triggerCSVDownload(item.records, `History_MC_${item.range.replace(/\s+/g, '_')}.csv`);
        }
    };
};

// History se item delete karne ka function
window.deleteHistoryItem = function(id) {
    if (confirm("Are you sure you want to delete this sheet from history?")) {
        const tx = db.transaction("history", "readwrite");
        const store = tx.objectStore("history");
        store.delete(id);
        tx.oncomplete = function() {
            renderHistoryTable();
        };
    }
};

// Main CSV generate karne ka helper
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

// ====== ASLI SCRAPING LOGIC (WITH INLINE MINI-CIRCLE & AUTO-SAVE TO HISTORY) ======
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
                let isAuth = record.status.toLowerCase().includes('authorized');
                tableBody.innerHTML += `<tr>
                    <td><b>${record.mc}</b></td>
                    <td>${record.usdot}</td>
                    <td>${record.name}</td>
                    <td>${record.entityType}</td>
                    <td><span class="badge ${isAuth?'badge-active':'badge-inactive'}">${record.status}</span></td>
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
    document.getElementById('stopBtn').style.display = 'none';
    
    if (statusBox) {
        statusBox.style.padding = "15px";
        statusBox.style.display = "block";
        statusBox.style.borderLeft = "5px solid #28a745";
        statusBox.innerHTML = `<strong style="font-size: 16px; color: #28a745; font-family: sans-serif;">Done! Found ${scrapedData.length} active records.</strong>`;
    }
    
    // SCAN KHATAM HOTE HI DATA AUTO-SAVE TO INDEXEDDB
    if(scrapedData.length > 0 && db) {
        document.getElementById('downloadBtn').style.display = 'inline-block';
        
        const now = new Date();
        const formattedDate = now.toLocaleString('en-US', { hour12: true });
        
        const newHistoryItem = {
            date: formattedDate,
            range: `${start} - ${end}`,
            totalRecords: scrapedData.length,
            records: scrapedData
        };
        
        const tx = db.transaction("history", "readwrite");
        const store = tx.objectStore("history");
        store.add(newHistoryItem);
        tx.oncomplete = function() {
            renderHistoryTable(); // Nayi sheet ka table refresh ho kar screen par aa jayega
        };
    }
}

window.downloadCSV = function() {
    if(scrapedData.length > 0) {
        const start = document.getElementById('startMc').value;
        const end = document.getElementById('endMc').value;
        triggerCSVDownload(scrapedData, `SAFER_Clean_Data_${start}_to_${end}.csv`);
    }
}
