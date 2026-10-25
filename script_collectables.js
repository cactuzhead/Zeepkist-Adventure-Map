(function initDLCCounter() {
    function syncDLCCounter() {
        const rawData = localStorage.getItem('unlockedDLC');
        let unlockedList = [];

        if (rawData) {
            try {
                const parsed = JSON.parse(rawData);
                if (Array.isArray(parsed)) {
                    unlockedList = parsed;
                } else if (typeof parsed === 'object' && parsed !== null) {
                    // Handles object format { "1699070": true } or Set JSON
                    unlockedList = Object.keys(parsed).filter(k => parsed[k]);
                } else if (typeof parsed === 'number' || typeof parsed === 'string') {
                    unlockedList = String(rawData).split(',').filter(Boolean);
                }
            } catch (e) {
                unlockedList = String(rawData).split(',').filter(Boolean);
            }
        }

        // 1. Update counter badge
        const badge = document.getElementById('dlcBadge');
        if (badge) {
            badge.innerText = unlockedList.length;
        }

        // 2. Sync all DLC checkboxes in the dropdown
        const dlcMenu = document.getElementById('dlcMenu');
        if (dlcMenu) {
            const checkboxes = dlcMenu.querySelectorAll('input[type="checkbox"]');
            
            checkboxes.forEach(checkbox => {
                // Extracts numeric ID (e.g., "1699070" from "dlc-1699070")
                const rawId = checkbox.id.replace('dlc-', '');
                
                // Checks if item exists in unlockedList as number or string
                const isUnlocked = unlockedList.some(
                    item => String(item) === String(rawId) || String(item) === checkbox.id
                );
                
                checkbox.checked = isUnlocked;
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncDLCCounter);
    } else {
        syncDLCCounter();
    }
})();

let activeTooltipWrapper = null;
let activeLevelId = null;
let showSeasonalInTotal = false;
let hideCardTimeout = null;
const levelCard = document.getElementById('levelCard');
let ALL_LEVELS = [];
const MAP_COLLECTABLE_IDS = ['map01_1767531589174', 'map02_1767531710306', 'map03_1767531799236', 'map04_1767531884270', 'map05_1768074827328'];
const ZEEPKIST_DLC_ACHIEVEMENTS = {
    1699070: "ACH_EARLY_ACCESS",
    1962260: "ACH_KINGS_DAY",
    3316260: "ACH_BOBO_TIRES"
};
let ZEEPSAVE_TIMES = {};
try {
    ZEEPSAVE_TIMES = JSON.parse(localStorage.getItem('zeepsaveTimes')) || {};
} catch {
    ZEEPSAVE_TIMES = {};
}
const DEBUG_RANDOMIZE_TIMES = false; // set to false to disable
       
function isMapCollectableLevel(level) {
    return MAP_COLLECTABLE_IDS.includes(level.id);
}

function getSingleCollectableType(level) {
    if (!level.collectibles) return null;

    for (const group of Object.values(level.collectibles)) {
        for (const [type, total] of Object.entries(group)) {
            if (total === 1) return type;
        }
    }
    return null;
}

let shiftHeld = false;

window.addEventListener('keydown', e => {
    if (e.key === 'Shift' && !shiftHeld) {
        shiftHeld = true;

        // close any open card immediately
        levelCard.classList.remove('visible');
        activeTooltipWrapper = null;
        activeLevelId = null;

        // hide any other hover tooltips
        medalTooltip.classList.remove('visible');
    }
});

window.addEventListener('keyup', e => {
    if (e.key === 'Shift') {
        shiftHeld = false;
    }
});

fetch('levels.json')
  .then(res => res.json())
  .then(levels => {
    ALL_LEVELS = levels;
    const container = document.getElementById('dots');

    levels.forEach(level => {
        const wrapper = document.createElement('div');
        wrapper.className = 'dot-wrapper';
        wrapper.dataset.levelId = level.id;
        wrapper.style.left = `${level.x}%`;
        wrapper.style.top = `${level.y}%`;

        const dot = document.createElement('div');
        dot.className = 'dot';

        let state = parseInt(localStorage.getItem(level.id)) || 0;
        const isMapLevel = isMapCollectableLevel(level);


        if (isMapLevel) {
            const collectableType = getSingleCollectableType(level);
            const collectiblestate = getcollectiblestate(level);

            const collected = collectableType && collectiblestate[collectableType] === 0;
            if (collected) dot.classList.add('collected');

            dot.classList.add('map-collectable-dot');

            if (collectableType) {
                dot.classList.add(collectableType);
                
                const icon = document.createElement('span');
                icon.className = 'icon';
                dot.appendChild(icon);
            }
        }
        else {
            dot.classList.add(`state-${state}`);
        }


        wrapper.appendChild(dot);
        // Only append if the map container exists on this page
        if (container) {
            container.appendChild(wrapper);
        }
       
        wrapper.addEventListener('click', () => {
            if (localStorage.getItem('lockMapClicks') === 'true') return;
            if (isMapCollectableLevel(level)) return;

            dot.classList.remove(`state-${state}`);
            state = (state + 1) % 5;
            dot.classList.add(`state-${state}`);
            wrapper.dataset.state = state;
            localStorage.setItem(level.id, state);

            if (activeTooltipWrapper === wrapper) {
                showTooltip(level, state, wrapper.getBoundingClientRect());
            }

            updateTotals(ALL_LEVELS);
            updateCollectableTotals(ALL_LEVELS);
        });

        // let hideCardTimeout = null;

        // Hover shows tooltip
        wrapper.addEventListener('mouseenter', () => {
            if (shiftHeld) return;
            
            // Clear any pending hide timer so it stays open if re-entered quickly
            if (hideCardTimeout) clearTimeout(hideCardTimeout);

            activeTooltipWrapper = wrapper;
            activeLevelId = level.id;

            showTooltip(level, state, wrapper.getBoundingClientRect());
            levelCard.classList.add('visible');
        });

        // Mouseleave with a tiny grace period to bridge the gap to the card
        wrapper.addEventListener('mouseleave', () => {
            hideCardTimeout = setTimeout(() => {
                if (activeTooltipWrapper === wrapper) {
                    levelCard.classList.remove('visible');
                    activeTooltipWrapper = null;
                    activeLevelId = null;
                }
            }, 150); // 150ms window to move the mouse onto the popup card
        });

    });

    updateTotals(ALL_LEVELS);
    updateCollectableTotals(ALL_LEVELS);    
});




function updateMapCollectablePin(level) {
    if (!isMapCollectableLevel(level)) return;

    const wrapper = document.querySelector(
        `.dot-wrapper[data-level-id="${level.id}"]`
    );
    if (!wrapper) return;

    const dot = wrapper.querySelector('.dot');
    if (!dot) return;

    const type = getSingleCollectableType(level);
    if (!type) return;

    const state = getcollectiblestate(level);

    const collected = state[type] === 0; // 0 remaining = collected
    dot.classList.toggle('collected', collected);
}



function showTooltip(level, state, rect) {
    levelCard.innerHTML = "";

    const closeBtn = document.createElement('button');
    closeBtn.className = 'levelcard-close';
    closeBtn.textContent = '×';    

    closeBtn.addEventListener('click', () => {
        levelCard.classList.remove('visible');       
        activeTooltipWrapper = null;
        activeLevelId = null;
    });

    closeBtn.dataset.tooltip = 'Close';

    closeBtn.addEventListener('mouseenter', () => {
        medalTooltip.textContent = 'Shift to close';

        const rect = closeBtn.getBoundingClientRect();
        medalTooltip.style.left = rect.left + rect.width / 2 - 20 + "px";
        medalTooltip.style.top  = rect.bottom - 68 + "px";

        medalTooltip.classList.add('visible');
    });

    closeBtn.addEventListener('mouseleave', () => {
        medalTooltip.classList.remove('visible');
    });
    

    // Flicker-proof image
    const img = document.createElement('img');
    img.src = 'images/placeholder.png';
    const realImg = new Image();
    realImg.src = `images/thumbs/${level.id}.jpg`;
    realImg.onload = () => img.src = realImg.src;

    const h2 = document.createElement('h1');
    h2.className = 'tooltip-title';
    h2.textContent = level.name.toUpperCase();

    const accent = document.createElement('span');
    accent.className = 'title-accent';

    h2.appendChild(accent);

    const prefix = level.name.match(/^[a-z]+/i)?.[0].toLowerCase();
    if (prefix) {
        h2.classList.add(`level-${prefix}`);
    }

    const isMapCollectable = MAP_COLLECTABLE_IDS.includes(level.id);
    let ul = null;
    let mapLabel = null;

    if (isMapCollectable) {
        mapLabel = document.createElement('div');
        mapLabel.className = 'map-collectable-label';
        mapLabel.textContent = 'ADVENTURE MAP COLLECTABLE';
    }

    const thumbWrapper = document.createElement('div');
    thumbWrapper.className = 'thumbnail-wrapper';
    thumbWrapper.appendChild(img);

    let videoButtons = null;

    // popup card medal times
    if (!isMapCollectable) {
        ul = document.createElement('ul');
        ul.className = 'tiers';

        const medals = ['bronze','silver','gold','author'];
        medals.forEach((medal,i) => {
            const li = document.createElement('li');
            li.className = `tier ${medal} ${state >= i+1 ? 'completed' : ''}`;
            li.innerHTML = `
                <span>${medal}</span>
                <span class="check"></span>
                <span>${level.times[medal]}</span>
            `;
            ul.appendChild(li);
        });
        // NEW: player's best time from zeepsave, shown in purple
        const bestTime = ZEEPSAVE_TIMES[level.id];
        if (bestTime !== undefined) {
            const li = document.createElement('li');
            li.className = 'tier best-time completed';
            li.innerHTML = `
                <span>PERSONAL BEST</span>
                <span class="check"></span>
                <span>${formatSecondsToTime(bestTime)}</span>
            `;
            ul.appendChild(li);
        }
    }


    const videoTypes = [
        { key: 'authorYT', label: 'Author Run' },
        { key: 'giftsYT', label: 'All Collectibles' },
        { key: 'pumpkinsYT', label: 'All Pumpkins', month: 9 }, // October (0-indexed)
        { key: 'snowflakesYT', label: 'All Snowflakes', month: 11 }, // December (0-indexed)
    ];

    if (level.urls) {
        const videoButtons = document.createElement('div');
        videoButtons.className = 'video-buttons';

        const currentMonth = new Date().getMonth(); // 0 = Jan, 11 = Dec

        videoTypes.forEach(({ key, label, month }) => {
            // Skip YT button if month doesn't match (only applies to seasonal collectables)
            if (month !== undefined && month !== currentMonth) return;

            if (level.urls[key]) {
                const btn = document.createElement('button');
                btn.innerHTML = `
                    <span class="youtube-triangle">
                        <svg width="48" height="32" viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg">
                            <rect width="48" height="32" rx="8" fill="#ba0b0b"/>
                            <polygon points="18,8 18,24 34,16" fill="#ffffff"/>
                        </svg>
                    </span>
                    <span class="btn-text">${label}</span>
                `;
                btn.onclick = () => openVideo(level.urls[key]);
                videoButtons.appendChild(btn);
            }
        });

        if (videoButtons.childElementCount > 2) {
            videoButtons.style.gap = '4px';
        }

        if (videoButtons.childElementCount > 0) {
            thumbWrapper.appendChild(videoButtons);
        }
    }


// display collectibles
let collectiblesWrapper = null;

if (level.collectibles) {
    const collectiblestate = getcollectiblestate(level);

    collectiblesWrapper = document.createElement('div');
    collectiblesWrapper.className = 'collectibles';

    for (const [groupName, originalGroup] of Object.entries(level.collectibles)) {

        // clone to inject default medals
        const group = { ...originalGroup };

        if (groupName === 'permanent' && !group.medals) {
            group.medals = {};
        }
        const grid = document.createElement('div');
        grid.className = `collectibles-grid ${groupName}`;

        for (const type of Object.keys(group)) {            
            let total;
            let collected;

            if (type === 'medals') {
                // Hide medal gifts on map collectable levels
                if (isMapCollectableLevel(level)) {
                    total = 0;
                    collected = 0;
                } else {
                    total = getMedalTotal(level);
                    collected = getCollectedMedals(level);
                }
            } else {
                total = level.collectibles[groupName][type];
                const remaining = collectiblestate[type] ?? total;
                collected = total - remaining;
            }

            const meta = COLLECTABLE_META[type];
            if (!meta) continue;

            const item = document.createElement('div');
            item.className = `collectable ${type}`;

            // Tooltip text
            const label = COLLECTABLE_META[type]?.label || type;
            item.dataset.tooltip =
                groupName === 'seasonal'
                    ? `${label} (seasonal)`
                    : label;
            
            if (collected === total) item.classList.add('collected');
                else item.classList.remove('collected');

            if (total > 0) {
                item.innerHTML = `
                    <span class="icon"></span>
                    <span class="count">${collected}/${total}</span>
                `;
            } else {
                item.innerHTML = `
                    <span class="icon"></span>
                    <span class="count">&nbsp;&nbsp;&nbsp;</span>
                `;
                item.classList.add('no-items');
            }        

            // HOVER TOOLTIP FOR COLLECTABLE
            if (total > 0) {
                item.addEventListener('mouseenter', () => {

                    // Do not show hover tooltips or styles if map lock is enabled
                    if (localStorage.getItem('lockMapClicks') === 'true') return;
                    
                    const text = item.dataset.tooltip;
                    if (!text) return;

                    medalTooltip.textContent = text;

                    const rect = item.getBoundingClientRect();

                    medalTooltip.style.left = rect.left + rect.width / 2 + "px";
                    medalTooltip.style.top  = rect.top - 28 + "px";

                    medalTooltip.classList.add("visible");
                });
            }

            // CLICK TO COLLECT
            if (total > 0 && type !== 'medals') {
                item.addEventListener('click', e => {
                    e.stopPropagation(); // prevent closing the card

                    // Prevent manual clicking if map lock is enabled
                    if (localStorage.getItem('lockMapClicks') === 'true') return;

                    const total = level.collectibles[groupName][type];
                    let remaining = collectiblestate[type];        // e.g. 2, 1, 0
                    let collected = total - remaining;             // e.g. 0, 1, 2

                    // Cycle collected: 0 → 1 → 2 → 0 → ...
                    collected = (collected + 1) % (total + 1);

                    // Update remaining and save
                    remaining = total - collected;
                    collectiblestate[type] = remaining;
                    savecollectiblestate(level.id, collectiblestate);

                    // Update display
                    item.querySelector('.count').textContent = `${collected}/${total}`;

                    // Only mark as "collected" (e.g. full opacity) when fully done
                    if (collected === total) {
                        item.classList.add('collected');
                    } else {
                        item.classList.remove('collected');
                    }

                    // Update global totals
                    updateMapCollectablePin(level);
                    updateCollectableTotals(ALL_LEVELS);
                });
            }

            grid.appendChild(item);
        }

        if (grid.children.length) {
            collectiblesWrapper.appendChild(grid);
        }
    }
}


    levelCard.append(
        closeBtn,
        thumbWrapper,
        h2,
        ...(mapLabel ? [mapLabel] : []),
        ...(ul ? [ul] : []),
        ...(collectiblesWrapper ? [collectiblesWrapper] : [])
    );

    // Temporarily set visible to measure size
    levelCard.style.left = '0px';
    levelCard.style.top = '0px';
    levelCard.classList.add('visible');

    // Measure tooltip size
    const tooltipRect = levelCard.getBoundingClientRect();
    const pageWidth = document.documentElement.clientWidth;
    const pageHeight = document.documentElement.clientHeight;

    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let left = rect.right + 10 + scrollX;
    let top  = rect.top + scrollY;


    // Adjust horizontally if overflowing
    if (left + tooltipRect.width > pageWidth + scrollX) {
        left = rect.left - tooltipRect.width - 10 + scrollX;
        if (left < scrollX) left = scrollX;
    }

    // Adjust vertically if overflowing
    if (top + tooltipRect.height > pageHeight + scrollY) {
        top = pageHeight + scrollY - tooltipRect.height - 10;
    }

    levelCard.style.left = `${left}px`;
    levelCard.style.top = `${top}px`;

    // Remove previous tier classes
    levelCard.classList.remove('bronze','silver','gold','author');

    // Determine current tier and add class
    let tierClass = '';
    if (state === 1) tierClass = 'bronze';
    else if (state === 2) tierClass = 'silver';
    else if (state === 3) tierClass = 'gold';
    else if (state === 4) tierClass = 'author';

    if (tierClass) levelCard.classList.add(tierClass);
}

const COLLECTABLE_META = {
    redGifts: { label: 'Red Gifts' },
    blueFeathers: { label: 'Blue Feathers' },
    wheels: { label: 'Wheels' },
    paintBlobs: { label: 'Paint Blobs' },
    strange: { label: 'Strange' },
    gears: { label: 'Gear Gifts' },
    medals: { label: 'Medal Gifts' },
    pumpkins: { label: 'Pumpkins' },
    snowflakes: { label: 'Snowflakes' }
};


function getProgressData() {
    // Helper function to safely parse JSON from LocalStorage
    const getParsedJSON = (key, fallback) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : fallback;
        } catch {
            return fallback;
        }
    };

    // 1. Gather all individual structured keys directly
    const data = {
        user_steam_id: localStorage.getItem('user_steam_id') || null,
        medals: {},
        collectibles: {},
        zeepsaveTimes: getParsedJSON('zeepsaveTimes', {}),
        unlockedCosmetics: getParsedJSON('unlockedCosmetics', []),
        unlockedDLC: getParsedJSON('unlockedDLC', []),
        unlockedAchievements: getParsedJSON('unlockedAchievements', []),
        lockMapClicks: localStorage.getItem('lockMapClicks') ?? 'true'
    };

    // 2. Loop through localStorage ONLY for medals and collectibles
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);

        // Skip known object/array/system keys
        if ([
            'user_steam_id', 
            'zeepsaveTimes', 
            'unlockedCosmetics', 
            'unlockedDLC', 
            'unlockedAchievements',
            'lockMapClicks',
            'zeepkist_progress' // skip backup keys if present
        ].includes(key)) {
            continue;
        }

        // Handle collectibles
        if (key.startsWith('collectibles:')) {
            try { 
                data.collectibles[key] = JSON.parse(value); 
            } catch {}
            continue;
        }

        // Handle numerical medal values
        const parsed = parseInt(value, 10);
        if (!isNaN(parsed)) {
            data.medals[key] = parsed;
        }
    }

    return data;
}


