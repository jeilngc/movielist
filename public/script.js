// script.js
// App logic for "May & Jay". Expects seedItems and defaultCategoryOrder
// to already be defined (see data.js, loaded before this file).

const PLACEHOLDER_POSTER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="#262030"/><text x="50%" y="50%" fill="#a89d9a" font-family="sans-serif" font-size="18" text-anchor="middle" dominant-baseline="middle">No image</text></svg>');
const PLACEHOLDER_BANNER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="100%" height="100%" fill="#1c1922"/><text x="50%" y="50%" fill="#a89d9a" font-family="sans-serif" font-size="22" text-anchor="middle" dominant-baseline="middle">No image</text></svg>');
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

let categoryOrder = defaultCategoryOrder.slice();
let items = [];
let currentFilter = 'all';
let currentModalItem = null;
let mobileMenuOpen = false;
let surpriseTimer = null;
let heroCycleTimer = null;
let doubleFiveIndex = 0;
let currentHeroItemId = null;
let lastFocusedElement = null;
let currentRatingPerson = localStorage.getItem('mj_person') || 'may';

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function(ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
}

function getAverageRating(item) {
    const allRatings = [];
    if (item.watched) {
        if (item.watched.may) allRatings.push(item.watched.may.rating);
        if (item.watched.jay) allRatings.push(item.watched.jay.rating);
    }
    if (allRatings.length > 0) {
        const avg = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
        return Math.round(avg * 2) / 2;
    }
    return 0;
}

function ratingToStars(rating) {
    const full = Math.floor(rating);
    const half = (rating % 1 >= 0.5) ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + (empty > 0 ? '☆'.repeat(empty) : '');
}

function formatPlannedDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d - today) / 86400000);
    const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (diffDays === 0) return 'Today \u00b7 ' + dateStr;
    if (diffDays === 1) return 'Tomorrow \u00b7 ' + dateStr;
    if (diffDays > 1 && diffDays <= 7) return 'In ' + diffDays + ' days \u00b7 ' + dateStr;
    if (diffDays < 0) return dateStr + ' (past)';
    return dateStr;
}

function getDoubleFiveItems() {
    return items.filter(i =>
        i.watched &&
        i.watched.may &&
        i.watched.jay &&
        i.watched.may.rating === 5 &&
        i.watched.jay.rating === 5
    );
}

// Returns 'ok', 'redirect' (already sent to /login.html), or 'error'.
// IMPORTANT: we only ever seed placeholder data when the server explicitly
// tells us the library is empty (200 OK with a null body). A network error
// or non-2xx status is NOT proof the library is empty — it's proof we
// couldn't reach it — so those cases must NOT trigger a reseed, or a
// transient outage could silently overwrite the real shared library.
async function loadItems() {
    let res;
    try {
        res = await fetch('/api/items');
    } catch (e) {
        console.warn('Could not reach /api/items.', e);
        return 'error';
    }

    if (res.status === 401) {
        // replace(), not href — don't leave the (now-invalid) app page in
        // history, or the back button would bounce right back into it.
        window.location.replace('/login.html');
        return 'redirect';
    }

    if (!res.ok) {
        console.error('Failed to load items, status:', res.status);
        return 'error';
    }

    let data;
    try {
        data = await res.json();
    } catch (e) {
        console.error('Malformed /api/items response.', e);
        return 'error';
    }

    if (data) {
        items = data;
        return 'ok';
    }

    // Server confirmed: nothing saved yet. Safe to seed once.
    items = seedItems.map(i => Object.assign({}, i));
    await persistItems();
    return 'ok';
}

function showLoadError() {
    document.getElementById('heroTitle').textContent = 'Something went wrong';
    document.getElementById('heroDescription').textContent = '';
    document.getElementById('heroEyebrow').textContent = '';
    document.getElementById('heroStars').textContent = '';
    document.getElementById('heroYear').textContent = '';
    document.getElementById('heroDuration').textContent = '';
    document.getElementById('mainContent').innerHTML =
        '<div class="empty-state">' +
        '<h2>Couldn\'t load your library</h2>' +
        '<p>We hit a problem reaching the server. Your saved titles are safe — this only means we couldn\'t fetch them just now.</p>' +
        '<button class="btn btn-primary" onclick="location.reload()">Try again</button>' +
        '</div>';
}

async function persistItems() {
    try {
        await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
    } catch (e) {
        console.error('Could not save library changes.', e);
    }
}

function ensureAllCategories() {
    items.forEach(i => { if (!categoryOrder.includes(i.category)) categoryOrder.push(i.category); });
}

function pickHeroItem() {
    const upcoming = items.filter(i => !i.watched && i.plannedDate)
        .sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate));
    if (upcoming.length) return { item: upcoming[0], reason: 'scheduled' };
    const watchedItems = items.filter(i => i.watched);
    if (watchedItems.length) {
        const best = watchedItems.slice().sort((a, b) => getAverageRating(b) - getAverageRating(a))[0];
        return { item: best, reason: 'favorite' };
    }
    if (items.length) return { item: items[0], reason: 'default' };
    return { item: null, reason: 'none' };
}

