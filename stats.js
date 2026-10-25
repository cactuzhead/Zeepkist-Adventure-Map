const WORKER_URL = "https://zeepkist-steam-proxy.cactuzhead.workers.dev";
const ZEEPKIST_APP_ID = 1440670;

// Safe DOM element helper functions
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

async function initStats() {
    // 1. Get Steam ID from localStorage
    const steamId = localStorage.getItem("user_steam_id") || localStorage.getItem("steam_user_id");
    const errorMessage = `<span class="text-highlight">No SteamID found</span> in localStorage.<br>Please <span class="text-highlight">Sign in with Steam</span> on the <span class="text-highlight">Adventure Map</span> page.`;
    
    // Set topbar indicator immediately
    if (steamId) {
        setText("userSteamID", "USER STEAM ID " + steamId);
    } else {
        setText("userSteamID", "NO USER STEAM ID FOUND");
        showError(errorMessage);
        return;
    }

    try {
        // 2. Fetch live data securely via worker
        const response = await fetch(`${WORKER_URL}/?action=playtime&steamid=${steamId}`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();

        // 3. Extract Zeepkist stats from response
        if (!data.response || !Array.isArray(data.response.games)) {
            throw new Error("Invalid response format received from Steam API.");
        }

        const s = data.response.games.find(g => g.appid === ZEEPKIST_APP_ID);

        if (!s) {
            showError("Zeepkist was not found in this user's library.");
            return;
        }

        // 4. Formatting helpers
        const fmt = n => Math.floor(n).toLocaleString("en-GB");
        const hoursMinutes = mins => {
            const h = Math.floor(mins / 60), m = mins % 60;
            if (h === 0) return `${fmt(m)}m`;
            return `${fmt(h)}h ${String(m).padStart(2, "0")}m`;
        };

        const total = s.playtime_forever || 0;
        const totalH = Math.floor(total / 60), totalM = total % 60;
        const recent = s.playtime_2weeks || 0;

        let platformData = [
            { key: "windows", value: s.playtime_windows_forever || 0, circle: "segWindows" },
            { key: "linux", value: s.playtime_linux_forever || 0, circle: "segLinux" },
            { key: "mac", value: s.playtime_mac_forever || 0, circle: "segMac" },
            { key: "deck", value: s.playtime_deck_forever || 0, circle: "segDeck" }
        ];

        // --- FALLBACK IF STEAM DOES NOT REPORT PLATFORM BREAKDOWN ---
        const platformSum = platformData.reduce((sum, p) => sum + p.value, 0);
        if (platformSum === 0 && total > 0) {
            // Default lifetime total to Windows if Steam omits OS breakdown metrics
            platformData[0].value = total; 
        }

        // 5. Render Hero Section
        setText("steamGameID", ZEEPKIST_APP_ID);
        setText("gameID", "APP ID " + ZEEPKIST_APP_ID);
        setText("totalHours", fmt(totalH));
        setText("totalMinutes", `${totalM}m`);
        setText("totalDays", `${fmt(Math.floor(total / 1440))}d ${Math.floor((total % 1440) / 60)}h`);
        setText("platformCount", platformData.filter(p => p.value > 0).length);
        setText("recentCompact", hoursMinutes(recent));

        // 6. Render Recent Activity Panel
        setHTML("recentHours", `${Math.floor(recent / 60)} <small>hours</small> ${recent % 60} <small>mins</small>`);
        setText("recentMinutesNote", `${fmt(recent)} minutes recorded`);
        setText("recentShare", total > 0 ? `${((recent / total) * 100).toFixed(1)}% of total` : "0% of total");
        
        const recentBar = document.getElementById("recentBar");
        if (recentBar) {
            recentBar.style.width = `${Math.min(100, (recent / 840) * 100)}%`;
        }

        // 7. Render Platform Breakdowns & Legend Text with Percentages
        setText("donutHours", `${fmt(totalH)}h`);
        
        platformData.forEach(p => {
            // Calculate percentage share of total lifetime playtime
            const percent = total > 0 ? ((p.value / total) * 100).toFixed(1) : "0.0";
            
            // Explicitly separate the hours/mins and the percentage into distinct spans
            const formattedText = `<span class="platform-time">${hoursMinutes(p.value)}</span> <span class="platform-percent">(${percent}%)</span>`;

            // Apply to both Legend and Bar Text
            setHTML(`${p.key}Legend`, formattedText);
            setHTML(`${p.key}BarText`, formattedText);
        });

        // 8. Platform Bar Comparisons (Set Visual Widths)
        const maxPlatform = Math.max(...platformData.map(p => p.value), 1);
        const MIN_VISIBLE_PERCENT = 2; // Minimum width % so small values stay visible

        platformData.forEach(p => {
            const barEl = document.getElementById(`${p.key}Bar`);
            if (barEl) {
                if (p.value > 0) {
                    const rawPercent = (p.value / maxPlatform) * 100;
                    const finalPercent = Math.max(rawPercent, MIN_VISIBLE_PERCENT);
                    barEl.style.width = `${finalPercent}%`;
                } else {
                    barEl.style.width = `0%`;
                }
            }
        });

        // 9. Donut Chart SVG Segments
        const circumference = 2 * Math.PI * 77;
        const MIN_SEGMENT_LENGTH = 10;

        const activePlatforms = platformData.filter(p => p.value > 0);
        const totalActive = activePlatforms.length;

        let offset = 0;

        if (totalActive > 0) {
            const rawTotalTime = platformData.reduce((sum, p) => sum + p.value, 0) || 1;
            
            let lengths = platformData.map(p => {
                if (p.value <= 0) return 0;
                const calculated = (p.value / rawTotalTime) * circumference;
                return Math.max(calculated, MIN_SEGMENT_LENGTH);
            });

            const adjustedTotal = lengths.reduce((sum, len) => sum + len, 0);
            lengths = lengths.map(len => (len / adjustedTotal) * circumference);

            platformData.forEach((p, index) => {
                const circle = document.getElementById(p.circle);
                if (circle) {
                    const len = lengths[index];
                    if (len > 0) {
                        circle.style.strokeDasharray = `${len} ${circumference - len}`;
                        circle.style.strokeDashoffset = `${-offset}`;
                        offset += len;
                        circle.style.display = "block";
                    } else {
                        circle.style.display = "none";
                    }
                }
            });
        } else {
            platformData.forEach(p => {
                const circle = document.getElementById(p.circle);
                if (circle) circle.style.display = "none";
            });
        }

        // 10. Additional Game & Disconnected Playtime Details
        setText("disconnected", hoursMinutes(s.playtime_disconnected || 0));
        setText("communityStats", s.has_community_visible_stats ? "Yes" : "No");

        // 11. Handle Timestamps
        if (s.rtime_last_played && s.rtime_last_played > 0) {
            setText("timestamp", s.rtime_last_played);
            const date = new Date(s.rtime_last_played * 1000);
            setText("lastPlayedDate", date.toLocaleDateString("en-GB", {
                day: "numeric", month: "long", year: "numeric"
            }));
            setText("lastPlayedTime", `${date.toLocaleTimeString("en-GB", {
                hour: "2-digit", minute: "2-digit", second: "2-digit"
            })} local time`);
        } else if (recent > 0) {
            setText("timestamp", "Hidden");
            setText("lastPlayedDate", "Played within last 14 days");
            setText("lastPlayedTime", "Timestamp restricted by Steam Privacy");
        } else {
            setText("timestamp", "0");
            setText("lastPlayedDate", "No recent session recorded");
            setText("lastPlayedTime", "");
        }

        // 12. Game Icon
        const iconImg = document.getElementById("gameIcon");
        if (iconImg && s.img_icon_url) {
            iconImg.src = `https://media.steampowered.com/steamcommunity/public/images/apps/${ZEEPKIST_APP_ID}/${s.img_icon_url}.jpg`;
        }

        // --- DATA AVAILABILITY CHECK & NOTICE BANNER ---
        const missingPlatformData = platformSum === 0 && total > 0;
        const missingRecentActivity = !s.playtime_2weeks || s.playtime_2weeks === 0;
        const missingTimestamp = !s.rtime_last_played;
        const isFamilyShared = s.family_shared || false;

        const noticeEl = document.getElementById("dataNotice");
        const noticeListEl = document.getElementById("noticeList");

        if (noticeEl && noticeListEl) {
            let messages = [];

            if (isFamilyShared) {
                messages.push("Account accesses Zeepkist via Family Sharing.");
            }
            if (missingPlatformData) {
                messages.push("OS platform breakdown is not reported by Steam for this account (defaulted to Windows).");
            }
            if (missingTimestamp) {
                messages.push("Exact 'Last Played' timestamp is omitted or restricted by Steam API privacy settings.");
            }
            if (missingRecentActivity) {
                messages.push("No active playtime recorded in the past 14 days.");
            }

            if (messages.length > 0) {
                // Populate separate <li> lines
                noticeListEl.innerHTML = messages.map(msg => `<li>${msg}</li>`).join("");
                noticeEl.style.display = "block";
            } else {
                noticeEl.style.display = "none";
            }
        }

    } catch (err) {
        console.error("Failed to load Steam stats:", err);
        showError("Failed to fetch statistics for STEAM ID " + steamId + ". Try Sign in with Steam on Adventure Map Page.");
    }
}

function showError(message) {
    console.warn(message);
    const heroTitle = document.querySelector(".hero-main h1");
    if (heroTitle) {
        const formattedMessage = message.replace(/\n/g, "<br>");
        
        heroTitle.innerHTML = `Zeepkist<br><span class="error-subtitle">${formattedMessage}</span>`;
    }
}

// Ensures DOM is ready before executing
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStats);
} else {
    initStats();
}