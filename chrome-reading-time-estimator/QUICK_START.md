# 🚀 Quick Start Guide

Get the Reading Time Estimator extension up and running in 5 minutes!

## ⚡ Fast Installation

1. **Download**
   ```bash
   git clone https://github.com/frpboy/chrome-reading-time-estimator.git
   ```

2. **Install**
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `chrome-reading-time-estimator` folder

3. **Done!** 
   - Extension icon appears in toolbar
   - Visit any article and click the icon

## 🎯 Usage

### Basic Use
1. Navigate to any webpage with text
2. Click the extension icon
3. See instant reading time estimate

### Adjust Reading Speed
- Use the slider: 100-400 WPM
- Click presets: Slow (150), Average (200), Fast (300)
- Settings save automatically

### Refresh Analysis
- Click "Refresh" button to re-analyze
- Useful for dynamically loaded content

## 📊 What to Expect

### On Article Pages
- **Word Count**: Accurate count of readable text
- **Reading Time**: Estimated time based on your WPM
- **Clean UI**: Beautiful gradient design

### Example Results
```
📖 Reading Time: 5 min
📝 Word Count: 1.2k words
```

### Edge Cases
- **Short articles**: Shows "< 1 min" or "1 min"
- **Long articles**: Shows "2h 30m" format
- **Chrome pages**: Shows appropriate error
- **Empty pages**: Shows "No text found" message

## 🔍 Testing

### Quick Test
1. Open `test-page.html` in Chrome
2. Click extension icon
3. Should show ~3 minutes at 200 WPM

### Test Websites
- [Medium](https://medium.com) - Blog posts
- [BBC News](https://bbc.com/news) - News articles
- [Wikipedia](https://wikipedia.org) - Long-form content
- [MDN](https://developer.mozilla.org) - Documentation

## 🐛 Troubleshooting

### Icon Not Showing Results?
- ✅ Check you're on a regular webpage (not chrome://)
- ✅ Try the Refresh button
- ✅ Reload the webpage

### Word Count Seems Low?
- Extension excludes navigation, headers, and ads
- Only counts main article content
- This is intentional for accuracy!

### Settings Not Saving?
- Close and reopen popup to verify
- Check extension permissions
- Try setting again

## 💡 Pro Tips

1. **Pin the Extension**
   - Click puzzle icon in toolbar
   - Pin Reading Time Estimator for easy access

2. **Customize Reading Speed**
   - Slow readers: 150 WPM
   - Average readers: 200 WPM (default)
   - Speed readers: 300-400 WPM

3. **Use on Different Content**
   - Works great on news sites
   - Perfect for blog posts
   - Useful for documentation
   - Great for research articles

4. **Check Before Reading**
   - See if you have time before starting
   - Plan your reading sessions
   - Prioritize shorter articles

## 📚 More Information

- **Full Documentation**: See [README.md](README.md)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Installation Guide**: See [INSTALLATION.md](INSTALLATION.md)
- **Project Details**: See [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)

## 🎯 Next Steps

1. ⭐ Star the repository
2. 🐛 Report bugs or suggest features
3. 🤝 Contribute improvements
4. 📢 Share with friends!

## ❓ Need Help?

- **Issues**: [GitHub Issues](https://github.com/frpboy/chrome-reading-time-estimator/issues)
- **Email**: frpboy12@gmail.com
- **Documentation**: Check other .md files in this directory

---

**Happy Reading!** 📖✨

Made with ❤️ by [@frpboy](https://github.com/frpboy)
