# Installation and Testing Guide

This guide will walk you through installing and testing the Reading Time Estimator Chrome extension.

## 📦 Prerequisites

- Google Chrome browser (version 88 or higher recommended)
- Basic understanding of Chrome extensions (optional)

## 🚀 Installation Steps

### Step 1: Download the Extension

**Option A: Clone from GitHub**
```bash
git clone https://github.com/frpboy/chrome-reading-time-estimator.git
cd chrome-reading-time-estimator
```

**Option B: Download ZIP**
1. Go to the [GitHub repository](https://github.com/frpboy/chrome-reading-time-estimator)
2. Click the green "Code" button
3. Select "Download ZIP"
4. Extract the ZIP file to a folder on your computer

### Step 2: Enable Developer Mode in Chrome

1. Open Google Chrome
2. Navigate to `chrome://extensions/` (or click Menu → More Tools → Extensions)
3. Enable **Developer mode** by toggling the switch in the top-right corner

### Step 3: Load the Extension

1. Click the **"Load unpacked"** button that appears after enabling Developer mode
2. Navigate to the `chrome-reading-time-estimator` folder
3. Select the folder and click **"Select Folder"** (or "Open" on some systems)

### Step 4: Verify Installation

1. You should see the Reading Time Estimator extension in your extensions list
2. The extension icon should appear in your Chrome toolbar (you may need to click the puzzle icon to pin it)

## ✅ Testing the Extension

### Quick Test

1. **Open the Test Page**
   - Navigate to `chrome-reading-time-estimator/test-page.html` in Chrome
   - Or open any article on a website like Medium, BBC News, or Wikipedia

2. **Click the Extension Icon**
   - The extension icon in your toolbar
   - Wait for the analysis to complete (usually instant)

3. **Verify Results**
   - You should see the estimated reading time
   - Word count should be displayed
   - For the test page, expect ~3 minutes at 200 WPM

### Test Features

#### 1. Test Reading Speed Adjustment

1. Open the extension on any article page
2. Move the reading speed slider
3. Watch the estimated time update in real-time
4. Try the preset buttons: Slow, Average, Fast

#### 2. Test Settings Persistence

1. Set a custom reading speed (e.g., 250 WPM)
2. Close the extension popup
3. Navigate to a different page
4. Open the extension again
5. Verify your custom speed is still set

#### 3. Test on Different Websites

Try the extension on various types of content:

- **News Sites**: CNN.com, BBC.com, NYTimes.com
- **Blog Posts**: Medium.com, Dev.to
- **Documentation**: MDN Web Docs, GitHub docs
- **E-commerce**: Amazon product descriptions
- **Wikipedia**: Long-form articles

#### 4. Test Edge Cases

1. **Minimal Text Page**
   - Visit a page with very little text
   - Extension should show minimal reading time or appropriate message

2. **Image-Heavy Page**
   - Visit a photography or portfolio site
   - Should handle pages with mostly images gracefully

3. **Dynamic Content**
   - Visit a single-page application
   - Test refresh button after content loads

4. **Chrome Internal Pages**
   - Try on `chrome://extensions/`
   - Should show appropriate error message

### Expected Behavior

✅ **Should Work:**
- Accurate word counts on article pages
- Reasonable reading time estimates
- Smooth UI interactions
- Settings saving and loading
- Refresh functionality

❌ **Should Show Errors:**
- Chrome internal pages (`chrome://`)
- Browser settings pages
- Empty pages with no text

## 🐛 Troubleshooting

### Extension Doesn't Appear

1. Check that Developer mode is enabled
2. Verify you selected the correct folder (should contain manifest.json)
3. Look for any error messages in the extensions page
4. Try reloading the extension (click the refresh icon)

### Extension Icon Not Showing Results

1. Make sure you're on a regular webpage (not chrome:// pages)
2. Check the browser console for errors (F12 → Console)
3. Try clicking the Refresh button in the extension
4. Reload the webpage and try again

### Word Count Seems Wrong

1. The extension excludes navigation, headers, footers, and ads
2. Only counts words with letters or numbers
3. Check the browser console for any errors
4. Try the test page to verify basic functionality

### Settings Not Saving

1. Check that the extension has storage permission (should be automatic)
2. Try setting a value again
3. Check Chrome's extension permissions in chrome://extensions/

## 🔍 Debugging Tips

### View Extension Console

1. Go to `chrome://extensions/`
2. Find Reading Time Estimator
3. Click "Inspect views: popup.html" (or similar)
4. This opens DevTools for the extension

### View Content Script Console

1. Open any webpage
2. Press F12 to open DevTools
3. Go to the Console tab
4. Look for messages from content.js

### Check Permissions

1. Go to `chrome://extensions/`
2. Click "Details" on the extension
3. Scroll to "Permissions"
4. Verify "Read and change all data on all websites" is present

## 📊 Performance Testing

### Memory Usage

1. Open Chrome Task Manager (Shift + Esc)
2. Find "Extension: Reading Time Estimator"
3. Should use minimal memory (< 20 MB typically)

### Speed Test

1. Open a long article (2000+ words)
2. Time how long the extension takes to analyze
3. Should be nearly instant (< 500ms)

## 🔄 Updating the Extension

When you make changes to the code:

1. Go to `chrome://extensions/`
2. Find Reading Time Estimator
3. Click the refresh icon (🔄)
4. Test your changes

## 📝 Testing Checklist

Use this checklist to verify all features:

- [ ] Extension installs without errors
- [ ] Icon appears in toolbar
- [ ] Popup opens when clicking icon
- [ ] Word count is accurate
- [ ] Reading time calculation is correct
- [ ] Slider adjusts reading time
- [ ] Number input accepts values 100-400
- [ ] Preset buttons work (Slow, Average, Fast)
- [ ] Settings persist after closing popup
- [ ] Settings persist after restarting browser
- [ ] Refresh button re-analyzes page
- [ ] Works on news sites
- [ ] Works on blog posts
- [ ] Works on documentation pages
- [ ] Shows error on chrome:// pages
- [ ] Shows appropriate message for pages with no text
- [ ] No console errors on normal pages
- [ ] UI is responsive and smooth
- [ ] All animations work correctly

## 🎓 Next Steps

After successful testing:

1. **Use It**: Try it on your daily browsing
2. **Provide Feedback**: Open issues on GitHub for bugs or suggestions
3. **Contribute**: See [CONTRIBUTING.md](CONTRIBUTING.md) for how to help
4. **Share**: Tell others about the extension

## 📞 Need Help?

- **Issues**: [GitHub Issues](https://github.com/frpboy/chrome-reading-time-estimator/issues)
- **Email**: frpboy12@gmail.com
- **Documentation**: See [README.md](README.md)

---

Happy Reading! 📖✨