function refreshHero(forcedItem) {
    let item, reason;
    if (forcedItem) {
        item = forcedItem;
        reason = 'doubleFive';
    } else {
        const result = pickHeroItem();
        item = result.item;
        reason = result.reason;
    }

    if (!item) {
        currentHeroItemId = null;
        document.getElementById('heroEyebrow').textContent = 'YOUR LIBRARY';
        document.getElementById('heroTitle').textContent = 'Nothing here yet';
        document.getElementById('heroStars').textContent = '';
        document.getElementById('heroYear').textContent = '';
        document.getElementById('heroDuration').textContent = '';
        document.getElementById('heroDescription').textContent = 'Add your first title to get started.';
        document.getElementById('heroBackdrop').style.backgroundImage = '';
        document.getElementById('heroImage').src = '';
        return;
    }
    currentHeroItemId = item.id;
    const avg = getAverageRating(item);
    const eyebrow = document.getElementById('heroEyebrow');
    if (reason === 'doubleFive') {
        eyebrow.textContent = 'MAY & JAY · BOTH 5/5';
    } else if (reason === 'scheduled') {
        eyebrow.textContent = 'NEXT MOVIE NIGHT · ' + formatPlannedDate(item.plannedDate).toUpperCase();
    } else if (reason === 'favorite') {
        eyebrow.textContent = 'AN OLD FAVORITE OF OURS';
    } else {
        eyebrow.textContent = 'FROM THE LIBRARY';
    }
    document.getElementById('heroTitle').textContent = item.title;
    document.getElementById('heroStars').textContent = ratingToStars(avg);
    document.getElementById('heroYear').textContent = item.year;
    document.getElementById('heroDuration').textContent = item.duration;
    document.getElementById('heroDescription').textContent = item.description;
    const banner = item.banner || item.poster || '';
    document.getElementById('heroBackdrop').style.backgroundImage = "url('" + banner.replace(/'/g, "%27") + "')";
    document.getElementById('heroImage').src = banner;
    document.getElementById('heroImage').alt = item.title;
    const heroContent = document.getElementById('heroContent');
    heroContent.style.animation = 'none';
    void heroContent.offsetHeight;
    heroContent.style.animation = 'fadeInUp 0.7s ease forwards';
}

function startHeroCycling() {
    if (heroCycleTimer) clearInterval(heroCycleTimer);
    const doubleFive = getDoubleFiveItems();
    if (doubleFive.length === 1) {
        // Nothing to cycle to, but still worth spotlighting once.
        refreshHero(doubleFive[0]);
        return;
    }
    if (doubleFive.length < 2) return; // nothing to cycle between
    heroCycleTimer = setInterval(() => {
        const current = getDoubleFiveItems();
        if (current.length < 2) {
            clearInterval(heroCycleTimer);
            return;
        }
        doubleFiveIndex = (doubleFiveIndex + 1) % current.length;
        refreshHero(current[doubleFiveIndex]);
    }, 10000);
}

async function syncAuthedPerson() {
    try {
        const res = await fetch('/api/me');
        if (!res.ok) return;
        const data = await res.json();
        if (data.person === 'may' || data.person === 'jay') {
            currentRatingPerson = data.person;
            localStorage.setItem('mj_person', currentRatingPerson);
        }
    } catch (e) {
        // Non-fatal — fall back to whatever's in localStorage already.
    }
}

async function init() {
    await syncAuthedPerson();
    const loadStatus = await loadItems();
    if (loadStatus === 'redirect') return;
    if (loadStatus === 'error') {
        showLoadError();
        return;
    }
    ensureAllCategories();
    refreshHero();
    startHeroCycling();
    renderAllCategories();
    loadTurn();
    initPushUI();
    setupIosInstallHint();

    document.getElementById('heroDetailsBtn').addEventListener('click', () => {
        if (currentHeroItemId !== null) openDetail(currentHeroItemId);
    });
    document.getElementById('heroSurpriseBtn').addEventListener('click', surprisePick);
    document.getElementById('addSubmitBtn').addEventListener('click', submitAddForm);
    document.getElementById('addForm').addEventListener('submit', (e) => {
        e.preventDefault();
        submitAddForm();
    });

    window.addEventListener('scroll', () => {
        document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 40);
        positionTurnBanner();
    });
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && mobileMenuOpen) closeMobileMenu();
        positionTurnBanner();
    });
}

function toggleMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const overlay = document.getElementById('mobileNavOverlay');
    mobileMenuOpen = !mobileMenuOpen;
    if (mobileMenuOpen) {
        hamburger.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        closeMobileMenu();
    }
}
function closeMobileMenu() {
    mobileMenuOpen = false;
    document.getElementById('hamburger').classList.remove('open');
    document.getElementById('mobileNavOverlay').classList.remove('active');
    document.body.style.overflow = '';
}
function mobileNavSelect(filter, linkElement) {
    closeMobileMenu();
    filterContent(filter, null);
    document.querySelectorAll('#mobileNavOverlay a').forEach(a => a.classList.remove('active-mob'));
    if (linkElement) linkElement.classList.add('active-mob');
    document.querySelectorAll('.nav-links li a').forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('data-filter') === filter) a.classList.add('active');
    });
}
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('mobileNavOverlay');
    if (overlay) overlay.addEventListener('click', function(e) { if (e.target === this) closeMobileMenu(); });
});

function createCardHTML(item, showBadge) {
    const avg = getAverageRating(item);
    const stars = ratingToStars(avg);
    const typeLabel = item.type === 'movie' ? 'Movie' : 'Series';
    let badge = '';
    if (showBadge && item.plannedDate) badge = '<span class="schedule-badge">📅 ' + escapeHtml(formatPlannedDate(item.plannedDate)) + '</span>';
    let miniRatings = '';
    if (item.watched) {
        const mayR = item.watched.may ? item.watched.may.rating.toFixed(1) : '–';
        const jayR = item.watched.jay ? item.watched.jay.rating.toFixed(1) : '–';
        miniRatings = '<div class="mini-ratings"><span class="mini-may">M ' + mayR + '</span><span class="mini-jay">J ' + jayR + '</span></div>';
    }
    return '' +
        '<div class="card" data-id="' + item.id + '" role="button" tabindex="0" aria-label="' + escapeHtml(item.title) + '">' +
        '<div class="card-poster-wrapper"><img class="card-poster" src="' + escapeHtml(item.poster) + '" alt="' + escapeHtml(item.title) + '" loading="lazy" onerror="this.onerror=null;this.src=PLACEHOLDER_POSTER;"></div>' +
        '<span class="card-type-badge">' + typeLabel + '</span>' +
        '<div class="card-info">' +
        '<div class="card-title">' + escapeHtml(item.title) + '</div>' +
        '<div class="card-stars">' + stars + '</div>' +
        miniRatings +
        '<div class="card-meta"><span>' + item.year + '</span>' + badge + '</div>' +
        '</div>' +
        '</div>';
}

