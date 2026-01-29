# Contributing to Reading Time Estimator

Thank you for your interest in contributing to the Reading Time Estimator Chrome extension! This document provides guidelines and instructions for contributing.

## 🌟 How to Contribute

We welcome contributions of all kinds:

- 🐛 Bug reports
- 💡 Feature suggestions
- 📝 Documentation improvements
- 🔧 Code contributions
- 🎨 Design improvements
- 🌍 Translations (future feature)

## 🚀 Getting Started

### Prerequisites

- Google Chrome browser
- Basic knowledge of HTML, CSS, and JavaScript
- Git installed on your machine
- A GitHub account

### Setup Development Environment

1. **Fork the Repository**
   - Visit the [repository](https://github.com/frpboy/chrome-reading-time-estimator)
   - Click the "Fork" button in the top-right corner

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/chrome-reading-time-estimator.git
   cd chrome-reading-time-estimator
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
   
   Use descriptive branch names:
   - `feature/add-dark-mode`
   - `bugfix/word-count-issue`
   - `docs/update-readme`

4. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory

## 💻 Development Guidelines

### Code Style

- Use **2 spaces** for indentation
- Use **camelCase** for variable and function names
- Use **meaningful variable names**
- Add **comments** for complex logic
- Keep functions **small and focused**

### JavaScript Guidelines

```javascript
// Good
function calculateReadingTime(wordCount, wordsPerMinute) {
  if (wordCount === 0) return 0;
  const minutes = wordCount / wordsPerMinute;
  return Math.max(1, Math.ceil(minutes));
}

// Avoid
function calc(w, wpm) {
  return w / wpm;
}
```

### HTML Guidelines

- Use semantic HTML5 elements
- Include appropriate ARIA labels for accessibility
- Keep structure clean and organized

### CSS Guidelines

- Use meaningful class names
- Organize styles logically (layout → typography → colors)
- Use CSS custom properties for repeated values
- Ensure responsive design

## 🧪 Testing Your Changes

Before submitting a pull request:

1. **Test on Multiple Websites**
   - News sites (CNN, BBC, etc.)
   - Blogs (Medium, personal blogs)
   - Documentation sites (MDN, GitHub docs)
   - E-commerce sites

2. **Test Edge Cases**
   - Pages with minimal text
   - Pages with lots of images
   - Single-page applications
   - Dynamic content that loads on scroll

3. **Test All Features**
   - Word counting accuracy
   - Reading time calculation
   - Settings persistence
   - UI responsiveness
   - Error handling

4. **Check Console for Errors**
   - Open DevTools (F12)
   - Check for any console errors or warnings

## 📝 Commit Guidelines

### Commit Message Format

Use clear, descriptive commit messages:

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**

```
feat: add dark mode toggle

Added a dark mode option in settings that applies to the popup UI.
Users can toggle between light and dark themes.

Closes #42
```

```
fix: correct word count for pages with special characters

Updated the word counting logic to properly handle Unicode characters
and special punctuation marks.

Fixes #15
```

## 🔄 Pull Request Process

1. **Update Documentation**
   - Update README.md if adding features
   - Add comments to complex code
   - Update CHANGELOG if applicable

2. **Test Thoroughly**
   - Ensure all existing features still work
   - Test your new feature/fix
   - Check for console errors

3. **Create Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Fill out the PR template with:
     - Clear description of changes
     - Screenshots (if UI changes)
     - Testing steps
     - Related issues

4. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Code refactoring
   
   ## Testing
   - [ ] Tested on multiple websites
   - [ ] Checked for console errors
   - [ ] Verified settings persistence
   
   ## Screenshots
   (if applicable)
   
   ## Related Issues
   Closes #issue_number
   ```

5. **Code Review**
   - Respond to feedback promptly
   - Make requested changes
   - Ask questions if unclear

## 🐛 Bug Reports

When reporting bugs, include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**:
   ```
   1. Go to '...'
   2. Click on '....'
   3. See error
   ```
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Screenshots**: If applicable
6. **Environment**:
   - Chrome version
   - Operating system
   - Extension version
7. **Console Errors**: Any errors from DevTools console

## 💡 Feature Requests

When suggesting features:

1. **Use Case**: Describe the problem/need
2. **Proposed Solution**: Your idea for solving it
3. **Alternatives**: Other solutions you've considered
4. **Additional Context**: Screenshots, examples, etc.

## 🎯 Priority Areas

We're especially interested in contributions for:

- 🌍 **Internationalization**: Support for multiple languages
- ♿ **Accessibility**: Screen reader support, keyboard navigation
- 🎨 **UI/UX**: Design improvements, animations
- 📊 **Analytics**: Reading statistics and history
- 🔧 **Performance**: Optimization for faster analysis
- 📱 **Compatibility**: Testing on different sites and configurations

## 📚 Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)

## ⚖️ Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Our Standards

**Positive behavior:**
- Being respectful and inclusive
- Accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behavior:**
- Harassment or discriminatory language
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information

### Enforcement

Violations can be reported to frpboy12@gmail.com. All complaints will be reviewed and investigated.

## 📞 Contact

- **GitHub Issues**: For bugs and features
- **Email**: frpboy12@gmail.com
- **Discussions**: Use GitHub Discussions for questions

## 🙏 Recognition

Contributors will be:
- Listed in the README.md
- Credited in release notes
- Given a shoutout on social media (with permission)

Thank you for contributing to Reading Time Estimator! 🎉

---

<div align="center">
  <p>Made with ❤️ by the community</p>
</div>
