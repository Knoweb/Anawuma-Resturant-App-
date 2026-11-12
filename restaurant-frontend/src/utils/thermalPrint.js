import './thermalPrint.css';

const PRINT_ROOT_ID = 'anawuma-print-root';
const HTML_PRINT_CLASS = 'anawuma-printing-html';
const BODY_PRINT_CLASS = 'anawuma-printing';

let activeCleanup = null;
let activePrintToken = 0;

const ensurePrintRoot = () => {
  let root = document.getElementById(PRINT_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = PRINT_ROOT_ID;
    root.setAttribute('aria-hidden', 'true');
    document.body.appendChild(root);
  } else if (root.parentElement !== document.body || document.body.lastElementChild !== root) {
    // Keep as last direct child of body so modal/app styles cannot wrap it.
    document.body.appendChild(root);
  }
  return root;
};

/**
 * Removes thermal print mode classes and clears hidden print container.
 * Report pages (A4) should call this before triggering their own window.print().
 */
export const clearThermalPrintMode = () => {
  if (typeof activeCleanup === 'function') {
    activeCleanup();
    activeCleanup = null;
    return;
  }

  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove(HTML_PRINT_CLASS);
  document.body.classList.remove(BODY_PRINT_CLASS, 'billing-invoice-print-mode');
  const printRoot = document.getElementById(PRINT_ROOT_ID);
  if (printRoot) {
    printRoot.innerHTML = '';
  }
};

const exitFullscreenIfActive = async () => {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (!fsEl) return false;

  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
    return true;
  } catch {
    return false;
  }
};

const waitForImages = (container, maxWaitMs = 2500) => {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const timer = window.setTimeout(finish, maxWaitMs);

    Promise.all(
      images.map((img) => {
        if (img.complete) {
          return typeof img.decode === 'function'
            ? img.decode().catch(() => {})
            : Promise.resolve();
        }
        return new Promise((imgResolve) => {
          const done = () => imgResolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
      })
    ).finally(() => {
      window.clearTimeout(timer);
      finish();
    });
  });
};

const waitForNextFramesAndDelay = (delayMs) => {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, delayMs);
      });
    });
  });
};

/**
 * Prints isolated receipt/ticket HTML using an in-page print root under <body>.
 * Avoids Android Chrome popup closing races, popup blockers after async awaits,
 * hidden-iframe blank captures, and fullscreen compositor blank layers.
 */
export const printThermalDocument = async ({ html = '', styles = '' } = {}) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return false;

  clearThermalPrintMode();
  const printToken = ++activePrintToken;

  const printRoot = ensurePrintRoot();
  printRoot.innerHTML = `${styles ? `<style>${styles}</style>` : ''}<div class="anawuma-print-sheet">${html}</div>`;

  document.documentElement.classList.add(HTML_PRINT_CLASS);
  document.body.classList.add(BODY_PRINT_CLASS);

  const exitedFullscreen = await exitFullscreenIfActive();
  if (printToken !== activePrintToken) return false;

  await waitForImages(printRoot, 2500);
  if (printToken !== activePrintToken) return false;

  // Force synchronous layout reflow so mobile Chrome paints the print tree before spooler capture.
  void printRoot.offsetHeight;
  void document.body.offsetHeight;

  await waitForNextFramesAndDelay(exitedFullscreen ? 350 : 200);
  if (printToken !== activePrintToken) return false;

  const startedAt = Date.now();
  let didLeaveToSpooler = false;
  let cleaned = false;
  let fallbackTimer = null;
  let returnTimer = null;
  let onBlur;
  let onFocusReturn;
  let onVisibilityChange;
  let onUserInteraction;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    if (returnTimer) {
      window.clearTimeout(returnTimer);
      returnTimer = null;
    }

    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocusReturn);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pointerdown', onUserInteraction, true);
    window.removeEventListener('keydown', onUserInteraction, true);

    // Only wipe DOM if a newer print job hasn't taken over
    if (printToken === activePrintToken) {
      document.documentElement.classList.remove(HTML_PRINT_CLASS);
      document.body.classList.remove(BODY_PRINT_CLASS, 'billing-invoice-print-mode');
      printRoot.innerHTML = '';
    }

    if (activeCleanup === cleanup) {
      activeCleanup = null;
    }
  };

  activeCleanup = cleanup;

  const scheduleReturnCleanup = () => {
    if (returnTimer) window.clearTimeout(returnTimer);
    returnTimer = window.setTimeout(cleanup, 1000);
  };

  onBlur = () => {
    didLeaveToSpooler = true;
  };

  onFocusReturn = () => {
    if (didLeaveToSpooler || Date.now() - startedAt > 1000) {
      scheduleReturnCleanup();
    }
  };

  onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      didLeaveToSpooler = true;
    } else if (document.visibilityState === 'visible' && didLeaveToSpooler) {
      scheduleReturnCleanup();
    }
  };

  onUserInteraction = () => {
    if (Date.now() - startedAt > 1500) {
      cleanup();
    }
  };

  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocusReturn);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pointerdown', onUserInteraction, true);
  window.addEventListener('keydown', onUserInteraction, true);
  fallbackTimer = window.setTimeout(cleanup, 120000);

  window.focus();
  window.print();

  const elapsed = Date.now() - startedAt;
  // On desktop browsers, window.print() blocks until the print dialog closes.
  // On Android Chrome, window.print() returns in <50ms asynchronously; never strip print CSS prematurely.
  if (elapsed >= 400 && !document.hidden) {
    window.setTimeout(cleanup, 300);
  }

  return true;
};

export const escapeHtml = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