function renderCategoryHTML(categoryName, list, showBadge) {
    const cards = list.map(item => createCardHTML(item, showBadge)).join('');
    return '<div class="category-section"><div class="category-header"><h2 class="category-title">' + escapeHtml(categoryName) + '</h2></div><div class="category-row">' + cards + '</div></div>';
}

function emptyState(title, sub) {
    return '<div class="empty-state"><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(sub) + '</p></div>';
}

function groupByCategory(list, showBadge) {
    const grouped = {};
    list.forEach(i => { if (!grouped[i.category]) grouped[i.category] = []; grouped[i.category].push(i); });
    let html = '';
    const seen = new Set();
    categoryOrder.forEach(cat => {
        if (grouped[cat] && grouped[cat].length) { html += renderCategoryHTML(cat, grouped[cat], showBadge);
            seen.add(cat); }
    });
    Object.keys(grouped).forEach(cat => {
        if (!seen.has(cat) && grouped[cat].length) html += renderCategoryHTML(cat, grouped[cat], showBadge);
    });
    return html;
}

function renderWatchlistHTML(list) {
    const unwatched = list.filter(i => !i.watched);
    const scheduled = unwatched.filter(i => i.plannedDate).sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate));
    const someday = unwatched.filter(i => !i.plannedDate);
    let html = '';
    if (scheduled.length) html += renderCategoryHTML('Coming Up', scheduled, true);
    if (someday.length) html += renderCategoryHTML('Someday', someday, false);
    return html || emptyState('Nothing on the watchlist yet', 'Open any title and set a planned date, or add something new.');
}

function buildRecapStatCard(value, label) {
    return '<div class="recap-stat"><div class="recap-stat-value">' + value + '</div><div class="recap-stat-label">' + escapeHtml(label) + '</div></div>';
}

function buildRecapHTML() {
    const watched = items.filter(i => i.watched);
    if (!watched.length) {
        return emptyState('Nothing to recap yet', 'Rate a title together and your recap will start filling in here.');
    }

    const movies = watched.filter(i => i.type === 'movie').length;
    const series = watched.filter(i => i.type === 'series').length;
    const watchlistCount = items.filter(i => !i.watched).length;
    const mutual = watched.filter(i => i.watched.may && i.watched.jay);

    const mayRated = watched.filter(i => i.watched.may).map(i => i.watched.may.rating);
    const jayRated = watched.filter(i => i.watched.jay).map(i => i.watched.jay.rating);
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const avgMay = avg(mayRated);
    const avgJay = avg(jayRated);

    const catCounts = {};
    watched.forEach(i => { catCounts[i.category] = (catCounts[i.category] || 0) + 1; });
    const topCategory = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0];

    const statsRow =
        '<div class="recap-stats-row">' +
        buildRecapStatCard(watched.length, watched.length === 1 ? 'title watched' : 'titles watched') +
        buildRecapStatCard(movies, movies === 1 ? 'movie' : 'movies') +
        buildRecapStatCard(series, series === 1 ? 'series' : 'series') +
        buildRecapStatCard(watchlistCount, 'still on the list') +
        '</div>';

    let syncSection = '';
    if (mutual.length) {
        const avgDelta = avg(mutual.map(i => Math.abs(i.watched.may.rating - i.watched.jay.rating)));
        const syncPct = Math.round((1 - avgDelta / 5) * 100);
        const critic = avgMay === avgJay ? null : (avgMay < avgJay ? 'May' : 'Jay');
        syncSection =
            '<div class="recap-section">' +
            '<div class="recap-eyebrow">TASTE SYNC</div>' +
            '<div class="recap-sync-row">' +
            '<div class="recap-sync-value">' + syncPct + '%</div>' +
            '<div class="recap-sync-side">' +
            '<div class="recap-sync-caption">' + deltaCaption(avgDelta) + '</div>' +
            '<div class="recap-sync-sub">Based on ' + mutual.length + ' title' + (mutual.length === 1 ? '' : 's') + ' you\'ve both rated' +
            (critic ? ' &middot; <strong class="recap-' + critic.toLowerCase() + '">' + critic + '</strong> tends to rate a little tougher' : '') +
            '</div></div></div></div>';
    }

    let matchesSection = '';
    const doubleFives = getDoubleFiveItems();
    if (doubleFives.length) {
        matchesSection =
            '<div class="recap-section">' +
            '<div class="recap-eyebrow">PERFECT MATCHES &middot; ' + doubleFives.length + '</div>' +
            '<div class="category-row">' + doubleFives.map(i => createCardHTML(i, false)).join('') + '</div>' +
            '</div>';
    }

    let categorySection = '';
    if (topCategory) {
        categorySection =
            '<div class="recap-section">' +
            '<div class="recap-eyebrow">GO-TO GENRE</div>' +
            '<div class="recap-genre">' + escapeHtml(topCategory) + '<span class="recap-genre-count">' + catCounts[topCategory] + ' watched</span></div>' +
            '</div>';
    }

    return '' +
        '<div class="recap-header">' +
        '<div class="recap-eyebrow">MAY &amp; JAY</div>' +
        '<h2 class="recap-title">The story so far</h2>' +
        '</div>' +
        statsRow +
        syncSection +
        matchesSection +
        categorySection;
}

function buildAwardCard(eyebrow, item, citation) {
    if (!item) return '';
    return '' +
        '<div class="award-card">' +
        '<div class="recap-eyebrow award-eyebrow">' + escapeHtml(eyebrow) + '</div>' +
        '<div class="award-body">' +
        '<img class="award-poster" src="' + escapeHtml(item.poster || PLACEHOLDER_POSTER) + '" alt="' + escapeHtml(item.title) + '" loading="lazy" onerror="this.onerror=null;this.src=PLACEHOLDER_POSTER;">' +
        '<div class="award-info">' +
        '<div class="award-title" role="button" tabindex="0" onclick="openDetail(' + item.id + ')">' + escapeHtml(item.title) + '</div>' +
        '<div class="award-citation">' + citation + '</div>' +
        '</div></div></div>';
}

