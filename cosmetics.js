const grid = document.getElementById('grid');
const modal = document.getElementById('modal');
const modalVideo = document.getElementById('modalVideo');
const modalTitle = document.getElementById('modalTitle');
const modalInfo = document.getElementById('modalInfo');
const closeModal = document.getElementById('closeModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const themeToggle = document.getElementById('themeToggle');
const cosmeticsTotalEl = document.getElementById('cosmeticCount');
const searchInput = document.getElementById('search');
const colorFilter = document.getElementById('filterEnv');
const typeFilter = document.getElementById('cosmeticTypeFilter');
const sortBy = document.getElementById('sortBy');
const levelFilter = document.getElementById('levelFilter');
const cosmeticFilter = document.getElementById('cosmeticFilter');

let allCosmetics = [];

/* ------------------------------------
   Load cosmetics JSON
------------------------------------ */
fetch('cosmetics.json')
    .then(res => res.json())
    .then(data => init(data));

/* ------------------------------------
   Helper: Check if Cosmetic is Collected
------------------------------------ */
function isCosmeticUnlocked(c) {
    if (String(c.level).toLowerCase() === 'included with zeepkist') {
        return true;
    }

    let unlockedCosmetics = [];
    try {
        unlockedCosmetics = JSON.parse(localStorage.getItem('unlockedCosmetics') || '[]');
    } catch (e) {
        console.error('Failed to parse unlockedCosmetics:', e);
    }

    return unlockedCosmetics.some(u => {
        const targetId = String(u.id).trim();
        const cosmeticID = String(c.cosmeticID || '').trim();
        const baseID = String(c.baseID || '').trim();

        const isIdMatch = (cosmeticID !== '' && cosmeticID === targetId) ||
                          (baseID !== '' && baseID === targetId);

        if (!isIdMatch) return false;

        const normU = String(u.type || '').toLowerCase().replace(/s$/, '');
        const normC = String(c.type || '').toLowerCase().replace(/s$/, '');

        return normU === normC ||
               (normU === 'character' && normC === 'color') ||
               (normU === 'color' && normC === 'character');
    });
}

/* ------------------------------------
   Render cards
------------------------------------ */
function renderCosmetics(cosmetics) {
    grid.innerHTML = '';

    cosmetics.forEach(c => {
        const card = document.createElement('div');
        const isCollected = isCosmeticUnlocked(c);

        card.className = isCollected ? 'card collectedCosmetic' : 'card uncollectedCosmetic';

        const page = Math.floor((c.position - 1) / 8) + 1;
        const item = ((c.position - 1) % 8) + 1;
        const unlockFormatted = formatUnlock(c.unlock);        

        card.innerHTML = `
            <div class="thumb-wrapper">
                <img class="thumb ${c.type}"
                    src="images/cosmetics/${c.id}.png"
                    alt="${c.name}"
                    loading="lazy"
                    onerror="this.src='images/placeholder.png'">

                ${c.unlock ? `                    
                    <div class="cosmetic cosmetic-${c.unlock}">
                        <span class="icon" data-tooltip="${
                            c.unlock === "free"
                                ? unlockFormatted
                                : `Unlocked by ${unlockFormatted}`
                        }">
                    </div>                    
                ` : ''}
            </div>

            <div class="card-body">
                <h3 class="card-title">${c.name}</h3>
                 <div class="chips">
                    <span class="chip">${formatLevel(c.level)}</span>                    
                </div>
                <div class="meta">
                    <span class="cosmetic-type">
                        <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                            &nbsp;${c.type}
                        </span>
                        <span class="cosmetic-location">Page ${page}  &nbsp;-&nbsp;  Item ${item}</span>
                    </span>
                    <span class="cosmetic-colors">   
                        <span class="cosmetic-wrapper cosmetic-${c.primary?.toLowerCase()}">${c.primary}</span>
                        <span class="cosmetic-wrapper cosmetic-${c.secondary?.toLowerCase()}">${c.secondary}</span>
                        <span class="cosmetic-wrapper cosmetic-${c.accent?.toLowerCase()}">${c.accent}</span>
                    </span>
                </div>
            </div>
        `;

        const videoTypes = [
            { key: 'authorYT', label: 'Author Run' },
            { key: 'giftsYT', label: 'All Collectibles' },
            { key: 'pumpkinsYT', label: 'Pumpkin Collectable', month: 9 },
            { key: 'snowflakesYT', label: 'Snowflake Collectable', month: 11 },
            { key: 'cosmeticYT', label: 'Collectable' },
        ];

        if (c.urls) {
            const videoButtons = document.createElement('div');
            videoButtons.className = 'video-buttons';            

            videoTypes.forEach(({ key, label }) => {
                if (c.urls[key]) {
                    const btn = document.createElement('button');
                    btn.innerHTML = `
                        <span class="youtube-triangle">
                            <svg width="48" height="32" viewBox="0 0 48 32">
                                <rect width="48" height="32" rx="8" fill="#ba0b0b"/>
                                <polygon points="18,8 18,24 34,16" fill="#ffffff"/>
                            </svg>
                        </span>
                        <span class="btn-text">${label}</span>
                    `;

                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openModal(c, c.urls[key]);
                    });

                    videoButtons.appendChild(btn);
                }
            });

            if (videoButtons.childElementCount > 2) {
                videoButtons.style.gap = '4px';
            }

            const thumbWrapper = card.querySelector('.thumb-wrapper');
            if (videoButtons.childElementCount > 0) {
                thumbWrapper.appendChild(videoButtons);
            }
        }

        if (c.urls && c.urls.cosmeticYT) {
            card.addEventListener('click', (e) => {          
                const targetElement = e.target instanceof Element ? e.target : e.target.parentElement;
                if (targetElement && targetElement.closest('.video-buttons')) return;
                openModal(c, c.urls.cosmeticYT);
            });
            card.style.cursor = 'pointer';
        } else {
            card.style.cursor = 'auto';            
        }

        const img = card.querySelector('img.thumb');
        img.onerror = () => { img.src = 'images/placeholder.png'; };

        grid.appendChild(card);
    });

    cosmeticsTotalEl.textContent = `${cosmetics.length} / ${allCosmetics.length} cosmetics`;
}