function updateTotals(levels) {
    let bronze = 0, silver = 0, gold = 0, author = 0;

    levels.forEach(level => {
        const state = parseInt(localStorage.getItem(level.id)) || 0;
        if (state === 1) bronze++;
        else if (state === 2) silver++;
        else if (state === 3) gold++;
        else if (state === 4) author++;
    });

    const total = levels.length - MAP_COLLECTABLE_IDS.length;

    // Safely update elements only if they exist on the current page
    const setElemText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setElemText('bronzeCount', bronze);
    setElemText('silverCount', silver);
    setElemText('goldCount', gold);
    setElemText('authorCount', author);
    setElemText('remainingCount', total - bronze - silver - gold - author);
    setElemText('totalCount', total);      
}




function openLevelCard() {
    levelCard.classList.add('visible');
}

function closeLevelCard() {
    levelCard.classList.remove('visible');
}


// INSTANT THEME APPLYING:
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
}


const medalTooltip = document.getElementById("hoverTooltip");

document.querySelectorAll(".medal, .collectable-total").forEach(el => {
    el.addEventListener("mouseenter", () => {
        const text = el.dataset.tooltip;
        if (!text) return;

        medalTooltip.textContent = text;

        const rect = el.getBoundingClientRect();
        medalTooltip.style.left = rect.left + rect.width / 2 + "px";
        medalTooltip.style.top  = rect.bottom + 8 + "px";

        medalTooltip.classList.add("visible");
    });

    el.addEventListener("mouseleave", () => {
        medalTooltip.classList.remove("visible");
    });
});
if (levelCard) {
    // Keep card open if mouse enters the card itself
    levelCard.addEventListener('mouseenter', () => {
        if (hideCardTimeout) clearTimeout(hideCardTimeout);
    });

    // Hide card when mouse leaves the card entirely
    levelCard.addEventListener('mouseleave', () => {
        levelCard.classList.remove('visible');
        activeTooltipWrapper = null;
        activeLevelId = null;
        medalTooltip?.classList.remove('visible');
    });
}

