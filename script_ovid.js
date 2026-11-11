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
const searchInput = document.getElementById('searchInput');
const searchStatus = document.getElementById('searchStatus');
const backToTop = document.getElementById('backToTop');
let currentData = null;
let currentQuery = '';
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
    currentData = data;
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
    const searchRegex = buildSearchRegex(currentQuery);
    let matchCount = 0;
    const table = document.createElement('table');
    table.className = 'aligned-table';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const thNum = document.createElement('th');
    thNum.className = 'line-number';
    thNum.textContent = '';
    const thLat = document.createElement('th');
    thLat.textContent = 'Latin';
    headerRow.appendChild(thNum);
    headerRow.appendChild(thLat);
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    lines.forEach(line => {
        const lineRanges = findMatchRanges(line.text, searchRegex);
        matchCount += lineRanges.length;
        const tr = document.createElement('tr');
        const numTd = document.createElement('td');
        numTd.className = 'line-number';
        numTd.textContent = line.number;
        tr.appendChild(numTd);
        const latTd = document.createElement('td');
        latTd.className = 'latin-text';
        latTd.innerHTML = processLineToHTML(line.text, lineRanges);
        tr.appendChild(latTd);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    display.appendChild(table);
    const translation = document.createElement('section');
    translation.className = 'english-translation';
    const translationHeading = document.createElement('h2');
    translationHeading.className = 'translation-heading';
    translationHeading.textContent = 'English translation';
    translation.appendChild(translationHeading);
    translations.forEach(trans => {
        const paragraphRanges = findMatchRanges(trans.text, searchRegex);
        matchCount += paragraphRanges.length;
        const paragraph = document.createElement('p');
        paragraph.className = 'english-paragraph';
        paragraph.innerHTML = renderTextWithMarks(trans.text, 0, paragraphRanges);
        translation.appendChild(paragraph);
    });
    display.appendChild(translation);
    updateSearchStatus(matchCount);
}
select.addEventListener('change', function() {
    const id = this.value;
    if (!id) {
        currentData = null;
        searchStatus.textContent = '';
        document.getElementById('displayArea').innerHTML = '';
        return;
    }
    const displayLoad = document.getElementById('displayArea');
    displayLoad.innerHTML = '<p>Loading…</p>';
    letterLoad(id).then(data => {
        letterRender(data);
    }).catch(error => {
        currentData = null;
        searchStatus.textContent = '';
        displayLoad.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    });
});
function processLineToHTML(lineText, searchRanges) {
    if (!lineText) return '';
    const tokens = lineText.match(/\S+|\s+/g);
    if (!tokens) return escapeHTML(lineText);
    const ranges = searchRanges || [];
    let position = 0;
    const parts = tokens.map(token => {
        const tokenStart = position;
        position += token.length;
        if (/^\s+$/.test(token)) {
            return renderTextWithMarks(token, tokenStart, ranges);
        }
        const cleaned = token.replace(/^[^\p{L}\p{M}']+|[^\p{L}\p{M}']+$/gu, '');
        if (cleaned.length === 0) {
            return renderTextWithMarks(token, tokenStart, ranges);
        }
        const safeAttr = cleaned.replace(/"/g, '&quot;');
        const url = getLogeionMorphoURL(cleaned);
        return `<a class="word-clickable" data-clean="${safeAttr}" href="${url}" target="_blank" rel="noopener">${renderTextWithMarks(token, tokenStart, ranges)}</a>`;
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
function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function buildSearchRegex(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) return null;
    const pattern = escapeRegExp(trimmed).replace(/\s+/g, '\\s+');
    return new RegExp(pattern, 'gi');
}
function findMatchRanges(text, regex) {
    const ranges = [];
    if (!text || !regex) return ranges;
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match[0].length === 0) {
            regex.lastIndex++;
            continue;
        }
        ranges.push([match.index, match.index + match[0].length]);
    }
    return ranges;
}
function renderTextWithMarks(text, offset, ranges) {
    if (!ranges || ranges.length === 0) return escapeHTML(text);
    const end = offset + text.length;
    let html = '';
    let pos = 0;
    ranges.forEach(range => {
        const rangeStart = Math.max(range[0], offset);
        const rangeEnd = Math.min(range[1], end);
        if (rangeEnd <= rangeStart) return;
        if (rangeStart > offset + pos) {
            html += escapeHTML(text.slice(pos, rangeStart - offset));
        }
        html += `<mark class="search-match">${escapeHTML(text.slice(rangeStart - offset, rangeEnd - offset))}</mark>`;
        pos = rangeEnd - offset;
    });
    if (pos < text.length) {
        html += escapeHTML(text.slice(pos));
    }
    return html;
}
function updateSearchStatus(count) {
    if (!currentData || !currentQuery.trim()) {
        searchStatus.textContent = '';
        return;
    }
    if (count === 0) {
        searchStatus.textContent = 'No matches';
    } else if (count === 1) {
        searchStatus.textContent = '1 match';
    } else {
        searchStatus.textContent = count + ' matches';
    }
}
searchInput.addEventListener('input', function() {
    currentQuery = this.value;
    if (currentData) {
        letterRender(currentData);
    } else {
        searchStatus.textContent = '';
    }
});
searchInput.addEventListener('keydown', function(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const firstMatch = document.querySelector('#displayArea .search-match');
    if (firstMatch) {
        firstMatch.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'center'
        });
    }
});
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function updateBackToTop() {
    if (window.scrollY > 400) {
        backToTop.classList.add('is-visible');
    } else {
        backToTop.classList.remove('is-visible');
    }
}
window.addEventListener('scroll', updateBackToTop, { passive: true });
backToTop.addEventListener('click', function() {
    window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    });
});
updateBackToTop();
