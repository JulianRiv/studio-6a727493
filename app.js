document.addEventListener('DOMContentLoaded', () => {
    const SAVE_KEY = 'shieldClickerSave.v2';
    const LEGACY_SAVE_KEY = 'shieldClickerSave.v1';
    const COST_GROWTH = 1.15;

    const SHIELD_SKINS = [
        {
            id: 'cap',
            name: 'Captain America',
            desc: 'The original. Red, white & blue.',
            cost: 0,
            emblem: 'star',
            shape: 'round',
            colors: { red: '#b1191d', white: '#f5f6f8', blue: '#1e3a8a', star: '#f5f6f8' },
        },
        {
            id: 'ironman',
            name: 'Iron Man',
            desc: 'Red and gold armor plating.',
            cost: 500,
            emblem: 'arc',
            shape: 'round',
            colors: { red: '#9e1b1b', white: '#d4af37', blue: '#e8c04a', star: '#3a2a05' },
        },
        {
            id: 'blackpanther',
            name: 'Black Panther',
            desc: 'Vibranium black & royal purple.',
            cost: 2500,
            emblem: 'claw',
            shape: 'round',
            colors: { red: '#101014', white: '#5b2a86', blue: '#6d3fa0', star: '#c7cdd6' },
        },
        {
            id: 'wintersoldier',
            name: 'Winter Soldier',
            desc: 'Gunmetal black with a crimson star.',
            cost: 10000,
            emblem: 'star',
            shape: 'round',
            colors: { red: '#17181b', white: '#3d4147', blue: '#24262a', star: '#b1191d' },
        },
        {
            id: 'kiteshield',
            name: "Cap's First Shield",
            desc: "A relic of the war years \u2014 the triangular kite shield Cap carried before the iconic disc.",
            cost: 25000,
            emblem: 'star',
            shape: 'kite',
            colors: { red: '#b1191d', white: '#f5f6f8', blue: '#1e3a8a', star: '#f5f6f8' },
        },
        {
            id: 'hulk',
            name: 'Hulk',
            desc: 'Gamma green & gray, purple core.',
            cost: 50000,
            emblem: 'fist',
            shape: 'round',
            colors: { red: '#2f8a3e', white: '#6b7076', blue: '#5b2a86', star: '#d8f0d8' },
        },
    ];

    // ---------- Themed center emblems ----------
    // Each skin's center emblem is generated procedurally (not baked into a
    // static path) so it scales cleanly across the header brand icon, the
    // shop swatches, and the big clickable shield -- all of which use
    // different center-circle radii. `cx`/`cy` are the emblem's center point
    // and `r` is the radius of the colored center disc it sits on.
    function starPath(cx, cy, outerR, innerR, spikes = 5, startAngle = -Math.PI / 2) {
        let d = '';
        const step = Math.PI / spikes;
        let angle = startAngle;
        for (let i = 0; i < spikes; i++) {
            const xOuter = cx + Math.cos(angle) * outerR;
            const yOuter = cy + Math.sin(angle) * outerR;
            d += (i === 0 ? 'M' : 'L') + xOuter.toFixed(2) + ' ' + yOuter.toFixed(2) + ' ';
            angle += step;
            const xInner = cx + Math.cos(angle) * innerR;
            const yInner = cy + Math.sin(angle) * innerR;
            d += 'L' + xInner.toFixed(2) + ' ' + yInner.toFixed(2) + ' ';
            angle += step;
        }
        return d + 'Z';
    }

    function triangleSpokes(cx, cy, rInner, rOuter, count, color, opacity) {
        let out = '';
        for (let i = 0; i < count; i++) {
            const angle = ((Math.PI * 2) / count) * i;
            const perp = angle + Math.PI / 2;
            const halfWidth = (rOuter - rInner) * 0.22;
            const x1 = cx + Math.cos(angle) * rInner + Math.cos(perp) * halfWidth;
            const y1 = cy + Math.sin(angle) * rInner + Math.sin(perp) * halfWidth;
            const x2 = cx + Math.cos(angle) * rInner - Math.cos(perp) * halfWidth;
            const y2 = cy + Math.sin(angle) * rInner - Math.sin(perp) * halfWidth;
            const x3 = cx + Math.cos(angle) * rOuter;
            const y3 = cy + Math.sin(angle) * rOuter;
            out += `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} L${x2.toFixed(2)} ${y2.toFixed(2)} L${x3.toFixed(2)} ${y3.toFixed(2)} Z" fill="${color}" opacity="${opacity}"/>`;
        }
        return out;
    }

    function clawMarks(cx, cy, r, color) {
        const d = { x: 0.6547, y: 0.7559 };
        const p = { x: -0.7559, y: 0.6547 };
        const offsets = [-0.34, 0, 0.34];
        const len = 0.62;
        let out = '';
        offsets.forEach((o, i) => {
            const sx = cx + p.x * o * r - d.x * len * r;
            const sy = cy + p.y * o * r - d.y * len * r;
            const ex = cx + p.x * o * r + d.x * len * r;
            const ey = cy + p.y * o * r + d.y * len * r;
            const strokeW = r * (0.15 - i * 0.015);
            out += `<line x1="${sx.toFixed(2)}" y1="${sy.toFixed(2)}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}" stroke="${color}" stroke-width="${strokeW.toFixed(2)}" stroke-linecap="round"/>`;
        });
        return out;
    }

    // Same clenched-fist geometry used for the Luke Cage generator icon
    // (see GENERATOR_ICONS.blacksmith), reused here instead of a separate
    // hand-built fist shape so the two stay visually identical. The source
    // paths are authored in a 24x24 icon box centered roughly on
    // (10.65, 12); we recenter+scale them to fit the emblemMarkup(skin, cx,
    // cy, r) sizing pattern shared by every shield emblem.
    function fistShape(cx, cy, r, color) {
        const iconCenterX = 10.65;
        const iconCenterY = 12;
        const scale = r * 0.12; // maps the icon's ~6-unit half-height to ~0.72r, in line with the other emblem builders
        const strokeWidth = (1.6 / scale).toFixed(3);
        return `
            <g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${scale.toFixed(4)}) translate(${-iconCenterX} ${-iconCenterY})">
                <path d="M8 10.5V7a1.4 1.4 0 0 1 2.8 0v3" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10.8 10V6a1.4 1.4 0 0 1 2.8 0v4" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13.6 10V7a1.4 1.4 0 0 1 2.8 0v5.5" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16.4 11v1.8A5.2 5.2 0 0 1 11.2 18h-.6a5.2 5.2 0 0 1-5.1-4.2l-.6-3.1a1.3 1.3 0 0 1 2.53-.6l.27.9" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
        `;
    }

    const EMBLEM_BUILDERS = {
        // Captain America: the classic 5-point star.
        star(cx, cy, r, colors) {
            const outerR = r * 0.8;
            const innerR = outerR * 0.52;
            return `<path d="${starPath(cx, cy, outerR, innerR)}" fill="${colors.star}"/>`;
        },
        // Iron Man: arc-reactor rings with a triangular glow.
        arc(cx, cy, r, colors) {
            let out = '';
            out += triangleSpokes(cx, cy, r * 0.4, r * 0.78, 6, '#ffffff', 0.5);
            out += `<circle cx="${cx}" cy="${cy}" r="${r * 0.8}" fill="none" stroke="${colors.star}" stroke-width="${r * 0.1}"/>`;
            out += `<circle cx="${cx}" cy="${cy}" r="${r * 0.52}" fill="none" stroke="#ffffff" stroke-width="${r * 0.07}" opacity="0.9"/>`;
            out += `<circle cx="${cx}" cy="${cy}" r="${r * 0.28}" fill="${colors.star}"/>`;
            out += `<circle cx="${cx}" cy="${cy}" r="${r * 0.12}" fill="#ffffff"/>`;
            return out;
        },
        // Black Panther: sleek silver claw-mark slashes.
        claw(cx, cy, r, colors) {
            return clawMarks(cx, cy, r, colors.star);
        },
        // Hulk: a clenched fist / smash silhouette.
        fist(cx, cy, r, colors) {
            return fistShape(cx, cy, r * 0.78, colors.star);
        },
    };

    function emblemMarkup(skin, cx, cy, r) {
        const builder = EMBLEM_BUILDERS[skin.emblem] || EMBLEM_BUILDERS.star;
        return builder(cx, cy, r, skin.colors);
    }

    // ---------- Kite shield shape (Cap's original comic-era shield) ----------
    // A heater/kite silhouette: a smooth rounded top edge tapering down to a
    // single point at the bottom. Fully parametric on a center point and a
    // "radius" R so it can be nested (like the round shield's rings) and
    // reused at any size -- the big clickable shield, the header brand icon,
    // and the shop swatch all just call this with different R values.
    function kiteShieldPath(cx, cy, r) {
        const topY = cy - r * 0.92;
        const shoulderY = cy - r * 0.5;
        const shoulderX = r * 0.82;
        const bottomY = cy + r * 1.0;
        const bulgeY = cy + r * 0.15;
        return (
            `M ${(cx - shoulderX).toFixed(2)} ${shoulderY.toFixed(2)} ` +
            `Q ${cx.toFixed(2)} ${topY.toFixed(2)} ${(cx + shoulderX).toFixed(2)} ${shoulderY.toFixed(2)} ` +
            `Q ${(cx + shoulderX * 1.05).toFixed(2)} ${bulgeY.toFixed(2)} ${cx.toFixed(2)} ${bottomY.toFixed(2)} ` +
            `Q ${(cx - shoulderX * 1.05).toFixed(2)} ${bulgeY.toFixed(2)} ${(cx - shoulderX).toFixed(2)} ${shoulderY.toFixed(2)} ` +
            `Z`
        );
    }

    // Renders a stack of nested kite silhouettes (outer-to-inner) as the
    // striped red/white/blue styling that stands in for the round shield's
    // concentric rings, keeping the same layered look but in the kite shape.
    function kiteLayersMarkup(cx, cy, layers) {
        return layers
            .map((layer) => {
                const stroke = layer.stroke ? ` stroke="${layer.stroke}" stroke-width="${layer.sw || 1.5}"` : '';
                return `<path d="${kiteShieldPath(cx, cy, layer.r)}" fill="${layer.fill}"${stroke}/>`;
            })
            .join('');
    }

    // Builds the kite-shaped base for the big clickable shield (200x200,
    // center 100,100), reusing the metallic rim gradient already defined in
    // that SVG's <defs>.
    function buildKiteMainBase(colors) {
        return kiteLayersMarkup(100, 100, [
            { r: 96, fill: 'url(#shieldMetal)', stroke: 'var(--shield-rim-lo)', sw: 3 },
            { r: 86, fill: colors.red, stroke: 'var(--shield-rim-lo)', sw: 1.5 },
            { r: 68, fill: colors.white },
            { r: 50, fill: colors.red },
        ]) + `<circle cx="100" cy="100" r="32" fill="${colors.blue}" stroke="${colors.white}" stroke-width="2"/>`;
    }

    // Builds the kite-shaped base for the small header brand icon (100x100,
    // center 50,50), using a flat rim color since that SVG has no gradient defs.
    function buildKiteHeaderBase(colors) {
        return kiteLayersMarkup(50, 50, [
            { r: 48, fill: 'var(--shield-rim-mid)', stroke: 'var(--shield-rim-lo)', sw: 2 },
            { r: 42, fill: colors.red },
            { r: 33, fill: colors.white },
            { r: 24, fill: colors.red },
        ]) + `<circle cx="50" cy="50" r="15" fill="${colors.blue}" stroke="${colors.white}" stroke-width="1"/>`;
    }

    // Builds a full mini shield SVG (used for the shop swatches) so the
    // preview matches the equipped/available skin's real emblem AND shape,
    // not just a flat color swatch.
    function buildSwatchSVG(skin) {
        const isKite = skin.shape === 'kite';
        const base = isKite
            ? kiteLayersMarkup(50, 50, [
                  { r: 48, fill: skin.colors.red },
                  { r: 33, fill: skin.colors.white },
                  { r: 24, fill: skin.colors.red },
              ]) + `<circle cx="50" cy="50" r="15" fill="${skin.colors.blue}"/>`
            : `
                <circle cx="50" cy="50" r="48" fill="${skin.colors.red}"/>
                <circle cx="50" cy="50" r="33" fill="${skin.colors.white}"/>
                <circle cx="50" cy="50" r="24" fill="${skin.colors.red}"/>
                <circle cx="50" cy="50" r="15" fill="${skin.colors.blue}"/>
            `;
        return `
            <svg viewBox="0 0 100 100" class="skin-swatch-svg" aria-hidden="true">
                ${base}
                ${emblemMarkup(skin, 50, 50, 15)}
            </svg>
        `;
    }

    const CLICK_UPGRADES = [
        { id: 'click1', name: 'Sharper Edge', desc: '+1 per click', baseCost: 15, power: 1 },
        { id: 'click2', name: 'Reinforced Rim', desc: '+2 per click', baseCost: 100, power: 2 },
        { id: 'click3', name: 'Radiant Star', desc: '+5 per click', baseCost: 600, power: 5 },
        { id: 'click4', name: 'Blessed Aegis', desc: '+15 per click', baseCost: 3500, power: 15 },
        { id: 'click5', name: 'Celestial Core', desc: '+40 per click', baseCost: 20000, power: 40 },
    ];

    const GENERATORS = [
        { id: 'squire', name: 'Spider-Man', desc: 'Web-slings across town, tossing shields your way', baseCost: 25, rate: 0.2 },
        { id: 'blacksmith', name: 'Luke Cage', desc: 'Unbreakable fists hammer out shields nonstop', baseCost: 150, rate: 1.5 },
        { id: 'watchtower', name: 'Avengers Tower', desc: 'Earth\'s Mightiest HQ, mass-producing shields', baseCost: 900, rate: 8 },
        { id: 'fortress', name: 'Asgard', desc: 'Golden realm whose forges never cool', baseCost: 6500, rate: 45 },
        { id: 'citadel', name: 'Celestial Throne', desc: 'A cosmic seat radiating shields across the stars', baseCost: 45000, rate: 260 },
    ];

    const GENERATOR_ICONS = {
        // Spider-Man: a spun web (radial spokes + connecting rings)
        squire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M2 12h20"/><path d="M4.5 4.5l15 15"/><path d="M19.5 4.5l-15 15"/><path d="M12 6.5l-4.2 5.5 4.2 5.5 4.2-5.5z"/><path d="M6.8 9.3h10.4"/><path d="M6.8 14.7h10.4"/></svg>',
        // Luke Cage: an unbreakable clenched fist
        blacksmith: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10.5V7a1.4 1.4 0 0 1 2.8 0v3"/><path d="M10.8 10V6a1.4 1.4 0 0 1 2.8 0v4"/><path d="M13.6 10V7a1.4 1.4 0 0 1 2.8 0v5.5"/><path d="M16.4 11v1.8A5.2 5.2 0 0 1 11.2 18h-.6a5.2 5.2 0 0 1-5.1-4.2l-.6-3.1a1.3 1.3 0 0 1 2.53-.6l.27.9"/></svg>',
        // Avengers Tower: a tall skyscraper with a spire
        watchtower: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 2.5v2.5"/><rect x="7.5" y="5" width="9" height="16" rx="0.6"/><path d="M9.5 8.5h5"/><path d="M9.5 11.5h5"/><path d="M9.5 14.5h5"/><path d="M9.5 17.5h5"/></svg>',
        // Asgard: Mjolnir, the enchanted hammer
        fortress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="3.2" width="11" height="5.6" rx="1"/><path d="M12 8.8v11.4"/><path d="M9.2 20.2h5.6"/></svg>',
        // Celestial Throne: a cosmic starburst crown
        citadel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v5.5"/><path d="M12 16.5V22"/><path d="M2 12h5.5"/><path d="M16.5 12H22"/><path d="M4.6 4.6l3.9 3.9"/><path d="M15.5 15.5l3.9 3.9"/><path d="M19.4 4.6l-3.9 3.9"/><path d="M8.5 15.5l-3.9 3.9"/><circle cx="12" cy="12" r="2.6"/></svg>',
    };

    let state = {
        points: 0,
        clickPower: 1,
        clickUpgrades: {},
        generators: {},
        ownedShields: {},
        equippedShield: 'cap',
    };

    CLICK_UPGRADES.forEach((u) => (state.clickUpgrades[u.id] = 0));
    GENERATORS.forEach((g) => (state.generators[g.id] = 0));
    SHIELD_SKINS.forEach((s) => (state.ownedShields[s.id] = s.cost === 0));

    function loadState() {
        try {
            let raw = localStorage.getItem(SAVE_KEY);
            if (!raw) raw = localStorage.getItem(LEGACY_SAVE_KEY);
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
            SHIELD_SKINS.forEach((s) => {
                const owned = saved.ownedShields && saved.ownedShields[s.id];
                state.ownedShields[s.id] = typeof owned === 'boolean' ? owned : s.cost === 0;
            });
            const equipped = saved.equippedShield;
            state.equippedShield =
                typeof equipped === 'string' && SHIELD_SKINS.some((s) => s.id === equipped) && state.ownedShields[equipped]
                    ? equipped
                    : 'cap';
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
    const brandTitleEl = document.getElementById('brandTitle');
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

    function applyShieldSkin() {
        const skin = SHIELD_SKINS.find((s) => s.id === state.equippedShield) || SHIELD_SKINS[0];
        const root = document.documentElement;
        root.style.setProperty('--shield-red', skin.colors.red);
        root.style.setProperty('--shield-white', skin.colors.white);
        root.style.setProperty('--shield-blue', skin.colors.blue);
        root.style.setProperty('--shield-star', skin.colors.star);

        // Swap the actual emblem shape (not just its color) in both the big
        // clickable shield and the small header brand icon.
        const mainEmblem = document.getElementById('shieldEmblemMain');
        if (mainEmblem) mainEmblem.innerHTML = emblemMarkup(skin, 100, 100, 32);
        const headerEmblem = document.getElementById('shieldEmblemHeader');
        if (headerEmblem) headerEmblem.innerHTML = emblemMarkup(skin, 50, 50, 15);

        // Swap the underlying silhouette (round rings vs. kite shape) for the
        // big shield and the header icon. Click handling, orbit-ring
        // positioning, and emblem pops all key off the button/icon's
        // bounding box and center point, which stay identical regardless of
        // which base is shown, so no other logic needs to change.
        const isKite = skin.shape === 'kite';

        const mainRoundBase = document.getElementById('shieldBaseRound');
        const mainKiteBase = document.getElementById('shieldBaseKite');
        const mainSheen = document.getElementById('shieldSheenOverlay');
        if (mainRoundBase) mainRoundBase.style.display = isKite ? 'none' : '';
        if (mainKiteBase) {
            mainKiteBase.style.display = isKite ? '' : 'none';
            if (isKite) mainKiteBase.innerHTML = buildKiteMainBase(skin.colors);
        }
        if (mainSheen) mainSheen.style.display = isKite ? 'none' : '';

        const headerRoundBase = document.getElementById('headerBaseRound');
        const headerKiteBase = document.getElementById('headerBaseKite');
        if (headerRoundBase) headerRoundBase.style.display = isKite ? 'none' : '';
        if (headerKiteBase) {
            headerKiteBase.style.display = isKite ? '' : 'none';
            if (isKite) headerKiteBase.innerHTML = buildKiteHeaderBase(skin.colors);
        }
    }

    const shieldSkinsEl = document.getElementById('shieldSkins');

    // Bind the buy/equip handler ONCE via event delegation on the container,
    // instead of re-attaching a listener to each button every render. This
    // way the click still works even if a re-render (e.g. from the 200ms
    // game tick) swaps out the underlying button DOM node mid-interaction.
    if (shieldSkinsEl) {
        shieldSkinsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.skin-action');
            if (!btn || btn.disabled) return;
            const skin = SHIELD_SKINS.find((sk) => sk.id === btn.dataset.skinId);
            if (skin) handleShieldSkinAction(skin);
        });
    }

    function renderShieldSkins() {
        if (!shieldSkinsEl) return;
        shieldSkinsEl.innerHTML = '';
        SHIELD_SKINS.forEach((s) => {
            const owned = !!state.ownedShields[s.id];
            const equipped = state.equippedShield === s.id;
            const card = document.createElement('div');
            card.className = 'upgrade-card skin-card';

            let actionLabel = '';
            let actionClass = 'skin-action';
            let disabled = false;
            if (equipped) {
                actionLabel = 'Equipped';
                actionClass += ' equipped';
                disabled = true;
            } else if (owned) {
                actionLabel = 'Equip';
                actionClass += ' equip';
            } else {
                actionLabel = `Buy (${formatNumber(s.cost)})`;
                // Compare against the numeric point total explicitly. state.points
                // can briefly be a numeric string right after a save/load round-trip
                // if this were ever serialized oddly, so coerce defensively --
                // string vs number comparison here previously caused correct
                // purchases to be blocked as "unaffordable".
                disabled = Number(state.points) < s.cost;
            }

            const swatch = document.createElement('div');
            swatch.className = 'skin-swatch' + (s.shape === 'kite' ? ' skin-swatch-kite' : '');
            swatch.innerHTML = buildSwatchSVG(s);

            const info = document.createElement('div');
            info.className = 'skin-info';
            info.innerHTML = `
                <div class="skin-name-row">
                    <span class="skin-name">${s.name}</span>
                </div>
                <span class="upgrade-desc">${s.desc}</span>
                <span class="skin-status">${owned ? (equipped ? 'Equipped' : 'Owned') : `${formatNumber(s.cost)} Shields`}</span>
            `;

            const btn = document.createElement('button');
            btn.className = actionClass;
            btn.textContent = actionLabel;
            btn.disabled = disabled;
            btn.dataset.skinId = s.id;

            card.appendChild(swatch);
            card.appendChild(info);
            card.appendChild(btn);
            shieldSkinsEl.appendChild(card);
        });
    }

    function handleShieldSkinAction(s) {
        const owned = !!state.ownedShields[s.id];
        if (owned) {
            if (state.equippedShield === s.id) return;
            state.equippedShield = s.id;
            applyShieldSkin();
            renderShieldSkins();
            saveState();
            return;
        }
        if (Number(state.points) < s.cost) return;
        state.points = Number(state.points) - s.cost;
        state.ownedShields[s.id] = true;
        state.equippedShield = s.id;
        applyShieldSkin();
        renderStats();
        renderShieldSkins();
        saveState();
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
                <span class="upgrade-desc">${g.desc} (+${formatNumber(g.rate, { precise: true })}/s each)</span>
                <span class="upgrade-cost">${formatNumber(cost)} Shields</span>
            `;
            btn.addEventListener('click', () => buyGenerator(g));
            generatorUpgradesEl.appendChild(btn);
        });

        renderActiveGenerators();
        renderShieldSkins();
    }

    function refreshAffordability() {
        const cards = document.querySelectorAll('#clickUpgrades .upgrade-card, #generatorUpgrades .upgrade-card');
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
        refreshShieldSkinAffordability();
    }

    // Lightweight update used on the frequent tick/click paths: only flips
    // the disabled state of existing "Buy" buttons based on current points,
    // without tearing down and recreating the DOM (which previously could
    // yank a button out from under an in-progress click on the Shields tab).
    // Full rebuilds (renderShieldSkins) are reserved for actual state changes
    // -- purchase, equip, tab switch, load/reset -- where the button set or
    // labels genuinely need to change.
    function refreshShieldSkinAffordability() {
        if (!shieldSkinsEl) return;
        shieldSkinsEl.querySelectorAll('.skin-action').forEach((btn) => {
            const skin = SHIELD_SKINS.find((sk) => sk.id === btn.dataset.skinId);
            if (!skin) return;
            const owned = !!state.ownedShields[skin.id];
            const equipped = state.equippedShield === skin.id;
            if (!owned && !equipped) {
                btn.disabled = Number(state.points) < skin.cost;
            }
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

    // ---------- Falling emblem "pop" click feedback ----------
    // On each shield click we spawn a tiny copy of the equipped shield's
    // emblem (reusing buildSwatchSVG, which itself uses EMBLEM_BUILDERS /
    // the same colors applyShieldSkin sets) that pops up from the click
    // point and then tumbles off screen with a gravity-like fall + fade.
    // Rapid clicking is throttled by capping the number of concurrently
    // alive pop nodes so the DOM never accumulates.
    const MAX_EMBLEM_POPS = 10;
    let activeEmblemPops = 0;

    function spawnEmblemPop(x, y) {
        if (activeEmblemPops >= MAX_EMBLEM_POPS) return; // throttle rapid clicks
        const skin = SHIELD_SKINS.find((s) => s.id === state.equippedShield) || SHIELD_SKINS[0];

        const pop = document.createElement('div');
        pop.className = 'emblem-pop';
        pop.style.left = x + 'px';
        pop.style.top = y + 'px';
        // Slight per-spawn randomness so a burst of clicks doesn't look
        // perfectly uniform: horizontal drift and tumble direction/amount.
        const drift = (Math.random() * 2 - 1) * 46; // px, final horizontal drift
        const rot = (Math.random() < 0.5 ? -1 : 1) * (220 + Math.random() * 200); // deg
        const riseRot = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 12);
        pop.style.setProperty('--pop-drift', drift.toFixed(1) + 'px');
        pop.style.setProperty('--pop-rot', rot.toFixed(0) + 'deg');
        pop.style.setProperty('--pop-rise-rot', riseRot.toFixed(0) + 'deg');
        pop.innerHTML = buildSwatchSVG(skin);

        clickWrap.appendChild(pop);
        activeEmblemPops++;

        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            activeEmblemPops--;
            pop.remove();
        };
        pop.addEventListener('animationend', cleanup);
        // Safety net in case animationend doesn't fire (e.g. node removed
        // from a hidden tab/backgrounded frame).
        setTimeout(cleanup, 1400);
    }

    // ---------- Passive-income emblem pops ----------
    // Same falling-emblem effect as clicks, but triggered by the passive
    // generator tick instead of a click. Since ticks fire every TICK_MS and
    // pointsPerSecond() can range from a fraction of a point to thousands,
    // we accumulate the fractional points produced and only pop once whole
    // "units" of income have piled up, capping how many pops any single
    // tick can spawn so a big generator army can't flood the screen. The
    // shared MAX_EMBLEM_POPS cap inside spawnEmblemPop still applies on top
    // of this.
    let passiveEmblemAccumulator = 0;
    const MAX_PASSIVE_POPS_PER_TICK = 3;

    // Picks a randomized point near the shield rim (roughly where the
    // orbiting generator icons travel) rather than a click position, since
    // passive generation has no click coordinate to anchor to.
    function spawnGeneratorEmblemPop() {
        if (!clickWrap) return;
        const rect = clickWrap.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const radius = orbitRadiusPx();
        const angle = Math.random() * Math.PI * 2;
        const jitter = radius * (0.85 + Math.random() * 0.3); // hug the rim, with a little spread
        const x = cx + Math.cos(angle) * jitter;
        const y = cy + Math.sin(angle) * jitter;
        spawnEmblemPop(x, y);
    }

    function spawnPassiveEmblemPops(pointsGained) {
        if (pointsGained <= 0) return;
        passiveEmblemAccumulator += pointsGained;
        const toSpawn = Math.min(MAX_PASSIVE_POPS_PER_TICK, Math.floor(passiveEmblemAccumulator));
        if (toSpawn <= 0) return;
        passiveEmblemAccumulator -= toSpawn;
        for (let i = 0; i < toSpawn; i++) {
            spawnGeneratorEmblemPop();
        }
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
        spawnEmblemPop(x, y);

        shieldBtn.classList.remove('pulse');
        // force reflow to restart animation
        void shieldBtn.offsetWidth;
        shieldBtn.classList.add('pulse');

        renderStats();
        refreshAffordability();
        saveState();
    }

    shieldBtn.addEventListener('click', handleShieldClick);

    // ---------- Hidden easter-egg cheat: click the title 5x fast ----------
    // Clicking the brand title/logo 5 times within a short window grants a
    // one-time large point bonus. The streak resets if too much time passes
    // between clicks, and once it has fired it cannot fire again until the
    // click count fully resets back to zero (i.e. the player has to stop
    // clicking and start a brand-new streak of 5).
    const CHEAT_CLICK_TARGET = 5;
    const CHEAT_CLICK_WINDOW_MS = 2000;
    const CHEAT_BONUS_POINTS = 1000000;
    let cheatClickCount = 0;
    let cheatLastClickTime = 0;
    let cheatArmed = true; // false while a streak that already triggered hasn't reset yet

    function spawnToast(message) {
        let toast = document.createElement('div');
        toast.className = 'app-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        // Force reflow so the appear transition runs, then trigger it.
        void toast.offsetWidth;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 2600);
    }

    function handleBrandTitleClick() {
        const now = Date.now();
        if (now - cheatLastClickTime > CHEAT_CLICK_WINDOW_MS) {
            // Too much time passed since the last click: restart the streak
            // and re-arm the cheat so it can trigger again on this new streak.
            cheatClickCount = 0;
            cheatArmed = true;
        }
        cheatLastClickTime = now;
        cheatClickCount += 1;

        if (cheatClickCount >= CHEAT_CLICK_TARGET) {
            if (cheatArmed) {
                state.points = Number(state.points) + CHEAT_BONUS_POINTS;
                cheatArmed = false; // can't retrigger until the streak resets
                renderStats();
                refreshAffordability();
                saveState();
                spawnToast(`\u2728 Secret bonus unlocked! +${formatNumber(CHEAT_BONUS_POINTS)} Shields`);
            }
            // Keep counting clicks, but don't let the counter grow forever.
            cheatClickCount = CHEAT_CLICK_TARGET;
        }
    }

    if (brandTitleEl) {
        brandTitleEl.style.cursor = 'pointer';
        brandTitleEl.addEventListener('click', handleBrandTitleClick);
    }

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
        localStorage.removeItem(LEGACY_SAVE_KEY);
        state = {
            points: 0,
            clickPower: 1,
            clickUpgrades: {},
            generators: {},
            ownedShields: {},
            equippedShield: 'cap',
        };
        CLICK_UPGRADES.forEach((u) => (state.clickUpgrades[u.id] = 0));
        GENERATORS.forEach((g) => (state.generators[g.id] = 0));
        SHIELD_SKINS.forEach((s) => (state.ownedShields[s.id] = s.cost === 0));
        applyShieldSkin();
        renderStats();
        renderShop();
    });

    // Game loop: tick every 200ms for smooth passive income
    const TICK_MS = 200;
    setInterval(() => {
        const gain = pointsPerSecond() * (TICK_MS / 1000);
        if (gain > 0) {
            state.points += gain;
            spawnPassiveEmblemPops(gain);
            renderStats();
            refreshAffordability();
        }
    }, TICK_MS);

    // Autosave every 5s
    setInterval(saveState, 5000);
    window.addEventListener('beforeunload', saveState);

    loadState();
    applyShieldSkin();
    renderStats();
    renderShop();
});