function updateCollectableTotals(levels) {
    const collectedTotals = {};
    const maxTotals = {};

    let allCollected = 0;
    let allMax = 0;

    let nonSeasonalCollected = 0;
    let nonSeasonalMax = 0;

    levels.forEach(level => {
        if (!level.collectibles) return;

        const state = getcollectiblestate(level);

        for (const [groupName, originalGroup] of Object.entries(level.collectibles)) {

    // clone group to safely inject defaults
    const group = { ...originalGroup };

    // every permanent level has medal rewards by default
    if (
        groupName === 'permanent' &&
        !group.medals &&
        !isMapCollectableLevel(level)
    ) {
        group.medals = {};
    }
            for (const [type, total] of Object.entries(group)) {
                if (!(type in collectedTotals)) {
                    collectedTotals[type] = 0;
                    maxTotals[type] = 0;
                }

                let collected;
                let adjustedTotal = total;

                if (type === 'medals') {
                    adjustedTotal = getMedalTotal(level);
                    collected = getCollectedMedals(level);
                } else {
                    adjustedTotal = total;
                    const remaining = state[type] ?? total;
                    collected = total - remaining;
                }

                collectedTotals[type] += collected;
                maxTotals[type] += adjustedTotal;

                allCollected += collected;
                allMax += adjustedTotal;

                if (groupName !== 'seasonal') {
                    nonSeasonalCollected += collected;
                    nonSeasonalMax += adjustedTotal;
                }
            }
        }
    });

    for (const type of Object.keys(collectedTotals)) {
        const el = document.getElementById(`${type}Count`);
        if (!el) continue;

        const parent = el.closest('.collectable-total');
        if (!parent) continue;

        el.textContent = `${collectedTotals[type]}/${maxTotals[type]}`;

        // Only mark as collected if total is > 0 AND collected equals total
        if (maxTotals[type] > 0 && collectedTotals[type] === maxTotals[type]) {
            parent.classList.add('collected');
        } else {
            parent.classList.remove('collected');
        }
    }

    const totalEl = document.getElementById('giftsTotalCount');
    if (!totalEl) return;

    if (showSeasonalInTotal) {
        totalEl.textContent = `${allCollected}/${allMax} inc seasonal gifts`;
        totalEl.dataset.tooltip = 'Click to hide seasonal collectables';
    } else {
        totalEl.textContent = `${nonSeasonalCollected}/${nonSeasonalMax} permanent gifts`;
        totalEl.dataset.tooltip = 'Click to include seasonal collectables';
    }
}

