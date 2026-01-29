/* Quick Notes - Chrome Extension
 * Author: frpboy (https://github.com/frpboy)
 * Background service worker for extension lifecycle management
 */

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Quick Notes installed successfully');
    
    // Initialize storage with empty notes array
    chrome.storage.local.set({
      'quick-notes-data': []
    }).then(() => {
      console.log('Quick Notes: Storage initialized');
    }).catch(error => {
      console.error('Quick Notes: Failed to initialize storage:', error);
    });
    
    // Open welcome page or show notification
    chrome.action.setBadgeText({
      text: 'NEW'
    });
    
    setTimeout(() => {
      chrome.action.setBadgeText({
        text: ''
      });
    }, 24 * 60 * 60 * 1000); // Clear after 24 hours
  }
  
  if (details.reason === 'update') {
    console.log('Quick Notes updated to version', chrome.runtime.getManifest().version);
  }
});

// Extension startup handler
chrome.runtime.onStartup.addListener(() => {
  console.log('Quick Notes: Browser started, extension ready');
  
  // Perform any necessary cleanup or initialization
  chrome.storage.local.get('quick-notes-data').then(result => {
    if (!result['quick-notes-data']) {
      chrome.storage.local.set({
        'quick-notes-data': []
      });
    }
  }).catch(error => {
    console.error('Quick Notes: Failed to check storage on startup:', error);
  });
});

// Message handler for potential future inter-extension communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Quick Notes: Message received', message);
  
  // Handle different message types
  switch (message.type) {
    case 'GET_NOTES_COUNT':
      chrome.storage.local.get('quick-notes-data').then(result => {
        const notes = result['quick-notes-data'] || [];
        sendResponse({ count: notes.length });
      }).catch(error => {
        console.error('Quick Notes: Failed to get notes count:', error);
        sendResponse({ count: 0, error: error.message });
      });
      return true; // Keep message channel open for async response
      
    case 'BACKUP_NOTES':
      // Handle backup request if needed in future
      sendResponse({ success: true });
      break;
      
    default:
      console.warn('Quick Notes: Unknown message type', message.type);
  }
});

// Storage change listener to monitor data modifications
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes['quick-notes-data']) {
    const newNotes = changes['quick-notes-data'].newValue || [];
    const oldNotes = changes['quick-notes-data'].oldValue || [];
    
    // Log storage changes for debugging
    if (newNotes.length !== oldNotes.length) {
      console.log(`Quick Notes: Note count changed from ${oldNotes.length} to ${newNotes.length}`);
    }
    
    // Could add sync functionality here in future
    // e.g., sync to cloud storage, trigger notifications, etc.
  }
});

// Alarm handler for periodic tasks (if needed in future)
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Quick Notes: Alarm triggered', alarm);
  
  // Handle different alarm types
  switch (alarm.name) {
    case 'cleanup':
      // Perform periodic cleanup if needed
      break;
      
    case 'sync':
      // Perform sync if cloud sync is implemented
      break;
  }
});

// Context menu setup (optional feature for future)
chrome.runtime.onInstalled.addListener(() => {
  // Could add context menu item to save selected text as note
  // Disabled by default to keep extension lightweight
  /*
  chrome.contextMenus.create({
    id: 'save-as-note',
    title: 'Save as Quick Note',
    contexts: ['selection']
  });
  */
});

// Context menu click handler (if context menu is enabled)
/*
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-as-note') {
    const selectedText = info.selectionText;
    if (selectedText) {
      // Save selected text as a new note
      chrome.storage.local.get('quick-notes-data').then(result => {
        const notes = result['quick-notes-data'] || [];
        const newNote = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2),
          content: selectedText.trim(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          sourceUrl: info.pageUrl
        };
        
        notes.unshift(newNote);
        
        return chrome.storage.local.set({ 'quick-notes-data': notes });
      }).then(() => {
        console.log('Quick Notes: Saved selected text as note');
        
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Quick Notes',
          message: 'Selected text saved as note'
        });
      }).catch(error => {
        console.error('Quick Notes: Failed to save selected text:', error);
      });
    }
  }
});
*/

// Performance monitoring
const performanceMonitor = {
  startTime: Date.now(),
  
  logStartupTime() {
    const startupTime = Date.now() - this.startTime;
    console.log(`Quick Notes: Extension started in ${startupTime}ms`);
  }
};

// Log startup time after initialization
setTimeout(() => {
  performanceMonitor.logStartupTime();
}, 100);

console.log('Quick Notes: Background service worker loaded successfully');
