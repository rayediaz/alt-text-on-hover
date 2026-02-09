const STORAGE_KEY = "enabled";

const toggle = document.getElementById("toggle");
const status = document.getElementById("status");
const scanButton = document.getElementById("scan");
const countTotal = document.getElementById("count-total");
const countMissing = document.getElementById("count-missing");
const countEmpty = document.getElementById("count-empty");
const scanStatus = document.getElementById("scan-status");
const results = document.getElementById("results");
const copyJsonButton = document.getElementById("copy-json");
const copyCsvButton = document.getElementById("copy-csv");

let lastReport = null;

const setUI = (isEnabled) => {
  toggle.checked = isEnabled;
  status.textContent = isEnabled ? "Enabled" : "Disabled";
  status.style.color = isEnabled ? "#fe5f03" : "#b7a399";
};

chrome.storage.sync.get({ [STORAGE_KEY]: true }, (data) => {
  setUI(Boolean(data[STORAGE_KEY]));
});

toggle.addEventListener("change", (event) => {
  const isEnabled = event.target.checked;
  chrome.storage.sync.set({ [STORAGE_KEY]: isEnabled }, () => {
    setUI(isEnabled);
  });
});

const setScanStatus = (message) => {
  scanStatus.textContent = message;
};

const setCounts = ({ totalImages, missingCount, emptyCount }) => {
  countTotal.textContent = totalImages;
  countMissing.textContent = missingCount;
  countEmpty.textContent = emptyCount;
};

const clearResults = () => {
  results.innerHTML = "";
};

const renderResults = (items) => {
  clearResults();
  if (!items.length) {
    return;
  }

  items.forEach((item) => {
    const entry = document.createElement("div");
    entry.className = "result-item";
    entry.dataset.selector = item.selector || "";

    const title = document.createElement("div");
    title.className = "result-title";
    title.textContent = item.status === "missing" ? "Missing alt" : "Empty alt";

    const meta = document.createElement("div");
    meta.className = "result-meta";
    meta.textContent = item.src || "(no src)";

    entry.appendChild(title);
    entry.appendChild(meta);
    results.appendChild(entry);
  });
};

const getActiveTab = () =>
  new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const [tab] = tabs;
      if (!tab || !tab.id) {
        reject(new Error("No active tab."));
        return;
      }

      resolve(tab);
    });
  });

const sendMessageToActiveTab = (message) =>
  getActiveTab().then(
    (tab) =>
      new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      })
  );

const buildCsv = (report) => {
  const header = [
    "pageUrl",
    "src",
    "alt",
    "status",
    "selector",
    "naturalWidth",
    "naturalHeight"
  ];

  const rows = report.items.map((item) => [
    report.pageUrl,
    item.src,
    item.alt,
    item.status,
    item.selector,
    item.naturalWidth,
    item.naturalHeight
  ]);

  const escape = (value) => {
    const text = value === null || value === undefined ? "" : String(value);
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
};

scanButton.addEventListener("click", async () => {
  scanButton.disabled = true;
  setScanStatus("Scanning current page...");
  clearResults();

  try {
    const report = await sendMessageToActiveTab({ type: "scanImages" });
    lastReport = report;
    setCounts(report);
    renderResults(report.items);

    if (report.items.length === 0) {
      setScanStatus("No missing or empty alt text found.");
    } else {
      setScanStatus(`Found ${report.items.length} images with missing/empty alt text.`);
    }

    copyJsonButton.disabled = report.items.length === 0;
    copyCsvButton.disabled = report.items.length === 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const hint = message.includes("Receiving end does not exist")
      ? "No content script found. Reload the page and try again."
      : message;
    setScanStatus(`Scan failed: ${hint}`);
    copyJsonButton.disabled = true;
    copyCsvButton.disabled = true;
  } finally {
    scanButton.disabled = false;
  }
});

results.addEventListener("click", async (event) => {
  const item = event.target.closest(".result-item");
  if (!item || !item.dataset.selector) {
    return;
  }

  try {
    await sendMessageToActiveTab({
      type: "scrollToImage",
      selector: item.dataset.selector
    });
  } catch (error) {
    setScanStatus("Unable to jump to image on this page.");
  }
});

copyJsonButton.addEventListener("click", async () => {
  if (!lastReport) {
    return;
  }

  try {
    await navigator.clipboard.writeText(JSON.stringify(lastReport, null, 2));
    setScanStatus("Report copied as JSON.");
  } catch (error) {
    setScanStatus("Copy failed. Try again.");
  }
});

copyCsvButton.addEventListener("click", async () => {
  if (!lastReport) {
    return;
  }

  try {
    await navigator.clipboard.writeText(buildCsv(lastReport));
    setScanStatus("Report copied as CSV.");
  } catch (error) {
    setScanStatus("Copy failed. Try again.");
  }
});
