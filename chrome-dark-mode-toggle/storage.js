const StorageUtils = (() => {
  const DEFAULT_SETTINGS = {
    darknessLevel: "medium",
    sitePreferences: {},
    whitelist: [],
    blacklist: []
  };

  const normalizeHostname = (hostname) => {
    if (!hostname) return "";
    return hostname.toLowerCase();
  };

  const sanitizeList = (list) => {
    if (!Array.isArray(list)) return [];
    return Array.from(new Set(list.map(normalizeHostname).filter(Boolean)));
  };

  const getSettings = () => new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (data) => {
      const settings = {
        ...DEFAULT_SETTINGS,
        ...data,
        sitePreferences: {
          ...DEFAULT_SETTINGS.sitePreferences,
          ...(data.sitePreferences || {})
        },
        whitelist: sanitizeList(data.whitelist),
        blacklist: sanitizeList(data.blacklist)
      };
      resolve(settings);
    });
  });

  const saveSettings = (settings) => new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => resolve(settings));
  });

  const updateDarknessLevel = (level) => getSettings().then((settings) => {
    settings.darknessLevel = level;
    return saveSettings(settings);
  });

  const setSitePreference = (hostname, enabled) => getSettings().then((settings) => {
    const host = normalizeHostname(hostname);
    settings.sitePreferences = {
      ...settings.sitePreferences,
      [host]: { enabled: Boolean(enabled) }
    };
    return saveSettings(settings);
  });

  const removeSitePreference = (hostname) => getSettings().then((settings) => {
    const host = normalizeHostname(hostname);
    const updated = { ...settings.sitePreferences };
    delete updated[host];
    settings.sitePreferences = updated;
    return saveSettings(settings);
  });

  const addToList = (listName, hostname) => getSettings().then((settings) => {
    const host = normalizeHostname(hostname);
    if (!host) return settings;
    const list = new Set(settings[listName] || []);
    list.add(host);
    settings[listName] = Array.from(list);
    return saveSettings(settings);
  });

  const removeFromList = (listName, hostname) => getSettings().then((settings) => {
    const host = normalizeHostname(hostname);
    settings[listName] = (settings[listName] || []).filter((item) => item !== host);
    return saveSettings(settings);
  });

  const isSiteEnabled = (settings, hostname) => {
    const host = normalizeHostname(hostname);
    if (!host) return false;
    if (settings.blacklist.includes(host)) return false;
    if (settings.whitelist.includes(host)) return true;
    const preference = settings.sitePreferences[host];
    return preference ? Boolean(preference.enabled) : false;
  };

  return {
    DEFAULT_SETTINGS,
    normalizeHostname,
    getSettings,
    saveSettings,
    updateDarknessLevel,
    setSitePreference,
    removeSitePreference,
    addToList,
    removeFromList,
    isSiteEnabled
  };
})();

// Dark Mode Toggle by frpboy (https://github.com/frpboy)
