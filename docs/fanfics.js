/* ============================================================================
   fanfics.js  —  EchoBreak community (static build)
   ----------------------------------------------------------------------------
   Fully client-side. No backend, no auth, no user accounts.
   - Fanfics are loaded from data/fanfics.json (baked at build time).
   - "Favorites" are stored per-browser in localStorage.
   - View counts are per-browser (localStorage) — honest local stat, not a DB.
   ============================================================================ */

(function () {
    'use strict';

    const DATA_URL = 'data/fanfics.json';
    const LS_FAV = 'echobreak_favorites';
    const LS_VIEWS = 'echobreak_views';
    const PLACEHOLDER = 'images/placeholder.jpg';

    let FANFICS = [];

    /* ---------- localStorage helpers (guarded) ---------- */
    function lsGet(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
        catch (_) { return fallback; }
    }
    function lsSet(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) { }
    }
    function getFavorites() { const v = lsGet(LS_FAV, []); return Array.isArray(v) ? v : []; }
    function isFavorite(id) { return getFavorites().includes(id); }
    function toggleFavorite(id) {
        const favs = getFavorites();
        const i = favs.indexOf(id);
        if (i === -1) favs.push(id); else favs.splice(i, 1);
        lsSet(LS_FAV, favs);
        return favs.includes(id);
    }
    function getViews() { const v = lsGet(LS_VIEWS, {}); return (v && typeof v === 'object') ? v : {}; }
    function bumpView(id) {
        const v = getViews();
        v[id] = (v[id] || 0) + 1;
        lsSet(LS_VIEWS, v);
        return v[id];
    }

    /* ---------- utilities ---------- */
    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function wordCount(text) {
        return (text || '').split(/\s+/).filter(Boolean).length;
    }
    function readingTime(text) {
        const m = Math.max(1, Math.round(wordCount(text) / 180)); // ~180 wpm
        return m;
    }
    function fmtDate(s) {
        const d = new Date((s || '').replace(' ', 'T'));
        return isNaN(d) ? (s || '') : d.toLocaleDateString('ru-RU');
    }
    function byId(id) { return document.getElementById(id); }

    /* ---------- minimal, safe markdown renderer ---------- */
    function renderMarkdown(src) {
        const lines = String(src).split('\n');
        let html = '', inUl = false, inOl = false;
        const closeLists = () => {
            if (inUl) { html += '</ul>'; inUl = false; }
            if (inOl) { html += '</ol>'; inOl = false; }
        };
        for (let raw of lines) {
            const line = raw.trim();
            const e = escapeHtml(line.replace(/^(#{1,3}\s*|\*\s|-\s|\d+\.\s*|>\s?)/, ''));
            if (line.startsWith('###')) { closeLists(); html += `<h4>${escapeHtml(line.slice(3).trim())}</h4>`; }
            else if (line.startsWith('##')) { closeLists(); html += `<h3>${escapeHtml(line.slice(2).trim())}</h3>`; }
            else if (line.startsWith('#')) { closeLists(); html += `<h2>${escapeHtml(line.slice(1).trim())}</h2>`; }
            else if (/^(\*|-)\s/.test(line)) { if (!inUl) { closeLists(); html += '<ul>'; inUl = true; } html += `<li>${e}</li>`; }
            else if (/^\d+\.\s/.test(line)) { if (!inOl) { closeLists(); html += '<ol>'; inOl = true; } html += `<li>${e}</li>`; }
            else if (line === '---' || line === '***') { closeLists(); html += '<hr>'; }
            else if (line.startsWith('>')) { closeLists(); html += `<blockquote>${escapeHtml(line.slice(1).trim())}</blockquote>`; }
            else if (line) { closeLists(); html += `<p>${escapeHtml(line)}</p>`; }
            else { closeLists(); html += '<br>'; }
        }
        closeLists();
        return html;
    }

    /* ---------- modal plumbing ---------- */
    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }
    function openModal(id) { const m = byId(id); if (m) m.style.display = 'block'; }

    /* ---------- card grid ---------- */
    function cardHtml(f) {
        const cover = f.cover || PLACEHOLDER;
        const badge = f.nsfw ? '<span class="nsfw-badge">NSFW</span>' : '';
        return `
            <div class="fanfic-card" data-id="${f.id}">
                <div style="position:relative;">
                    <img src="${escapeHtml(cover)}" alt="Обложка" class="fanfic-image"
                         onerror="this.src='${PLACEHOLDER}'">
                    ${badge}
                </div>
                <div class="fanfic-metadata">
                    <p><strong>${escapeHtml(f.title)}</strong></p>
                    <p>${escapeHtml(f.author)}</p>
                </div>
                <div class="card-actions">
                    <button class="read-button" data-id="${f.id}">Читать</button>
                    <button class="star-button card-fav" data-id="${f.id}"
                            title="В избранное">${isFavorite(f.id) ? '★' : '☆'}</button>
                </div>
            </div>`;
    }

    function renderGrid(list, container) {
        container.innerHTML = '';
        if (!list.length) { container.textContent = 'Пока пусто.'; return; }
        container.innerHTML = list.map(cardHtml).join('');
        container.querySelectorAll('.read-button').forEach(b =>
            b.onclick = () => openFanfic(Number(b.dataset.id)));
        container.querySelectorAll('.fanfic-image').forEach(img =>
            img.onclick = () => openFanfic(Number(img.closest('.fanfic-card').dataset.id)));
        container.querySelectorAll('.card-fav').forEach(b =>
            b.onclick = (e) => {
                e.stopPropagation();
                const on = toggleFavorite(Number(b.dataset.id));
                b.textContent = on ? '★' : '☆';
            });
    }

    /* ---------- reader ---------- */
    function showReader(f) {
        const views = bumpView(f.id);
        byId('fanficTitle').textContent = f.title;
        byId('fanficAuthorDate').textContent =
            `Автор: ${f.author} | Дата: ${fmtDate(f.created_at)}`;
        byId('fanficStats').textContent =
            `${wordCount(f.content).toLocaleString('ru-RU')} слов · ~${readingTime(f.content)} мин чтения · ${views} просмотров (у вас)`;
        byId('fanficContent').innerHTML = renderMarkdown(f.content);

        const star = byId('starButton');
        const sync = () => { star.textContent = isFavorite(f.id) ? '★ В избранном' : '☆ В избранное'; };
        sync();
        star.onclick = () => { toggleFavorite(f.id); sync(); };

        byId('viewAuthorButton').onclick = () => showAuthor(f.author);

        const toggle = byId('toggleReadingMode');
        if (toggle) toggle.onclick = function () {
            const mc = document.querySelector('.modal-content.full-screen');
            mc.classList.toggle('light-mode');
            this.textContent = mc.classList.contains('light-mode') ? '☼' : '◐';
        };

        openModal('fanficModal');
    }

    function openFanfic(id) {
        const f = FANFICS.find(x => x.id === id);
        if (!f) return;
        if (f.nsfw) {
            openModal('nsfwWarningModal');
            const ok = byId('showNsfwContent'), no = byId('cancelNsfw');
            const cleanup = () => { ok.onclick = null; no.onclick = null; };
            ok.onclick = () => { byId('nsfwWarningModal').style.display = 'none'; cleanup(); showReader(f); };
            no.onclick = () => { byId('nsfwWarningModal').style.display = 'none'; cleanup(); };
        } else {
            showReader(f);
        }
    }

    /* ---------- author view ---------- */
    function showAuthor(name) {
        const works = FANFICS.filter(f => (f.author || '').trim() === (name || '').trim());
        byId('authorName').textContent = name;
        const totalWords = works.reduce((s, f) => s + wordCount(f.content), 0);
        const first = works.length
            ? new Date(Math.min(...works.map(f => new Date((f.created_at || '').replace(' ', 'T')))))
            : null;
        byId('authorStats').innerHTML = `
            <p><strong>Фанфиков:</strong> ${works.length}</p>
            <p><strong>Всего слов:</strong> ${totalWords.toLocaleString('ru-RU')}</p>
            ${first && !isNaN(first) ? `<p><strong>Первый фанфик:</strong> ${first.toLocaleDateString('ru-RU')}</p>` : ''}`;
        const list = byId('authorFanfics');
        list.innerHTML = works
            .slice().sort((a, b) => b.id - a.id)
            .map(f => `
                <div class="author-fanfic-item">
                    <h4>${escapeHtml(f.title)}</h4>
                    <p>${fmtDate(f.created_at)} • ${wordCount(f.content).toLocaleString('ru-RU')} слов</p>
                    <button class="read-button-small" data-id="${f.id}">Читать</button>
                </div>`).join('');
        list.querySelectorAll('.read-button-small').forEach(b =>
            b.onclick = () => { closeAllModals(); openFanfic(Number(b.dataset.id)); });
        openModal('authorModal');
    }

    /* ---------- favorites + stats modals ---------- */
    function showStarred() {
        const favs = getFavorites();
        const list = FANFICS.filter(f => favs.includes(f.id));
        const box = byId('starredFanficsList');
        if (!list.length) { box.innerHTML = '<p>Вы пока ничего не добавили в избранное.</p>'; }
        else {
            box.innerHTML = list.map(f => `
                <div class="author-fanfic-item">
                    <h4>${escapeHtml(f.title)}</h4>
                    <p>${escapeHtml(f.author)} • ${fmtDate(f.created_at)}</p>
                    <button class="read-button-small" data-id="${f.id}">Читать</button>
                </div>`).join('');
            box.querySelectorAll('.read-button-small').forEach(b =>
                b.onclick = () => { closeAllModals(); openFanfic(Number(b.dataset.id)); });
        }
        openModal('starredModal');
    }

    function showStats() {
        const total = FANFICS.length;
        const words = FANFICS.reduce((s, f) => s + wordCount(f.content), 0);
        const authors = new Set(FANFICS.map(f => f.author)).size;
        const nsfw = FANFICS.filter(f => f.nsfw).length;
        const views = getViews();
        const readLocal = Object.keys(views).length;
        byId('globalStats').innerHTML = `
            <p><strong>Фанфиков:</strong> ${total}</p>
            <p><strong>Авторов:</strong> ${authors}</p>
            <p><strong>Всего слов:</strong> ${words.toLocaleString('ru-RU')}</p>
            <p><strong>NSFW:</strong> ${nsfw}</p>
            <p><strong>Прочитано вами:</strong> ${readLocal}</p>`;
        openModal('statsModal');
    }

    /* ---------- boot ---------- */
    document.addEventListener('DOMContentLoaded', async function () {
        const container = byId('gistsList');
        container.textContent = 'Загрузка фанфиков…';
        try {
            const resp = await fetch(DATA_URL);
            if (!resp.ok) throw new Error('не удалось загрузить данные');
            FANFICS = await resp.json();
            FANFICS.sort((a, b) => b.id - a.id); // newest first
            renderGrid(FANFICS, container);
        } catch (err) {
            container.textContent = `Ошибка загрузки фанфиков: ${err.message}`;
            return;
        }

        byId('viewStarredButton')?.addEventListener('click', showStarred);
        byId('viewStatsButton')?.addEventListener('click', showStats);

        document.querySelectorAll('.close-modal').forEach(btn =>
            btn.onclick = () => btn.closest('.modal').style.display = 'none');
        window.addEventListener('click', e => {
            if (e.target.classList && e.target.classList.contains('modal')) e.target.style.display = 'none';
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });
    });
})();
