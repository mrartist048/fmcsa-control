function showLimitExceededModal(message) {
    let existingModal = document.getElementById('dlLimitExceededModal');
    if (existingModal) existingModal.remove();

    let modal = document.createElement('div');
    modal.id = 'dlLimitExceededModal';
    modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 999999999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;";
    
    modal.innerHTML = `
        <div style="background: #ffffff; padding: 35px 30px; border-radius: 10px; width: 400px; box-shadow: 0 15px 40px rgba(0,0,0,0.4); text-align: center; border-top: 6px solid #dc3545;">
            <div style="font-size: 42px; margin-bottom: 10px;">⚠️</div>
            <h2 style="color: #dc3545; margin-top: 0; margin-bottom: 10px; font-size: 22px;">License Limit Exceeded!</h2>
            <p style="color: #444; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
                ${message}
            </p>
            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #ddd; font-size: 12px; color: #333; margin-bottom: 20px;">
                Need to increase your active device/tab limit? <br>Contact Admin: <b>03700684849</b>
            </div>
            <button onclick="window.location.reload();" style="background: #002d62; color: white; border: none; padding: 12px 20px; font-size: 13px; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%;">OK, Understood</button>
        </div>
    `;
    document.body.appendChild(modal);
}

async function checkGlobalSessions() {
    if (userLimit === 0 || !currentClient) return;
    const url = `${FIREBASE_DB_URL}sessions/${currentClient}.json`;
    const now = Date.now();
    let safeTabKey = tabUniqueId.replace(/[.#$\/\[\]]/g, "_");
    
    try {
        const res = await fetch(url);
        const data = await res.json() || {};
        let activeSessionsMap = {};
        const offlineThreshold = 12000; // 12 seconds heartbeat threshold

        Object.keys(data).forEach(key => {
            let session = data[key];
            if (session && session.timestamp && (now - session.timestamp < offlineThreshold)) {
                activeSessionsMap[key] = session;
            }
        });

        let activeCount = Object.keys(activeSessionsMap).length;
        let isCurrentRegistered = !!activeSessionsMap[safeTabKey];

        // Agar yeh tab pehle se registered nahi hai aur active count limit tak ya usse upar pahunch gaya hai
        if (!isCurrentRegistered && activeCount >= userLimit) {
            if (typeof scraping !== 'undefined' && scraping) stopScraping();
            showLimitExceededModal(`Your global license limit for "<b>${currentClient}</b>" has been reached. Max allowed active tabs/devices is <b>${userLimit}</b>. Scraping has been paused safely.`);
            return;
        }

        // Agar current tab registered hai ya limit ke andar hai toh apna heartbeat update karo
        await fetch(`${FIREBASE_DB_URL}sessions/${currentClient}/${safeTabKey}.json`, {
            method: 'PUT',
            body: JSON.stringify({ instanceId: tabUniqueId, nickname: dispatcherNickname, timestamp: now })
        });
    } catch (e) {
        console.error("Session sync failed:", e);
    }
}
