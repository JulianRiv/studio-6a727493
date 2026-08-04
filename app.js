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
        { id: 'squire', name: 'Squire', desc: 'A loyal squire polishes shields for you', baseCost: 25, rate: 0.2 },
        { id: 'blacksmith', name: 'Blacksmith', desc: 'Forges shields automatically', baseCost: 150, rate: 1.5 },
        { id: 'watchtower', name: 'Watchtower', desc: 'Spots shields from afar', baseCost: 900, rate: 8 },
        { id: 'fortress', name: 'Fortress', desc: 'A whole garrison producing shields', baseCost: 6500, rate: 45 },
        { id: 'citadel', name: 'Citadel', desc: 'A legendary stronghold of production', baseCost: 45000, rate: 260 },
    ];

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

    function formatNumber(n) {
        if (n < 1000) return Math.floor(n).toString();
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

    function currentClickPower() {
        const bonus = CLICK_UPGRADES.reduce(
            (sum, u) => sum + u.power * state.clickUpgrades[u.id],
            0
        );
        return state.clickPower + bonus;
    }

    function renderStats() {
        pointsValueEl.textContent = formatNumber(state.points);
        ppsValueEl.textContent = formatNumber(pointsPerSecond());
        clickPowerValueEl.textContent = formatNumber(currentClickPower());
    }

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
                <span class="upgrade-desc">${g.desc} (+${formatNumber(g.rate)}/s each)</span>
                <span class="upgrade-cost">${formatNumber(cost)} Shields</span>
            `;
            btn.addEventListener('click', () => buyGenerator(g));
            generatorUpgradesEl.appendChild(btn);
        });
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