// Groups watched titles by year/month based on `watchedDate` — the day
// picker shown in the rate form. Titles rated without a date just don't
// show up here (no schema migration needed for the existing library).
function buildAwardsTimelineHTML(watched) {
    const dated = watched.filter(i => i.watchedDate);
    if (!dated.length) {
        return '' +
            '<div class="recap-section">' +
            '<div class="recap-eyebrow">WATCH TIMELINE</div>' +
            '<p class="awards-timeline-empty">Set the "watched on" date next time you rate something, and your month-by-month timeline will build up here.</p>' +
            '</div>';
    }

    const byYear = {};
    dated.forEach((item) => {
        const [y, m] = item.watchedDate.split('-');
        const year = Number(y);
        const month = Number(m) - 1;
        if (!byYear[year]) byYear[year] = {};
        if (!byYear[year][month]) byYear[year][month] = [];
        byYear[year][month].push(item);
    });

    const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

    const yearBlocks = years.map((year) => {
        const months = Object.keys(byYear[year]).map(Number).sort((a, b) => b - a);
        const monthBlocks = months.map((month) => {
            const monthItems = byYear[year][month].slice().sort((a, b) => (b.watchedDate || '').localeCompare(a.watchedDate || ''));
            return '' +
                '<div class="timeline-month">' +
                '<div class="timeline-month-head">' + MONTH_NAMES[month] +
                ' <span class="timeline-month-count">' + monthItems.length + (monthItems.length === 1 ? ' title' : ' titles') + '</span></div>' +
                '<div class="category-row">' + monthItems.map((i) => createCardHTML(i, false)).join('') + '</div>' +
                '</div>';
        }).join('');
        return '<div class="timeline-year"><div class="timeline-year-head">' + year + '</div>' + monthBlocks + '</div>';
    }).join('');

    return '' +
        '<div class="recap-section">' +
        '<div class="recap-eyebrow">WATCH TIMELINE</div>' +
        yearBlocks +
        '</div>';
}

// All-time awards ranked from your whole shared library. (The month-by-month
// breakdown below this, grouped by the "watched on" date you set when rating,
// is the closer equivalent to a yearly wrap-up.)
function buildAwardsHTML() {
    const watched = items.filter(i => i.watched);
    if (watched.length < 2) {
        return emptyState('Not enough watched titles yet', 'Rate a few more together and the awards ceremony will unlock.');
    }

    const mayTop = watched.filter(i => i.watched.may).sort((a, b) => b.watched.may.rating - a.watched.may.rating)[0];
    const jayTop = watched.filter(i => i.watched.jay).sort((a, b) => b.watched.jay.rating - a.watched.jay.rating)[0];

    const doubleFives = getDoubleFiveItems();
    const perfectMatch = doubleFives.length ? doubleFives[doubleFives.length - 1] : null;

    const catCounts = {};
    watched.forEach(i => { catCounts[i.category] = (catCounts[i.category] || 0) + 1; });
    const topCategory = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0];
    let bestOfGenre = null;
    if (topCategory) {
        bestOfGenre = watched.filter(i => i.category === topCategory)
            .sort((a, b) => getAverageRating(b) - getAverageRating(a))[0];
    }

    let hallOfShame = null, minAvg = 6;
    watched.forEach(i => {
        const avg = getAverageRating(i);
        if (avg > 0 && avg < minAvg) { minAvg = avg; hallOfShame = i; }
    });
    // Only call out a "worst" if it's meaningfully behind the pack — no need
    // to be unkind about a library everyone rated 4+ stars.
    if (minAvg >= 3.5) hallOfShame = null;

    const cards = [
        mayTop ? buildAwardCard("MAY'S PICK", mayTop, 'May gave this ' + mayTop.watched.may.rating.toFixed(1) + ' \u2605 \u2014 her highest rating on record.') : '',
        jayTop ? buildAwardCard("JAY'S PICK", jayTop, 'Jay gave this ' + jayTop.watched.jay.rating.toFixed(1) + ' \u2605 \u2014 his highest rating on record.') : '',
        perfectMatch ? buildAwardCard('PERFECT MATCH', perfectMatch, 'The rare title you both gave a flawless 5.0.') : '',
        bestOfGenre ? buildAwardCard('BEST ' + escapeHtml(topCategory).toUpperCase(), bestOfGenre, 'Your favorite in your most-watched category, ' + escapeHtml(topCategory) + '.') : '',
        hallOfShame ? buildAwardCard('THE "NEVER AGAIN" AWARD', hallOfShame, 'Your lowest-rated watch together. Sorry, whoever picked this one.') : ''
    ].filter(Boolean).join('');

    return '' +
        '<div class="recap-header">' +
        '<div class="recap-eyebrow">MAY &amp; JAY PRESENT</div>' +
        '<h2 class="recap-title">The Movie Night Awards</h2>' +
        '<p class="awards-subtitle">Superlatives pulled from your whole shared library so far.</p>' +
        '</div>' +
        '<div class="recap-section awards-grid">' + cards + '</div>' +
        buildAwardsTimelineHTML(watched);
}

function renderAllCategories() {
    const container = document.getElementById('mainContent');
    if (currentFilter === 'recap') {
        container.innerHTML = buildRecapHTML();
        return;
    }
    if (currentFilter === 'awards') {
        container.innerHTML = buildAwardsHTML();
        return;
    }
    if (currentFilter === 'watchlist') {
        container.innerHTML = renderWatchlistHTML(items);
        return;
    }
    if (currentFilter === 'alreadyWatched') {
        const watchedItems = items.filter(i => i.watched);
        container.innerHTML = groupByCategory(watchedItems, false) || emptyState('No watched titles yet', "Open a title and log a rating once you've watched it together.");
        return;
    }
    const filtered = items.filter(i => currentFilter === 'all' || i.type === currentFilter);
    container.innerHTML = groupByCategory(filtered, false) || emptyState('Nothing here yet', 'Try a different filter, or add something new.');
}

