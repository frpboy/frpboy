# 📖 Reading Time Estimator - Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/frpboy/chrome-reading-time-estimator)

A lightweight Chrome extension that calculates and displays the estimated reading time for any webpage. Perfect for readers who want to know how long an article will take before diving in!

## ✨ Features

- **📊 Instant Analysis**: Automatically calculates reading time when you open the extension
- **⏱️ Accurate Estimates**: Based on word count and customizable reading speed
- **🎯 Smart Content Detection**: Intelligently excludes navigation, headers, footers, and other non-content elements
- **⚙️ Customizable Settings**: Adjust reading speed from 100-400 WPM (default: 200 WPM)
- **💾 Persistent Preferences**: Your reading speed setting is saved across browser sessions
- **🎨 Beautiful UI**: Clean, modern interface with gradient design
- **🚀 Zero Dependencies**: Built with vanilla JavaScript for optimal performance

## 🖼️ Screenshots

### Extension Popup
The extension displays reading time and word count in an elegant, easy-to-read format:

```
┌─────────────────────────────┐
│     📖 Reading Time         │
├─────────────────────────────┤
│  ⏱️  Estimated Time         │
│      5 min                  │
│                             │
│  📝  Word Count             │
│      1.2k words             │
│                             │
│  ⚙️  Settings               │
│  Reading Speed (WPM)        │
│  [====●====] 200            │
│  [Slow] [Average] [Fast]    │
│                             │
│  [🔄 Refresh]               │
└─────────────────────────────┘
```

## 🚀 Installation

### Option 1: Manual Installation (Developer Mode)

1. **Download the Extension**
   ```bash
   git clone https://github.com/frpboy/chrome-reading-time-estimator.git
   ```

2. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `chrome-reading-time-estimator` folder

5. **Start Using**
   - The extension icon will appear in your toolbar
   - Visit any webpage and click the icon to see reading time

### Option 2: Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store soon!

## 📖 Usage

1. **Navigate to any webpage** with text content (articles, blog posts, documentation, etc.)

2. **Click the extension icon** in your Chrome toolbar

3. **View the results**:
   - Estimated reading time
   - Total word count

4. **Customize (Optional)**:
   - Adjust the reading speed slider (100-400 WPM)
   - Use preset buttons for quick changes: Slow (150), Average (200), Fast (300)
   - Your preference is automatically saved

5. **Refresh**: Click the "Refresh" button to re-analyze the page if content has changed

## 🎯 How It Works

### Reading Time Calculation

The extension uses the following formula:
```
Reading Time (minutes) = Word Count ÷ Reading Speed (WPM)
```

**Default Reading Speeds:**
- **Slow**: 150 WPM (leisurely reading)
- **Average**: 200 WPM (default, typical reading speed)
- **Fast**: 300 WPM (experienced readers)

### Content Extraction

The extension intelligently extracts only readable content by:
1. Removing navigation elements, headers, footers, and sidebars
2. Filtering out scripts, styles, and other non-text content
3. Excluding elements with navigation/banner/complementary roles
4. Counting only meaningful words (containing letters or numbers)

### Supported Pages

✅ Works on:
- News articles
- Blog posts
- Documentation sites
- Online magazines
- Educational content
- Any text-heavy webpage

❌ Cannot analyze:
- Chrome internal pages (`chrome://`, `chrome-extension://`)
- Browser settings pages
- Pages with restricted access

## 🛠️ Technical Details

### Built With

- **Manifest V3**: Latest Chrome extension standard
- **Vanilla JavaScript**: No external dependencies
- **Chrome Storage API**: For persistent user preferences
- **Chrome Scripting API**: For content analysis

### Project Structure

```
chrome-reading-time-estimator/
├── manifest.json           # Extension configuration (Manifest V3)
├── popup.html             # Extension popup interface
├── popup.css              # Popup styling
├── popup.js               # Popup logic and UI handling
├── content.js             # Content script for page analysis
├── icons/                 # Extension icons
│   ├── icon16.png        # 16x16 toolbar icon
│   ├── icon48.png        # 48x48 extension manager icon
│   └── icon128.png       # 128x128 Chrome Web Store icon
├── README.md             # This file
├── CONTRIBUTING.md       # Contribution guidelines
└── LICENSE               # MIT License
```

### Key Files

- **manifest.json**: Defines extension permissions, scripts, and metadata
- **popup.js**: Handles UI interactions, storage, and calculations
- **content.js**: Extracts text content from webpages
- **popup.html/css**: Creates the beautiful user interface

## 🤝 Contributing

Contributions are welcome! This is an open-source project and we'd love your help making it better.

### Ways to Contribute

- 🐛 Report bugs
- 💡 Suggest new features
- 📝 Improve documentation
- 🔧 Submit pull requests
- ⭐ Star the repository

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📋 Roadmap

Future enhancements planned:

- [ ] Add support for different languages and reading patterns
- [ ] Include images/media in time calculation
- [ ] Dark mode toggle
- [ ] Reading progress tracker
- [ ] Statistics dashboard (total time read, articles completed)
- [ ] Export reading history
- [ ] Integration with read-it-later services
- [ ] Accessibility improvements

## 🐛 Known Issues

None currently! If you find a bug, please [open an issue](https://github.com/frpboy/chrome-reading-time-estimator/issues).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Rahul Muraleedharan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## 👨‍💻 Author

**Rahul Muraleedharan**
- GitHub: [@frpboy](https://github.com/frpboy)
- Email: frpboy12@gmail.com
- LinkedIn: [rahul-muraleedharan-it](https://www.linkedin.com/in/rahul-muraleedharan-it)

## 🌟 Acknowledgments

- Inspired by Medium's reading time feature
- Built as part of a series of 5 open-source Chrome extensions
- Thanks to all contributors and users!

## 📊 Stats

![GitHub stars](https://img.shields.io/github/stars/frpboy/chrome-reading-time-estimator?style=social)
![GitHub forks](https://img.shields.io/github/forks/frpboy/chrome-reading-time-estimator?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/frpboy/chrome-reading-time-estimator?style=social)

---

<div align="center">
  <p>If you find this extension useful, please consider giving it a ⭐!</p>
  <p>Made with ❤️ by <a href="https://github.com/frpboy">frpboy</a></p>
</div>
