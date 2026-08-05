document.addEventListener('DOMContentLoaded', () => {
    const SAVE_KEY = 'shieldClickerSave.v1';
    const COST_GROWTH = 1.15;

    const CLICK_UPGRADES = [
        { id: 'click1', name: 'Sharper Edge', desc: '+1 per click', baseCost: 15, power: 1 },
        { id: 'click2', name: 'Reinforced Rim', desc: '+2 per click', baseCost: 100, power: 2 },
        { id: 'click3', name: 'Radiant Star', desc: '+5 per click', baseCost: 600, power: 5 },
        { id: 'click4', name: 'Blessed Aegis', desc: '+15 per click', baseCost: 3500, power: 15 },
        { id: 'click5', name: 'Celestial Core', desc: '+40 per click', baseCost: 20000, power: 40 },
    ];

    const GENERATORS = [
        { id: 'squire', name: 'Spider-Man', desc: 'A loyal squire polishes shields for you', baseCost: 25, rate: 0.2 },
        { id: 'blacksmith', name: 'Luke Cage', desc: 'Forges shields automatically', baseCost: 150, rate: 1.5 },
        { id: 'watchtower', name: 'Avengers Tower', desc: 'Spots shields from afar', baseCost: 900, rate: 8 },
        { id: 'fortress', name: 'Asgard', desc: 'A whole garrison producing shields', baseCost: 6500, rate: 45 },
        { id: 'citadel', name: 'Celestial Throne', desc: 'A legendary stronghold of production', baseCost: 45000, rate: 260 },
    ];

    const GENERATOR_ICONS = {
        squire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6.5" r="2.3"/><path d="M12 8.8v6"/><path d="M12 10.5 L5 8"/><path d="M12 10.5 L19 8"/><path d="M12 10.5 L6 20"/><path d="M12 10.5 L18 20"/><path d="M12 14.8 L7 13.2"/><path d="M12 14.8 L17 13.2"/></svg>',
        blacksmith: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3c2 1.5 2 3.5 0 5"/><path d="M8 6l10 10"/><path d="M15 13l6 6"/><path d="M17 15l3-3"/><path d="M4 16l4-4 3 3-4 4-3-1z"/></svg>',
        watchtower: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21V9l3-5 3 5v12"/><path d="M7 21h10"/><path d="M9.5 13h5"/><path d="M8.5 17h7"/></svg>',
        fortress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L14 6 L12 8 L10 6 Z"/><path d="M12 8v6"/><path d="M7 21l5-7 5 7"/><path d="M5 21h14"/></svg>',
        citadel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L14 8 L20 9 L15.5 13 L17 19 L12 15.5 L7 19 L8.5 13 L4 9 L10 8 Z"/></svg>',
    };

    let state = {
        points: 0,
        clickPower: 1,
        clickUpgrades: {},
        generators: {},
    };

    CLICK_UPGRADES.forEach((u) => (state.clickUpgrades[u.id] = 0));
    GENERATORS.forEach((g) => (state.generators[g.id] = 0));

    function loadState() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            state.points = typeof saved.points === 'number' ? saved.points : 0;
            state.clickPower = typeof saved.clickPower === 'number' ? saved.clickPower : 1;
            CLICK_UPGRADES.forEach((u) => {
                state.clickUpgrades[u.id] = (saved.clickUpgrades && saved.clickUpgrades[u.id]) || 0;
            });
            GENERATORS.forEach((g) => {
                state.generators[g.id] = (saved.generators && saved.generators[g.id]) || 0;
            });
        } catch (e) {
            console.warn('Failed to load save', e);
        }
    }

    function saveState() {
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    }

    function costFor(baseCost, owned) {
        return Math.ceil(baseCost * Math.pow(COST_GROWTH, owned));
    }

    function pointsPerSecond() {
        return GENERATORS.reduce((sum, g) => sum + g.rate * state.generators[g.id], 0);
    }

    function formatNumber(n, { precise = false } = {}) {
        if (n < 1000) {
            if (!precise || Number.isInteger(n)) return Math.floor(n).toString();
            // Preserve fractional precision (e.g. sub-1/s generator rates) instead
            // of flooring them away to a misleading "0".
            return n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n).toString();
        }
        const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
        let unitIndex = -1;
        let value = n;
        while (value >= 1000 && unitIndex < units.length - 1) {
            value /= 1000;
            unitIndex++;
        }
        return value.toFixed(value < 10 ? 2 : value < 100 ? 1 : 0) + units[unitIndex];
    }

    const pointsValueEl = document.getElementById('pointsValue');
    const ppsValueEl = document.getElementById('pointsPerSecond');
    const clickPowerValueEl = document.getElementById('clickPowerValue');
    const shieldBtn = document.getElementById('shieldBtn');
    const clickWrap = document.getElementById('clickWrap');
    const resetBtn = document.getElementById('resetBtn');
    const clickUpgradesEl = document.getElementById('clickUpgrades');
    const generatorUpgradesEl = document.getElementById('generatorUpgrades');
    const activeGeneratorsEl = document.getElementById('activeGenerators');

    function currentClickPower() {
        const bonus = CLICK_UPGRADES.reduce(
            (sum, u) => sum + u.power * state.clickUpgrades[u.id],
            0
        );
        return state.clickPower + bonus;
    }

    function renderStats() {
        pointsValueEl.textContent = formatNumber(state.points);
        ppsValueEl.textContent = formatNumber(pointsPerSecond(), { precise: true });
        clickPowerValueEl.textContent = formatNumber(currentClickPower());
    }

    function orbitRadiusPx() {
        // Keep the icons hugging the rim of the shield button rather than the
        // full click-wrap bounding box (which has extra breathing room).
        if (!shieldBtn) return 150;
        const rect = shieldBtn.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height) || 300;
        return size * 0.47;
    }

    // Maximum number of icons ever rendered on the ring at once. Beyond this,
    // owned counts are represented proportionally by type instead of 1:1.
    const MAX_ORBIT_ICONS = 40;

    // Work out, per owned generator type, how many icons should actually be
    // drawn on the ring. When the true total is within the cap we show one
    // icon per owned unit (exact). Once it exceeds the cap we fall back to a
    // proportional (largest-remainder) allocation that still sums to the cap,
    // so the ring stays readable and performant at high owned counts.
    function computeIconAllocation() {
        const owned = GENERATORS.filter((g) => state.generators[g.id] > 0).map((g) => ({
            id: g.id,
            owned: state.generators[g.id],
        }));
        const totalOwned = owned.reduce((sum, g) => sum + g.owned, 0);

        if (totalOwned === 0) return [];
        if (totalOwned <= MAX_ORBIT_ICONS) {
            return owned.map((g) => ({ id: g.id, count: g.owned, capped: false }));
        }

        const raw = owned.map((g) => (g.owned / totalOwned) * MAX_ORBIT_ICONS);
        const counts = raw.map((r) => Math.max(1, Math.floor(r)));
        const remainders = raw.map((r) => r - Math.floor(r));
        let allocated = counts.reduce((a, b) => a + b, 0);

        // Distribute (or claw back) the remaining slots using the largest
        // remainder first so the split stays as proportional as possible.
        const orderDesc = owned.map((_, i) => i).sort((a, b) => remainders[b] - remainders[a]);

        let diff = MAX_ORBIT_ICONS - allocated;
        let guard = 0;
        while (diff > 0 && guard < 10000) {
            counts[orderDesc[guard % orderDesc.length]]++;
            diff--;
            guard++;
        }
        guard = 0;
        while (diff < 0 && guard < 10000) {
            const i = orderDesc[orderDesc.length - 1 - (guard % orderDesc.length)];
            if (counts[i] > 1) {
                counts[i]--;
                diff++;
            }
            guard++;
            if (guard > orderDesc.length * 2 && diff < 0) break; // can't reduce further
        }

        return owned.map((g, i) => ({ id: g.id, count: counts[i], capped: true }));
    }

    function renderActiveGenerators() {
        if (!activeGeneratorsEl) return;

        const radius = orbitRadiusPx();
        activeGeneratorsEl.style.setProperty('--orbit-radius', radius + 'px');

        const allocation = computeIconAllocation();
        const anyCapped = allocation.some((a) => a.capped);

        // Build the flat, keyed list of individual icons to render. Keys are
        // stable per (generator, index-within-type) so that when a count
        // shrinks/grows only the affected icons are added/removed, and
        // existing icons keep their DOM node (and running animation) intact.
        const target = [];
        allocation.forEach((a) => {
            for (let i = 0; i < a.count; i++) {
                target.push({ key: `${a.id}:${i}`, genId: a.id, indexInType: i });
            }
        });
        const total = target.length;

        const existingEls = new Map(
            Array.from(activeGeneratorsEl.children).map((el) => [el.dataset.key, el])
        );
        const targetKeys = new Set(target.map((t) => t.key));

        // Remove icons that no longer exist.
        existingEls.forEach((el, key) => {
            if (!targetKeys.has(key)) el.remove();
        });

        target.forEach((t, overallIndex) => {
            const g = GENERATORS.find((gen) => gen.id === t.genId);
            if (!g) return;
            const owned = state.generators[t.genId];
            const typeIndex = GENERATORS.findIndex((gen) => gen.id === t.genId);
            const offset = total > 0 ? (360 / total) * overallIndex : 0;
            const duration = 14 + typeIndex * 3.5 + (t.indexInType % 4) * 1.1;
            const direction = (typeIndex + t.indexInType) % 2 === 0 ? 'normal' : 'reverse';
            const title = anyCapped
                ? `${g.name}: ${owned} owned (icons shown proportionally)`
                : `${g.name}: ${owned} owned`;

            let orbit = existingEls.get(t.key);
            if (!orbit) {
                orbit = document.createElement('div');
                orbit.className = 'gen-orbit';
                orbit.dataset.key = t.key;
                orbit.dataset.genId = t.genId;

                const inner = document.createElement('div');
                inner.className = 'gen-orbit-inner';

                const icon = document.createElement('div');
                icon.className = 'gen-orbit-icon';
                icon.innerHTML = GENERATOR_ICONS[t.genId] || '';

                inner.appendChild(icon);
                orbit.appendChild(inner);
                activeGeneratorsEl.appendChild(orbit);
            }

            // Update positioning/animation properties in place. Changing a
            // custom property referenced by a running CSS animation reflows
            // its current position but does not restart the animation timer,
            // so existing icons keep animating smoothly.
            orbit.style.setProperty('--orbit-offset', offset + 'deg');
            orbit.style.setProperty('--orbit-duration', duration + 's');
            orbit.style.animationDirection = direction;

            const iconEl = orbit.querySelector('.gen-orbit-icon');
            if (iconEl) {
                iconEl.title = title;
                iconEl.style.setProperty('--orbit-offset', offset + 'deg');
                iconEl.style.setProperty('--orbit-duration', duration + 's');
                iconEl.style.animationDirection = direction;
            }
        });
    }

    window.addEventListener('resize', () => {
        const radius = orbitRadiusPx();
        if (activeGeneratorsEl) activeGeneratorsEl.style.setProperty('--orbit-radius', radius + 'px');
    });

    function renderShop() {
        clickUpgradesEl.innerHTML = '';
        CLICK_UPGRADES.forEach((u) => {
            const owned = state.clickUpgrades[u.id];
            const cost = costFor(u.baseCost, owned);
            const btn = document.createElement('button');
            btn.className = 'upgrade-card';
            btn.disabled = state.points < cost;
            btn.innerHTML = `
                <div class="upgrade-top">
                    <span class="upgrade-name">${u.name}</span>
                    <span class="upgrade-owned">${owned}</span>
                </div>
                <span class="upgrade-desc">${u.desc}</span>
                <span class="upgrade-cost">${formatNumber(cost)} Shields</span>
            `;
            btn.addEventListener('click', () => buyClickUpgrade(u));
            clickUpgradesEl.appendChild(btn);
        });

        generatorUpgradesEl.innerHTML = '';
        GENERATORS.forEach((g) => {
            const owned = state.generators[g.id];
            const cost = costFor(g.baseCost, owned);
            const btn = document.createElement('button');
            btn.className = 'upgrade-card';
            btn.disabled = state.points < cost;
            btn.innerHTML = `
                <div class="upgrade-top">
                    <span class="upgrade-name">${g.name}</span>
                    <span class="upgrade-owned">${owned}</span>
                </div>
                <span class="upgrade-desc">${g.desc} (+${formatNumber(g.rate, { precise: true })}/s each)</span>
                <span class="upgrade-cost">${formatNumber(cost)} Shields</span>
            `;
            btn.addEventListener('click', () => buyGenerator(g));
            generatorUpgradesEl.appendChild(btn);
        });

        renderActiveGenerators();
    }

    function refreshAffordability() {
        const cards = document.querySelectorAll('.upgrade-card');
        let i = 0;
        CLICK_UPGRADES.forEach((u) => {
            const cost = costFor(u.baseCost, state.clickUpgrades[u.id]);
            if (cards[i]) cards[i].disabled = state.points < cost;
            i++;
        });
        GENERATORS.forEach((g) => {
            const cost = costFor(g.baseCost, state.generators[g.id]);
            if (cards[i]) cards[i].disabled = state.points < cost;
            i++;
        });
    }

    function buyClickUpgrade(u) {
        const owned = state.clickUpgrades[u.id];
        const cost = costFor(u.baseCost, owned);
        if (state.points < cost) return;
        state.points -= cost;
        state.clickUpgrades[u.id] += 1;
        renderStats();
        renderShop();
        saveState();
    }

    function buyGenerator(g) {
        const owned = state.generators[g.id];
        const cost = costFor(g.baseCost, owned);
        if (state.points < cost) return;
        state.points -= cost;
        state.generators[g.id] += 1;
        renderStats();
        renderShop();
        saveState();
    }

    function spawnFloater(x, y, amount) {
        const floater = document.createElement('span');
        floater.className = 'floater';
        floater.textContent = '+' + formatNumber(amount);
        floater.style.left = x + 'px';
        floater.style.top = y + 'px';
        clickWrap.appendChild(floater);
        setTimeout(() => floater.remove(), 900);
    }

    function handleShieldClick(e) {
        const gain = currentClickPower();
        state.points += gain;

        const rect = clickWrap.getBoundingClientRect();
        let x, y;
        if (e.touches && e.touches[0]) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else if (typeof e.clientX === 'number' && e.clientX !== 0) {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        } else {
            x = rect.width / 2;
            y = rect.height / 2;
        }
        spawnFloater(x, y, gain);

        shieldBtn.classList.remove('pulse');
        // force reflow to restart animation
        void shieldBtn.offsetWidth;
        shieldBtn.classList.add('pulse');

        renderStats();
        refreshAffordability();
        saveState();
    }

    shieldBtn.addEventListener('click', handleShieldClick);

    // Shop tabs
    const shopTabs = document.getElementById('shopTabs');
    if (shopTabs) {
        shopTabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.shop-tab');
            if (!btn) return;
            const target = btn.dataset.tab;
            shopTabs.querySelectorAll('.shop-tab').forEach((t) => {
                const active = t.dataset.tab === target;
                t.classList.toggle('active', active);
                t.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            document.querySelectorAll('.shop-section').forEach((panel) => {
                panel.hidden = panel.dataset.panel !== target;
            });
        });
    }

    resetBtn.addEventListener('click', () => {
        const confirmed = window.confirm('Reset all progress? This cannot be undone.');
        if (!confirmed) return;
        localStorage.removeItem(SAVE_KEY);
        state = { points: 0, clickPower: 1, clickUpgrades: {}, generators: {} };
        CLICK_UPGRADES.forEach((u) => (state.clickUpgrades[u.id] = 0));
        GENERATORS.forEach((g) => (state.generators[g.id] = 0));
        renderStats();
        renderShop();
    });

    // Game loop: tick every 200ms for smooth passive income
    const TICK_MS = 200;
    setInterval(() => {
        const gain = pointsPerSecond() * (TICK_MS / 1000);
        if (gain > 0) {
            state.points += gain;
            renderStats();
            refreshAffordability();
        }
    }, TICK_MS);

    // Autosave every 5s
    setInterval(saveState, 5000);
    window.addEventListener('beforeunload', saveState);

    loadState();
    renderStats();
    renderShop();
});
