// ====== ACCESS CONTROL CONFIGURATION ======
// Yahan aap apne clients ke username aur unka status manage karenge
const allowedUsers = {
    "dispatcher_lahore": true,   // Is client ka access chal raha hai
    "dispatcher_karachi": false, // Is client ka access aap ne band kar diya
    "dispatchloadify": true,
};

// Jis client ko aap file de rahe hain, uska username yahan check hoga
const currentClient = window.scrClientID || "unknown";

if (!allowedUsers[currentClient]) {
    // Agar client list mein nahi hai ya 'false' hai to tool block ho jayega
    document.getElementById('status').innerText = "ERROR: Subscription Expired Please contact the administrator. (Whatsapp 03037654849)";
    document.getElementById('status').style.background = "#f8d7da";
    document.getElementById('status').style.color = "#721c24";
    document.getElementById('status').style.borderLeft = "4px solid #d9534f";
    
    // Buttons ko disable kar dete hain taake woh click na kar sakein
    document.getElementById('startBtn').disabled = true;
    document.getElementById('startBtn').style.opacity = "0.5";
    alert("Your access has been revoked or expired. Contact admin for renewal.");
    throw new Error("Access Denied"); // Code ko yahin rok dega
}

// ====== ASLI SCRAPING LOGIC (WITH NEW PROGRESS & ETA LOGIC) ======
let scraping = false; let scrapedData = [];
window.stopScraping = function() { scraping = false; document.getElementById('status').innerText = "Stopping..."; }

window.startScraping = async function() {
    const start = parseInt(document.getElementById('startMc').value);
    const end = parseInt(document.getElementById('endMc').value);
    
    // Range validate karne ke baad calculations shuru karenge
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
    
    // ETA Aur Percentage Ke Naye Variables
    let startTime = null;
    let totalToScan = end - start + 1;
    let totalProcessed = 0; // Kitne MCs ka process cycle guzra (chahay record mile ya na mile)

    for (let mc = start; mc <= end; mc++) {
        if (!scraping) break;
        
        totalProcessed++;
        if (startTime === null) {
            startTime = Date.now(); // Pehli request start hote hi time note kiya
        }

        // Percentage aur Live Remaining Time (ETA) Calculation Logic
        let percentage = Math.floor((totalProcessed / totalToScan) * 100);
        let elapsedSeconds = (Date.now() - startTime) / 1000;
        let avgTimePerMC = elapsedSeconds / totalProcessed;
        let remainingMCs = totalToScan - totalProcessed;
        let estimatedRemainingSeconds = remainingMCs * avgTimePerMC;

        let mins = Math.floor(estimatedRemainingSeconds / 60);
        let secs = Math.floor(estimatedRemainingSeconds % 60);

        let timeString = "";
        if (totalProcessed < 3) {
            timeString = "Calculating ETA..."; // Shuruati 2 requests tak display normal rahega
        } else {
            timeString = `Estimated Time Remaining: ${mins}m ${secs}s`;
        }

        // Status bar ko do hisson mein clean show karwayenge (Left pe MC, Right pe ETA)
        document.getElementById('status').innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span><strong>Scanning MC ${mc}...</strong> (${percentage}%)</span>
                <span style="color: #555; font-size: 13px; font-weight: bold; font-family: sans-serif;">${timeString}</span>
            </div>
        `;

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
                // Email nikalte waqt bhi ETA aur scanning wala status bar intact rahega
                document.getElementById('status').innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span><strong>Extracting Email for USDOT ${record.usdot}...</strong> (${percentage}%)</span>
                        <span style="color: #555; font-size: 13px; font-weight: bold; font-family: sans-serif;">${timeString}</span>
                    </div>
                `;
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
    document.getElementById('status').innerText = `Done! Found ${scrapedData.length} active records.`;
    if(scrapedData.length > 0) document.getElementById('downloadBtn').style.display = 'inline-block';
}

window.downloadCSV = function() {
    let csv = "MC Number,USDOT Number,Company Name,Entity Type,Operating Status,Phone,Address,Email,Power Units,Drivers\n"; 
    scrapedData.forEach(r => { 
        csv += `${r.mc},${r.usdot},"${r.name}","${r.entityType}","${r.status}","${r.phone}","${r.address}","${r.email}","${r.powerUnits}","${r.drivers}"\n`; 
    }); 
    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'SAFER_Clean_Data.csv';
    link.click();
}
