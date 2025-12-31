let activeTooltipWrapper = null;

fetch('levels.json')
.then(res => res.json())
.then(levels => {
    const container = document.getElementById('dots');

    levels.forEach(level => {
    const wrapper = document.createElement('div');
    wrapper.className = 'dot-wrapper';
    wrapper.style.left = `${level.x}%`;
    wrapper.style.top = `${level.y}%`;

    const dot = document.createElement('div');
    dot.className = 'dot';

    let state = parseInt(localStorage.getItem(level.id)) || 0;
    dot.classList.add(`state-${state}`);

    wrapper.dataset.levelId = level.id;
    wrapper.dataset.state = state;

    wrapper.appendChild(dot);
    container.appendChild(wrapper);

    // click updates dot AND tooltip
    wrapper.addEventListener('click', () => {
        dot.classList.remove(`state-${state}`);
        state = (state + 1) % 5;
        dot.classList.add(`state-${state}`);
        wrapper.dataset.state = state;
        localStorage.setItem(level.id, state);

        if (activeTooltipWrapper === wrapper) {
        showTooltip(level, state, wrapper.getBoundingClientRect());
        }
        updateTotals(levels);
    });

        wrapper.addEventListener('mouseenter', () => {
        activeTooltipWrapper = wrapper;
        showTooltip(level, state, wrapper.getBoundingClientRect());
    });
    });
    updateTotals(levels);
});


function showTooltip(level, state, rect) {
    globalTooltip.innerHTML = "";

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

    const ul = document.createElement('ul');
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

    globalTooltip.append(img,h2,ul);

    // Temporarily set visible to measure size
    globalTooltip.style.left = '0px';
    globalTooltip.style.top = '0px';
    globalTooltip.classList.add('visible');

    // Measure tooltip size
    const tooltipRect = globalTooltip.getBoundingClientRect();
    const pageWidth = document.documentElement.clientWidth;
    const pageHeight = document.documentElement.clientHeight;

    let left = rect.right + 10; // default to right of dot
    let top = rect.top;

    // Adjust horizontally if overflowing
    if (left + tooltipRect.width > pageWidth) {
        left = rect.left - tooltipRect.width - 10; // show left of dot
        if (left < 0) left = 0; // clamp to left edge
    }

    // Adjust vertically if overflowing
    if (top + tooltipRect.height > pageHeight) {
        top = pageHeight - tooltipRect.height - 10; // clamp to bottom
    }

    globalTooltip.style.left = `${left}px`;
    globalTooltip.style.top = `${top}px`;

    // Remove previous tier classes
    globalTooltip.classList.remove('bronze','silver','gold','author');

    // Determine current tier and add class
    let tierClass = '';
    if (state === 1) tierClass = 'bronze';
    else if (state === 2) tierClass = 'silver';
    else if (state === 3) tierClass = 'gold';
    else if (state === 4) tierClass = 'author';

    if (tierClass) globalTooltip.classList.add(tierClass);
}


function getProgressData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = parseInt(localStorage.getItem(key));
        if (!isNaN(value)) data[key] = value;
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

    const total = levels.length;

    document.getElementById('bronzeCount').textContent = bronze;
    document.getElementById('silverCount').textContent = silver;
    document.getElementById('goldCount').textContent = gold;
    document.getElementById('authorCount').textContent = author;
    document.getElementById('remainingCount').textContent = total - bronze - silver - gold - author;
    document.getElementById('totalCount').textContent = total;
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
        Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, value);
        });
        location.reload(); // refresh dots + counters
    };
    reader.readAsText(file);
});


// global hide - only when mouse is far from all dots
document.addEventListener('mousemove', e => {
    const dotWrapper = e.target.closest('.dot-wrapper');
    if (!dotWrapper) {
        activeTooltipWrapper = null;
        globalTooltip.classList.remove('visible');
    }
});


const themeToggle = document.getElementById('themeToggle');

const savedTheme = localStorage.getItem('theme') || 'dark';

document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.checked = savedTheme === 'dark';

themeToggle.addEventListener('change', () => {
    const theme = themeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
});

const medalTooltip = document.getElementById('globalMedalTooltip');

document.querySelectorAll('.medal').forEach(medal => {
    const text = medal.querySelector('.tooltip-text').textContent;

    medal.addEventListener('mouseenter', e => {
        medalTooltip.textContent = text;

        const rect = medal.getBoundingClientRect();
        medalTooltip.style.left = `${rect.left + rect.width/2}px`;
        medalTooltip.style.top  = `${rect.bottom + 6}px`;

        medalTooltip.classList.add('visible');
    });

    medal.addEventListener('mouseleave', () => {
        medalTooltip.classList.remove('visible');
    });
});
