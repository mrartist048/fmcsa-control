<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dispatch Link</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f4f7fe; color: #333; }
        .container { max-width: 1200px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .controls { display: flex; gap: 10px; margin-bottom: 15px; align-items: center; flex-wrap: wrap; }
        input { padding: 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; }
        button { padding: 9px 16px; font-size: 14px; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; color: white; }
        #startBtn { background: #28a745; }
        #stopBtn { background: #dc3545; display: none; }
        #downloadBtn { background: #002d62; display: none; }
        #status { margin-bottom: 15px; font-weight: bold; font-size: 14px; }
        .table-responsive { width: 100%; overflow-x: auto; max-height: 500px; border: 1px solid #ddd; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; min-width: 1000px; background: #fff; }
        th, td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; font-size: 13px; vertical-align: top; }
        th { background: #002d62; color: white; position: sticky; top: 0; }
        
        /* Dropdown Checkbox Styling */
        .dropdown-check-list { display: inline-block; position: relative; }
        .dropdown-check-list .anchor { position: relative; cursor: pointer; display: inline-block; padding: 6px 12px; background: white; border: 1px solid #b6ccfe; border-radius: 4px; font-size: 12px; user-select: none; color: #002d62; font-weight: bold; }
        .dropdown-check-list .anchor:active { background-color: #f1f1f1; }
        .dropdown-check-list ul.items { position: absolute; background: white; border: 1px solid #b6ccfe; border-top: none; border-radius: 0 0 4px 4px; display: none; margin: 0; padding: 10px; list-style: none; max-height: 200px; overflow-y: auto; z-index: 1000; width: 220px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: left; }
        .dropdown-check-list.visible ul.items { display: block; }
        .dropdown-check-list ul.items li { margin-bottom: 5px; font-size: 12px; }
    </style>
</head>
<body>

<div class="container">
    <h2>Dispatch Link | Lead Processor & CRM</h2>
    
    <div class="controls">
        <label>Start MC:</label>
        <input type="number" id="startMc" placeholder="e.g. 1">
        <label>End MC:</label>
        <input type="number" id="endMc" placeholder="e.g. 1000">
        <button id="startBtn" onclick="startScraping()">Start Fetching</button>
        <button id="stopBtn" onclick="stopScraping()">Stop</button>
        <button id="downloadBtn" onclick="downloadCSV()">Download CSV</button>
    </div>

    <div id="status">Ready to fetch...</div>

    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>MC Number</th>
                    <th>USDOT</th>
                    <th>Company Name</th>
                    <th>Entity Type</th>
                    <th>Status</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Email</th>
                    <th>Power Units</th>
                    <th>Vehicle Type</th>
                </tr>
            </thead>
            <tbody id="resultsTable"></tbody>
        </table>
    </div>
</div>

<script>
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

const allowedUsers = {
    "Gslogisticsdispatch": { pass: "Gslogisticsdispatch", maxLaptops: 2, expires: "2026-07-28", dbUrl: FIREBASE_DB_URL_1 },    
    "precisionx": { pass: "precisionx123", maxLaptops: 1, expires: "2026-07-30", dbUrl: FIREBASE_DB_URL_1 },  
    "dispatchloadify": { pass: "admin789", maxLaptops: 5, expires: "2026-09-01", dbUrl: FIREBASE_DB_URL_2 }, 
    "baitstarlogistics": { pass: "baitstarlogistics123", maxLaptops: 10, expires: "2026-08-30", dbUrl: FIREBASE_DB_URL_2 },         
    "Skylinelogistics": { pass: "Skylinelogistics123", maxLaptops: 2, expires: "2026-08-30", dbUrl: FIREBASE_DB_URL_1 },  
    "Loadlink": { pass: "Loadlink#trial", maxLaptops: 3, expires: "2026-08-14", dbUrl: FIREBASE_DB_URL_2 },
    "Nexteklogistics": { pass: "Nexteklogistics#123", maxLaptops: 1, expires: "2026-09-22", dbUrl: FIREBASE_DB_URL_2 },
    "testinguser": { pass: "testinguser123", maxLaptops: 2, expires: "2026-08-30", dbUrl: FIREBASE_DB_URL_3 }, 
};

let currentClient = localStorage.getItem("dl_logged_client") || "";
const FIREBASE_DB_URL = (currentClient && allowedUsers[currentClient] && allowedUsers[currentClient].dbUrl) ? allowedUsers[currentClient].dbUrl : FIREBASE_DB_URL_1;
let userLimit = 0;
let dispatcherNickname = ""; 

if (!window.name || !window.name.startsWith("dl_inst_")) {
    window.name = "dl_inst_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
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
    injectAdvancedFilterBar();
};

function toggleCategoryDropdown(e) {
    e.stopPropagation();
    let list = document.getElementById('categoryDropdownCheckList');
    if (list) {
        list.classList.toggle('visible');
    }
}

window.addEventListener('click', function(event) {
    if (!event.target.closest('#categoryDropdownCheckList')) {
        let list = document.getElementById('categoryDropdownCheckList');
        if (list && list.classList.contains('visible')) {
            list.classList.remove('visible');
        }
    }
});

function updateCategoryCheckboxes() {
    let container = document.getElementById('checkboxListContainer');
    if (!container) return;
    let currentChecked = Array.from(document.querySelectorAll('.cat-checkbox:checked')).map(cb => cb.value);
    
    let html = "";
    Array.from(availableCategories).sort().forEach(cat => {
        let isChecked = currentChecked.includes(cat) ? "checked" : "";
        html += `<li><label style="cursor: pointer; display: flex; align-items: center; gap: 6px;"><input type="checkbox" class="cat-checkbox" value="${cat}" ${isChecked} onchange="applyAdvancedFilters()"> ${cat}</label></li>`;
    });
    container.innerHTML = html;
}

function injectAdvancedFilterBar() {
    let table = document.querySelector('table');
    if (!table || document.getElementById('advancedFilterWrapper')) return;

    let filterDiv = document.createElement('div');
    filterDiv.id = 'advancedFilterWrapper';
    filterDiv.style.cssText = "background: #f4f7fe; padding: 12px 15px; margin: 12px 0; border: 1px solid #b6ccfe; border-radius: 6px; font-family: sans-serif; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; justify-content: space-between;";
    filterDiv.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; flex: 1;">
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 13px; font-weight: bold; color: #002d62;">📍 State:</span>
                <select id="stateDropdownSelect" style="padding: 6px 10px; font-size: 12px; border: 1px solid #b6ccfe; border-radius: 4px; background: white; color: #002d62; font-weight: bold;" onchange="applyAdvancedFilters()">
                    <option value="">All States</option>
                </select>
            </div>
            
            <div id="categoryDropdownCheckList" class="dropdown-check-list" tabindex="100">
                <span class="anchor" onclick="toggleCategoryDropdown(event)">Select Categories ▼</span>
                <ul id="checkboxListContainer" class="items"></ul>
            </div>

            <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 220px;">
                <span style="font-size: 13px; font-weight: bold; color: #002d62;">🔍 Search:</span>
                <input type="text" id="universalSearchInput" placeholder="Search MC, Company Name..." style="width: 100%; padding: 6px 10px; font-size: 12px; border: 1px solid #b6ccfe; border-radius: 4px;" oninput="applyAdvancedFilters()">
            </div>
            <button onclick="resetAdvancedFilters()" style="background: #002d62; color: white; border: none; padding: 6px 14px; font-size: 12px; font-weight: bold; border-radius: 4px; cursor: pointer;">🔄 Reset</button>
        </div>
        <div style="background: #002d62; color: white; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: bold; white-space: nowrap;">
            📊 Showing: <span id="visibleRecordCountBadge">0</span> Records
        </div>
    `;
    table.parentNode.insertBefore(filterDiv, table);
    populateStateDropdown();
}

function populateStateDropdown() {
    let select = document.getElementById('stateDropdownSelect');
    if (!select) return;
    let stateCounts = {};
    if (typeof scrapedData !== 'undefined' && scrapedData.length > 0) {
        scrapedData.forEach(r => {
            let addr = (r.address || "").toUpperCase();
            for (let code in usStatesMap) {
                let stateRegex = new RegExp(`\\b${code}\\b(?=\\s+\\d{5}(-\\d{4})?)`);
                if (stateRegex.test(addr)) {
                    stateCounts[code] = (stateCounts[code] || 0) + 1;
                    break;
                }
            }
        });
    }
    let currentVal = select.value;
    select.innerHTML = '<option value="">All States</option>';
    Object.keys(stateCounts).sort().forEach(code => {
        let opt = document.createElement('option');
        opt.value = code;
        opt.textContent = `${usStatesMap[code] || code} (${code}) - ${stateCounts[code]}`;
        select.appendChild(opt);
    });
    select.value = currentVal;
    updateVisibleRecordCount();
}

window.applyAdvancedFilters = function() {
    let selectedState = (document.getElementById('stateDropdownSelect')?.value || "").toUpperCase().trim();
    let searchQuery = (document.getElementById('universalSearchInput')?.value || "").toLowerCase().trim();
    let selectedCategories = Array.from(document.querySelectorAll('.cat-checkbox:checked')).map(cb => cb.value);

    let rows = document.querySelectorAll('#resultsTable tr');
    rows.forEach((row, index) => {
        let record = scrapedData[index];
        if (!record) return;

        let mcText = record.mc.toString().toLowerCase();
        let nameText = record.name.toLowerCase();
        let phoneText = record.phone.toLowerCase();
        let addressText = record.address.toUpperCase();
        let carrierDetailsText = record.carrierDetails || "";

        let matchesState = true;
        if (selectedState !== "") {
            let stateRegex = new RegExp(`\\b${selectedState}\\b(?=\\s+\\d{5}(-\\d{4})?)`);
            matchesState = stateRegex.test(addressText);
        }

        let matchesSearch = searchQuery === "" || mcText.includes(searchQuery) || nameText.includes(searchQuery) || phoneText.includes(searchQuery);
        let matchesCategory = selectedCategories.length === 0 || selectedCategories.every(cat => carrierDetailsText.includes(cat));

        row.style.display = (matchesState && matchesSearch && matchesCategory) ? "" : "none";
    });
    updateVisibleRecordCount();
};

window.resetAdvancedFilters = function() {
    document.getElementById('stateDropdownSelect').value = "";
    document.getElementById('universalSearchInput').value = "";
    document.querySelectorAll('.cat-checkbox').forEach(cb => cb.checked = false);
    applyAdvancedFilters();
};

function updateVisibleRecordCount() {
    let rows = document.querySelectorAll('#resultsTable tr');
    let visibleCount = 0;
    rows.forEach(r => { if (r.style.display !== 'none') visibleCount++; });
    let badge = document.getElementById('visibleRecordCountBadge');
    if (badge) badge.innerText = visibleCount;
}

let scraping = false; 
let scrapedData = [];

window.stopScraping = function() {
    scraping = false;
    document.getElementById('status').innerHTML = "<strong>⏸️ Processing Paused Safely.</strong>";
};

async function startScraping() {
    const start = parseInt(document.getElementById('startMc').value);
    const end = parseInt(document.getElementById('endMc').value);
    const statusBox = document.getElementById('status');
    const tableBody = document.getElementById('resultsTable');

    if (isNaN(start) || isNaN(end) || start > end) {
        statusBox.innerText = "Please enter a valid MC range.";
        return;
    }

    scrapedData = [];
    availableCategories.clear();
    tableBody.innerHTML = '';
    scraping = true;
    
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'inline-block';
    document.getElementById('downloadBtn').style.display = 'none';

    let totalToScan = end - start + 1;
    let processed = 0;

    for (let mc = start; mc <= end; mc++) {
        if (!scraping) break;
        processed++;
        statusBox.innerText = `Scanning MC ${mc} (${processed}/${totalToScan})...`;

        try {
            const snapshotUrl = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${mc}`;
            const response = await fetch(snapshotUrl);
            if (!response.ok) continue;
            const htmlText = await response.text();

            if (htmlText.includes("Record not found") || !htmlText.includes("USDOT Number:")) {
                continue;
            }

            let record = { mc: mc, usdot: 'N/A', name: 'N/A', entityType: 'N/A', status: 'N/A', phone: 'N/A', address: 'N/A', email: 'N/A', powerUnits: 'N/A', vehicleType: 'N/A', carrierDetails: '' };
            let el = document.createElement('html');
            el.innerHTML = htmlText;
            let cells = el.querySelectorAll('td, th');

            for (let i = 0; i < cells.length; i++) {
                let text = cells[i].textContent.trim();
                if (text.startsWith("Legal Name:") || text.startsWith("Entity Name:")) { if(cells[i+1]) record.name = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
                if (text.startsWith("USDOT Number:")) { if(cells[i+1]) record.usdot = cells[i+1].textContent.trim().split(/\s+/)[0]; }
                if (text.startsWith("Entity Type:")) { if(cells[i+1]) record.entityType = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
                if (text.startsWith("Operating Authority Status:")) {
                    if (cells[i+1]) {
                        let rawStatus = cells[i+1].textContent.toUpperCase();
                        record.status = rawStatus.includes("NOT AUTHORIZED") ? "NOT AUTHORIZED" : (rawStatus.includes("AUTHORIZED") || rawStatus.includes("ACTIVE") ? "AUTHORIZED" : cells[i+1].textContent.trim());
                    }
                }
                if (text.startsWith("Power Units:")) { if(cells[i+1]) record.powerUnits = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
                if (text.startsWith("Phone:")) { if(cells[i+1]) record.phone = cells[i+1].textContent.trim().replace(/\s+/g, ' '); }
                if (text.startsWith("Physical Address:") || (text.startsWith("Address:") && !text.includes("Mailing"))) {
                    if(cells[i+1]) record.address = cells[i+1].textContent.trim().replace(/\s+/g, ' ');
                }
            }

            if (record.status !== "AUTHORIZED") continue;

            let tables = el.querySelectorAll('table');
            let allDetails = [];
            tables.forEach(table => {
                let rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    let rCells = row.querySelectorAll('td');
                    rCells.forEach((cell, idx) => {
                        let cVal = cell.textContent.trim();
                        if (cVal === 'X' || cVal.toLowerCase() === 'x') {
                            let labelCell = rCells[idx + 1] || rCells[idx - 1];
                            if (labelCell) {
                                let cleanVal = labelCell.textContent.trim().replace(/\s+/g, ' ');
                                if (cleanVal && cleanVal !== 'X' && !allDetails.includes(cleanVal)) {
                                    allDetails.push(cleanVal);
                                    availableCategories.add(cleanVal);
                                }
                            }
                        }
                    });
                });
            });
            if (allDetails.length > 0) record.carrierDetails = allDetails.join(', ');

            scrapedData.push(record);
            updateCategoryCheckboxes();

            let row = document.createElement('tr');
            row.innerHTML = `
                <td><b>${record.mc}</b></td>
                <td>${record.usdot}</td>
                <td>${record.name}</td>
                <td>${record.entityType}</td>
                <td style="color: green; font-weight: bold;">${record.status}</td>
                <td>${record.phone}</td>
                <td>${record.address}</td>
                <td>${record.email}</td>
                <td>${record.powerUnits}</td>
                <td><b>${record.vehicleType}</b></td>
            `;
            tableBody.appendChild(row);
            applyAdvancedFilters();

        } catch (err) {
            console.error(err);
        }

        await new Promise(r => setTimeout(r, 200));
    }

    scraping = false;
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('stopBtn').style.display = 'none';
    if (scrapedData.length > 0) document.getElementById('downloadBtn').style.display = 'inline-block';
    statusBox.innerText = `Completed! Found ${scrapedData.length} Authorized records.`;
}

function downloadCSV() {
    if (scrapedData.length === 0) return;
    let csv = "MC Number,USDOT,Company Name,Entity Type,Status,Phone,Address,Email,Power Units,Vehicle Type,Carrier Details\n";
    scrapedData.forEach(r => {
        csv += `${r.mc},${r.usdot},"${r.name}","${r.entityType}","${r.status}","${r.phone}","${r.address}","${r.email}","${r.powerUnits}","${r.vehicleType}","${r.carrierDetails}"\n`;
    });
    let blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "FMCSA_Filtered_Data.csv";
    link.click();
}
</script>

</body>
</html>
