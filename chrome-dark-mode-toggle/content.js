const applyDarkMode = (enabled, level) => {
  const root = document.documentElement;
  if (!root) return;
  const styleId = "dark-mode-toggle-style";
  let styleTag = document.getElementById(styleId);

  if (enabled) {
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(styleTag);
      }
    }
    styleTag.textContent = DarkModeStyles.getStyleText(level);
    root.classList.add(DarkModeStyles.className);
  } else {
    root.classList.remove(DarkModeStyles.className);
    if (styleTag) {
      styleTag.remove();
    }
  }
};

const getHostname = () => {
  try {
    return new URL(window.location.href).hostname;
  } catch (error) {
    return window.location.hostname || "";
  }
};

const syncFromSettings = (settings) => {
  const hostname = getHostname();
  const enabled = StorageUtils.isSiteEnabled(settings, hostname);
  applyDarkMode(enabled, settings.darknessLevel);
};

const initDarkMode = async () => {
  const settings = await StorageUtils.getSettings();
  syncFromSettings(settings);
};

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  StorageUtils.getSettings().then((settings) => syncFromSettings(settings));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "DARK_MODE_TOGGLE_UPDATE") {
    syncFromSettings(message.settings);
    sendResponse({ status: "updated" });
  }
});

initDarkMode();

// Dark Mode Toggle by frpboy (https://github.com/frpboy)