document.addEventListener('click', e => {
    const total = e.target.closest('#giftsTotalCount');
    if (!total) return;

    e.stopPropagation();
    showSeasonalInTotal = !showSeasonalInTotal;
    updateCollectableTotals(ALL_LEVELS);
});




function getcollectiblestate(level) {
    const key = `collectibles:${level.id}`;
    const stored = localStorage.getItem(key);

    let state = stored ? JSON.parse(stored) : {};

    if (level.collectibles) {
        for (const group of Object.values(level.collectibles)) {
            for (const [type, total] of Object.entries(group)) {
                    // If new type added later (like medals)
                    if (typeof state[type] !== 'number') {
                        state[type] = total; // default remaining = total
                    }
            }
        }
    }

    localStorage.setItem(key, JSON.stringify(state));
    return state;
}



function savecollectiblestate(levelId, state) {
  localStorage.setItem(`collectibles:${levelId}`, JSON.stringify(state));
}


function getYouTubeEmbedUrl(url) {
    const u = new URL(url);

    let videoId = '';
    let start = 0;

    if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1);
        start = u.searchParams.get('t') || 0;
    } else {
        videoId = u.searchParams.get('v');
        start = u.searchParams.get('t') || 0;
    }

    return `https://www.youtube.com/embed/${videoId}?start=${parseInt(start, 10)}&autoplay=1`;
}

const videoModal = document.getElementById('videoModal');
const videoFrame = document.getElementById('videoFrame');

function openVideo(url) {
    videoFrame.src = getYouTubeEmbedUrl(url);
    videoModal.classList.add('visible');
}

function closeVideo() {
    videoFrame.src = ''; // stops playback
    videoModal.classList.remove('visible');
}

function getMedalRewardBreakdown(level) {
    const base = {
        bronze: 1,
        silver: 1,
        gold: 1,
        author: 1
    };

    const medals = level.collectibles?.permanent?.medals || {};

    for (const tier in medals) {
        base[tier] = medals[tier];
    }

    return base;
}

function getMedalTotal(level) {
    const rewards = getMedalRewardBreakdown(level);

    return (
        rewards.bronze +
        rewards.silver +
        rewards.gold +
        rewards.author
    );
}

function getCollectedMedals(level) {
    const state = parseInt(localStorage.getItem(level.id)) || 0;
    const rewards = getMedalRewardBreakdown(level);

    const order = ['bronze','silver','gold','author'];

    let collected = 0;

    for (let i = 0; i < state; i++) {
        collected += rewards[order[i]];
    }

    return collected;
}

const closeBtn = videoModal?.querySelector('.video-close');
if (closeBtn) {
    closeBtn.addEventListener('click', closeVideo);
}

const backdrop = videoModal?.querySelector('.video-backdrop');
if (backdrop) {
    backdrop.addEventListener('click', closeVideo);
}


