const DATA_PATH = 'DATA/';
function letterLoad(id) {
    const fileName = `epistula_${id}.json`;
    return fetch(DATA_PATH + fileName).then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load ${fileName}`);
        }
        return response.json();
    });
}
const select = document.getElementById('letterSelect');
function toRoman(num) {
    const romanNums = [
        '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
        'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'
    ];
    return romanNums[num];
}
for (let i = 1; i <= 21; i++) {
    const option = document.createElement('option');
    const roman = toRoman(i);
    option.value = i;
    option.textContent = roman;
    select.appendChild(option);
}
function letterRender(data) {
    const display = document.getElementById('displayArea');
    display.innerHTML = '';
    const sender = data.epistles[0].sender;
    const recipient = data.epistles[0].recipient;
    const infoDiv = document.createElement('div');
    infoDiv.className = 'letter-info';
    infoDiv.innerHTML = `<p style="text-align: center; font-size: 1.1rem; margin: 0 0 1rem 0; color: #444;">
          <strong>Sender:</strong> ${sender} &nbsp;|&nbsp;
          <strong>Recipient:</strong> ${recipient}
        </p>`;
    display.appendChild(infoDiv);
    const lines = data.epistles[0].lines;
    const translations = data.epistles[0].translations;
    const table = document.createElement('table');
    table.className = 'aligned-table';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const thNum = document.createElement('th');
    thNum.className = 'line-number';
    thNum.textContent = '';
    const thLat = document.createElement('th');
    thLat.textContent = 'Latin';
    const thEng = document.createElement('th');
    thEng.textContent = 'English';
    headerRow.appendChild(thNum);
    headerRow.appendChild(thLat);
    headerRow.appendChild(thEng);
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    lines.forEach((line, index) => {
        const tr = document.createElement('tr');
        const numTd = document.createElement('td');
        numTd.className = 'line-number';
        numTd.textContent = line.number;
        tr.appendChild(numTd);
        const latTd = document.createElement('td');
        latTd.className = 'latin-text';
        latTd.innerHTML = processLineToHTML(line.text);
        tr.appendChild(latTd);
        if (index === 0) {
            const engTd = document.createElement('td');
            engTd.className = 'english-text';
            engTd.setAttribute('rowspan', lines.length);
            translations.forEach(trans => {
                const paragraph = document.createElement('p');
                paragraph.textContent = trans.text;
                engTd.appendChild(paragraph);
            });
            tr.appendChild(engTd);
        }
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    display.appendChild(table);
    resetSearchState();
}
select.addEventListener('change', function() {
    const id = this.value;
    if (!id) {
        document.getElementById('displayArea').innerHTML = '';
        resetSearchState();
        return;
    }
    const displayLoad = document.getElementById('displayArea');
    displayLoad.innerHTML = '<p>Loading…</p>';
    letterLoad(id).then(data => {
        letterRender(data);
    }).catch(error => {
        displayLoad.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    });
});
function processLineToHTML(lineText) {
    if (!lineText) return '';
    const tokens = lineText.match(/\S+|\s+/g);
    if (!tokens) return escapeHTML(lineText);
    const parts = tokens.map(token => {
        if (/^\s+$/.test(token)) return token;
        const cleaned = token.replace(/^[^\p{L}\p{M}']+|[^\p{L}\p{M}']+$/gu, '');
        if (cleaned.length === 0) return escapeHTML(token);
        const safeDisplay = escapeHTML(token);
        const safeAttr = cleaned.replace(/"/g, '&quot;');
        const url = getLogeionMorphoURL(cleaned);
        return `<a class="word-clickable" data-clean="${safeAttr}" href="${url}" target="_blank" rel="noopener">${safeDisplay}</a>`;
    });
    return parts.join('');
}
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
function getLogeionMorphoURL(cleanWord) {
    const encoded = encodeURIComponent(cleanWord).replace(/'/g, '%27');
    return `https://logeion.uchicago.edu/morpho/${encoded}`;
}

/* ---- Back-to-top button ---- */
const backToTop = document.getElementById('backToTop');
function updateBackToTop() {
    if (window.scrollY > 400) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
}
window.addEventListener('scroll', updateBackToTop, { passive: true });
updateBackToTop();
backToTop.addEventListener('click', function() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    backToTop.blur();
});

