# Changelog

All notable changes to the Reading Time Estimator Chrome extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-29

### Added
- Initial release of Reading Time Estimator
- Word count calculation for webpages
- Reading time estimation based on words per minute (WPM)
- Customizable reading speed (100-400 WPM)
- Three preset reading speeds: Slow (150 WPM), Average (200 WPM), Fast (300 WPM)
- Persistent storage of user's reading speed preference
- Beautiful gradient UI with modern design
- Smart content extraction that excludes navigation, headers, and footers
- Real-time updates when reading speed is adjusted
- Refresh button to re-analyze page content
- Support for all websites (except Chrome internal pages)
- Error handling for pages with no text content
- Loading animation while analyzing content
- Formatted display of reading time (minutes, hours)
- Formatted display of word count (with k notation for thousands)
- Responsive design optimized for extension popup
- Zero external dependencies (vanilla JavaScript)
- MIT License for open-source distribution

### Features
- **Manifest V3**: Built using the latest Chrome extension standard
- **Active Tab Permission**: Only accesses the current tab when extension is opened
- **Storage API**: Saves user preferences across sessions
- **Content Scripts**: Automatically injected for page analysis
- **Scripting API**: Dynamic script execution for content extraction

### Technical Details
- Clean, maintainable code structure
- Comprehensive error handling
- Optimized performance with minimal resource usage
- Accessible HTML structure
- CSS animations for smooth user experience

### Documentation
- Comprehensive README.md with installation instructions
- CONTRIBUTING.md with guidelines for contributors
- LICENSE file (MIT)
- Test page for development and testing
- Inline code comments for maintainability

## [Unreleased]

### Planned Features
- Dark mode support
- Multiple language support for international users
- Reading progress tracking
- Statistics dashboard (total reading time, articles read)
- Integration with read-it-later services (Pocket, Instapaper)
- Export reading history
- Custom themes and color schemes
- Keyboard shortcuts
- Context menu integration
- Badge showing reading time on extension icon
- Support for PDF documents
- Advanced content detection for complex layouts

---

## Version History

- **1.0.0** (2024-01-29) - Initial release

---

For more information, see the [README](README.md).
