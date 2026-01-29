const DarkModeStyles = (() => {
  const className = "dark-mode-toggle-enabled";
  const levels = {
    light: { brightness: 0.95, contrast: 0.9 },
    medium: { brightness: 0.9, contrast: 0.85 },
    dark: { brightness: 0.82, contrast: 0.8 }
  };

  const getFilter = (level) => {
    const config = levels[level] || levels.medium;
    return `invert(1) hue-rotate(180deg) brightness(${config.brightness}) contrast(${config.contrast})`;
  };

  const getStyleText = (level) => `
:root.${className} {
  background-color: #111 !important;
  color-scheme: dark;
  filter: ${getFilter(level)};
}

:root.${className} body {
  background-color: #111 !important;
  color: #e6e6e6 !important;
}

:root.${className} img,
:root.${className} video,
:root.${className} picture,
:root.${className} iframe,
:root.${className} canvas,
:root.${className} svg,
:root.${className} embed,
:root.${className} object {
  filter: invert(1) hue-rotate(180deg) brightness(1) contrast(1) !important;
}

:root.${className} input,
:root.${className} textarea,
:root.${className} select,
:root.${className} button {
  background-color: #1b1b1b !important;
  color: #e6e6e6 !important;
  border-color: #333 !important;
}

:root.${className} ::selection {
  background: #4b4b4b;
  color: #ffffff;
}
`;

  return { className, levels, getStyleText };
})();

// Dark Mode Toggle by frpboy (https://github.com/frpboy)
