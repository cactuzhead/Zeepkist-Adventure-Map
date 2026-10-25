const IMAGE_FOLDER = "images/achievements/";
const IMAGE_EXTENSION = ".jpg"; 

async function initAchievements() {
    console.log("[Achievements] Initializing...");

    // 1. Theme toggle synchronization
    try {
        const themeToggle = document.getElementById('themeToggle');
        // Check 'theme' first, fallback to legacy 'dm_theme', default to 'dark'
        const saved = localStorage.getItem('theme') || localStorage.getItem('dm_theme');
        const isDark = saved ? saved === 'dark' : true;
        
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeToggle) themeToggle.checked = true;
        } else {
            document.documentElement.removeAttribute('data-theme');
            if (themeToggle) themeToggle.checked = false;
        }

        if (themeToggle) {
            themeToggle.addEventListener('change', (e) => {
                const newTheme = e.target.checked ? 'dark' : 'light';
                if (e.target.checked) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                    document.documentElement.removeAttribute('data-theme');
                }
                localStorage.setItem('theme', newTheme);
                localStorage.removeItem('dm_theme');
            });
        }
    } catch (e) {
        console.warn("[Achievements] Theme init warning:", e);
    }

    // 2. Fetch static master JSON
    let masterAchievements = [];
    try {
        const masterResponse = await fetch('achievements.json');
        if (!masterResponse.ok) throw new Error(`HTTP error ${masterResponse.status}`);
        masterAchievements = await masterResponse.json();
    } catch (err) {
        console.error("[Achievements] Failed to load achievements.json:", err);
    }

    // 3. Render base UI with master list
    const localUnlockedRaw = localStorage.getItem("unlockedAchievements");
    const unlockedSet = new Set(localUnlockedRaw ? JSON.parse(localUnlockedRaw) : []);
    renderUI(masterAchievements, unlockedSet);

    // 4. IMMEDIATE check for Steam ID
    const rawSteamId = localStorage.getItem("user_steam_id");
    const steamId = (rawSteamId && rawSteamId !== "null" && rawSteamId !== "undefined" && rawSteamId.trim() !== "") ? rawSteamId.trim() : null;

    console.log("[Achievements] Detected Steam ID in localStorage:", steamId);

    if (steamId) {
        setText("userSteamID", "USER STEAM ID " + steamId);
    } else {
        setText("userSteamID", "NO USER STEAM ID FOUND");
    }

    // 5. Hard stop: If no valid Steam ID is stored, force the Connect modal
    if (!steamId) {
        console.log("[Achievements] No Steam ID found. Displaying Connect Modal.");
        showConnectModal();
        return; // ABSOLUTE TERMINATION - Cannot reach fetchSteamAchievements
    }

    // 6. Fetch from API only when Steam ID exists
    fetchSteamAchievements(steamId, masterAchievements);
}

async function fetchSteamAchievements(steamId, masterAchievements) {
    console.log("[Achievements] Syncing with Steam API for ID:", steamId);
    try {
        const workerRes = await fetch(`https://zeepkist-steam-proxy.cactuzhead.workers.dev/?action=achievements&steamid=${steamId}`);
        if (!workerRes.ok) throw new Error("Worker endpoint failure");

        const data = await workerRes.json();
        const achievementList = data?.playerstats?.achievements || [];
        const freshUnlocked = achievementList
            .filter(a => a.achieved === 1)
            .map(a => a.apiname);

        if (achievementList.length === 0 || freshUnlocked.length === 0) {
            console.log("[Achievements] Steam returned 0 unlocked achievements. Displaying Privacy Modal.");
            showPrivacyModal();
        } else {
            localStorage.setItem("unlockedAchievements", JSON.stringify(freshUnlocked));
            renderUI(masterAchievements, new Set(freshUnlocked));
        }

    } catch (err) {
        console.warn("[Achievements] Steam sync failed:", err);
        showPrivacyModal();
    }
}

function showConnectModal() {
    const container = document.getElementById('modalContainer');
    if (container) {
        container.innerHTML = `
            <h2 class="zeepsave-name">Connect to Steam</h2>
            <p class="privacy-modal-desc">
                You need to connect your Steam account to automatically sync and track your unlocked achievements.
            </p>
            <p class="privacy-modal-desc">
                Please head over to the <a href="index.html" style="color: var(--accent); font-weight: bold; text-decoration: underline;">Adventure Map</a> page and click <strong>Sync Steam</strong> to connect.
            </p>
        `;
    }
    openModal();
}

function showPrivacyModal() {
    const container = document.getElementById('modalContainer');
    if (container) {
        container.innerHTML = `
            <h2 class="zeepsave-name">No Achievements Found</h2>
            <p class="privacy-modal-desc">
                We couldn't retrieve your achievements. This usually happens if your Steam profile or game details are set to <strong>Private</strong>.
            </p>
            
            <h3 class="zeepsave-name">To fix this on Steam:</h3>
            <p class="privacy-modal-desc">Go to <strong>Edit Profile</strong> &gt; <strong>Privacy Settings</strong></p>

            <ul class="steam-requirements-list">
                <li><strong>My Profile</strong> must be set to <strong>Public</strong>.</li>
                <li><strong>Game Details</strong> must be set to <strong>Public</strong>.</li>
                <li>In the <strong>Game Details</strong> section <strong>Always keep my total playtime private...</strong> should be unchecked.</li>
            </ul>
        `;
    }
    openModal();
}

function openModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) modal.classList.add('visible');
}

function closePrivacyModal() {
    const modal = document.getElementById('privacyModal');
    if (modal) modal.classList.remove('visible');
}

function setText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
}

function renderUI(masterList, unlockedSet) {
    const unlockedContainer = document.getElementById("unlocked-list");
    const lockedContainer = document.getElementById("locked-list");

    if (!unlockedContainer || !lockedContainer) return;

    unlockedContainer.innerHTML = "";
    lockedContainer.innerHTML = "";

    if (!Array.isArray(masterList)) return;

    let unlockedCount = 0;
    let lockedCount = 0;

    masterList.forEach(ach => {
        const isUnlocked = unlockedSet.has(ach.apiname);
        
        // Count totals
        if (isUnlocked) {
            unlockedCount++;
        } else {
            lockedCount++;
        }

        const card = document.createElement("div");
        card.className = `achievement-card ${isUnlocked ? '' : 'locked'}`;

        const iconSrc = ach.icon || `${IMAGE_FOLDER}${ach.apiname}${IMAGE_EXTENSION}`;

        card.innerHTML = `
            <img class="achievement-card-icon" 
                 src="${iconSrc}" 
                 alt="${ach.name || ''}" 
                 onerror="this.onerror=null; this.style.visibility='hidden';" />
            <div class="achievement-card-info">
                <div class="achievement-card-name">${ach.name || ''}</div>
                <div class="achievement-card-desc">${ach.description || ''}</div>
            </div>
        `;

        if (isUnlocked) {
            unlockedContainer.appendChild(card);
        } else {
            lockedContainer.appendChild(card);
        }
    });

    // Update section title subtotals
    const unlockedSub = document.getElementById("unlockedSubtotal");
    if (unlockedSub) unlockedSub.textContent = `(${unlockedCount})`;

    const lockedSub = document.getElementById("lockedSubtotal");
    if (lockedSub) lockedSub.textContent = `(${lockedCount})`;
}

document.addEventListener("DOMContentLoaded", initAchievements);