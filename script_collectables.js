let activeTooltipWrapper = null;
let activeLevelId = null;
let showSeasonalInTotal = false;
const levelCard = document.getElementById('levelCard');
let ALL_LEVELS = [];
const MAP_COLLECTABLE_IDS = ['map01_1767531589174', 'map02_1767531710306', 'map03_1767531799236', 'map04_1767531884270', 'map05_1768074827328'];
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
        container.appendChild(wrapper);

        // MAP COLLECTABLE PIN TOOLTIP
        // if (isMapLevel) {
        //     const type = getSingleCollectableType(level);
        //     const meta = COLLECTABLE_META[type];

        //     if (meta) {
        //         wrapper.addEventListener('mouseenter', () => {
        //             medalTooltip.textContent = meta.label;

        //             const rect = wrapper.getBoundingClientRect();
        //             medalTooltip.style.left = rect.left + rect.width / 2 + "px";
        //             medalTooltip.style.top  = rect.top - 28 + "px";

        //             medalTooltip.classList.add("visible");
        //         });

        //         wrapper.addEventListener('mouseleave', () => {
        //             medalTooltip.classList.remove("visible");
        //         });
        //     }
        // }
       
        wrapper.addEventListener('click', () => {
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

        // Hover shows tooltip
        wrapper.addEventListener('mouseenter', () => {
            if (shiftHeld) return;

            activeTooltipWrapper = wrapper;
            activeLevelId = level.id;

            showTooltip(level, state, wrapper.getBoundingClientRect());
            levelCard.classList.add('visible');
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
            // const total = level.collectibles[groupName][type];
            // const remaining = collectiblestate[type] ?? total;
            // const collected = total - remaining;
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
                item.classList.add('no-items'); // optional class for styling
            }        

            // HOVER TOOLTIP FOR COLLECTABLE
            if (total > 0) {
                item.addEventListener('mouseenter', () => {
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



// function getProgressData() {
//     const data = {};
//     for (let i = 0; i < localStorage.length; i++) {
//         const key = localStorage.key(i);
//         const value = parseInt(localStorage.getItem(key));
//         if (!isNaN(value)) data[key] = value;
//     }
//     return data;
// }


function getProgressData() {
    const data = {
        medals: {},
        collectibles: {},
        zeepsaveTimes: {}
    };

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);

        if (key === 'zeepsaveTimes') {
            try {
                data.zeepsaveTimes = JSON.parse(value);
            } catch {}
            continue;
        }

        const parsed = parseInt(value);
        if (!isNaN(parsed) && !key.startsWith('collectibles:')) {
            data.medals[key] = parsed;
        }

        if (key.startsWith('collectibles:')) {
            data.collectibles[key] = JSON.parse(value);
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

    document.getElementById('bronzeCount').textContent = bronze;
    document.getElementById('silverCount').textContent = silver;
    document.getElementById('goldCount').textContent = gold;
    document.getElementById('authorCount').textContent = author;
    document.getElementById('remainingCount').textContent = total - bronze - silver - gold - author;
    document.getElementById('totalCount').textContent =  total;       
}


document.getElementById('exportBtn').addEventListener('click', () => {
    const data = getProgressData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'zeepkist-progress.json';
    a.click();
});


document.getElementById('importInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const data = JSON.parse(reader.result);

        // Handle OLD format first
        if (!data.medals && !data.collectibles) {
            Object.entries(data).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });

            location.reload();
            return;
        }

        // Clear existing progress (optional but recommended)
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('collectibles:') || !isNaN(parseInt(localStorage.getItem(key)))) {
                localStorage.removeItem(key);
            }
        });

        // Restore medals
        if (data.medals) {
            Object.entries(data.medals).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });
        }

        // Restore collectibles
        if (data.collectibles) {
            Object.entries(data.collectibles).forEach(([key, value]) => {
                localStorage.setItem(key, JSON.stringify(value));
            });
        }

        // Restore zeepsave best times
        if (data.zeepsaveTimes) {
            localStorage.setItem('zeepsaveTimes', JSON.stringify(data.zeepsaveTimes));
            ZEEPSAVE_TIMES = data.zeepsaveTimes;
        }

        location.reload();
    };
    reader.readAsText(file);
});


function openLevelCard() {
    levelCard.classList.add('visible');
}

function closeLevelCard() {
    levelCard.classList.remove('visible');
}



const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'dark';

document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.checked = savedTheme === 'dark';

themeToggle.addEventListener('change', () => {
    const theme = themeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
});

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
levelCard.addEventListener('mouseleave', () => {
    medalTooltip.classList.remove('visible');
});

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

    // clone group so we can safely inject defaults
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

                // const remaining = state[type] ?? total;
                // const collected = total - remaining;
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
        const parent = el.closest('.collectable-total');
        if (!el) continue;

        el.textContent = `${collectedTotals[type]}/${maxTotals[type]}`;

        if (collectedTotals[type] === maxTotals[type]) {
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

videoModal.querySelector('.video-close').addEventListener('click', closeVideo);
videoModal.querySelector('.video-backdrop').addEventListener('click', closeVideo);


document.getElementById('zeepsaveInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);

            const lines = Object.values(data.AdventureTimes)
                .map(entry => `${transformLevelUID(entry.LevelUID)}, ${entry.Time.toFixed(3)}`);

            fetch('levels.json')
            .then(res => res.json())
            .then(levelsData => {

                let testLines = lines;

                if (DEBUG_RANDOMIZE_TIMES) {
                    const addOptions = [10, 20, 30, 45];
                    testLines = lines.map(line => {
                        const [name, timeStr] = line.split(', ');
                        const randomAdd = addOptions[Math.floor(Math.random() * addOptions.length)];
                        const newTime = parseFloat(timeStr) + randomAdd;
                        return `${name}, ${newTime.toFixed(3)}`;
                    });
                }

                const results = compareToMedals(testLines, levelsData);
                console.table(results);

                ZEEPSAVE_TIMES = {};
                results.forEach(r => {
                    const level = levelsData.find(l => normalizeName(l.name) === normalizeName(r.name));
                    if (level) {
                        ZEEPSAVE_TIMES[level.id] = parseFloat(r.zeepsaveTime);
                    }
                });
                localStorage.setItem('zeepsaveTimes', JSON.stringify(ZEEPSAVE_TIMES));

                updateLevelProgress(results, levelsData);

                location.reload();
            })
            .catch(err => console.error('Failed to load levels.json:', err));
                

        } catch (err) {
            console.error('Failed to parse/process file:', err);
        }
    };
    reader.readAsText(file);
});

const zeepSaveHelp = document.querySelector('.zeepsave-help');
const zeepSavePopup = document.querySelector('.zeepsave-popup');

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

    console.log('Unmatched levels (' + unmatched.length + '):', unmatched);
    return results;
}

function medalToNumber(medal) {
    switch (medal) {
        case 'author': return 4;
        case 'gold':   return 3;
        case 'silver': return 2;
        case 'bronze': return 1;
        default:       return 0; // 'no medal'
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

    console.log('Updated (' + updated.length + '):', updated);
    console.log('Skipped (' + skipped.length + '):', skipped);

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

    console.log('Updated (' + updated.length + '):', updated);
    console.log('Skipped (' + skipped.length + '):', skipped);

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