/* ---- Search (Latin and English) ---- */
const searchInput = document.getElementById('searchInput');
const searchStatus = document.getElementById('searchStatus');
let searchMatches = [];
let searchIndex = -1;
let lastQuery = '';
function updateSearchStatus(text) {
    searchStatus.textContent = text;
}
function collectSearchContainers() {
    const display = document.getElementById('displayArea');
    const latinCells = Array.from(display.querySelectorAll('.latin-text'));
    const englishParagraphs = Array.from(display.querySelectorAll('.english-text p'));
    return latinCells.concat(englishParagraphs);
}
function collectTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    let node = walker.nextNode();
    while (node) {
        nodes.push(node);
        node = walker.nextNode();
    }
    return nodes;
}
function wrapTextSegment(node, start, end) {
    const text = node.nodeValue;
    if (!text || end <= start) return;
    const parent = node.parentNode;
    if (!parent) return;
    const matchText = text.slice(start, end);
    const rest = text.slice(end);
    const mark = document.createElement('mark');
    mark.className = 'search-hit';
    mark.textContent = matchText;
    if (rest) {
        parent.insertBefore(document.createTextNode(rest), node.nextSibling);
    }
    parent.insertBefore(mark, node.nextSibling);
    node.nodeValue = text.slice(0, start);
}
function highlightInContainer(container, query) {
    const nodes = collectTextNodes(container);
    if (nodes.length === 0) return;
    const spans = [];
    let fullText = '';
    nodes.forEach(node => {
        const start = fullText.length;
        fullText += node.nodeValue;
        spans.push({ node: node, start: start, end: fullText.length });
    });
    const haystack = fullText.toLowerCase();
    const needle = query.toLowerCase();
    if (!needle) return;
    const segmentsByNode = new Map();
    let from = haystack.indexOf(needle);
    while (from !== -1) {
        const to = from + needle.length;
        spans.forEach(span => {
            if (span.end <= from || span.start >= to) return;
            const localStart = Math.max(from, span.start) - span.start;
            const localEnd = Math.min(to, span.end) - span.start;
            if (localEnd <= localStart) return;
            if (!segmentsByNode.has(span.node)) {
                segmentsByNode.set(span.node, []);
            }
            segmentsByNode.get(span.node).push({ start: localStart, end: localEnd });
        });
        from = haystack.indexOf(needle, to);
    }
    segmentsByNode.forEach((segments, node) => {
        segments.sort((a, b) => b.start - a.start);
        segments.forEach(segment => {
            wrapTextSegment(node, segment.start, segment.end);
        });
    });
}
function clearHighlights() {
    const marks = document.querySelectorAll('#displayArea mark.search-hit');
    const parents = new Set();
    marks.forEach(mark => {
        const parent = mark.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parents.add(parent);
    });
    parents.forEach(parent => parent.normalize());
    searchMatches = [];
    searchIndex = -1;
}
function runSearch(query) {
    clearHighlights();
    updateSearchStatus('');
    const containers = collectSearchContainers();
    containers.forEach(container => {
        highlightInContainer(container, query);
    });
    let matches = [];
    containers.forEach(container => {
        matches = matches.concat(Array.from(container.querySelectorAll('mark.search-hit')));
    });
    searchMatches = matches;
    if (searchMatches.length === 0) {
        updateSearchStatus('No matches');
        return;
    }
    searchIndex = 0;
    showMatch(0);
}
function showMatch(index) {
    searchMatches.forEach(mark => mark.classList.remove('search-current'));
    const mark = searchMatches[index];
    if (!mark) return;
    mark.classList.add('search-current');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    mark.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    updateSearchStatus((index + 1) + ' / ' + searchMatches.length);
}
function resetSearchState() {
    clearHighlights();
    lastQuery = '';
    updateSearchStatus('');
}
searchInput.addEventListener('input', function() {
    if (this.value.trim() === lastQuery) return;
    clearHighlights();
    lastQuery = '';
    updateSearchStatus('');
});
searchInput.addEventListener('keydown', function(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const query = this.value.trim();
    if (!query) {
        clearHighlights();
        lastQuery = '';
        updateSearchStatus('');
        return;
    }
    if (query !== lastQuery || searchMatches.length === 0) {
        lastQuery = query;
        runSearch(query);
        return;
    }
    if (event.shiftKey) {
        searchIndex = (searchIndex - 1 + searchMatches.length) % searchMatches.length;
    } else {
        searchIndex = (searchIndex + 1) % searchMatches.length;
    }
    showMatch(searchIndex);
});
