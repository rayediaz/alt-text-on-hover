# Alt Text Hover Inspector

A browser extension that helps you perform QA for image accessibility and SEO. It highlights images with missing or empty alt text and reveals each image's alt text on hover, making accessibility checks quick and easy.

## Features

- **Show Alt Text on Hover:** Hover over any image to instantly see its `alt` attribute.
- **Click to Copy Alt Text:** Click any image with an `alt` value to copy it to your clipboard.
- **Missing Alt Highlight:** Images without alt text get an orange outline and are flagged as accessibility risks.
- **Popup Scanner:** Scan the current page for all images and get a breakdown of missing, empty, and total image counts.
- **Jump to Images:** Quickly navigate to flagged images by clicking on scan results.
- **Export Reports:** Copy JSON or CSV reports of missing/empty alt text for further review or documentation.
- **Toggle On/Off:** Enable or disable the extension using the popup toggle.

## Installation

1. **Clone this repository or download the ZIP:**

```sh
git clone https://github.com/[your-username]/alt-text-on-hover.git
```

2. **Open Chrome (or another Chromium-based browser) and go to:**

```
chrome://extensions
```

3. **Enable Developer Mode** (top right).

4. **Click "Load unpacked"** and select the `alt-text-on-hover` folder.

5. The Alt Text Hover Inspector icon should appear in your browser toolbar.

## Usage

- Hover any image to see its alt text; missing alt images are outlined and labeled.
- Click any image with alt text to copy its `alt` value to your clipboard.
- Click the extension icon to open the popup:
  - Toggle the extension on or off.
  - Click **Scan page** to list all missing or empty alt text images.
  - Click report items to jump to the corresponding image on the page.
  - Copy JSON/CSV for documentation or accessibility audits.

## Contributing

- Contributions are welcome! Please open an issue or submit a pull request with improvements, bug fixes, or feature ideas.

## Privacy

- The extension does not collect or transmit any personal data. For details, see [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md).

## License

MIT License. See [`LICENSE`](./LICENSE) for details.

---
**Alt Text Hover Inspector** makes image alt text QA fast, visual, and actionable.