const zeepsaveInput = document.getElementById('zeepsaveInput');
if (zeepsaveInput) {
    zeepsaveInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const data = JSON.parse(reader.result);

                // --- CLEAR MEDAL/LEVEL PROGRESS KEYS ---
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('collectibles:') || 
                        key === 'theme' || 
                        key === 'unlockedCosmetics' || 
                        key === 'zeepsaveTimes') {
                        return;
                    }

                    const val = parseInt(localStorage.getItem(key));
                    if (!isNaN(val)) {
                        localStorage.removeItem(key);
                    }
                });

                const unlockedItems = extractUnlockedCollectables(data);
                localStorage.setItem('unlockedCosmetics', JSON.stringify(unlockedItems));

                const lines = Object.values(data.AdventureTimes || {})
                    .map(entry => `${transformLevelUID(entry.LevelUID)}, ${entry.Time.toFixed(3)}`);

                fetch('levels.json')
                .then(res => res.json())
                .then(async levelsData => {

                    let testLines = lines;

                    if (typeof DEBUG_RANDOMIZE_TIMES !== 'undefined' && DEBUG_RANDOMIZE_TIMES) {
                        const addOptions = [10, 20, 30, 45];
                        testLines = lines.map(line => {
                            const [name, timeStr] = line.split(', ');
                            const randomAdd = addOptions[Math.floor(Math.random() * addOptions.length)];
                            const newTime = parseFloat(timeStr) + randomAdd;
                            return `${name}, ${newTime.toFixed(3)}`;
                        });
                    }

                    const results = compareToMedals(testLines, levelsData);

                    ZEEPSAVE_TIMES = {};
                    results.forEach(r => {
                        const level = levelsData.find(l => normalizeName(l.name) === normalizeName(r.name));
                        if (level) {
                            ZEEPSAVE_TIMES[level.id] = parseFloat(r.zeepsaveTime);
                        }
                    });
                    localStorage.setItem('zeepsaveTimes', JSON.stringify(ZEEPSAVE_TIMES));

                    if (typeof updateLevelProgress === 'function') {
                        updateLevelProgress(results, levelsData);
                    }

                    try {
                        await syncZeepsaveCollectibles(data, levelsData);
                    } catch (cosmeticErr) {
                        console.error('Error during syncZeepsaveCollectibles:', cosmeticErr);
                    }

                    saveAllProgress();
                    location.reload();
                })
                .catch(err => console.error('Failed to load levels.json:', err));

            } catch (err) {
                console.error('Failed to parse/process file:', err);
            }
        };
        reader.readAsText(file);
    });
}

const zeepSaveHelp = document.querySelector('.info-help-wrapper') || document.querySelector('.zeepsave-help');
const zeepSavePopup = document.querySelector('.zeepsave-popup');

if (zeepSaveHelp && zeepSavePopup) {
    zeepSaveHelp.addEventListener('mouseenter', () => {
        const rect = zeepSaveHelp.getBoundingClientRect();
        zeepSavePopup.style.display = 'block';
        const popupWidth = zeepSavePopup.offsetWidth;
        zeepSavePopup.style.left = `${rect.right - popupWidth}px`;
        zeepSavePopup.style.top = `${rect.bottom + 10}px`;
    });

    zeepSaveHelp.addEventListener('mouseleave', () => {
        zeepSavePopup.style.display = 'none';
    });
}

function transformLevelUID(uid) {
    let result;
    if (/^secret/i.test(uid)) {
        result = uid.replace(/^secret/i, 'X');
    } else if (/^ea\d/.test(uid)) {
        result = uid.replace(/^ea/, 'a');
    } else if (/^ea/.test(uid)) {
        result = uid.replace(/^ea/, '');
    } else {
        result = uid;
    }
    return result.toUpperCase();
}

function medalTimeToSeconds(timeStr) {
    const [minutes, secondsPart] = timeStr.split(':');
    return parseInt(minutes, 10) * 60 + parseFloat(secondsPart);
}

function normalizeName(name) {
    let clean = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const match = clean.match(/^([A-Z]+)(\d+)$/);
    if (match) {
        return match[1] + match[2].padStart(2, '0');
    }
    return clean;
}

function compareToMedals(zeeLines, levelsData) {
    const zeeTimes = {};
    zeeLines.forEach(line => {
        const [name, timeStr] = line.split(', ');
        zeeTimes[normalizeName(name)] = parseFloat(timeStr);
    });

    const realLevels = levelsData.filter(level => normalizeName(level.name) !== 'MAP');
    const unmatched = [];
    const results = [];

    realLevels.forEach(level => {
        const normalizedLevelName = normalizeName(level.name);
        const zeeTime = zeeTimes[normalizedLevelName];

        if (zeeTime === undefined) {
            unmatched.push({ levelName: level.name, normalized: normalizedLevelName });
            return;
        }

        const medalOrder = ['author', 'gold', 'silver', 'bronze'];
        let matchedMedal = null;

        for (const medal of medalOrder) {
            const medalSeconds = medalTimeToSeconds(level.times[medal]);
            if (zeeTime < medalSeconds) {
                matchedMedal = { medal, medalTime: medalSeconds.toFixed(3) };
                break;
            }
        }

        results.push({
            name: level.name,
            medal: matchedMedal ? matchedMedal.medal : 'no medal',
            medalTime: matchedMedal ? matchedMedal.medalTime : medalTimeToSeconds(level.times.bronze).toFixed(3),
            zeepsaveTime: zeeTime.toFixed(3)
        });
    });

    // console.log('Unmatched levels (' + unmatched.length + '):', unmatched);
    return results;
}

function medalToNumber(medal) {
    switch (medal) {
        case 'author': return 4;
        case 'gold':   return 3;
        case 'silver': return 2;
        case 'bronze': return 1;
        default:       return 0; // no medal
    }
}

// Extract the level-name portion from a localStorage key like
// "collectibles:a12_1766962679952" -> "a12"
function extractLevelPrefix(storageKey) {
    const withoutPrefix = storageKey.replace(/^collectibles:/, '');
    const match = withoutPrefix.match(/^([a-zA-Z0-9]+)_/);
    return match ? match[1] : withoutPrefix;
}

function updateCollectibleMedals(results) {
    // Build a lookup: normalized level name -> medal number
    const medalByName = {};
    results.forEach(r => {
        medalByName[normalizeName(r.name)] = medalToNumber(r.medal);
    });

    const updated = [];
    const skipped = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key.startsWith('collectibles:')) continue;

        const prefix = extractLevelPrefix(key);
        const normalizedPrefix = normalizeName(prefix);
        const medalValue = medalByName[normalizedPrefix];

        if (medalValue === undefined) {
            skipped.push(key);
            continue;
        }

        try {
            const state = JSON.parse(localStorage.getItem(key));

            // Only touch it if the key actually tracks a "medals" field
            if ('medals' in state) {
                state.medals = medalValue;
                localStorage.setItem(key, JSON.stringify(state));
                updated.push({ key, prefix, medals: medalValue });
            } else {
                skipped.push(key);
            }
        } catch (err) {
            console.error('Failed to parse/update', key, err);
        }
    }

    // console.log('Updated (' + updated.length + '):', updated);
    // console.log('Skipped (' + skipped.length + '):', skipped);

    return updated;
}

