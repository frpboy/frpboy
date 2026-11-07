"use strict";

/** Card themes. Dark matches the profile README's existing #0D1117 style. */
const THEMES = {
  dark: {
    bg: "#0D1117",
    border: "#30363D",
    title: "#58A6FF",
    text: "#C9D1D9",
    muted: "#8B949E",
    accent: "#58A6FF",
    green: "#3FB950",
    orange: "#F0883E",
    purple: "#BC8CFF",
    red: "#F85149",
    bar_bg: "#21262D",
    gold: "#E3B341",
    silver: "#9BA7B4",
    bronze: "#C98A5E",
    locked: "#6E7681",
  },
  light: {
    bg: "#FFFFFF",
    border: "#D0D7DE",
    title: "#0969DA",
    text: "#24292F",
    muted: "#57606A",
    accent: "#0969DA",
    green: "#1A7F37",
    orange: "#BC4C00",
    purple: "#8250DF",
    red: "#CF222E",
    bar_bg: "#EAEEF2",
    gold: "#9A6700",
    silver: "#57606A",
    bronze: "#A3715E",
    locked: "#57606A",
  },
};

// GitHub Linguist colors where known; deterministic HSL hash otherwise.
const LANG_COLORS = {
  TypeScript: "#3178C6", JavaScript: "#F1E05A", Python: "#3572A5", Dart: "#00B4AB",
  "C#": "#178600", HTML: "#E34C26", CSS: "#563D7C", Rust: "#DEA584", Java: "#B07219",
  Go: "#00ADD8", Kotlin: "#A97BFF", Shell: "#89E051", Dockerfile: "#384D54", Other: "#8B949E",
  MDX: "#FCB32C", C: "#555555", Swift: "#F05138", "C++": "#F34B7D", PLpgSQL: "#336790",
  CMake: "#DA3434", PowerShell: "#012456", Vue: "#41B883", Lean: "#9B30FF", Astro: "#FF5A03",
  CoffeeScript: "#244776", Makefile: "#427819", "Objective-C": "#438EFF", Ruby: "#701516",
  "Emacs Lisp": "#C065DB", "Inno Setup": "#264B99", Lua: "#000080", Smarty: "#F0C040",
  Nix: "#7E7EFF", Handlebars: "#F7931E", Elixir: "#6E4A7E", "Vim Script": "#199F4B",
};

function langColor(name, theme) {
  if (LANG_COLORS[name]) return LANG_COLORS[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 55%, ${theme && theme.bg === "#FFFFFF" ? 40 : 60}%)`;
}

module.exports = { THEMES, langColor };