function filterContent(filter, linkElement) {
    currentFilter = filter;
    document.querySelectorAll('.nav-links li a').forEach(a => a.classList.remove('active'));
    if (linkElement) linkElement.classList.add('active');
    document.querySelectorAll('#mobileNavOverlay a').forEach(a => {
        a.classList.remove('active-mob');
        if (a.getAttribute('data-filter') === filter) a.classList.add('active-mob');
    });
    document.getElementById('searchInput').value = '';
    renderAllCategories();
    document.getElementById('mainContent').scrollIntoView({ behavior: 'smooth', block: 'start' });
    closeMobileMenu();
}

function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!query || currentFilter === 'recap' || currentFilter === 'awards') { renderAllCategories(); return; }
    let filtered = items.filter(i => i.title.toLowerCase().includes(query));
    if (currentFilter === 'movie' || currentFilter === 'series') filtered = filtered.filter(i => i.type === currentFilter);
    else if (currentFilter === 'alreadyWatched') filtered = filtered.filter(i => i.watched);
    else if (currentFilter === 'watchlist') filtered = filtered.filter(i => !i.watched);
    const container = document.getElementById('mainContent');
    if (!filtered.length) { container.innerHTML = emptyState('No results', 'Nothing matches "' + document.getElementById('searchInput').value.trim() + '".'); return; }
    if (currentFilter === 'watchlist') container.innerHTML = renderWatchlistHTML(filtered);
    else container.innerHTML = renderCategoryHTML('Search Results', filtered, false);
}

document.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (card && document.getElementById('mainContent').contains(card)) {
        openDetail(Number(card.dataset.id));
    }
});

function deltaCaption(delta) {
    if (delta === 0) return 'Perfectly in sync 🎯';
    if (delta <= 0.5) return 'Practically twins 🤝';
    if (delta <= 1.5) return 'A little different taste 🎬';
    return 'Totally different wavelengths 📡';
}

function buildSyncMeterHTML(mayRating, jayRating) {
    const delta = Math.abs(mayRating - jayRating);
    const caption = deltaCaption(delta);
    const mayPos = (mayRating / 5 * 100).toFixed(1);
    const jayPos = (jayRating / 5 * 100).toFixed(1);
    return '' +
        '<div class="sync-meter">' +
        '<div class="sync-track"><span class="sync-dot sync-may" style="left:' + mayPos + '%"></span><span class="sync-dot sync-jay" style="left:' + jayPos + '%"></span></div>' +
        '<div class="sync-caption">' + caption + '</div>' +
        '</div>';
}

function showToast(message, isError) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = '<span class="toast-icon">' + (isError ? '⚠️' : '✓') + '</span><span>' + escapeHtml(message) + '</span>';
    toast.classList.toggle('toast-error', !!isError);
    // Restart the animation even if a toast is already showing.
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢'];

// Reactions live on the *other* person's comment — you can't react to your
// own. When viewing your own card we just show what your partner left (if
// anything); on your partner's card you get the picker.
function buildReactionRow(item, target) {
    const current = (item.watched[target] && item.watched[target].reaction) || '';
    if (currentRatingPerson === target) {
        if (!current) return '';
        return '<div class="reaction-row reaction-row-readonly"><span class="reaction-chip reaction-chip-active" aria-hidden="true">' + current + '</span><span class="reaction-hint">reacted</span></div>';
    }
    return '<div class="reaction-row">' +
        REACTION_EMOJIS.map((e) =>
            '<button type="button" class="reaction-chip' + (current === e ? ' reaction-chip-active' : '') + '" ' +
            'onclick="reactToComment(' + item.id + ', \'' + target + '\', \'' + e + '\')" ' +
            'aria-label="React with ' + e + '">' + e + '</button>'
        ).join('') +
        '</div>';
}

async function reactToComment(id, target, emoji) {
    try {
        const res = await fetch('/api/react', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, target, emoji })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to react.');

        const idx = items.findIndex((i) => i.id === id);
        if (idx !== -1) items[idx] = data.item;

        if (currentModalItem && currentModalItem.id === id) {
            currentModalItem = data.item;
            document.getElementById('modalBody').innerHTML = buildModalBodyHTML(data.item);
            wireRateForm(data.item);
            wirePlanForm(data.item);
        }
    } catch (e) {
        showToast(e.message || 'Something went wrong.', true);
    }
}

function buildModalBodyHTML(item) {
    const avg = getAverageRating(item);
    const typeLabel = item.type === 'movie' ? 'Movie' : 'Series';
    let sync = '';
    let existingRatingsHtml = '';
    if (item.watched) {
        if (item.watched.may && item.watched.jay) {
            sync = buildSyncMeterHTML(item.watched.may.rating, item.watched.jay.rating);
        }
        existingRatingsHtml = '<div class="existing-ratings">';
        if (item.watched.may) {
            existingRatingsHtml += '<div class="note-card note-may"><div class="note-card-head">May ★ ' + item.watched.may.rating.toFixed(1) + '</div>';
            if (item.watched.may.comment) existingRatingsHtml += '<p>' + escapeHtml(item.watched.may.comment) + '</p>';
            existingRatingsHtml += buildReactionRow(item, 'may');
            existingRatingsHtml += '</div>';
        }
        if (item.watched.jay) {
            existingRatingsHtml += '<div class="note-card note-jay"><div class="note-card-head">Jay ★ ' + item.watched.jay.rating.toFixed(1) + '</div>';
            if (item.watched.jay.comment) existingRatingsHtml += '<p>' + escapeHtml(item.watched.jay.comment) + '</p>';
            existingRatingsHtml += buildReactionRow(item, 'jay');
            existingRatingsHtml += '</div>';
        }
        existingRatingsHtml += '</div>';
    }
    let plannedDateHtml = '';
    if (item.watched) {
        if (item.plannedDate) {
            plannedDateHtml = '<div class="planned-date-display">📅 ' + escapeHtml(formatPlannedDate(item.plannedDate)) + '</div>';
        }
    } else {
        plannedDateHtml = buildPlanFormHTML(item);
    }
    return '' +
        '<div class="modal-meta">' +
        '<span class="modal-stars">' + ratingToStars(avg) + '</span>' +
        '<span class="modal-chip">' + item.year + '</span>' +
        '<span class="modal-chip">' + typeLabel + '</span>' +
        '<span class="modal-chip">' + escapeHtml(item.category) + '</span>' +
        '<span class="modal-chip">' + escapeHtml(item.duration) + '</span>' +
        '</div>' +
        '<p class="modal-description">' + escapeHtml(item.description) + '</p>' +
        '<div id="syncMeterSlot">' + sync + '</div>' +
        existingRatingsHtml +
        plannedDateHtml +
        buildRateFormHTML(item);
}

