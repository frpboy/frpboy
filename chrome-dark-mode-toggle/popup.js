const getCurrentTab = () => new Promise((resolve) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    resolve(tabs[0]);
  });
});

const getHostnameFromTab = (tab) => {
  if (!tab?.url) return "";
  try {
    return new URL(tab.url).hostname;
  } catch (error) {
    return "";
  }
};

const elements = {
  toggleButton: document.getElementById("toggleButton"),
  statusText: document.getElementById("statusText"),
  hostname: document.getElementById("siteHostname"),
  segments: document.querySelectorAll(".segment"),
  whitelistButton: document.getElementById("whitelistButton"),
  blacklistButton: document.getElementById("blacklistButton")
};

const updateUI = (settings, hostname) => {
  const enabled = StorageUtils.isSiteEnabled(settings, hostname);
  elements.toggleButton.classList.toggle("active", enabled);
  elements.statusText.textContent = enabled ? "Enabled" : "Disabled";
  elements.hostname.textContent = hostname || "Unknown";

  elements.segments.forEach((segment) => {
    const level = segment.dataset.level;
    segment.classList.toggle("active", level === settings.darknessLevel);
  });

  const normalizedHost = StorageUtils.normalizeHostname(hostname);
  elements.whitelistButton.classList.toggle(
    "active",
    settings.whitelist.includes(normalizedHost)
  );
  elements.blacklistButton.classList.toggle(
    "active",
    settings.blacklist.includes(normalizedHost)
  );
};

const updateSettings = async (updater) => {
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  const settings = response.settings;
  const updated = await updater(settings);
  const result = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    settings: updated
  });
  return result.settings;
};

const toggleCurrentSite = async (hostname) => {
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  const settings = response.settings;
  const enabled = !StorageUtils.isSiteEnabled(settings, hostname);
  const updated = {
    ...settings,
    sitePreferences: {
      ...settings.sitePreferences,
      [StorageUtils.normalizeHostname(hostname)]: { enabled }
    }
  };
  const result = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    settings: updated
  });
  return result.settings;
};

const updateListStatus = async (listName, hostname) => {
  const normalizedHost = StorageUtils.normalizeHostname(hostname);
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  const settings = response.settings;
  const list = new Set(settings[listName]);
  const action = list.has(normalizedHost) ? "remove" : "add";
  const updatedSettings = await chrome.runtime.sendMessage({
    type: "UPDATE_LIST",
    listName,
    hostname: normalizedHost,
    action
  });
  return updatedSettings.settings;
};

const initPopup = async () => {
  const tab = await getCurrentTab();
  const hostname = getHostnameFromTab(tab);
  const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  let settings = response.settings;
  updateUI(settings, hostname);

  elements.toggleButton.addEventListener("click", async () => {
    settings = await toggleCurrentSite(hostname);
    updateUI(settings, hostname);
  });

  elements.segments.forEach((segment) => {
    segment.addEventListener("click", async () => {
      const level = segment.dataset.level;
      settings = await updateSettings((current) => ({
        ...current,
        darknessLevel: level
      }));
      updateUI(settings, hostname);
    });
  });

  elements.whitelistButton.addEventListener("click", async () => {
    settings = await updateListStatus("whitelist", hostname);
    updateUI(settings, hostname);
  });

  elements.blacklistButton.addEventListener("click", async () => {
    settings = await updateListStatus("blacklist", hostname);
    updateUI(settings, hostname);
  });
};

initPopup();

// Dark Mode Toggle by frpboy (https://github.com/frpboy)
