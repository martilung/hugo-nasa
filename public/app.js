// Kliendipoolne skript NASA päevapildi üle-ekraani ja nurgas asuva tekstikasti kuvamiseks

const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const contentState = document.getElementById('content-state');
const errorMessageEl = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');

const dateDisplayEl = document.getElementById('date-display');
const titleEl = document.getElementById('picture-title');
const imageEl = document.getElementById('space-image');
const openFullBtnEl = document.getElementById('open-full-btn');
const copyrightEl = document.getElementById('copyright-text');
const explanationEl = document.getElementById('picture-explanation');

const toggleTextBtn = document.getElementById('toggle-text-btn');
const panelBody = document.getElementById('panel-body');

let isCollapsed = false;

toggleTextBtn.addEventListener('click', () => {
  isCollapsed = !isCollapsed;
  if (isCollapsed) {
    panelBody.classList.add('hidden');
    contentState.classList.add('collapsed');
    toggleTextBtn.textContent = 'NÄITA TEKSTI';
    toggleTextBtn.setAttribute('aria-expanded', 'false');
  } else {
    panelBody.classList.remove('hidden');
    contentState.classList.remove('collapsed');
    toggleTextBtn.textContent = 'PEIDA TEKST';
    toggleTextBtn.setAttribute('aria-expanded', 'true');
  }
});

/**
 * Jagab pika trükitähtedes selgituse mugavalt loetavateks lõikudeks (2 lauset lõigus)
 */
function renderReadableParagraphs(container, uppercaseText) {
  container.innerHTML = '';
  const sentences = uppercaseText.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [uppercaseText];

  let group = [];
  sentences.forEach((sentence, idx) => {
    const cleaned = sentence.trim();
    if (cleaned) {
      group.push(cleaned);
    }
    if (group.length === 2 || idx === sentences.length - 1) {
      if (group.length > 0) {
        const p = document.createElement('p');
        p.textContent = group.join(' ');
        container.appendChild(p);
        group = [];
      }
    }
  });
}

/**
 * Kliendipoolne varutõlge juhuks, kui kõik serveripoolsed tõlketeenused on pilve-IP tõttu piiratud
 */
async function translateInBrowser(text) {
  if (!text || !text.trim()) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=et&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && Array.isArray(json[0])) {
        const translated = json[0].map((part) => (Array.isArray(part) ? part[0] : '')).join('').trim();
        if (translated) return translated;
      }
    }
  } catch (err) {
    console.warn('Kliendipoolne varutõlge ebaõnnestus:', err);
  }
  return text;
}

async function loadSpacePicture() {
  loadingState.classList.remove('hidden');
  errorState.classList.add('hidden');
  contentState.classList.add('hidden');

  try {
    const response = await fetch('/api/apod');
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || 'PILDI LAADIMINE EBAÕNNESTUS.');
    }

    let finalTitle = data.titleEt || data.titleOriginal || '';
    let finalExplanation = data.explanationEt || '';

    // Kui serveripoolne tõlge ei õnnestunud, teeme tõlke otse külastaja brauseris
    if (data.isTranslated === false) {
      const [browserTitle, browserExp] = await Promise.all([
        translateInBrowser(data.titleRawOriginal || data.titleOriginal || finalTitle),
        translateInBrowser(data.explanationOriginal || finalExplanation)
      ]);
      if (browserTitle) finalTitle = browserTitle.replace(/\s+/g, ' ').trim().toLocaleUpperCase('et-EE');
      if (browserExp) finalExplanation = browserExp.replace(/\s+/g, ' ').trim().toLocaleUpperCase('et-EE');
    }

    dateDisplayEl.textContent = data.formattedDate || data.date;
    titleEl.textContent = finalTitle;

    const fullUrl = data.hdImageUrl || data.imageUrl;
    imageEl.src = fullUrl;
    imageEl.alt = finalTitle || 'NASA PÄEVA KOSMOSEPILT';
    imageEl.classList.remove('hidden');

    openFullBtnEl.href = fullUrl;
    copyrightEl.textContent = `ALLIKAS: ${data.copyright || 'NASA'}`;

    renderReadableParagraphs(explanationEl, finalExplanation);

    loadingState.classList.add('hidden');
    contentState.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    errorMessageEl.textContent = (err.message || 'PILDI LAADIMINE EBAÕNNESTUS.').toLocaleUpperCase('et-EE');
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');
  }
}

retryBtn.addEventListener('click', loadSpacePicture);
document.addEventListener('DOMContentLoaded', loadSpacePicture);