function buildPlanFormHTML(item) {
    return '' +
        '<div class="plan-form" id="planForm">' +
        '<div class="plan-form-head">📅 Plan a watch date</div>' +
        '<div class="plan-row">' +
        '<input type="date" id="planDateInput" value="' + (item.plannedDate || '') + '">' +
        '<div class="plan-actions">' +
        '<button type="button" class="btn btn-primary plan-save-btn" id="planSaveBtn">Save date</button>' +
        (item.plannedDate ? '<button type="button" class="btn btn-ghost plan-clear-btn" id="planClearBtn">Clear</button>' : '') +
        '</div>' +
        '</div>' +
        '<div class="rate-status" id="planStatus"></div>' +
        '</div>';
}

function wirePlanForm(item) {
    const input = document.getElementById('planDateInput');
    const saveBtn = document.getElementById('planSaveBtn');
    const clearBtn = document.getElementById('planClearBtn');
    const status = document.getElementById('planStatus');
    if (!input || !saveBtn) return;

    async function savePlan(dateValue) {
        saveBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;
        status.textContent = '';
        status.classList.remove('rate-error');
        try {
            const res = await fetch('/api/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, plannedDate: dateValue || null })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save.');

            const idx = items.findIndex((i) => i.id === item.id);
            if (idx !== -1) items[idx] = data.item;
            currentModalItem = data.item;

            document.getElementById('modalBody').innerHTML = buildModalBodyHTML(data.item);
            wireRateForm(data.item);
            wirePlanForm(data.item);
            renderAllCategories();
            showToast(dateValue ? 'Watch date saved!' : 'Watch date cleared.');
        } catch (e) {
            status.textContent = e.message || 'Something went wrong.';
            status.classList.add('rate-error');
            showToast(e.message || 'Something went wrong.', true);
            saveBtn.disabled = false;
            if (clearBtn) clearBtn.disabled = false;
        }
    }

    saveBtn.addEventListener('click', () => {
        if (!input.value) {
            status.textContent = 'Pick a date first.';
            status.classList.add('rate-error');
            return;
        }
        savePlan(input.value);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => savePlan(null));
    }
}

function todayDateStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function buildRateFormHTML(item) {
    const existing = item.watched && item.watched[currentRatingPerson];
    const startRating = existing ? existing.rating : 0;
    const startComment = existing ? (existing.comment || '') : '';
    const startDate = item.watchedDate || todayDateStr();
    const personLabel = currentRatingPerson === 'may' ? 'May' : 'Jay';
    const previewText = startRating > 0 ? (ratingToStars(startRating) + ' ' + Number(startRating).toFixed(1)) : 'Not yet rated';
    return '' +
        '<div class="rate-form" id="rateForm">' +
        '<div class="rate-form-head">Rate it <span class="rating-as">rating as <strong>' + personLabel + '</strong></span>' +
        '<button type="button" class="switch-person-link" id="switchPersonLink" title="Log out and sign in with the other password">Not you?</button>' +
        '</div>' +
        '<div class="star-row">' +
        '<input type="range" id="rateRange" min="0" max="5" step="0.5" value="' + startRating + '">' +
        '<span class="star-preview" id="starPreview">' + previewText + '</span>' +
        '</div>' +
        '<textarea id="rateComment" class="rate-comment" placeholder="Add a comment (optional)" maxlength="1000">' + escapeHtml(startComment) + '</textarea>' +
        '<label class="rate-watched-date-label" for="rateWatchedDate">Watched on</label>' +
        '<input type="date" id="rateWatchedDate" class="rate-watched-date" value="' + escapeHtml(startDate) + '">' +
        '<button type="button" class="btn btn-primary rate-submit-btn" id="rateSubmitBtn">' + (startRating > 0 ? 'Save rating' : 'Save rating') + '</button>' +
        '<div class="rate-status" id="rateStatus"></div>' +
        '</div>';
}

function wireRateForm(item) {
    const range = document.getElementById('rateRange');
    const preview = document.getElementById('starPreview');
    const comment = document.getElementById('rateComment');
    const submitBtn = document.getElementById('rateSubmitBtn');
    const status = document.getElementById('rateStatus');
    const switchLink = document.getElementById('switchPersonLink');
    if (!range || !submitBtn) return;

    function updatePreview() {
        const v = Number(range.value);
        preview.textContent = v > 0 ? (ratingToStars(v) + ' ' + v.toFixed(1)) : 'Not yet rated';
    }

    range.addEventListener('input', updatePreview);

    if (switchLink) {
        switchLink.addEventListener('click', () => {
            doLogout();
        });
    }

    submitBtn.addEventListener('click', async () => {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving…';
        status.textContent = '';
        status.classList.remove('rate-error');
        try {
            const ratingValue = Number(range.value);
            const watchedDateInput = document.getElementById('rateWatchedDate');
            const res = await fetch('/api/rate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: item.id,
                    person: currentRatingPerson,
                    rating: ratingValue,
                    comment: comment.value.trim(),
                    watchedDate: watchedDateInput ? watchedDateInput.value : null
                })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save.');

            const idx = items.findIndex(i => i.id === item.id);
            if (idx !== -1) items[idx] = data.item;
            currentModalItem = data.item;

            document.getElementById('modalBody').innerHTML = buildModalBodyHTML(data.item);
            wireRateForm(data.item);
            wirePlanForm(data.item);
            if (ratingValue === 0) {
                showToast('Rating removed.');
            } else {
                document.getElementById('rateStatus').textContent = 'Saved!';
                showToast('Rating saved!');
            }
            renderAllCategories();
        } catch (e) {
            status.textContent = e.message || 'Something went wrong.';
            status.classList.add('rate-error');
            showToast(e.message || 'Something went wrong.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save rating';
        }
    });
}

