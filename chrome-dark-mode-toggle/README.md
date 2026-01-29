# 🌙 Dark Mode Toggle - Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/frpboy/chrome-dark-mode-toggle)

A simple, powerful Chrome extension that adds one-click dark mode to any website. Customize darkness levels, save per-site preferences, and keep images looking natural with smart inversion.

## ✨ Features

- **🌗 One-click toggle** for dark mode on any website
- **🎚️ Three darkness levels**: light, medium, and dark
- **💾 Per-site preferences** saved automatically
- **✅ Whitelist & blacklist** to always enable or disable dark mode
- **🧠 Smart CSS inversion** preserves layouts and readability
- **🖼️ Media protection** avoids inverting images and videos
- **⌨️ Keyboard shortcut**: `Ctrl/Cmd + Shift + D`
- **⚙️ Settings page** to manage customization and saved sites
- **🚀 Vanilla JavaScript** with zero dependencies

## 🖼️ Screenshots

### Before / After

```
┌──────────────────────────────┐      ┌──────────────────────────────┐
│    ☀️  Light Website          │      │    🌙  Dark Mode Enabled      │
│  Bright backgrounds           │  →   │  Soft dark backgrounds        │
│  Standard text                │      │  High-contrast text           │
└──────────────────────────────┘      └──────────────────────────────┘
```

## 🚀 Installation

### Option 1: Manual Installation (Developer Mode)

1. **Clone the repository**
   ```bash
   git clone https://github.com/frpboy/chrome-dark-mode-toggle.git
   ```

2. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or go to **Menu → More Tools → Extensions**

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `chrome-dark-mode-toggle` folder

5. **Start Using**
   - Click the 🌙 icon in your toolbar
   - Toggle dark mode for the current site

### Option 2: Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store soon.

## 📖 Usage

1. **Visit any website**
2. **Click the extension icon** to toggle dark mode
3. **Pick a darkness level** (light/medium/dark)
4. **Use the settings page** for advanced configuration:
   - Manage site preferences
   - Add sites to the whitelist or blacklist
5. **Keyboard shortcut**: `Ctrl/Cmd + Shift + D`

## ⚙️ Settings

The settings page lets you:

- Choose a default darkness level
- Add or remove per-site preferences
- Maintain a whitelist (always enable)
- Maintain a blacklist (always disable)

## 🛠️ Technical Details

### Built With

- **Manifest V3**
- **Vanilla JavaScript**
- **Chrome Storage API**
- **CSS Filter Inversion**

### Project Structure

```
chrome-dark-mode-toggle/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── background.js
├── settings.html
├── settings.css
├── settings.js
├── styles.js
├── storage.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## 📄 License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2024 frpboy
```

## 👨‍💻 Author

**frpboy**
- GitHub: [@frpboy](https://github.com/frpboy)

---

Built as part of a series of 5 open-source Chrome extensions.
