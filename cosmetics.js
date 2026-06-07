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

let allCosmetics = [];


/* ------------------------------------
   Load cosmetics JSON
------------------------------------ */
fetch('cosmetics.json')
    .then(res => res.json())
    .then(data => init(data));


/* ------------------------------------
   Render cards
------------------------------------ */
function renderCosmetics(cosmetics) {
    grid.innerHTML = '';

    cosmetics.forEach(c => {
        const card = document.createElement('div');
        card.className = 'card';

        const page = Math.floor((c.position - 1) / 8) + 1;
        const item = ((c.position - 1) % 8) + 1;
        const unlockFormatted = formatUnlock(c.unlock);        

        card.innerHTML = `
            <div class="thumb-wrapper">
                <img class="thumb ${c.type}"
                    src="images/cosmetics/${c.id}.png"
                    alt="${c.name}"
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
                ${false ? `
                    <div class="position">
                        ${c.position 
                            ? `<span class="position">position #${c.position}</span>` 
                            : ""
                        }
                    </div>
                ` : ""}      
                <div class="meta">
                    <span class="cosmetic-type">
                        <span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-icon lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
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
            { key: 'pumpkinsYT', label: 'All Pumpkins', month: 9 }, // October (0-indexed)
            { key: 'snowflakesYT', label: 'All Snowflakes', month: 11 }, // December (0-indexed)
            { key: 'cosmeticYT', label: 'Collectable' },
        ];

        if (c.urls) {
            const videoButtons = document.createElement('div');
            videoButtons.className = 'video-buttons';            

            videoTypes.forEach(({ key, label }) => {
                if (c.urls[key]) {
                    const url =  normalizeYT(c.urls[key]); // freeze value NOW

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

        // fallback image
        const img = card.querySelector('img.thumb');
        img.onerror = () => { img.src = 'images/placeholder.png'; };

        grid.appendChild(card);
        
    });

    cosmeticCount.textContent = `${cosmetics.length} / ${allCosmetics.length} cosmetics`;
}


closeModal.addEventListener('click', closeModalFunc);
modalBackdrop.addEventListener('click', closeModalFunc);

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModalFunc();
});


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
   search filtering
------------------------------------ */
function applyFilters() {
    const search = searchInput.value.toLowerCase();
    const type = typeFilter.value;
    const level = levelFilter.value;    
    const color = colorFilter.value.toLowerCase().trim();

    const filtered = allCosmetics.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search);
        const matchesType = type === 'all' || c.type === type;
        const matchesLevel = level === 'all' || c.level === level;        
        const searchColor = color.toLowerCase().trim();

        const matchesColor =
        searchColor === '' ||
        [c.primary, c.secondary, c.accent]
            .some(col => col && col.toLowerCase().trim() === searchColor);

        return matchesSearch && matchesType && matchesLevel && matchesColor;
    });

    renderCosmetics(filtered);
}

// EVENT LISTENERS
searchInput.addEventListener('input', applyFilters);
typeFilter.addEventListener('change', applyFilters);
levelFilter.addEventListener('change', applyFilters);
colorFilter.addEventListener('input', applyFilters);


/* ------------------------------------
   search filters
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

    // Color filter
    colorFilter.innerHTML = `<option value="">All Colors</option>`;
    Array.from(colors).sort().forEach(c => {
        const option = document.createElement('option');
        option.value = c;
        option.textContent = c
            .replace(/\b\w/g, c => c.toUpperCase());
        colorFilter.appendChild(option);
    });

    // Type filter
    typeFilter.innerHTML = `<option value="">All Cosmetic Types</option>`;
    Array.from(types).sort().forEach(t => {
        const option = document.createElement('option');
        option.value = t;
        option.textContent = t
            .replace(/\b\w/g, c => c.toUpperCase());
        typeFilter.appendChild(option);
    });

    // Level filter
    levelFilter.innerHTML = `<option value="">All Levels</option>`;
    Array.from(levels).sort().forEach(l => {
        const option = document.createElement('option');
        option.value = l;
        option.textContent = l;
        levelFilter.appendChild(option);
    });
}


/* ------------------------------------
   apply controls
------------------------------------ */
function applyControls() {
    let filtered = [...allCosmetics];
    const search = searchInput.value.trim().toLowerCase();
    const color = colorFilter.value.toLowerCase();
    const type = typeFilter.value;
    const level = levelFilter.value;

    // SEARCH: match name, type, colors, level (not now type or how unlocked)
    if (search) {
        filtered = filtered.filter(c =>
            c.name.toLowerCase().includes(search) ||
            // c.type.toLowerCase().includes(search) ||
            c.primary.toLowerCase().includes(search) ||
            c.secondary.toLowerCase().includes(search) ||
            c.accent.toLowerCase().includes(search) ||
            c.level.toLowerCase().includes(search) 
            // ||
            // c.unlock.toLowerCase().includes(search)
        );
    }

    // Filters
    if (color) {
        filtered = filtered.filter(c =>
            [c.primary, c.secondary, c.accent]
                .some(col => col && col.toLowerCase().trim() === color)
        );
    }

    if (type) filtered = filtered.filter(c => c.type === type);
    if (level) filtered = filtered.filter(c => c.level === level);

    // Sorting
    const sort = sortBy.value;
    if (sort === 'name') filtered.sort((a,b) => a.name.localeCompare(b.name));
    if (sort === 'nameZA') filtered.sort((a,b) => b.name.localeCompare(a.name));
    if (sort === 'level') filtered.sort((a,b) => a.level.localeCompare(b.level));
    if (sort === 'levelZA') filtered.sort((a,b) => b.level.localeCompare(a.level));
    if (sort === 'location') { filtered.sort((a, b) => Number(a.position) - Number(b.position)); }
    if (sort === 'locationDesc') { filtered.sort((a, b) => Number(b.position) - Number(a.position)); }

    // Update total cosmetics count
    cosmeticsTotalEl.textContent = `${filtered.length} / ${allCosmetics.length} cosmetics`;

    renderCosmetics(filtered);
}


/* ------------------------------------
   Modal
------------------------------------ */
function openModal(cosmetic, url) {
    if (!url) return;

    modalVideo.src = getYouTubeEmbedUrl(url);
    modal.classList.add('visible');
}

function closeModalFunc() {
    modal.classList.remove('visible');
    modalVideo.src = ''; // Stop video
}


/* ------------------------------------
   Youtube Normalize
------------------------------------ */
function normalizeYT(url) {
    // Convert youtu.be short links to full URL with start parameter
    const match = url.match(/youtu\.be\/([^\?]+)\?t=(\d+)/);
    if (match) {
        const [, id, t] = match;
        return `https://www.youtube.com/watch?v=${id}&start=${t}`;
    }
    return url;
}


// seperate level names
function formatLevel(level) {
    return level.replace(/^([A-Za-z]+)(\d+)$/, '$1-$2');
}

// Event listeners
searchInput.addEventListener('input', applyControls);
colorFilter.addEventListener('change', applyControls);
typeFilter.addEventListener('change', applyControls);
sortBy.addEventListener('change', applyControls);

modalBackdrop.addEventListener('click', closeModalFunc);
closeModal.addEventListener('click', closeModalFunc);

levelFilter.addEventListener('change', applyControls);


/* ------------------------------------
   Foramtting Helper
------------------------------------ */
function formatUnlock(str) {
    if (!str) return "";
    if (str.toLowerCase() === "free") return "Included with Zeepkist";
    if (str.toLowerCase() === "dlc") return "DLC&nbsp;";
    if (str.toLowerCase() === "red-gifts") return "Red Gifts";
    if (str.toLowerCase() === "blue-feathers") return "Blue Feathers";    
    if (str.toLowerCase() === "paint-blobs") return "Paint Blobs";
    if (str.toLowerCase() === "medals-bronze") return "Bronze Medal";
    if (str.toLowerCase() === "medals-silver") return "Silver Medal";
    if (str.toLowerCase() === "medals-gold") return "Gold Medal";
    if (str.toLowerCase() === "medals-author") return "Author Medal";
    return str.charAt(0).toUpperCase() + str.slice(1);
}


const medalTooltip = document.getElementById("hoverTooltip");

document.addEventListener("mouseenter", e => {
    const targetEl = e.target instanceof Element ? e.target : e.target.parentElement;
    const el = targetEl?.closest("[data-tooltip]");
    if (!el) return;

    const text = el.dataset.tooltip;
    if (!text) return;

    medalTooltip.textContent = text;
    const rect = el.getBoundingClientRect();

    // Temporarily show to measure size
    medalTooltip.style.left = "0px";
    medalTooltip.style.top = "0px";
    medalTooltip.classList.add("visible");

    const tooltipRect = medalTooltip.getBoundingClientRect();

    // Default position (centered below element)
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    let top = rect.bottom + 8;

    // Prevent overflow right
    if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 8;
    }

    // Prevent overflow left
    if (left < 8) {
        left = 8;
    }

    // OPTIONAL: flip above if bottom overflow
    if (top + tooltipRect.height > window.innerHeight) {
        top = rect.top - tooltipRect.height - 8;
    }

    medalTooltip.style.left = left + "px";
    medalTooltip.style.top = top + "px";
}, true);