function openDetail(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    currentModalItem = item;
    lastFocusedElement = document.activeElement;
    const heroSrc = item.banner || item.poster || PLACEHOLDER_BANNER;
    document.getElementById('modalPoster').src = heroSrc;
    document.getElementById('modalPoster').alt = item.title;
    document.getElementById('modalHeroBackdrop').style.backgroundImage = "url('" + heroSrc.replace(/'/g, "%27") + "')";
    document.getElementById('modalTitle').textContent = item.title;
    document.getElementById('modalBody').innerHTML = buildModalBodyHTML(item);
    wireRateForm(item);
    wirePlanForm(item);
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('modal').scrollTop = 0;
    document.querySelector('.modal-close').focus();
}

function closeModal(e) {
    if (e && e.target !== document.getElementById('modalOverlay')) return;
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
    currentModalItem = null;
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
    lastFocusedElement = null;
}

function openAddModal() {
    lastFocusedElement = document.activeElement;
    document.getElementById('addForm').reset();
    document.getElementById('addStatus').textContent = '';
    document.getElementById('addStatus').classList.remove('rate-error');
    document.getElementById('addYearInput').value = new Date().getFullYear();
    document.getElementById('addOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('addTitleInput').focus();
}

function closeAddModal(e) {
    if (e && e.target !== document.getElementById('addOverlay')) return;
    document.getElementById('addOverlay').classList.remove('active');
    document.body.style.overflow = '';
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
    lastFocusedElement = null;
}

async function submitAddForm() {
    const status = document.getElementById('addStatus');
    const submitBtn = document.getElementById('addSubmitBtn');
    status.textContent = '';
    status.classList.remove('rate-error');

    const title = document.getElementById('addTitleInput').value.trim();
    const type = document.getElementById('addTypeInput').value;
    const year = Number(document.getElementById('addYearInput').value);
    const category = document.getElementById('addCategoryInput').value.trim();
    const duration = document.getElementById('addDurationInput').value.trim();
    const poster = document.getElementById('addPosterInput').value.trim();
    const banner = document.getElementById('addBannerInput').value.trim();
    const description = document.getElementById('addDescriptionInput').value.trim();

    if (!title || !category || !poster || !year) {
        status.textContent = 'Please fill in all required fields (marked *).';
        status.classList.add('rate-error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding…';

    try {
        const res = await fetch('/api/items/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, type, category, year, duration, poster, banner, description })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            throw new Error(data.error || 'Something went wrong saving this title.');
        }
        items.push(data.item);
        renderAllCategories();
        closeAddModal();
        showToast('"' + title + '" added to the library!');
    } catch (e) {
        status.textContent = e.message || 'Something went wrong saving this title.';
        status.classList.add('rate-error');
        showToast('Could not add title.', true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add to library';
    }
}

function surprisePick() {
    let pool = items.filter(i => !i.watched);
    let usingFallback = false;
    if (!pool.length) { pool = items.slice();
        usingFallback = true; }
    if (!pool.length) return;

    const finalItem = pool[Math.floor(Math.random() * pool.length)];
    const overlay = document.getElementById('surpriseOverlay');
    const img = document.getElementById('surpriseImg');
    const text = document.getElementById('surpriseText');
    const sub = document.getElementById('surpriseSub');
    text.textContent = 'Picking something for tonight…';
    sub.textContent = 'Hold tight';
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    let ticks = 0;
    const maxTicks = 14;
    if (surpriseTimer) clearInterval(surpriseTimer);
    surpriseTimer = setInterval(() => {
        ticks++;
        const randomItem = pool[Math.floor(Math.random() * pool.length)];
        img.src = randomItem.poster || PLACEHOLDER_POSTER;
        if (ticks >= maxTicks) {
            clearInterval(surpriseTimer);
            img.src = finalItem.poster || PLACEHOLDER_POSTER;
            text.textContent = finalItem.title;
            sub.textContent = usingFallback ? 'You’ve seen it all — here’s an old favorite' : 'Tonight’s pick';
            setTimeout(() => {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
                openDetail(finalItem.id);
            }, 900);
        }
    }, 90);
}

function closeSurprise(e) {
    if (e && e.target !== document.getElementById('surpriseOverlay')) return;
    if (surpriseTimer) clearInterval(surpriseTimer);
    document.getElementById('surpriseOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (document.getElementById('modalOverlay').classList.contains('active')) closeModal();
        else if (document.getElementById('surpriseOverlay').classList.contains('active')) closeSurprise({ target: document.getElementById('surpriseOverlay') });
        else if (mobileMenuOpen) closeMobileMenu();
        return;
    }
    if ((e.key === '/' || (e.ctrlKey && e.key === 'f')) && document.activeElement !== document.getElementById('searchInput')) {
        e.preventDefault();
        document.getElementById('searchInput').focus();
        return;
    }
    // Enter/Space activates cards, nav links, and the logo — anything marked role="button".
    if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target.closest('[role="button"]');
        if (target) { e.preventDefault(); target.click(); }
        return;
    }
    // Keep Tab from leaving the modal while it's open.
    if (e.key === 'Tab' && document.getElementById('modalOverlay').classList.contains('active')) {
        const modal = document.getElementById('modal');
        const focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
});

// --- PWA: install prompt + service worker registration ---
let deferredInstallPrompt = null;

function isIosDevice() {
    const ua = navigator.userAgent;
    const isIphoneOrIpad = /iPad|iPhone|iPod/.test(ua);
    // iPadOS 13+ identifies as "Macintosh" in the UA string but is touch-capable.
    const isModernIpad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    return isIphoneOrIpad || isModernIpad;
}

function isStandaloneDisplay() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = document.getElementById('installBtn');
    if (btn) btn.hidden = false;
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    const btn = document.getElementById('installBtn');
    if (btn) btn.hidden = true;
});

// Safari (iOS/iPadOS) never fires `beforeinstallprompt` and has no
// programmatic install API at all — "Add to Home Screen" only exists inside
// the Share sheet. So on iOS we show the same button, but pointed at
// instructions instead of a native prompt.
function setupIosInstallHint() {
    if (!isIosDevice() || isStandaloneDisplay()) return;
    const btn = document.getElementById('installBtn');
    if (!btn) return;
    btn.hidden = false;
    btn.textContent = '📲 Add to Home Screen';
}

async function promptInstall() {
    const btn = document.getElementById('installBtn');
    if (!deferredInstallPrompt) {
        if (isIosDevice() && !isStandaloneDisplay()) {
            showToast('Tap the Share button, then "Add to Home Screen".');
        }
        return;
    }
    deferredInstallPrompt.prompt();
    try {
        await deferredInstallPrompt.userChoice;
    } catch (e) {
        // Ignore — some browsers reject this promise if the prompt was dismissed.
    }
    deferredInstallPrompt = null;
    if (btn) btn.hidden = true;
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((e) => {
            console.warn('Service worker registration failed.', e);
        });
    });
}

