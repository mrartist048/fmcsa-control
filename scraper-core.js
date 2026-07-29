async function renderAdvancedAdminModal() {
    let existing = document.getElementById('dlAdminReportsModal');
    if (existing) existing.remove();

    let modal = document.createElement('div');
    modal.id = 'dlAdminReportsModal';
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 10000000; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    
    modal.innerHTML = `
        <div style="background: white; width: 620px; max-height: 90vh; border-radius: 10px; box-shadow: 0 15px 35px rgba(0,0,0,0.3); display: flex; flex-direction: column; overflow: hidden;">
            <div style="background: #002d62; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 18px;">👑 Admin Dashboard & Team Monitoring</h3>
                <button onclick="document.getElementById('dlAdminReportsModal').remove()" style="background: none; border: none; color: white; font-size: 22px; cursor: pointer; font-weight: bold;">&times;</button>
            </div>
            
            <!-- Tab Navigation Bar -->
            <div style="display: flex; background: #f1f3f4; border-bottom: 1px solid #ddd; padding: 10px 15px; gap: 8px;">
                <button onclick="switchAdminTab('online')" id="adminTabBtnOnline" style="flex: 1; background: #002d62; color: white; border: none; padding: 9px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s;">🟢 Live Users</button>
                <button onclick="switchAdminTab('leaderboard')" id="adminTabBtnLeaderboard" style="flex: 1; background: #e2eafc; color: #002d62; border: 1px solid #b6ccfe; padding: 9px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s;">🏆 Team Calling</button>
                <button onclick="switchAdminTab('reports')" id="adminTabBtnReports" style="flex: 1; background: #e2eafc; color: #002d62; border: 1px solid #b6ccfe; padding: 9px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s;">📋 Shift Reports</button>
            </div>

            <!-- Modal Body Container -->
            <div id="adminReportsModalBody" style="padding: 20px; overflow-y: auto; flex: 1; text-align: center; color: #6c757d; background: #fafbfc;">
                Loading live team status and reports...
            </div>

            <!-- Footer with Clean Actions -->
            <div style="background: #ffffff; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee;">
                <button onclick="downloadAdminReportCSV()" style="background: #28a745; color: white; border: none; padding: 8px 16px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px;">📥 Export CSV Report</button>
                <button onclick="document.getElementById('dlAdminReportsModal').remove()" style="background: #6c757d; color: white; border: none; padding: 8px 18px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;">Close Panel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    try {
        let [sessionsRes, reportsRes] = await Promise.all([
            fetch(`${FIREBASE_DB_URL}sessions/${currentClient}.json`),
            fetch(`${FIREBASE_DB_URL}shift_reports/${currentClient}/${dispatcherNickname}.json`)
        ]);

        let sessionsData = await sessionsRes.json() || {};
        let reportsData = await reportsRes.json() || [];

        window.cachedAdminSessions = sessionsData;
        window.cachedAdminReports = Array.isArray(reportsData) ? reportsData : [];
        
        renderAdminTabContent('online');
    } catch (e) {
        console.error("Failed to load admin monitoring dashboard:", e);
        let bodyContainer = document.getElementById('adminReportsModalBody');
        if (bodyContainer) bodyContainer.innerHTML = `<p style="color: #dc3545;">Failed to load data from database.</p>`;
    }
}

window.switchAdminTab = function(tabName) {
    let btnOnline = document.getElementById('adminTabBtnOnline');
    let btnLeaderboard = document.getElementById('adminTabBtnLeaderboard');
    let btnReports = document.getElementById('adminTabBtnReports');

    [btnOnline, btnLeaderboard, btnReports].forEach(b => {
        if (b) {
            b.style.background = "#e2eafc";
            b.style.color = "#002d62";
            b.style.border = "1px solid #b6ccfe";
        }
    });

    let activeBtn = tabName === 'online' ? btnOnline : tabName === 'leaderboard' ? btnLeaderboard : btnReports;
    if (activeBtn) {
        activeBtn.style.background = "#002d62";
        activeBtn.style.color = "white";
        activeBtn.style.border = "none";
    }

    renderAdminTabContent(tabName);
};

function renderAdminTabContent(tabName) {
    let bodyContainer = document.getElementById('adminReportsModalBody');
    if (!bodyContainer) return;

    let sessionsData = window.cachedAdminSessions || {};
    let reportsList = window.cachedAdminReports || [];
    let now = Date.now();

    if (tabName === 'online') {
        let activeUsersHtml = `<div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">`;
        let activeCount = 0;

        Object.keys(sessionsData).forEach(key => {
            let s = sessionsData[key];
            if (s && s.nickname && s.timestamp) {
                let isOnline = (now - s.timestamp < 25000);
                if (isOnline) {
                    activeCount++;
                    let lastActiveTime = new Date(s.timestamp).toLocaleTimeString();
                    activeUsersHtml += `
                        <div style="background: white; border: 1px solid #e0e0e0; border-left: 4px solid #28a745; padding: 12px 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
                            <div>
                                <div style="font-size: 14px; font-weight: bold; color: #002d62; display: flex; align-items: center; gap: 6px;">
                                    🟢 <span>${s.nickname}</span> <span style="font-size: 10px; background: #e8f5e9; color: #2e7d32; padding: 2px 6px; border-radius: 4px;">Online</span>
                                </div>
                                <div style="color: #666; font-size: 11px; margin-top: 4px;">Login Time: <b>${s.loginTime || 'N/A'}</b></div>
                            </div>
                            <div style="color: #555; font-size: 11px; background: #f8f9fa; padding: 6px 10px; border-radius: 4px; border: 1px solid #eee;">Last Heartbeat: <br><b>${lastActiveTime}</b></div>
                        </div>
                    `;
                }
            }
        });

        if (activeCount === 0) {
            activeUsersHtml += `<div style="text-align: center; color: #6c757d; font-size: 13px; font-style: italic; padding: 30px;">No dispatchers currently online.</div>`;
        }
        activeUsersHtml += `</div>`;
        bodyContainer.innerHTML = activeUsersHtml;

    } else if (tabName === 'leaderboard') {
        let perfMap = {};
        reportsList.forEach(rep => {
            let name = rep.sender || "Unknown";
            if (!perfMap[name]) {
                perfMap[name] = { totalCalls: 0, shiftsCount: 0 };
            }
            perfMap[name].totalCalls += rep.totalCalls || 0;
            perfMap[name].shiftsCount += 1;
        });

        let sortedLeaderboard = Object.keys(perfMap).sort((a, b) => perfMap[b].totalCalls - perfMap[a].totalCalls);
        let leaderHtml = `<div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">`;

        if (sortedLeaderboard.length === 0) {
            leaderHtml += `<div style="text-align: center; color: #6c757d; font-size: 13px; font-style: italic; padding: 30px;">No team calling performance data available yet.</div>`;
        } else {
            sortedLeaderboard.forEach((name, idx) => {
                let stats = perfMap[name];
                let medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `<b>#${idx+1}</b>`;
                leaderHtml += `
                    <div style="background: white; border: 1px solid #e0e0e0; border-left: 4px solid #ff9800; padding: 12px 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px; width: 25px; text-align: center;">${medal}</span>
                            <div>
                                <b style="color: #002d62; font-size: 15px;">${name}</b>
                                <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">Total Shifts Logged: ${stats.shiftsCount}</div>
                            </div>
                        </div>
                        <div style="background: #002d62; color: white; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: bold;">
                            Total Calls: ${stats.totalCalls}
                        </div>
                    </div>
                `;
            });
        }
        leaderHtml += `</div>`;
        bodyContainer.innerHTML = leaderHtml;

    } else if (tabName === 'reports') {
        let reportsHtml = `<div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">`;
        
        if (reportsList.length === 0) {
            reportsHtml += `<div style="text-align: center; color: #6c757d; font-size: 13px; font-style: italic; padding: 30px;">No shift reports received yet.</div>`;
        } else {
            reportsList.slice().reverse().forEach(rep => {
                reportsHtml += `
                    <div style="background: white; border: 1px solid #e0e0e0; border-left: 4px solid #17a2b8; padding: 12px 15px; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
                        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #002d62; margin-bottom: 6px;">
                            <span>👤 Agent: ${rep.sender}</span>
                            <span style="color: #6c757d; font-weight: normal; font-size: 12px;">📅 Shift: ${rep.date}</span>
                        </div>
                        <div style="font-size: 11px; color: #888; margin-bottom: 8px;">Submitted At: ${rep.timestamp}</div>
                        <div style="font-size: 12px; background: #f8f9fa; padding: 8px 12px; border-radius: 4px; border: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                            <span>Total Calls Logged:</span>
                            <b style="color: #002d62; font-size: 14px;">${rep.totalCalls} Calls</b>
                        </div>
                    </div>
                `;
            });
        }
        reportsHtml += `</div>`;
        bodyContainer.innerHTML = reportsHtml;
    }
}
