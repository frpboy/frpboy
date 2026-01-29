const segments = document.querySelectorAll(".segment");
const siteInput = document.getElementById("siteInput");
const addSiteButton = document.getElementById("addSiteButton");
const siteList = document.getElementById("siteList");
const whitelistInput = document.getElementById("whitelistInput");
const addWhitelistButton = document.getElementById("addWhitelistButton");
const whitelistList = document.getElementById("whitelistList");
const blacklistInput = document.getElementById("blacklistInput");
const addBlacklistButton = document.getElementById("addBlacklistButton");
const blacklistList = document.getElementById("blacklistList");

const cleanHostname = (value) => StorageUtils.normalizeHostname(value.trim());

const renderList = (container, items, onRemove) => {
  container.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No sites added yet.";
    container.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const pill = document.createElement("div");
    pill.className = "site-pill";
    const label = document.createElement("span");
    label.textContent = item;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => onRemove(item));
    pill.appendChild(label);
    pill.appendChild(remove);
    container.appendChild(pill);
  });
};

const renderSitePreferences = (settings) => {
  const entries = Object.entries(settings.sitePreferences || {})
    .filter(([, value]) => value && typeof value.enabled === "boolean")
    .map(([hostname, preference]) => ({ hostname, enabled: preference.enabled }));

  siteList.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No per-site preferences saved.";
    siteList.appendChild(empty);
    return;
  }

  entries.forEach(({ hostname, enabled }) => {
    const pill = document.createElement("div");
    pill.className = "site-pill";
    const label = document.createElement("span");
    label.textContent = hostname;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = enabled ? "Disable" : "Enable";
    toggle.addEventListener("click", () => updateSitePreference(hostname, !enabled));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => removePreference(hostname));
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    actions.appendChild(toggle);
    actions.appendChild(remove);
    pill.appendChild(label);
    pill.appendChild(actions);
    siteList.appendChild(pill);
  });
};

const updateSegments = (level) => {
  segments.forEach((segment) => {
    segment.classList.toggle("active", segment.dataset.level === level);
  });
};

const updateDarknessLevel = async (level) => {
  const settings = await StorageUtils.updateDarknessLevel(level);
  updateSegments(settings.darknessLevel);
  return settings;
};

const updateSitePreference = async (hostname, enabled) => {
  const settings = await StorageUtils.setSitePreference(hostname, enabled);
  renderSitePreferences(settings);
  return settings;
};

const removePreference = async (hostname) => {
  const settings = await StorageUtils.removeSitePreference(hostname);
  renderSitePreferences(settings);
  return settings;
};

const addToList = async (listName, input) => {
  const hostname = cleanHostname(input.value);
  if (!hostname) return null;
  const settings = await StorageUtils.addToList(listName, hostname);
  input.value = "";
  renderListForSettings(settings);
  return settings;
};

const removeFromList = async (listName, hostname) => {
  const settings = await StorageUtils.removeFromList(listName, hostname);
  renderListForSettings(settings);
  return settings;
};

const renderListForSettings = (settings) => {
  renderList(whitelistList, settings.whitelist || [], (hostname) => removeFromList("whitelist", hostname));
  renderList(blacklistList, settings.blacklist || [], (hostname) => removeFromList("blacklist", hostname));
};

const initSettings = async () => {
  const settings = await StorageUtils.getSettings();
  updateSegments(settings.darknessLevel);
  renderSitePreferences(settings);
  renderListForSettings(settings);

  segments.forEach((segment) => {
    segment.addEventListener("click", () => updateDarknessLevel(segment.dataset.level));
  });

  addSiteButton.addEventListener("click", () => {
    const hostname = cleanHostname(siteInput.value);
    if (!hostname) return;
    updateSitePreference(hostname, true);
    siteInput.value = "";
  });

  addWhitelistButton.addEventListener("click", () => addToList("whitelist", whitelistInput));
  addBlacklistButton.addEventListener("click", () => addToList("blacklist", blacklistInput));
};

initSettings();

// Dark Mode Toggle by frpboy (https://github.com/frpboy)
