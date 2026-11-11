
const DATA_PATH = 'DATA/';

// ========================================
// HTML ELEMENTS
// ========================================

const select = document.getElementById('letterSelect');
const display = document.getElementById('displayArea');

const readingControls = document.getElementById('readingControls');
const searchInput = document.getElementById('textSearch');
const searchStatus = document.getElementById('searchStatus');

const backToTopButton = document.getElementById('backToTop');

// Currently displayed poem and its searchable elements.
let currentContent = null;

// Prevent an earlier fetch from overwriting a newer selection.
let activeLoadId = 0;


// ========================================
// 1. LOAD JSON FILE
// ========================================

function letterLoad(id) {
    const fileName = `epistula_${id}.json`;

    return fetch(DATA_PATH + fileName)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load ${fileName}`);
            }

            return response.json();
        });
}


// ========================================
// 2. ROMAN NUMERALS AND POEM SELECTOR
// ========================================

function toRoman(num) {
    const romanNums = [
        '',
        'I', 'II', 'III', 'IV', 'V',
        'VI', 'VII', 'VIII', 'IX', 'X',
        'XI', 'XII', 'XIII', 'XIV', 'XV',
        'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
        'XXI'
    ];

    return romanNums[num] || '';
}

// Populate the poem selector.
for (let i = 1; i <= 21; i++) {
    const option = document.createElement('option');

    option.value = i;
    option.textContent = toRoman(i);

    select.appendChild(option);
}


// ========================================
// 3. CREATE TEXT SECTION
// ========================================

function createSection(className, headingText) {
    const section = document.createElement('section');

    section.className = `text-section ${className}`;

    const heading = document.createElement('h2');
    heading.textContent = headingText;

    section.appendChild(heading);

    return section;
}


// ========================================
// 4. RENDER SELECTED POEM
// ========================================

function letterRender(data) {
    display.replaceChildren();

    searchInput.value = '';
    searchStatus.textContent = '';

    const epistle = data?.epistles?.[0];

    if (!epistle) {
        display.textContent = 'No poem data was found.';
        readingControls.hidden = true;
        currentContent = null;
        return;
    }

    readingControls.hidden = false;

    const lines = Array.isArray(epistle.lines)
        ? epistle.lines
        : [];

    const translations = Array.isArray(epistle.translations)
        ? epistle.translations
        : [];


    // ====================================
    // 4A. SENDER AND RECIPIENT
    // ====================================

    const infoDiv = document.createElement('div');
    infoDiv.className = 'letter-info';

    const infoParagraph = document.createElement('p');

    const senderLabel = document.createElement('strong');
    senderLabel.textContent = 'Sender:';

    const recipientLabel = document.createElement('strong');
    recipientLabel.textContent = 'Recipient:';

    infoParagraph.append(
        senderLabel,
        document.createTextNode(` ${epistle.sender || 'Unknown'} | `),
        recipientLabel,
        document.createTextNode(` ${epistle.recipient || 'Unknown'}`)
    );

    infoDiv.appendChild(infoParagraph);
    display.appendChild(infoDiv);


    // ====================================
    // 4B. CREATE LATIN AND ENGLISH SECTIONS
    // ====================================

    const columns = document.createElement('div');
    columns.className = 'text-columns';

    const latinSection = createSection(
        'latin-section',
        'Latin'
    );

    const englishSection = createSection(
        'english-section',
        'English'
    );


    // ====================================
    // 4C. RENDER LATIN VERSES
    // ====================================

    const latinContainer = document.createElement('div');
    latinContainer.className = 'latin-lines';

    const latinItems = [];

    lines.forEach(line => {
        const row = document.createElement('div');
        row.className = 'latin-line';

        // Verse number.
        const number = document.createElement('span');
        number.className = 'line-number';
        number.textContent = line.number ?? '';

        // Latin verse.
        const latinText = document.createElement('span');
        latinText.className = 'latin-content';
        latinText.innerHTML = processLineToHTML(line.text);

        row.append(number, latinText);
        latinContainer.appendChild(row);

        // Store verse for searching.
        latinItems.push({
            element: row,
            searchText: line.text || ''
        });
    });

    latinSection.appendChild(latinContainer);


    // ====================================
    // 4D. RENDER ENGLISH PARAGRAPHS
    // ====================================

    const englishContainer = document.createElement('div');
    englishContainer.className = 'english-paragraphs';

    const englishItems = [];

    translations.forEach(translation => {
        const paragraph = document.createElement('p');

        paragraph.className = 'english-paragraph';

        // Each translation object becomes one paragraph.
        // No Latin line matching takes place here.
        paragraph.textContent = translation.text || '';

        englishContainer.appendChild(paragraph);

        // Store paragraph for searching.
        englishItems.push({
            element: paragraph,
            searchText: translation.text || ''
        });
    });

    englishSection.appendChild(englishContainer);


    // ====================================
    // 4E. PUT EVERYTHING ON THE PAGE
    // ====================================

    columns.append(
        latinSection,
        englishSection
    );

    display.appendChild(columns);


    // Store references for the search function.
    currentContent = {
        latinSection,
        englishSection,
        latinItems,
        englishItems
    };

    updateSearch();
}


// ========================================
// 5. SEARCH NORMALIZATION
// ========================================

// Case-insensitive search.
// Removes diacritical marks so users can search
// Latin with or without macrons.

function normalizeSearchText(text) {
    return String(text ?? '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLocaleLowerCase();
}


// ========================================
// 6. SEARCH LATIN AND ENGLISH
// ========================================

function updateSearch() {
    if (!currentContent) {
        return;
    }

    const query = normalizeSearchText(
        searchInput.value.trim()
    );

    let latinMatches = 0;
    let englishMatches = 0;


    // ====================================
    // SEARCH LATIN VERSES
    // ====================================

    currentContent.latinItems.forEach(item => {
        const matches = query === '' ||
            normalizeSearchText(item.searchText).includes(query);

        item.element.hidden = !matches;

        item.element.classList.toggle(
            'is-match',
            query !== '' && matches
        );

        if (matches) {
            latinMatches++;
        }
    });


    // ====================================
    // SEARCH ENGLISH PARAGRAPHS
    // ====================================

    currentContent.englishItems.forEach(item => {
        const matches = query === '' ||
            normalizeSearchText(item.searchText).includes(query);

        item.element.hidden = !matches;

        item.element.classList.toggle(
            'is-match',
            query !== '' && matches
        );

        if (matches) {
            englishMatches++;
        }
    });


    // ====================================
    // HIDE EMPTY SECTIONS
    // ====================================

    currentContent.latinSection.hidden =
        query !== '' && latinMatches === 0;

    currentContent.englishSection.hidden =
        query !== '' && englishMatches === 0;


    // ====================================
    // DISPLAY SEARCH STATUS
    // ====================================

    if (query === '') {
        searchStatus.textContent = '';
        return;
    }

    if (latinMatches + englishMatches === 0) {
        searchStatus.textContent =
            'No matches found in this poem.';

        return;
    }

    const latinLabel = latinMatches === 1
        ? 'Latin verse'
        : 'Latin verses';

    const englishLabel = englishMatches === 1
        ? 'English paragraph'
        : 'English paragraphs';

    searchStatus.textContent =
        `Found ${latinMatches} ${latinLabel} and ` +
        `${englishMatches} ${englishLabel}.`;
}


// Search as the user types.
searchInput.addEventListener('input', updateSearch);


// ========================================
// 7. LOAD POEM WHEN SELECTED
// ========================================

select.addEventListener('change', function () {
    const id = this.value;

    // Generate a unique ID for this loading request.
    const loadId = ++activeLoadId;

    // Empty selection.
    if (!id) {
        display.replaceChildren();

        readingControls.hidden = true;
        searchInput.value = '';
        searchStatus.textContent = '';

        currentContent = null;

        return;
    }

    // Reset previous poem.
    currentContent = null;

    readingControls.hidden = true;
    searchInput.value = '';
    searchStatus.textContent = '';

    display.textContent = 'Loading…';

    letterLoad(id)
        .then(data => {

            // Ignore results from an older request.
            if (loadId !== activeLoadId) {
                return;
            }

            letterRender(data);
        })
        .catch(error => {

            // Ignore errors from an older request.
            if (loadId !== activeLoadId) {
                return;
            }

            display.replaceChildren();

            const errorParagraph = document.createElement('p');
            errorParagraph.className = 'error';
            errorParagraph.textContent = `Error: ${error.message}`;

            display.appendChild(errorParagraph);
        });
});


// ========================================
// 8. MAKE LATIN WORDS CLICKABLE
// ========================================

function processLineToHTML(lineText) {
    if (!lineText) {
        return '';
    }

    // Split the line into words and whitespace.
    // Whitespace is preserved.
    const tokens = String(lineText).match(/\S+|\s+/gu);

    if (!tokens) {
        return escapeHTML(lineText);
    }

    const parts = tokens.map(token => {

        // Preserve whitespace.
        if (/^\s+$/u.test(token)) {
            return token;
        }

        // Remove punctuation at the beginning and end.
        // Keep Latin letters, diacritics and apostrophes.
        const cleaned = token.replace(
            /^[^\p{L}\p{M}']+|[^\p{L}\p{M}']+$/gu,
            ''
        );

        // If there are no letters, leave the token unchanged.
        if (!cleaned) {
            return escapeHTML(token);
        }

        const url = getLogeionMorphoURL(cleaned);

        return (
            `<a class="word-clickable" ` +
            `href="${url}" ` +
            `target="_blank" ` +
            `rel="noopener noreferrer">` +
            `${escapeHTML(token)}</a>`
        );
    });

    return parts.join('');
}


// ========================================
// 9. HTML ESCAPING
// ========================================

function escapeHTML(str) {
    const characters = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };

    return String(str).replace(
        /[&<>"']/g,
        character => characters[character]
    );
}


// ========================================
// 10. LOGEION MORPHOLOGY URL
// ========================================

function getLogeionMorphoURL(cleanWord) {
    const encoded = encodeURIComponent(cleanWord)
        .replace(/'/g, '%27');

    return `https://logeion.uchicago.edu/morpho/${encoded}`;
}


// ========================================
// 11. BACK TO TOP BUTTON
// ========================================

function updateBackToTopButton() {
    const shouldShow = window.scrollY > 300;

    backToTopButton.classList.toggle(
        'is-visible',
        shouldShow
    );
}


// Show the button when scrolling down.
window.addEventListener(
    'scroll',
    updateBackToTopButton,
    { passive: true }
);


// Return to the top when clicked.
backToTopButton.addEventListener('click', function () {
    const reduceMotion = window.matchMedia &&
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

    window.scrollTo({
        top: 0,
        behavior: reduceMotion ? 'auto' : 'smooth'
    });
});


// Set initial button visibility.
updateBackToTopButton();
