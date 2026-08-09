function renderAdminTabContent(tabName) {
    let bodyContainer = document.getElementById('adminReportsModalBody');
    if (!bodyContainer) return;

    let sessionsData = window.cachedAdminSessions || {};
    let allReportsGrouped = window.cachedAdminReportsGrouped || {};
    let dbCallLogs = window.cachedAdminDbCallLogs || {};
    let now = Date.now();
    const offlineThreshold = 60000;

    let startDate = window.adminStartDateStr || "2020-01-01";
    let endDate = window.adminEndDateStr || "2030-12-31";

    if (tabName === 'online') {
        let usersHtml = `
            <div style="font-size: 11px; color: #6c757d; text-align: left; margin-bottom: 8px;">
                📅 Showing Active Status / Users Registered within Date Range: <b>${startDate}</b> to <b>${endDate}</b>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">
        `;
        
        let allKnownUsers = new Set();
        Object.keys(sessionsData).forEach(k => {
            if (sessionsData[k] && sessionsData[k].nickname) allKnownUsers.add(sessionsData[k].nickname);
        });
        Object.keys(allReportsGrouped).forEach(name => allKnownUsers.add(name));
        Object.keys(dbCallLogs).forEach(name => allKnownUsers.add(name));
        
        if (dispatcherNickname) allKnownUsers.add(dispatcherNickname);

        let userListArray = Array.from(allKnownUsers);
        let displayedCount = 0;

        userListArray.forEach(name => {
            let userSessionKey = Object.keys(sessionsData).find(k => sessionsData[k].nickname === name);
            let sessionObj = userSessionKey ? sessionsData[userSessionKey] : null;
            
            let sessionDate = sessionObj && sessionObj.shiftDate ? sessionObj.shiftDate : "";
            
            let agentDbLogs = dbCallLogs[name] || [];
            if (!Array.isArray(agentDbLogs)) agentDbLogs = [];
            let hasLogsInRange = agentDbLogs.some(l => {
                let lDate = l.shiftDate || "";
                return lDate >= startDate && lDate <= endDate;
            });

            let agentReports = allReportsGrouped[name] || [];
            if (!Array.isArray(agentReports)) agentReports = [];
            let hasReportsInRange = agentReports.some(r => {
                let rDate = r.date || "";
                return rDate >= startDate && rDate <= endDate;
            });

            let isOnline = false;
            if (sessionObj && sessionObj.timestamp && (now - sessionObj.timestamp < offlineThreshold)) {
                isOnline = true;
            }

            // Fix: Agar view mode 'online' hai, toh sirf online users ko dikhao chahe date range kuch bhi ho (ya live active users check krne k liye). Agar 'all' hai toh date range ya active check hoga.
            let matchesViewMode = true;
            if (window.adminUsersViewMode === 'online') {
                matchesViewMode = isOnline;
            } else if (window.adminUsersViewMode === 'offline') {
                matchesViewMode = !isOnline;
            }

            let isWithinDateRange = (sessionDate >= startDate && sessionDate <= endDate) || hasLogsInRange || hasReportsInRange || isOnline;
            if (!isWithinDateRange && window.adminDateFilterMode !== 'all' && window.adminUsersViewMode === 'all') {
                return;
            }

            if (!matchesViewMode) return;

            displayedCount++;
            let badgeHtml = isOnline 
                ? `<span style="font-size: 10px; background: #e8f5e9; color: #2e7d32; padding: 2px 6px; border-radius: 4px; font-weight: bold;">🟢 Online</span>`
                : `<span style="font-size: 10px; background: #f1f3f4; color: #6c757d; padding: 2px 6px; border-radius: 4px; font-weight: bold;">⚪ Offline</span>`;
            
            let borderColor = isOnline ? "#28a745" : "#6c757d";
            let loginInfo = sessionObj && sessionObj.loginTime ? `Login Time: <b>${sessionObj.loginTime}</b> (Date: ${sessionDate || 'N/A'})` : `Status: <b>Active / Registered</b>`;

            usersHtml += `
                <div style="background: white; border: 1px solid #e0e0e0; border-left: 4px solid ${borderColor}; padding: 12px 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
                    <div>
                        <div style="font-size: 14px; font-weight: bold; color: #002d62; display: flex; align-items: center; gap: 8px;">
                            <span>${name}</span> ${badgeHtml}
                        </div>
                        <div style="color: #666; font-size: 11px; margin-top: 4px;">${loginInfo}</div>
                    </div>
                    <div style="color: #555; font-size: 11px; background: #f8f9fa; padding: 6px 10px; border-radius: 4px; border: 1px solid #eee; text-align: right;">
                        Last Seen: <br><b>${sessionObj && sessionObj.timestamp ? new Date(sessionObj.timestamp).toLocaleTimeString() : 'N/A'}</b>
                    </div>
                </div>
            `;
        });

        if (displayedCount === 0) {
            usersHtml += `<div style="text-align: center; color: #6c757d; font-size: 13px; font-style: italic; padding: 30px;">No users found matching view mode "${window.adminUsersViewMode}" for selected filter.</div>`;
        }
        usersHtml += `</div>`;
        bodyContainer.innerHTML = usersHtml;

    } else if (tabName === 'leaderboard') {
        let perfMap = {};
        
        let allKnownUsers = new Set();
        Object.keys(allReportsGrouped).forEach(name => allKnownUsers.add(name));
        Object.keys(dbCallLogs).forEach(name => allKnownUsers.add(name));
        Object.keys(sessionsData).forEach(k => {
            if (sessionsData[k] && sessionsData[k].nickname) allKnownUsers.add(sessionsData[k].nickname);
        });
        if (dispatcherNickname) allKnownUsers.add(dispatcherNickname);

        allKnownUsers.forEach(agentName => {
            let agentDbLogs = dbCallLogs[agentName];
            if (!Array.isArray(agentDbLogs)) {
                let localLogs = JSON.parse(localStorage.getItem(`dl_call_logs_${currentClient}_${agentName}`)) || [];
                agentDbLogs = localLogs;
            }

            let filteredLogs = agentDbLogs.filter(l => {
                let lDate = l.shiftDate || "";
                return lDate >= startDate && lDate <= endDate;
            });

            if (filteredLogs.length > 0) {
                if (!perfMap[agentName]) {
                    perfMap[agentName] = { totalCalls: 0 };
                }
                perfMap[agentName].totalCalls = filteredLogs.length;
            } else {
                let repList = allReportsGrouped[agentName] || [];
                let filteredReps = repList.filter(r => r.date >= startDate && r.date <= endDate);
                if (filteredReps.length > 0) {
                    if (!perfMap[agentName]) {
                        perfMap[agentName] = { totalCalls: 0 };
                    }
                    perfMap[agentName].totalCalls = filteredReps.reduce((sum, r) => sum + (r.totalCalls || 0), 0);
                }
            }
        });

        let sortedLeaderboard = Object.keys(perfMap).sort((a, b) => perfMap[b].totalCalls - perfMap[a].totalCalls);
        let leaderHtml = `
            <div style="font-size: 11px; color: #6c757d; text-align: left; margin-bottom: 8px;">
                📅 Showing Calling Performance strictly from <b>${startDate}</b> to <b>${endDate}</b>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">
        `;

        let activeLeaderboardCount = 0;
        sortedLeaderboard.forEach((name) => {
            let stats = perfMap[name];
            if (stats.totalCalls > 0) {
                activeLeaderboardCount++;
                let idx = activeLeaderboardCount - 1;
                let medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `<b>#${idx+1}</b>`;
                leaderHtml += `
                    <div style="background: white; border: 1px solid #e0e0e0; border-left: 4px solid #ff9800; padding: 12px 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.03);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px; width: 25px; text-align: center;">${medal}</span>
                            <div>
                                <b style="color: #002d62; font-size: 15px;">${name}</b>
                                <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">Calls Tracked in Date Range</div>
                            </div>
                        </div>
                        <div style="background: #002d62; color: white; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: bold;">
                            Total Calls: ${stats.totalCalls}
                        </div>
                    </div>
                `;
            }
        });

        if (activeLeaderboardCount === 0) {
            leaderHtml += `<div style="text-align: center; color: #6c757d; font-size: 13px; font-style: italic; padding: 30px;">No calling performance data available for the selected date range (${startDate} to ${endDate}).</div>`;
        }
        leaderHtml += `</div>`;
        bodyContainer.innerHTML = leaderHtml;

    } else if (tabName === 'reports') {
        let allKnownUsers = new Set();
        Object.keys(allReportsGrouped).forEach(name => allKnownUsers.add(name));
        Object.keys(dbCallLogs).forEach(name => allKnownUsers.add(name));
        Object.keys(sessionsData).forEach(k => {
            if (sessionsData[k] && sessionsData[k].nickname) allKnownUsers.add(sessionsData[k].nickname);
        });
        if (dispatcherNickname) allKnownUsers.add(dispatcherNickname);

        let reportsHtml = `
            <div style="font-size: 11px; color: #6c757d; text-align: left; margin-bottom: 8px;">
                📅 Shift Reports & Pickup Ratio Breakdown strictly from <b>${startDate}</b> to <b>${endDate}</b>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; text-align: left;">
        `;
        
        let totalVisibleAgentsWithReports = 0;

        allKnownUsers.forEach(agent => {
            let agentDbLogs = dbCallLogs[agent];
            if (!Array.isArray(agentDbLogs)) {
                let localLogs = JSON.parse(localStorage.getItem(`dl_call_logs_${currentClient}_${agent}`)) || [];
                agentDbLogs = localLogs;
            }

            let filteredLogs = agentDbLogs.filter(l => {
                let lDate = l.shiftDate || "";
                return (lDate >= startDate && lDate <= endDate);
            });

            let reportsList = Array.isArray(allReportsGrouped[agent]) ? allReportsGrouped[agent] : [];
            let filteredReports = reportsList.filter(rep => {
                let repDate = rep.date || "";
                return (repDate >= startDate && repDate <= endDate);
            });

            let combinedShiftsMap = {};
            filteredReports.forEach(r => {
                combinedShiftsMap[r.date] = {
                    date: r.date,
                    timestamp: r.timestamp || "Submitted Shift",
                    totalCalls: r.totalCalls || 0,
                    logs: r.logs || []
                };
            });

            let logsGroupedByDate = {};
            filteredLogs.forEach(l => {
                let d = l.shiftDate;
                if (!logsGroupedByDate[d]) logsGroupedByDate[d] = [];
                logsGroupedByDate[d].push(l);
            });

            Object.keys(logsGroupedByDate).forEach(d => {
                let dayLogs = logsGroupedByDate[d];
                if (!combinedShiftsMap[d]) {
                    combinedShiftsMap[d] = {
                        date: d,
                        timestamp: "Live Active Shift",
                        totalCalls: dayLogs.length,
                        logs: dayLogs
                    };
                } else {
                    if (dayLogs.length > combinedShiftsMap[d].totalCalls) {
                        combinedShiftsMap[d].totalCalls = dayLogs.length;
                        combinedShiftsMap[d].logs = dayLogs;
                    }
                }
            });

            let finalAgentShifts = Object.values(combinedShiftsMap);

            if (finalAgentShifts.length > 0) {
                totalVisibleAgentsWithReports++;
                let totalAgentCalls = finalAgentShifts.reduce((sum, r) => sum + r.totalCalls, 0);
                let collapseId = `agent_report_box_${agent.replace(/\s+/g, '_')}`;

                reportsHtml += `
                    <div style="background: white; border: 1px solid #e0e0e0; border-left: 4px solid #002d62; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); overflow: hidden;">
                        <div onclick="toggleAgentReportAccordion('${collapseId}')" style="background: #f8f9fa; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 16px;">👤</span>
                                <div>
                                    <b style="color: #002d62; font-size: 14px;">${agent}</b>
                                    <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">Shifts in Range: ${finalAgentShifts.length} | Total Calls: ${totalAgentCalls}</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <button onclick="event.stopPropagation(); downloadSingleAgentReportCSV('${agent}')" style="background: #28a745; color: white; border: none; padding: 5px 10px; font-size: 11px; font-weight: bold; border-radius: 4px; cursor: pointer;" title="Download Agent CSV">📥 Download CSV</button>
                                <span style="font-size: 12px; font-weight: bold; color: #002d62;">▼ Click to Expand</span>
                            </div>
                        </div>
                        <div id="${collapseId}" style="display: none; padding: 12px 16px; border-top: 1px solid #eee; background: #fafbfc; flex-direction: column; gap: 8px;">
                `;

                finalAgentShifts.sort((a,b) => b.date.localeCompare(a.date)).forEach(rep => {
                    let logsArr = rep.logs || [];
                    let counts = { "Hung up": 0, "Voicemail": 0, "Not interested": 0, "Do not Call": 0, "Follow up": 0, "Sale Closed": 0 };
                    
                    logsArr.forEach(l => {
                        let st = l.status || "Hung up";
                        if (counts[st] !== undefined) counts[st]++;
                        else counts["Hung up"]++;
                    });

                    let totalC = logsArr.length > 0 ? logsArr.length : rep.totalCalls;
                    let connectedCalls = counts["Follow up"] + counts["Sale Closed"] + counts["Not interested"] + counts["Do not Call"];
                    let pickupRatio = totalC > 0 ? Math.round((connectedCalls / totalC) * 100) : 0;

                    reportsHtml += `
                        <div style="background: white; border: 1px solid #e9ecef; padding: 10px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div>
                                <div style="font-size: 12px; font-weight: bold; color: #002d62;">📅 Shift Date: ${rep.date} (${rep.timestamp})</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; flex-wrap: wrap;">
                                <span style="background: #ffebee; color: #c62828; padding: 3px 6px; border-radius: 3px; font-weight: bold;">Hung up: ${counts["Hung up"]}</span>
                                <span style="background: #f3e5f5; color: #6a1b9a; padding: 3px 6px; border-radius: 3px; font-weight: bold;">Voicemail: ${counts["Voicemail"]}</span>
                                <span style="background: #fff3e0; color: #ef6c00; padding: 3px 6px; border-radius: 3px; font-weight: bold;">Not interested: ${counts["Not interested"]}</span>
                                <span style="background: #e3f2fd; color: #1565c0; padding: 3px 6px; border-radius: 3px; font-weight: bold;">Do not Call: ${counts["Do not Call"]}</span>
                                <span style="background: #e8f5e9; color: #2e7d32; padding: 3px 6px; border-radius: 3px; font-weight: bold;">Follow up: ${counts["Follow up"]}</span>
                                <span style="background: #e0f2f1; color: #00695c; padding: 3px 6px; border-radius: 3px; font-weight: bold;">Sale Closed: ${counts["Sale Closed"]}</span>
                                <span style="background: #002d62; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px;">Pickup Ratio: ${pickupRatio}%</span>
                            </div>
                        </div>
                    `;
                });
                reportsHtml += `</div></div>`;
            }
        });

        if (totalVisibleAgentsWithReports === 0) {
            reportsHtml += `<div style="text-align: center; color: #6c757d; font-size: 13px; font-style: italic; padding: 30px;">No shift reports found for the selected date range (${startDate} to ${endDate}).</div>`;
        }
        reportsHtml += `</div>`;
        bodyContainer.innerHTML = reportsHtml;
    }
}