document.addEventListener("mouseleave", e => {
    const targetEl = e.target instanceof Element ? e.target : e.target.parentElement;
    if (!targetEl?.closest("[data-tooltip]")) return;

    medalTooltip.classList.remove("visible");
}, true);


/* ------------------------------------
   initialize
------------------------------------ */
function init(cosmeticsData) {
    allCosmetics = cosmeticsData;
    populateFilters(allCosmetics);
    applyControls();
}


/* ------------------------------------
   get YouTube Embeded URL
------------------------------------ */
function getYouTubeEmbedUrl(url) {
    if (!url) return '';

    let videoId = '';
    let startTime = 0;

    // Convert short youtu.be to full URL
    const shortMatch = url.match(/youtu\.be\/([^\?\&]+)/);
    if (shortMatch) videoId = shortMatch[1];

    // Standard youtube.com/watch?v= links
    const fullMatch = url.match(/v=([^\&\?\#]+)/);
    if (fullMatch) videoId = fullMatch[1];

    // Extract timestamp from ?t= or &t= or #t=
    const timeMatch = url.match(/[?&\#]t=(\d+)/);
    if (timeMatch) startTime = parseInt(timeMatch[1], 10);

    if (!videoId) return url;

    // Use &autoplay=1 after start
    return `https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=1`;
}