/* ------------------------------------
   Dark/light theme toggle
------------------------------------ */
function setTheme(isDark) {
    if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try {
        localStorage.setItem('dm_theme', isDark ? 'dark' : 'light');
    } catch (e) {}
}

themeToggle.addEventListener('change', () => setTheme(themeToggle.checked));

(function initTheme() {
    const saved = localStorage.getItem('dm_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    themeToggle.checked = isDark;
    setTheme(isDark);
})();

/* ------------------------------------
   populate select dropdowns
------------------------------------ */
function populateFilters(cosmetics) {
    const colors = new Set();
    const types = new Set();
    const levels = new Set();

    cosmetics.forEach(c => {
        if (c.primary) colors.add(c.primary);
        if (c.type) types.add(c.type);
        if (c.level) levels.add(c.level);
    });

    colorFilter.innerHTML = `<option value="">All Colors</option>`;
    Array.from(colors).sort().forEach(c => {
        const option = document.createElement('option');
        option.value = c;
        option.textContent = c.replace(/\b\w/g, char => char.toUpperCase());
        colorFilter.appendChild(option);
    });

    typeFilter.innerHTML = `<option value="">All Cosmetic Types</option>`;
    Array.from(types).sort().forEach(t => {
        const option = document.createElement('option');
        option.value = t;
        option.textContent = t.replace(/\b\w/g, char => char.toUpperCase());
        typeFilter.appendChild(option);
    });

    levelFilter.innerHTML = `<option value="">All Levels</option>`;
    Array.from(levels).sort().forEach(l => {
        const option = document.createElement('option');
        option.value = l;
        option.textContent = l;
        levelFilter.appendChild(option);
    });
}

/* ------------------------------------
   apply all controls & filters
------------------------------------ */
function applyControls() {
    let filtered = [...allCosmetics];
    const search = searchInput.value.trim().toLowerCase();
    const color = colorFilter.value.toLowerCase();
    const type = typeFilter.value;
    const level = levelFilter.value;
    const status = cosmeticFilter ? cosmeticFilter.value : 'all';

    // Search
    if (search) {
        filtered = filtered.filter(c =>
            c.name.toLowerCase().includes(search) ||
            (c.primary && c.primary.toLowerCase().includes(search)) ||
            (c.secondary && c.secondary.toLowerCase().includes(search)) ||
            (c.accent && c.accent.toLowerCase().includes(search)) ||
            (c.level && c.level.toLowerCase().includes(search))
        );
    }

    // Colors
    if (color) {
        filtered = filtered.filter(c =>
            [c.primary, c.secondary, c.accent]
                .some(col => col && col.toLowerCase().trim() === color)
        );
    }

    // Type & Level
    if (type) filtered = filtered.filter(c => c.type === type);
    if (level) filtered = filtered.filter(c => c.level === level);

    // Status Filter (Unlocked vs Locked)
    if (status === 'unlocked') {
        filtered = filtered.filter(c => isCosmeticUnlocked(c));
    } else if (status === 'locked') {
        filtered = filtered.filter(c => !isCosmeticUnlocked(c));
    }

    // Sorting
    const sort = sortBy.value;
    if (sort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));
    if (sort === 'nameZA') filtered.sort((a,b) => b.name.localeCompare(a.name));
    if (sort === 'level') filtered.sort((a,b) => a.level.localeCompare(b.level));
    if (sort === 'levelZA') filtered.sort((a,b) => b.level.localeCompare(a.level));
    if (sort === 'location') filtered.sort((a, b) => Number(a.position) - Number(b.position));
    if (sort === 'locationDesc') filtered.sort((a, b) => Number(b.position) - Number(a.position));

    renderCosmetics(filtered);
}