function updateLevelProgress(results, levelsData) {
    // Build lookup: normalized level name -> { id, medalValue }
    const medalByName = {};
    results.forEach(r => {
        medalByName[normalizeName(r.name)] = medalToNumber(r.medal);
    });

    const updated = [];
    const skipped = [];

    levelsData.forEach(level => {
        const normalizedName = normalizeName(level.name);
        const medalValue = medalByName[normalizedName];

        if (medalValue === undefined) {
            skipped.push(level.name);
            return;
        }

        // 1. Update the main completion-state key (drives dot color + tier checkmarks)
        const currentState = parseInt(localStorage.getItem(level.id)) || 0;
        if (medalValue > currentState) {
            localStorage.setItem(level.id, medalValue);
        }

        // 2. Update the collectibles medals count, if that entry exists
        const collectiblesKey = `collectibles:${level.id}`;
        const stored = localStorage.getItem(collectiblesKey);
        if (stored) {
            try {
                const state = JSON.parse(stored);
                if ('medals' in state) {
                    state.medals = Math.max(state.medals || 0, medalValue);
                    localStorage.setItem(collectiblesKey, JSON.stringify(state));
                }
            } catch (err) {
                console.error('Failed to parse/update', collectiblesKey, err);
            }
        }

        updated.push({ id: level.id, name: level.name, medal: medalValue });
    });

    // console.log('Updated (' + updated.length + '):', updated);
    // console.log('Skipped (' + skipped.length + '):', skipped);

    return updated;
}

function formatSecondsToTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(3).padStart(6, '0');
    return `${minutes.toString().padStart(2, '0')}:${seconds}`;
}

document.querySelectorAll('.copy-path-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.stopPropagation(); // avoid triggering popup hide/mouseleave weirdness
        const path = btn.dataset.path;

        try {
            await navigator.clipboard.writeText(path);

            // Brief visual feedback
            const original = btn.textContent;
            btn.textContent = '✅';
            setTimeout(() => {
                btn.textContent = original;
            }, 1200);
        } catch (err) {
            console.error('Failed to copy path:', err);
        }
    });
});




// Map Progression.zeepsave unlocked categories to internal type names
const ZEEPSAVE_CATEGORY_MAP = {
    UnlockedZeepkists: 'zeepkists',
    UnlockedHats: 'hats',
    UnlockedColors: 'characters',
    UnlockedGlasses: 'glasses',
    UnlockedWheels: 'wheels',
    UnlockedParagliders: 'paragliders',
    UnlockedHorns: 'horns',
    UnlockedCosmetics: 'cosmetics'
};

function extractUnlockedCollectables(saveData) {
    const unlockedItems = [];

    for (const [saveKey, typeName] of Object.entries(ZEEPSAVE_CATEGORY_MAP)) {
        const itemIds = saveData[saveKey];

        if (Array.isArray(itemIds)) {
            itemIds.forEach(id => {
                unlockedItems.push({
                    type: typeName,
                    id: Number(id)
                });
            });
        }
    }

    return unlockedItems;
}

/**
 * Converts kebab-case strings to camelCase
 * e.g., 'red-gifts' -> 'redGifts', 'paint-blobs' -> 'paintBlobs'
 */
