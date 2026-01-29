function analyzePageContent() {
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
    characterCount: text.length
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeContent') {
    try {
      const result = analyzePageContent();
      sendResponse({ success: true, data: result });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});
