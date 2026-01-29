const DEFAULT_READING_SPEED = 200;

const elements = {
  loading: null,
  results: null,
  error: null,
  readingTime: null,
  wordCount: null,
  readingSpeed: null,
  readingSpeedValue: null,
  refreshBtn: null,
  presetBtns: null
};

function initElements() {
  elements.loading = document.getElementById('loading');
  elements.results = document.getElementById('results');
  elements.error = document.getElementById('error');
  elements.readingTime = document.getElementById('readingTime');
  elements.wordCount = document.getElementById('wordCount');
  elements.readingSpeed = document.getElementById('readingSpeed');
  elements.readingSpeedValue = document.getElementById('readingSpeedValue');
  elements.refreshBtn = document.getElementById('refreshBtn');
  elements.presetBtns = document.querySelectorAll('.preset-btn');
}

function showLoading() {
  elements.loading.classList.remove('hidden');
  elements.results.classList.add('hidden');
  elements.error.classList.add('hidden');
}

function showResults() {
  elements.loading.classList.add('hidden');
  elements.results.classList.remove('hidden');
  elements.error.classList.add('hidden');
}

function showError(message) {
  elements.loading.classList.add('hidden');
  elements.results.classList.add('hidden');
  elements.error.classList.remove('hidden');
  document.getElementById('errorMessage').textContent = message;
}

function calculateReadingTime(wordCount, wordsPerMinute) {
  if (wordCount === 0) return 0;
  const minutes = wordCount / wordsPerMinute;
  return Math.max(1, Math.ceil(minutes));
}

function formatTime(minutes) {
  if (minutes < 1) return '< 1 min';
  if (minutes === 1) return '1 min';
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

function formatWordCount(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k words`;
  }
  return `${count} words`;
}

function updateDisplay(wordCount, readingSpeed) {
  const minutes = calculateReadingTime(wordCount, readingSpeed);
  elements.readingTime.textContent = formatTime(minutes);
  elements.wordCount.textContent = formatWordCount(wordCount);
}

async function loadReadingSpeed() {
  try {
    const result = await chrome.storage.sync.get(['readingSpeed']);
    const speed = result.readingSpeed || DEFAULT_READING_SPEED;
    elements.readingSpeed.value = speed;
    elements.readingSpeedValue.value = speed;
    return speed;
  } catch (error) {
    console.error('Error loading reading speed:', error);
    return DEFAULT_READING_SPEED;
  }
}

async function saveReadingSpeed(speed) {
  try {
    await chrome.storage.sync.set({ readingSpeed: speed });
  } catch (error) {
    console.error('Error saving reading speed:', error);
  }
}

async function analyzeCurrentPage() {
  showLoading();
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      showError('Unable to access current tab');
      return;
    }

    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showError('Cannot analyze Chrome internal pages');
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent
    });

    if (!results || !results[0] || !results[0].result) {
      showError('Unable to extract page content');
      return;
    }

    const { wordCount } = results[0].result;
    
    if (wordCount === 0) {
      showError('No readable text found on this page');
      return;
    }

    const readingSpeed = await loadReadingSpeed();
    updateDisplay(wordCount, readingSpeed);
    showResults();
  } catch (error) {
    console.error('Error analyzing page:', error);
    showError('An error occurred while analyzing the page');
  }
}

function extractPageContent() {
  const elementsToExclude = [
    'script', 'style', 'noscript', 'iframe', 
    'nav', 'header', 'footer', 'aside',
    '[role="navigation"]', '[role="banner"]', 
    '[role="contentinfo"]', '[role="complementary"]'
  ];

  const selectors = elementsToExclude.join(', ');
  const excludedElements = document.querySelectorAll(selectors);
  
  excludedElements.forEach(el => {
    el.setAttribute('data-reading-time-exclude', 'true');
  });

  const bodyClone = document.body.cloneNode(true);
  const excludedInClone = bodyClone.querySelectorAll('[data-reading-time-exclude]');
  excludedInClone.forEach(el => el.remove());

  let text = bodyClone.innerText || bodyClone.textContent || '';
  
  text = text.replace(/\s+/g, ' ').trim();
  
  const words = text.split(/\s+/).filter(word => {
    return word.length > 0 && /[a-zA-Z0-9]/.test(word);
  });

  excludedElements.forEach(el => {
    el.removeAttribute('data-reading-time-exclude');
  });

  return {
    wordCount: words.length,
    text: text.substring(0, 500)
  };
}

function setupEventListeners() {
  elements.readingSpeed.addEventListener('input', (e) => {
    const speed = parseInt(e.target.value);
    elements.readingSpeedValue.value = speed;
    saveReadingSpeed(speed);
    
    const wordCountText = elements.wordCount.textContent;
    const wordCount = parseInt(wordCountText.replace(/[^\d]/g, ''));
    if (!isNaN(wordCount)) {
      updateDisplay(wordCount, speed);
    }
  });

  elements.readingSpeedValue.addEventListener('input', (e) => {
    let speed = parseInt(e.target.value);
    if (isNaN(speed)) return;
    
    speed = Math.max(100, Math.min(400, speed));
    e.target.value = speed;
    elements.readingSpeed.value = speed;
    saveReadingSpeed(speed);
    
    const wordCountText = elements.wordCount.textContent;
    const wordCount = parseInt(wordCountText.replace(/[^\d]/g, ''));
    if (!isNaN(wordCount)) {
      updateDisplay(wordCount, speed);
    }
  });

  elements.readingSpeedValue.addEventListener('blur', (e) => {
    let speed = parseInt(e.target.value);
    if (isNaN(speed) || speed < 100) {
      speed = 100;
    } else if (speed > 400) {
      speed = 400;
    }
    e.target.value = speed;
    elements.readingSpeed.value = speed;
  });

  elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = parseInt(btn.dataset.speed);
      elements.readingSpeed.value = speed;
      elements.readingSpeedValue.value = speed;
      saveReadingSpeed(speed);
      
      const wordCountText = elements.wordCount.textContent;
      const wordCount = parseInt(wordCountText.replace(/[^\d]/g, ''));
      if (!isNaN(wordCount)) {
        updateDisplay(wordCount, speed);
      }
    });
  });

  elements.refreshBtn.addEventListener('click', () => {
    analyzeCurrentPage();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initElements();
  setupEventListeners();
  analyzeCurrentPage();
});