function kebabToCamelCase(str) {
  if (!str) return '';
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Normalizes cosmetic level names like "EZ01" to match levels.json "ez-01" format
 * e.g., "EZ01" -> "ez-01", "A12" -> "a-12"
 */
function formatLevelNameForLookup(levelStr) {
  if (!levelStr) return '';
  const clean = levelStr.trim().toLowerCase();
  return clean.replace(/^([a-z]+)(\d+)$/, '$1-$2');
}

/**
 * Main function to sync progression.zeepsave collectibles through cosmetics.json & levels.json
 */
async function syncZeepsaveCollectibles(zeepSaveData, levelsData) {
    // console.group('=== ZEEPSAVE COSMETICS SYNC LOGS ===');

    // 1. Extract unlocked (type, id) pairs from Progression.zeepsave
    const unlockedItems = extractUnlockedCollectables(zeepSaveData);

    // Save the array to localStorage
    localStorage.setItem('unlockedCosmetics', JSON.stringify(unlockedItems));

    // console.log(`[1/4] Extracted ${unlockedItems.length} unlocked items from Zeepsave.`);

    if (unlockedItems.length === 0) {
        console.warn('No cosmetic items found in Zeepsave data.');
        console.groupEnd();
        return;
    }

    // Fetch cosmetics.json
    let cosmeticsData = [];
    try {
        const res = await fetch('cosmetics.json');
        cosmeticsData = await res.json();
        // console.log(`[2/4] Loaded cosmetics.json (${cosmeticsData.length} records).`);
    } catch (err) {
        console.error('Failed to load cosmetics.json:', err);
        console.groupEnd();
        return;
    }

    // Build lookup map: "ez-01" -> "ez01_1766960215118"
    const levelIdMap = {};
    levelsData.forEach(level => {
        if (level.name) {
        levelIdMap[level.name.toLowerCase()] = level.id;
        }
    });

    function getFullLevelId(match) {
    // Special Adventure Map cosmetics: MAP01, MAP02, etc.
    if (match.level?.toUpperCase() === 'MAP') {
        const mapMatch = String(match.id || '').match(/^MAP(\d+)/i);

        if (mapMatch) {
            const mapNumber = mapMatch[1].padStart(2, '0');

            const mapLevel = levelsData.find(level =>
                String(level.id).toLowerCase().startsWith(`map${mapNumber}_`)
            );

            return mapLevel?.id;
        }
    }

    // Normal levels — preserve the original lookup behaviour
    const normalizedLevel = match.level
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    // First try the direct lookup
    if (levelIdMap[normalizedLevel]) {
        return levelIdMap[normalizedLevel];
    }

    // Then use the original special level-name conversion
    const formattedLevel = formatLevelNameForLookup(match.level);

    return levelIdMap[formattedLevel];
}

    const matchedCosmetics = [];
    const unmatchedCosmetics = [];
    const levelNotFoundMatches = [];
    const updatesPerLevel = {};
const matchedCosmeticIds = new Set();




// Helper to normalize category strings ('wheels' -> 'wheels', 'characters' -> 'color')
    const normalizeType = (str) => {
        if (!str) return '';
        const s = str.toLowerCase().trim().replace(/s$/, '');
        if (s === 'character') return 'color';
        return s;
    };

    // 2. Cross-reference zeepsave items against cosmetics.json
    unlockedItems.forEach(({ type, id }) => {
        const targetId = String(id).trim();
        const normZeepType = normalizeType(type);

        // 1. Find exact match by cosmeticID/baseID AND type
        const match = cosmeticsData.find(c => {
            const cosmeticID = String(c.cosmeticID || '').trim();
            const baseID = String(c.baseID || '').trim();
            const isIdMatch = (cosmeticID !== '' && cosmeticID === targetId) || 
                              (baseID !== '' && baseID === targetId);

            if (!isIdMatch) return false;

            // Match type (e.g. 'wheels' === 'wheels', or fallback if c.type is missing)
            if (!c.type) return true;
            const normCosmeticType = normalizeType(c.type);

            return normCosmeticType === normZeepType ||
                   (normCosmeticType === 'color' && normZeepType === 'character') ||
                   (normCosmeticType === 'character' && normZeepType === 'color');
        });

        if (!match) {
            unmatchedCosmetics.push({ type, id });
            return;
        }

        if (!match.level || !match.unlock) {
            console.warn(`[Skip] Cosmetic matched but lacks "level" or "unlock":`, match);
            return;
        }

        // Map "L01" to its full ID like "l01_1787248080432"
        const normTargetLevel = match.level.toLowerCase().replace(/[^a-z0-9]/g, '');
        const fullLevelId = getFullLevelId(match);

        if (!fullLevelId) {
            levelNotFoundMatches.push({ rawLevel: match.level, normalized: normTargetLevel, match });
            return;
        }

        // 2. Read the "unlock" field directly from cosmetics.json ("gears", "red-gifts", etc.)
        let camelUnlockKey = kebabToCamelCase(match.unlock.trim());
        if (camelUnlockKey === 'gear') camelUnlockKey = 'gears';

        matchedCosmetics.push({
            zeepType: type,
            zeepId: id,
            cosmeticMatch: match,
            targetLevelName: match.level,
            fullLevelId,
            unlockKey: camelUnlockKey
        });

        // 3. Store the unlock type to deduct/update for this level        
        const matchKey = `${type}:${id}`;

if (!matchedCosmeticIds.has(matchKey)) {
    matchedCosmeticIds.add(matchKey);

    if (!updatesPerLevel[fullLevelId]) {
        updatesPerLevel[fullLevelId] = [];
    }

    updatesPerLevel[fullLevelId].push(camelUnlockKey);
}
    });




    // 2. Cross-reference zeepsave items against cosmetics.json
    unlockedItems.forEach(({ type, id }) => {
        const targetId = String(id).trim();
        // --- UPDATE THIS TYPE MATCHING BLOCK IN syncZeepsaveCollectibles ---
        const normZeepType = type.toLowerCase().replace(/s$/, '');

        const match = cosmeticsData.find(c => {
            if (!c.type) return false;

            const normCosmeticType = c.type.toLowerCase().replace(/s$/, '');

            // Allow exact match OR character/color alias OR gears/UnlockedCosmetics fallback
            const isTypeMatch = 
                normCosmeticType === normZeepType ||
                (normCosmeticType === 'color' && normZeepType === 'character') ||
                (normCosmeticType === 'character' && normZeepType === 'color') ||
                (normCosmeticType === 'gear' && (normZeepType === 'gear' || normZeepType === 'cosmetic'));

            const cosmeticID = String(c.cosmeticID || '').trim();
            const baseID = String(c.baseID || '').trim();
            const isIdMatch = (cosmeticID === targetId) || (baseID !== '' && baseID === targetId);

            return isTypeMatch && isIdMatch;
        });

        if (!match) {
        unmatchedCosmetics.push({ type, id });
        return;
        }

        if (!match.level || !match.unlock) {
        console.warn(`[Skip] Cosmetic matched but lacks "level" or "unlock":`, match);
        return;
        }

        const targetLevelName = formatLevelNameForLookup(match.level);
        const fullLevelId = getFullLevelId(match);

        if (!fullLevelId) {
        levelNotFoundMatches.push({ rawLevel: match.level, formatted: targetLevelName, match });
        return;
        }

        // Convert unlock key: "red-gifts" -> "redGifts", "paint-blobs" -> "paintBlobs"
        const camelUnlockKey = kebabToCamelCase(match.unlock.trim());

        matchedCosmetics.push({
        zeepType: type,
        zeepId: id,
        cosmeticMatch: match,
        targetLevelName,
        fullLevelId,
        unlockKey: camelUnlockKey
        });

        const matchKey = `${type}:${id}`;

if (!matchedCosmeticIds.has(matchKey)) {
    matchedCosmeticIds.add(matchKey);

    if (!updatesPerLevel[fullLevelId]) {
        updatesPerLevel[fullLevelId] = [];
    }

    updatesPerLevel[fullLevelId].push(camelUnlockKey);
}
    });

    // 3. Update localStorage for ALL levels in levels.json
    const storageUpdateSummary = [];

    levelsData.forEach(levelObj => {
        const levelId = levelObj.id;
        if (!levelId) return;

        // Get current remaining state from storage
        const state = getcollectiblestate(levelObj);
        const oldStateCopy = { ...state };

        // Get matched unlock keys for this specific level (if any exist)
        const unlockKeys = updatesPerLevel[levelId] || [];

        // Count how many of each unlock key were matched in this save file
        const matchedCounts = {};
        unlockKeys.forEach(key => {
        matchedCounts[key] = (matchedCounts[key] || 0) + 1;
        });

        let modified = false;

        // Combine all collectible categories (permanent + seasonal) defined in levels.json
        const allCollectibleDefs = {
        ...(levelObj.collectibles?.permanent || {}),
        ...(levelObj.collectibles?.seasonal || {})
        };

        Object.entries(allCollectibleDefs).forEach(([key, totalMax]) => {
        if (totalMax > 0) {
            const matchedAmount = matchedCounts[key] || 0;
            
            // Remaining items = max minus what was found in Zeepsave.
            // If matchedAmount is 0, newRemaining becomes totalMax (uncollected/reset).
            const newRemaining = Math.max(0, totalMax - matchedAmount);

            if (state[key] !== newRemaining) {
            state[key] = newRemaining;
            modified = true;
            }
        }
        });

        if (modified) {
        savecollectiblestate(levelId, state);
        storageUpdateSummary.push({
            'Level Name': levelObj.name,
            'Level ID': levelId,
            'Matched Items': unlockKeys.length,
            'Before': JSON.stringify(oldStateCopy),
            'After': JSON.stringify(state)
        });
        }
  });

  if (storageUpdateSummary.length > 0) {
    console.table(storageUpdateSummary);
  } else {
    console.log('No localStorage changes needed (all levels already up-to-date).');
  }


  console.groupEnd();
}

/**
 * Collects all stored progress from localStorage into a single backup object.
 */
function getFullSaveData() {
    return {
        timestamp: new Date().toISOString(),
        user_steam_id: localStorage.getItem('user_steam_id') || '',
        medals: getProgressData().medals,
        collectibles: getProgressData().collectibles,
        zeepsaveTimes: JSON.parse(localStorage.getItem('zeepsaveTimes') || '{}'),
        unlockedCosmetics: JSON.parse(localStorage.getItem('unlockedCosmetics') || '[]'),
        unlockedDLC: JSON.parse(localStorage.getItem('unlockedDLC') || '[]'),
        unlockedAchievements: JSON.parse(localStorage.getItem('unlockedAchievements') || '[]')
    };
}

/**
 * Saves or exports the complete progress data
 */
function saveAllProgress() {
    const backupData = getFullSaveData();
    
    // Save to a unified localStorage backup key
    localStorage.setItem('zeepkist_full_backup', JSON.stringify(backupData));

    console.log('✅ Progress backed up successfully:', backupData);
    return backupData;
}


// 1. DOMContentLoaded: Reads steamid from URL/LocalStorage and initializes achievements
window.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const steamIdFromUrl = urlParams.get("steamid");

    if (steamIdFromUrl) {
        localStorage.setItem("user_steam_id", steamIdFromUrl);
        // console.log("Steam ID saved to LocalStorage:", steamIdFromUrl);

        // Remove query params without altering the base URL path
        const url = new URL(window.location.href);
        url.searchParams.delete('steamid');
        window.history.replaceState({}, document.title, url.pathname + url.search);
    }

    // B. Dynamically generate login button URL without double slashes
    const steamBtn = document.getElementById("steam-login-btn");
    if (steamBtn) {
        // Uses standard URL construction to prevent extra trailing slashes
        const redirectUrl = new URL(window.location.pathname, window.location.origin).href;
        steamBtn.href = `https://zeepkist-steam-proxy.cactuzhead.workers.dev/?action=login&redirect_uri=${encodeURIComponent(redirectUrl)}`;
    }

    // C. Load saved DLC checkboxes & recalculate totals
    if (typeof loadDLCCheckboxes === "function") {
        loadDLCCheckboxes();
    }

    // D. Fetch/Apply Steam Achievements
    const currentSteamId = localStorage.getItem("user_steam_id");
    // console.log("Current Steam ID from LocalStorage:", currentSteamId);

    if (currentSteamId) {
        // Render instantly from LocalStorage
        const cachedAchievements = getStoredUnlockedAchievements();
        if (cachedAchievements.length > 0) {
            applyUnlockedToUI(cachedAchievements);
        }

        // Fetch fresh state from Steam
        syncAchievementsFromSteam(currentSteamId);
    } else {
        // If no Steam ID, still update counters for local offline checkboxes
        refreshPageCounters();
    }
});

