importScripts("storage.js");

const getActiveTab = () => new Promise((resolve) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    resolve(tabs[0]);
  });
});

const broadcastSettings = (settings, tabId) => {
  if (tabId) {
    chrome.tabs.sendMessage(tabId, { type: "DARK_MODE_TOGGLE_UPDATE", settings });
    return;
  }
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "DARK_MODE_TOGGLE_UPDATE", settings });
      }
    });
  });
};

const toggleForActiveTab = async () => {
  const tab = await getActiveTab();
  if (!tab?.url) return;
  let hostname = "";
  try {
    hostname = new URL(tab.url).hostname;
  } catch (error) {
    hostname = "";
  }
  if (!hostname) return;

  const settings = await StorageUtils.getSettings();
  const currentlyEnabled = StorageUtils.isSiteEnabled(settings, hostname);
  settings.sitePreferences = {
    ...settings.sitePreferences,
    [hostname]: { enabled: !currentlyEnabled }
  };
  await StorageUtils.saveSettings(settings);
  broadcastSettings(settings, tab.id);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_SETTINGS") {
    StorageUtils.getSettings().then((settings) => sendResponse({ settings }));
    return true;
  }

  if (message?.type === "SAVE_SETTINGS") {
    StorageUtils.saveSettings(message.settings).then((settings) => {
      broadcastSettings(settings);
      sendResponse({ settings });
    });
    return true;
  }

  if (message?.type === "TOGGLE_SITE") {
    const { hostname, enabled } = message;
    StorageUtils.setSitePreference(hostname, enabled).then((settings) => {
      broadcastSettings(settings);
      sendResponse({ settings });
    });
    return true;
  }

  if (message?.type === "REMOVE_SITE_PREFERENCE") {
    StorageUtils.removeSitePreference(message.hostname).then((settings) => {
      broadcastSettings(settings);
      sendResponse({ settings });
    });
    return true;
  }

  if (message?.type === "UPDATE_LIST") {
    const { listName, hostname, action } = message;
    const handler = action === "remove"
      ? StorageUtils.removeFromList
      : StorageUtils.addToList;
    handler(listName, hostname).then((settings) => {
      broadcastSettings(settings);
      sendResponse({ settings });
    });
    return true;
  }

  return false;
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-dark-mode") {
    toggleForActiveTab();
  }
});

// Dark Mode Toggle by frpboy (https://github.com/frpboy)
