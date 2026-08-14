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

    let englishSkip = 0;

    lines.forEach(line => {
        const tr = document.createElement('tr');

        const numTd = document.createElement('td');
        numTd.className = 'line-number';
        numTd.textContent = line.number;
        tr.appendChild(numTd);

        const latTd = document.createElement('td');
        latTd.className = 'latin-text';
        latTd.innerHTML = processLineToHTML(line.text);
        tr.appendChild(latTd);

        if (englishSkip > 0) {
            englishSkip--;
        } else {
            const trans = translations.find(t => line.number >= t.startLine && line.number <= t.endLine);

            if (trans) {
                const engTd = document.createElement('td');
                engTd.className = 'english-text';

                const spanLength = trans.endLine - trans.startLine + 1;

                if (spanLength > 1) {
                    engTd.setAttribute('rowspan', spanLength);
                    englishSkip = spanLength - 1;
                }

                const range = trans.startLine + (trans.endLine > trans.startLine ? `–${trans.endLine}` : '');
                engTd.innerHTML = `<span class="translation-range">Lines ${range}:</span> ${escapeHTML(trans.text)}`;
                tr.appendChild(engTd);
            } else {
                const engTd = document.createElement('td');
                engTd.className = 'english-text';
                engTd.textContent = '';
                tr.appendChild(engTd);
            }
        }

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    display.appendChild(table);
}

// ============= LOAD LETTER ON SELECT CHANGE =============
select.addEventListener('change', function() {
    const id = this.value;
    if (!id) {
        document.getElementById('displayArea').innerHTML = '';
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

// ============= HELPER: TURN A LINE INTO CLICKABLE HTML =============
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