const STORAGE_KEY = "enabled";
const TOOLTIP_ID = "alt-text-hover-tooltip";
const OUTLINE_CLASS = "ath-outline";
const HIGHLIGHT_CLASS = "ath-flash";

let enabled = true;
let activeImage = null;
let tooltip = null;
let copyMessageTimer = null;

const getAltInfo = (alt) => {
  if (alt === null || alt === undefined) {
    return { text: "", status: "missing" };
  }

  const trimmed = alt.trim();
  if (trimmed.length === 0) {
    return { text: "", status: "empty" };
  }

  return { text: alt, status: "present" };
};

const ensureTooltip = () => {
  if (tooltip) {
    return tooltip;
  }

  tooltip = document.createElement("div");
  tooltip.id = TOOLTIP_ID;
  tooltip.className = "ath-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.style.display = "none";
  document.documentElement.appendChild(tooltip);
  return tooltip;
};

const setOutline = (img, shouldOutline) => {
  if (!img) {
    return;
  }

  if (shouldOutline) {
    img.classList.add(OUTLINE_CLASS);
  } else {
    img.classList.remove(OUTLINE_CLASS);
  }
};

const updateTooltipPosition = (event) => {
  if (!tooltip) {
    return;
  }

  const offsetX = 14;
  const offsetY = 18;
  const padding = 10;
  const maxWidth = 420;

  tooltip.style.maxWidth = `${maxWidth}px`;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const tooltipRect = tooltip.getBoundingClientRect();
  let left = event.clientX + offsetX;
  let top = event.clientY + offsetY;

  if (left + tooltipRect.width + padding > viewportWidth) {
    left = Math.max(padding, viewportWidth - tooltipRect.width - padding);
  }

  if (top + tooltipRect.height + padding > viewportHeight) {
    top = Math.max(padding, viewportHeight - tooltipRect.height - padding);
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
};

const showTooltip = (img, altText, missing, event) => {
  const tip = ensureTooltip();
  tip.textContent = missing ? "Missing alt text" : altText;
  tip.classList.toggle("ath-tooltip-missing", missing);
  tip.style.display = "block";

  if (activeImage && activeImage !== img) {
    setOutline(activeImage, false);
  }

  activeImage = img;
  setOutline(img, missing);
  updateTooltipPosition(event);
};

const hideTooltip = () => {
  if (copyMessageTimer) {
    clearTimeout(copyMessageTimer);
    copyMessageTimer = null;
  }

  if (tooltip) {
    tooltip.style.display = "none";
  }

  if (activeImage) {
    setOutline(activeImage, false);
  }

  activeImage = null;
};

const copyToClipboard = async (text) => {
  if (typeof navigator.clipboard?.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();

  const didCopy = document.execCommand("copy");
  textarea.remove();

  if (!didCopy) {
    throw new Error("Copy command failed");
  }
};

const showCopyMessage = (message, event, isError = false) => {
  const tip = ensureTooltip();
  tip.textContent = message;
  tip.classList.toggle("ath-tooltip-missing", isError);
  tip.style.display = "block";

  if (event) {
    updateTooltipPosition(event);
  }

  if (copyMessageTimer) {
    clearTimeout(copyMessageTimer);
  }

  copyMessageTimer = setTimeout(() => {
    const img = activeImage;
    if (!img) {
      return;
    }

    const { text, status } = getAltInfo(img.getAttribute("alt"));
    const missing = status !== "present";
    tip.textContent = missing ? "Missing alt text" : text;
    tip.classList.toggle("ath-tooltip-missing", missing);
  }, 1200);
};

const handleMouseOver = (event) => {
  if (!enabled) {
    return;
  }

  const img = event.target.closest("img");
  if (!img) {
    return;
  }

  const { text, status } = getAltInfo(img.getAttribute("alt"));
  const missing = status !== "present";
  showTooltip(img, text, missing, event);
};

const handleMouseMove = (event) => {
  if (!enabled || !tooltip || tooltip.style.display === "none") {
    return;
  }

  updateTooltipPosition(event);
};

const handleMouseOut = (event) => {
  const fromImg = event.target.closest("img");
  if (!fromImg) {
    return;
  }

  const related = event.relatedTarget;
  if (related && fromImg.contains(related)) {
    return;
  }

  hideTooltip();
};

const handleImageClick = async (event) => {
  if (!enabled) {
    return;
  }

  const img = event.target.closest("img");
  if (!img) {
    return;
  }

  activeImage = img;

  const { text, status } = getAltInfo(img.getAttribute("alt"));
  if (status !== "present") {
    showCopyMessage("No alt text to copy", event, true);
    return;
  }

  try {
    await copyToClipboard(text);
    showCopyMessage("Copied alt text", event);
  } catch {
    showCopyMessage("Unable to copy alt text", event, true);
  }
};

const handleKeyDown = (event) => {
  if (event.key === "Escape") {
    hideTooltip();
  }
};

const setEnabled = (nextEnabled) => {
  enabled = Boolean(nextEnabled);
  if (!enabled) {
    hideTooltip();
  }
};

const getDomPath = (element) => {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const parts = [];
  let node = element;

  while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.documentElement) {
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }

    const tag = node.tagName.toLowerCase();
    let selector = tag;

    if (node.parentElement) {
      const siblings = Array.from(node.parentElement.children).filter(
        (child) => child.tagName === node.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(node) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(selector);
    node = node.parentElement;
  }

  return parts.join(" > ");
};

const scanImages = () => {
  const images = Array.from(document.images);
  let missingCount = 0;
  let emptyCount = 0;

  const items = images
    .map((img) => {
      const altAttr = img.getAttribute("alt");
      const { status, text } = getAltInfo(altAttr);
      if (status === "missing") {
        missingCount += 1;
      } else if (status === "empty") {
        emptyCount += 1;
      }

      if (status === "present") {
        return null;
      }

      return {
        status,
        alt: text,
        src: img.currentSrc || img.src || "",
        selector: getDomPath(img),
        naturalWidth: img.naturalWidth || 0,
        naturalHeight: img.naturalHeight || 0
      };
    })
    .filter(Boolean);

  return {
    pageUrl: window.location.href,
    totalImages: images.length,
    missingCount,
    emptyCount,
    items
  };
};

const flashImage = (img) => {
  if (!img) {
    return;
  }

  img.classList.add(HIGHLIGHT_CLASS);
  setTimeout(() => {
    img.classList.remove(HIGHLIGHT_CLASS);
  }, 1400);
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "scanImages") {
    sendResponse(scanImages());
    return;
  }

  if (message.type === "scrollToImage") {
    const selector = message.selector || "";
    const target = selector ? document.querySelector(selector) : null;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      flashImage(target);
      sendResponse({ found: true });
    } else {
      sendResponse({ found: false });
    }
  }
});

chrome.storage.sync.get({ [STORAGE_KEY]: true }, (data) => {
  setEnabled(data[STORAGE_KEY]);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  if (changes[STORAGE_KEY]) {
    setEnabled(changes[STORAGE_KEY].newValue);
  }
});

document.addEventListener("mouseover", handleMouseOver, true);
document.addEventListener("mousemove", handleMouseMove, true);
document.addEventListener("mouseout", handleMouseOut, true);
document.addEventListener("click", (event) => {
  handleImageClick(event).catch(() => {
    showCopyMessage("Unable to copy alt text", event, true);
  });
}, true);
document.addEventListener("keydown", handleKeyDown, true);
