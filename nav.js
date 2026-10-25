document.addEventListener("DOMContentLoaded", () => {
    const navPlaceholder = document.getElementById("nav-placeholder");
    if (!navPlaceholder) return;

    // 1. Inject Navigation HTML
    navPlaceholder.innerHTML = `
        <div class="hamburger-menu-container">
            <button type="button" class="hamburger-menu-btn" id="menuBtn">&#9776;</button>

            <div class="hamburger-menu-dropdown" id="menuDropdown">
                <label class="hamburger-menu-item">
                    <span>Load</span>
                    <input type="file" id="importInput" accept="application/json" hidden>
                </label>

                <button id="exportBtn" type="button" class="hamburger-menu-item">
                    <span>Save</span>
                </button>

                <div class="hamburger-menu-divider"></div>

                <div class="hamburger-menu-toggle">
                    <span class="toggle-label">Dark Mode</span>
                    <div class="switch-wrapper">
                        <input type="checkbox" id="menuToggleInput">
                        <label for="menuToggleInput" class="slider round"></label>
                    </div>
                </div>

                <div class="hamburger-menu-divider"></div>

                <div class="hamburger-menu-toggle">
                    <span class="toggle-label">Lock Map Clicks</span>
                    <div class="switch-wrapper">
                        <input type="checkbox" id="lockMapToggleInput">
                        <label for="lockMapToggleInput" class="slider round"></label>
                    </div>
                </div>

                <div class="hamburger-menu-divider"></div>

                <a href="readme.html" target="_self" rel="noopener" class="hamburger-menu-item">
                    <span>Read Me</span>
                </a>
            </div>
        </div>
    `;

    window.dispatchEvent(new Event('navLoaded'));

    // 2. Dropdown Menu Open/Close Logic
    const menuBtn = document.getElementById('menuBtn');
    const menuDropdown = document.getElementById('menuDropdown');

    if (menuBtn && menuDropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!menuDropdown.contains(e.target) && e.target !== menuBtn) {
                menuDropdown.classList.remove('show');
            }
        });
    }

    // 3. Dark Mode Toggle Logic
    const themeToggle = document.getElementById('menuToggleInput');
    if (themeToggle) {
        // Prevent click events from bubbling up and closing the menu
        themeToggle.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        // Set initial state from localStorage or system preferences
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            themeToggle.checked = true;
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        // Handle switch toggling
        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // 4. Lock Map Clicks Toggle Logic
    const lockMapToggle = document.getElementById('lockMapToggleInput');
    if (lockMapToggle) {
        lockMapToggle.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        // Function to sync the checkbox with localStorage
        const syncToggleState = () => {
            const savedLockState = localStorage.getItem('lockMapClicks');
            lockMapToggle.checked = savedLockState === null ? true : savedLockState === 'true';
        };

        // Initial set
        if (localStorage.getItem('lockMapClicks') === null) {
            localStorage.setItem('lockMapClicks', 'true');
        }
        syncToggleState();

        // Handle switch toggling
        lockMapToggle.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            localStorage.setItem('lockMapClicks', isChecked);
            window.dispatchEvent(new CustomEvent('lockMapChanged', { detail: isChecked }));
        });

        // Listen for external updates (like when a JSON file is loaded)
        window.addEventListener('lockMapStateChanged', syncToggleState);
    }
});


/* ==========================================================================
     Delegated Click Listener (Handles Export & File Input Trigger)
   ========================================================================== */
document.addEventListener('click', (e) => {
    // Export Button
    const exportBtn = e.target.closest('#exportBtn');
    if (exportBtn) {
        e.preventDefault();
        const data = getProgressData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'zeepkist-progress.json';
        a.click();
        return;
    }

    // Import Button Trigger
    const importBtn = e.target.closest('#importBtn') || e.target.closest('[for="importInput"]');
    if (importBtn && importBtn.tagName !== 'LABEL') {
        e.preventDefault();
        document.getElementById('importInput')?.click();
    }
});

/* ==========================================================================
     Delegated Change Listener (Handles File Selection via #importInput)
   ========================================================================== */ 
document.addEventListener('change', (e) => {
    if (!e.target || e.target.id !== 'importInput') return;

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const data = JSON.parse(reader.result);

        // Handle legacy flat format
        if (!data.medals && !data.collectibles) {
            Object.entries(data).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });
            location.reload();
            return;
        }

        // 1. Restore Steam ID
        if (data.user_steam_id) {
            localStorage.setItem('user_steam_id', data.user_steam_id);
        } else {
            localStorage.removeItem('user_steam_id');
        }

        // 2. Clear existing medal/collectible progress keys safely
        const protectedKeys = [
            'user_steam_id',
            'theme',
            'zeepsaveTimes',
            'unlockedCosmetics',
            'unlockedDLC',
            'unlockedAchievements',
            'lockMapClicks',
            'zeepkist_full_backup'
        ];

        Object.keys(localStorage).forEach(key => {
            if (protectedKeys.includes(key)) return; // Don't wipe protected keys!

            if (key.startsWith('collectibles:') || !isNaN(parseInt(localStorage.getItem(key), 10))) {
                localStorage.removeItem(key);
            }
        });

        // 3. Restore medals
        if (data.medals) {
            Object.entries(data.medals).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });
        }

        // 4. Restore collectibles
        if (data.collectibles) {
            Object.entries(data.collectibles).forEach(([key, value]) => {
                localStorage.setItem(key, JSON.stringify(value));
            });
        }

        // 5. Restore zeepsave best times
        if (data.zeepsaveTimes) {
            localStorage.setItem('zeepsaveTimes', JSON.stringify(data.zeepsaveTimes));
            if (typeof ZEEPSAVE_TIMES !== 'undefined') {
                ZEEPSAVE_TIMES = data.zeepsaveTimes;
            }
        }

        // 6. Restore arrays
        if (data.unlockedCosmetics) {
            localStorage.setItem('unlockedCosmetics', JSON.stringify(data.unlockedCosmetics));
        }
        if (data.unlockedDLC) {
            localStorage.setItem('unlockedDLC', JSON.stringify(data.unlockedDLC));
        }
        if (data.unlockedAchievements) {
            localStorage.setItem('unlockedAchievements', JSON.stringify(data.unlockedAchievements));
        }
        if (data.lockMapClicks !== undefined) {
            localStorage.setItem('lockMapClicks', data.lockMapClicks);
        }

        location.reload();
    };
    reader.readAsText(file);
});