// --- Movie night reminders (Web Push) ---
let pushPublicKey = null;

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

function updatePushButton(subscribed) {
    const btn = document.getElementById('pushBtn');
    if (!btn) return;
    btn.textContent = subscribed ? '🔕 Reminders on' : '🔔 Remind us';
    btn.classList.toggle('install-btn-active', subscribed);
}

async function initPushUI() {
    // On iOS, PushManager only exists at all when the site has been added to
    // the home screen and opened from there (iOS 16.4+) — inside a normal
    // Safari tab this check correctly (and silently) hides the button.
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
        const res = await fetch('/api/push/public-key');
        const data = await res.json();
        if (!data.key) return; // VAPID keys aren't configured server-side yet — see SETUP.md
        pushPublicKey = data.key;
        const btn = document.getElementById('pushBtn');
        if (!btn) return;
        btn.hidden = false;
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        updatePushButton(!!existing);
    } catch (e) {
        console.warn('Push setup check failed.', e);
    }
}

async function togglePushSubscription() {
    if (!pushPublicKey) return;
    try {
        // Ask for notification permission FIRST, before any await — Safari
        // (and iOS Safari in particular) is strict about the permission
        // prompt needing to follow directly from the click that triggered
        // it, and an earlier await (e.g. for `serviceWorker.ready`) can
        // occasionally break that association.
        if (Notification.permission === 'denied') {
            showToast('Notifications are blocked for this site in your browser settings.', true);
            return;
        }
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                showToast('Notifications were not allowed.', true);
                return;
            }
        }

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();

        if (existing) {
            await existing.unsubscribe();
            await fetch('/api/push/unsubscribe', { method: 'POST' });
            updatePushButton(false);
            showToast('Movie night reminders turned off.');
            return;
        }

        const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(pushPublicKey)
        });

        const res = await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save subscription.');

        updatePushButton(true);
        showToast("You'll get a reminder when it's movie night!");
    } catch (e) {
        showToast(e.message || 'Could not turn on reminders.', true);
    }
}

// --- Pass the remote (fair-turn queue) ---
let currentTurn = 'may';
let turnPassConfirming = false;

async function loadTurn() {
    try {
        const res = await fetch('/api/turn');
        if (!res.ok) return;
        const data = await res.json();
        if (data.turn === 'may' || data.turn === 'jay') currentTurn = data.turn;
    } catch (e) {
        // Non-fatal — the banner just won't show this load.
        return;
    }
    renderTurnBanner();
}

function positionTurnBanner() {
    const navbar = document.getElementById('navbar');
    const banner = document.getElementById('turnBanner');
    if (!navbar || !banner) return;
    banner.style.top = navbar.offsetHeight + 'px';
}

function renderTurnBanner() {
    const banner = document.getElementById('turnBanner');
    if (!banner) return;
    const name = currentTurn === 'may' ? 'May' : 'Jay';
    const otherName = currentTurn === 'may' ? 'Jay' : 'May';
    const isYourTurn = currentRatingPerson === currentTurn;

    let actionHtml = '';
    if (isYourTurn && turnPassConfirming) {
        actionHtml =
            '<span class="turn-confirm-text">Pass to ' + otherName + '?</span>' +
            '<button type="button" class="turn-pass-btn" onclick="passTurn()">Confirm</button>' +
            '<button type="button" class="turn-cancel-btn" onclick="cancelPassTurn()">Cancel</button>';
    } else if (isYourTurn) {
        actionHtml = '<button type="button" class="turn-pass-btn" onclick="requestPassTurn()">Pass the remote &rarr;</button>';
    }

    banner.className = 'turn-banner turn-' + currentTurn;
    banner.innerHTML =
        '<span class="turn-banner-icon" aria-hidden="true">🎙️</span>' +
        '<span class="turn-banner-text">' + (isYourTurn ? "It's your turn to pick this weekend movie~" : "It's " + name + "'s turn to pick this weekend movie~") + '</span>' +
        actionHtml;
    banner.hidden = false;
    positionTurnBanner();
}

function requestPassTurn() {
    turnPassConfirming = true;
    renderTurnBanner();
}

function cancelPassTurn() {
    turnPassConfirming = false;
    renderTurnBanner();
}

async function passTurn() {
    try {
        const res = await fetch('/api/turn/pass', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to pass the remote.');
        currentTurn = data.turn;
        turnPassConfirming = false;
        renderTurnBanner();
        showToast('Passed the remote to ' + (currentTurn === 'may' ? 'May' : 'Jay') + '!');
    } catch (e) {
        turnPassConfirming = false;
        renderTurnBanner();
        showToast(e.message || 'Something went wrong.', true);
    }
}

async function doLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
        // Ignore network errors — we redirect to the login page regardless.
    }
    // replace(), not href — see the note in loadItems()/login.html.
    window.location.replace('/login.html');
}

init();