/* ------------------------------------
   Modal & Tooltip
------------------------------------ */
function openModal(cosmetic, url) {
    if (!url) return;
    modalVideo.src = getYouTubeEmbedUrl(url);
    modal.classList.add('visible');
}

function closeModalFunc() {
    modal.classList.remove('visible');
    modalVideo.src = '';
}

function normalizeYT(url) {
    const match = url.match(/youtu\.be\/([^\?]+)\?t=(\d+)/);
    if (match) {
        const [, id, t] = match;
        return `https://www.youtube.com/watch?v=${id}&start=${t}`;
    }
    return url;
}

function formatLevel(level) {
    return level.replace(/^([A-Za-z]+)(\d+)$/, '$1-$2');
}

function formatUnlock(str) {
    if (!str) return "";
    str = String(str);
    if (str.toLowerCase() === "free") return "Included with Zeepkist";
    if (str.toLowerCase() === "dlc") return "DLC&nbsp;";
    if (str.toLowerCase() === "red-gifts") return "Red Gifts";
    if (str.toLowerCase() === "blue-feathers") return "Blue Feathers";    
    if (str.toLowerCase() === "paint-blobs") return "Paint Blobs";
    if (str.toLowerCase() === "gears") return "Gear Gifts";
    if (str.toLowerCase() === "medals-bronze") return "Bronze Medal";
    if (str.toLowerCase() === "medals-silver") return "Silver Medal";
    if (str.toLowerCase() === "medals-gold") return "Gold Medal";
    if (str.toLowerCase() === "medals-author") return "Author Medal";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getYouTubeEmbedUrl(url) {
    if (!url) return '';
    let videoId = '';
    let startTime = 0;

    const shortMatch = url.match(/youtu\.be\/([^\?\&]+)/);
    if (shortMatch) videoId = shortMatch[1];

    const fullMatch = url.match(/v=([^\&\?\#]+)/);
    if (fullMatch) videoId = fullMatch[1];

    const timeMatch = url.match(/[?&\#]t=(\d+)/);
    if (timeMatch) startTime = parseInt(timeMatch[1], 10);

    if (!videoId) return url;
    return `https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=1`;
}

// Event Listeners
searchInput.addEventListener('input', applyControls);
colorFilter.addEventListener('change', applyControls);
typeFilter.addEventListener('change', applyControls);
levelFilter.addEventListener('change', applyControls);
sortBy.addEventListener('change', applyControls);
if (cosmeticFilter) cosmeticFilter.addEventListener('change', applyControls);

closeModal.addEventListener('click', closeModalFunc);
modalBackdrop.addEventListener('click', closeModalFunc);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModalFunc(); });

/* ------------------------------------
   initialize
------------------------------------ */
function init(cosmeticsData) {
    allCosmetics = cosmeticsData;
    populateFilters(allCosmetics);
    if (cosmeticFilter) cosmeticFilter.value = 'all'; // Ensure default is 'all'
    applyControls();
}