// 2. Fetch from Steam Proxy and store in LocalStorage
function syncAchievementsFromSteam(steamId) {
    const proxyUrl = `https://zeepkist-steam-proxy.cactuzhead.workers.dev/?action=achievements&steamid=${steamId}`;

    fetch(proxyUrl)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (data?.playerstats?.achievements && Array.isArray(data.playerstats.achievements)) {
                // Extract only unlocked achievements
                const unlockedList = data.playerstats.achievements
                    .filter(ach => ach.achieved === 1)
                    .map(ach => ach.apiname);

                // Save to LocalStorage
                localStorage.setItem("unlockedAchievements", JSON.stringify(unlockedList));

                // Apply to UI and update counters
                applyUnlockedToUI(unlockedList);
                refreshPageCounters();
            }
        })
        .catch(err => console.error("Error syncing Steam achievements:", err));
}

function updateDLCCounter() {
    const owned = getStoredUnlockedDLC();
    const badge = document.getElementById("dlcBadge");
    if (badge) {
        badge.textContent = owned.length;
    }
}

// Helper function to force counter recalculations
function refreshPageCounters() {
    if (typeof updateProgress === "function") updateProgress();
    if (typeof updateDLCCounter === "function") updateDLCCounter();
    if (typeof calculateTotals === "function") calculateTotals();
}


// 3. Retrieve unlocked achievement array from LocalStorage
function getStoredUnlockedAchievements() {
    try {
        const stored = localStorage.getItem("unlockedAchievements");
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to parse unlockedAchievements from LocalStorage:", e);
        return [];
    }
}

// Helper: Function to update UI using the array of unlocked names
function applyUnlockedToUI(unlockedList) {
    const unlockedSet = new Set(unlockedList);
}

// Save checkbox changes directly into LocalStorage and refresh UI + Badge
function toggleDLC(dlcId, isOwned) {
    let owned = getStoredUnlockedDLC();

    if (isOwned) {
        if (!owned.includes(dlcId)) owned.push(dlcId);
    } else {
        owned = owned.filter(id => id !== dlcId);
    }

    localStorage.setItem("unlockedDLC", JSON.stringify(owned));

    // Refresh badge & UI
    updateDLCBadge();
    if (typeof applyDLCToUI === "function") {
        applyDLCToUI(owned);
    }
}

// Read from LocalStorage and set checkbox states + badge on page load
function loadDLCCheckboxes() {
    const owned = getStoredUnlockedDLC();

    [1699070, 1962260, 3316260].forEach(dlcId => {
        const checkbox = document.getElementById(`dlc-${dlcId}`);
        if (checkbox) {
            checkbox.checked = owned.includes(dlcId);
        }
    });

    updateDLCBadge();
    if (typeof applyDLCToUI === "function") {
        applyDLCToUI(owned);
    }
}

// Safely retrieve array from LocalStorage
function getStoredUnlockedDLC() {
    try {
        const stored = localStorage.getItem("unlockedDLC");
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function applyDLCToUI(ownedDlcList) {
    // Custom logic to show/hide DLC items in your UI
}

// Toggle menu visibility
function toggleDLCDropdown() {
    const menu = document.getElementById("dlcMenu");
    menu.classList.toggle("show");
}

// ==========================================================================
//   Global Click-Outside Handler
// ==========================================================================
window.addEventListener("click", (event) => {
    // DLC Dropdown Close Handler
    const dlcContainer = document.querySelector(".dlc-dropdown-container");
    if (dlcContainer && !dlcContainer.contains(event.target)) {
        document.getElementById("dlcMenu")?.classList.remove("show");
    }

    // Hamburger Dropdown Close Handler
    const hamburgerContainer = document.querySelector(".hamburger-menu-container");
    const isToggleClick = event.target.closest(".hamburger-menu-toggle");

    if (hamburgerContainer && !hamburgerContainer.contains(event.target) && !isToggleClick) {
        document.getElementById("menuDropdown")?.classList.remove("show");
    }
});


// Update the badge number on the button
function updateDLCBadge() {
    const owned = getStoredUnlockedDLC();
    const badge = document.getElementById("dlcBadge");
    if (badge) {
        badge.textContent = owned.length;
    }
}

function toggleMenuDropdown() {
    const menu = document.getElementById('menuDropdown');
    menu.classList.toggle('show');
}

// Close the hamburger dropdown when clicking outside
window.addEventListener('click', (e) => {
    const container = document.querySelector('.menu-dropdown-container');
    if (container && !container.contains(e.target)) {
        const menu = document.getElementById('menuDropdown');
        if (menu && menu.classList.contains('show')) {
            menu.classList.remove('show');
        }
    }
});

function updateSummaryStats() {
    if (typeof ALL_LEVELS !== 'undefined' && ALL_LEVELS.length > 0) {
        updateTotals(ALL_LEVELS);
        updateCollectableTotals(ALL_LEVELS);
    }
}