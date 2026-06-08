let activeTooltipWrapper = null;
let activeLevelId = null;
let showSeasonalInTotal = false;
const levelCard = document.getElementById('levelCard');
let ALL_LEVELS = [];
const MAP_COLLECTABLE_IDS = ['map01_1767531589174', 'map02_1767531710306', 'map03_1767531799236', 'map04_1767531884270', 'map05_1768074827328'];

       
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
            total = getMedalTotal(level);
            collected = getCollectedMedals(level);
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
        collectibles: {}
    };

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);

        // Medal states (numbers)
        const parsed = parseInt(value);
        if (!isNaN(parsed) && !key.startsWith('collectibles:')) {
            data.medals[key] = parsed;
        }

        // Collectible states
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
    // reader.onload = () => {
    //     const data = JSON.parse(reader.result);
    //     Object.entries(data).forEach(([key, value]) => {
    //     localStorage.setItem(key, value);
    //     });
    //     location.reload(); // refresh dots + counters
    // };
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
    // localStorage.clear();
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
