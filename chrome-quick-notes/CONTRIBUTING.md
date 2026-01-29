# Contributing to Quick Notes

Thank you for your interest in contributing to **Quick Notes**! This document outlines the guidelines for contributing to this open-source Chrome extension project.

## About the Project

**Quick Notes** is a lightweight Chrome extension that allows users to take quick notes while browsing. It's part of the frpboy Chrome extension series, built with vanilla JavaScript and modern web technologies.

**Author:** frpboy (Rahul Muraleedharan)  
**Repository:** [frpboy/chrome-quick-notes](https://github.com/frpboy/chrome-quick-notes)  
**License:** MIT

## How to Contribute

### Reporting Bugs

Before reporting a bug, please:

1. Check existing [GitHub Issues](https://github.com/frpboy/chrome-quick-notes/issues) to avoid duplicates
2. Ensure you're using the latest version
3. Try to reproduce the issue consistently

**Bug Report Template:**

```markdown
**Bug Description**
A clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen

**Actual Behavior**
What actually happened

**Environment**
- Chrome Version: [e.g., 120.0]
- OS: [e.g., Windows 11]
- Extension Version: [e.g., 1.0.0]

**Screenshots**
If applicable, add screenshots

**Additional Context**
Any other relevant information
```

### Suggesting Features

Feature suggestions are welcome! Please:

1. Check existing [GitHub Issues](https://github.com/frpboy/chrome-quick-notes/issues) for similar requests
2. Open a new issue with the `enhancement` label
3. Clearly describe the feature and its benefits

**Feature Request Template:**

```markdown
**Feature Description**
A clear description of the requested feature

**Problem Statement**
What problem does this solve?

**Proposed Solution**
How should this feature work?

**Alternative Solutions**
Any alternative approaches considered

**Additional Context**
Screenshots, examples, or mockups
```

### Contributing Code

#### Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/chrome-quick-notes.git
   cd chrome-quick-notes
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the coding guidelines below
   - Test thoroughly in Chrome
   - Update documentation if needed

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

#### Coding Guidelines

**JavaScript Standards:**
- Use ES6+ features (const, let, arrow functions)
- Use async/await for promises
- Follow camelCase naming convention
- Use descriptive variable and function names
- Add JSDoc comments for functions

**HTML/CSS Guidelines:**
- Use semantic HTML elements
- Follow BEM naming convention for CSS classes
- Use CSS custom properties for colors
- Ensure responsive design
- Maintain accessibility standards

**File Structure:**
```
chrome-quick-notes/
├── manifest.json          # Extension manifest (V3)
├── popup.html            # Main UI markup
├── popup.css             # Styling
├── popup.js              # UI controller
├── background.js         # Service worker
├── storage.js            # Storage logic
├── utils.js              # Helper functions
├── icons/                # Extension icons
├── README.md            # Project documentation
├── CONTRIBUTING.md      # This file
└── LICENSE              # MIT license
```

**Code Quality Requirements:**
- No console errors in production
- Handle all edge cases
- Implement error handling
- Test in multiple scenarios
- Update documentation

#### Development Setup

**Prerequisites:**
- Google Chrome (version 88+)
- Text editor (VSCode recommended)
- Git

**Testing Your Changes:**

1. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-quick-notes` directory

2. Test all functionality:
   - Create and save notes
   - Edit existing notes
   - Delete notes
   - Search functionality
   - Import/Export features
   - Clear all notes

3. Check for issues:
   - Open DevTools (F12)
   - Check Console for errors
   - Verify Network requests
   - Test Storage operations

#### Pull Request Process

1. **Before Submitting:**
   - Test all functionality thoroughly
   - Ensure no console errors
   - Update documentation if needed
   - Follow commit message conventions

2. **Pull Request Template:**

```markdown
## Description
Brief description of changes made

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Enhancement
- [ ] Documentation update

## Testing
- [ ] Tested in Chrome (version)
- [ ] All features work correctly
- [ ] No console errors
- [ ] Edge cases handled

## Screenshots (if applicable)
Add before/after screenshots

## Additional Notes
Any additional information for reviewers
```

3. **Code Review Process:**
   - A maintainer will review your PR
   - Address feedback promptly
   - Make requested changes
   - Once approved, your PR will be merged

### Commit Message Convention

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

**Examples:**
```bash
git commit -m "feat: add note categorization feature"
git commit -m "fix: resolve auto-save timing issue"
git commit -m "docs: update installation instructions"
```

## Areas for Contribution

### High Priority
- [ ] Chrome Web Store submission preparation
- [ ] Enhanced import/export formats
- [ ] Better error handling and user feedback

### Medium Priority
- [ ] Context menu integration (right-click to save text)
- [ ] Note categories/tags
- [ ] Dark mode theme

### Low Priority
- [ ] Keyboard shortcut customization
- [ ] Cloud sync support
- [ ] Advanced text formatting

### Documentation
- [ ] Tutorial videos
- [ ] FAQ section
- [ ] Troubleshooting guide
- [ ] Translation to other languages

## Code Style Examples

**Good:**
```javascript
// Clear function name with JSDoc
/**
 * Save notes to Chrome local storage
 * @param {Array} notes - Array of note objects
 * @returns {Promise<void>}
 */
async saveNotes(notes) {
  try {
    await chrome.storage.local.set({ [this.storageKey]: notes });
  } catch (error) {
    console.error('Failed to save notes:', error);
    throw new Error('Failed to save notes to storage');
  }
}
```

**Avoid:**
```javascript
// Unclear naming, no comments
async function save(n) {
  return chrome.storage.set(n);
}
```

## Testing Requirements

### Manual Testing Checklist

- [ ] Extension installs without errors
- [ ] Can create and save new notes
- [ ] Auto-save works correctly
- [ ] Notes persist across browser restart
- [ ] Search functionality works
- [ ] Can edit existing notes
- [ ] Can delete individual notes
- [ ] Delete confirmation works
- [ ] Clear all works with confirmation
- [ ] Export produces valid file
- [ ] Import successfully adds notes
- [ ] Character count is accurate
- [ ] Word count is accurate
- [ ] Timestamps display correctly
- [ ] No console errors

### Performance Requirements

- Popup opens in under 100ms
- Note operations complete in under 50ms
- Search returns results instantly (< 200ms for 1000 notes)
- No memory leaks

## Communication

### Questions or Need Help?

- Check existing [GitHub Issues](https://github.com/frpboy/chrome-quick-notes/issues)
- Create a new issue with the `question` label
- Email: frpboy12@gmail.com

### Reporting Security Issues

Please do not open public issues for security vulnerabilities. Instead:

1. Email: frpboy12@gmail.com
2. Subject: `Security Vulnerability - Quick Notes`
3. Include detailed description and steps to reproduce

## Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- GitHub repository insights

## Code of Conduct

This project follows a code of conduct adapted from the Contributor Covenant:

1. Be respectful and inclusive
2. Welcome newcomers
3. Focus on constructive feedback
4. Respect differing viewpoints
5. Show empathy towards others

Violations should be reported to frpboy12@gmail.com

## License

By contributing to Quick Notes, you agree that your contributions will be licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

Thank you for contributing to **Quick Notes**! Your efforts help make this extension better for everyone.

**Quick Notes** - Your thoughts, instantly saved.  
*Part of the frpboy Chrome Extension Series*
