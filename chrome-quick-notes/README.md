# Quick Notes

A lightweight notepad Chrome extension for taking quick notes while browsing - your thoughts, instantly saved.

![Quick Notes Logo](icons/icon128.png)

## Overview

Quick Notes is the fourth Chrome extension in the frpboy Chrome extension series. It's a minimal, fast, and intuitive note-taking tool that lives in your browser toolbar. Capture thoughts, ideas, and important information without ever leaving your current tab.

### Key Features

✨ **Instant Note-Taking** - Quickly jot down thoughts as you browse  
💾 **Auto-Save** - Notes automatically save as you type  
🔍 **Smart Search** - Search through all your notes instantly  
📝 **Rich Text Support** - Unlimited text with character and word count  
📤 **Import/Export** - Backup and restore your notes  
🗑️ **Easy Management** - Delete notes individually or clear all  
⏰ **Smart Timestamps** - See when notes were created and last edited

## Installation

### From Source (Developer Mode)

1. Download or clone this repository
2. Open Google Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `chrome-quick-notes` directory
5. The Quick Notes icon will appear in your toolbar

### Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store soon.

## Usage Guide

### Taking Notes

1. Click the Quick Notes icon in your Chrome toolbar
2. Type your note in the text area
3. Click "Save Note" or simply stop typing to auto-save

**Pro Tip:** Use `Ctrl+S` (Windows/Linux) or `Cmd+S` (Mac) to quickly save a note.

### Managing Notes

#### Search Notes
- Use the search box to find specific notes
- Search works across all note content
- Clear the search to see all notes

#### Edit Notes
- Click the "Edit" button on any note
- The note content will load in the input field
- Make your changes and click "Update Note"

#### Delete Notes
- Click the "Delete" button on any note
- Confirm the deletion in the popup

**Keyboard Shortcut:** Press `Escape` to clear the input field.

### Import/Export

#### Export All Notes
1. Click the "Export All" button
2. Notes are saved as a readable text file
3. File includes timestamps and metadata

#### Import Notes
1. Click the "Import" button
2. Select a JSON or TXT file with notes
3. Notes are merged with existing ones

**Supported Formats:**
- JSON files from Quick Notes exports
- Plain text files (each file becomes one note)

### Clear All Notes

**⚠️ Warning:** This action cannot be undone!

1. Click the "Clear All" button
2. Confirm in the popup dialog
3. All notes are permanently deleted

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save current note |
| `Ctrl+F` / `Cmd+F` | Focus search box |
| `Escape` | Clear input field |

## Technical Specifications

- **Manifest Version:** V3 (Latest Chrome Extension standard)
- **Dependencies:** None (Vanilla JavaScript)
- **Storage:** Chrome local storage
- **Permissions:** Storage only
- **Browser:** Chrome 88+

## File Structure

```
chrome-quick-notes/
├── manifest.json          # Extension configuration
├── popup.html            # Main UI
├── popup.css             # Styling
├── popup.js              # Main UI controller
├── background.js         # Service worker
├── storage.js            # Storage management
├── utils.js              # Helper functions
├── icons/                # Extension icons
│   ├── icon16.png       # Toolbar icon
│   ├── icon48.png       # Extension manager icon
│   └── icon128.png      # Chrome Web Store icon
├── README.md            # This file
├── CONTRIBUTING.md      # Contribution guidelines
└── LICENSE              # MIT License
```

## Development

### Project Structure

The extension follows a modular architecture:

- **popup.js**: Main UI controller, handles user interactions
- **storage.js**: All storage operations, data persistence
- **utils.js**: Helper functions for formatting, import/export
- **background.js**: Extension lifecycle management

### Code Guidelines

- Vanilla JavaScript only (no frameworks)
- No external dependencies
- Clean, readable, and maintainable code
- Comprehensive error handling
- Performance-optimized

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### How to Contribute

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Reporting Issues

- Use GitHub Issues for bug reports
- Include browser version and OS
- Provide steps to reproduce
- Add screenshots if applicable

## Author

**frpboy** - Rahul Muraleedharan

- GitHub: [@frpboy](https://github.com/frpboy)
- Email: frpboy12@gmail.com
- Location: Kerala, India

*Built with ❤️ as part of the frpboy Chrome extension series*

## Roadmap

- [ ] Chrome Web Store submission
- [ ] Context menu integration (right-click to save selected text)
- [ ] Note categories/tags
- [ ] Cloud sync support
- [ ] Dark mode theme
- [ ] Enhanced text formatting
- [ ] Note sharing capabilities

## Support

- ⭐ Star this repository if you find it useful
- 🐛 Report bugs via GitHub Issues
- 💡 Suggest features via GitHub Discussions
- 📧 Contact: frpboy12@gmail.com

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Quick Notes** - Your thoughts, instantly saved.  
*Part of the frpboy Chrome Extension Series*
