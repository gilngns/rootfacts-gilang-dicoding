import {
  generateCameraSection,
  generateInfoPanel,
  generateFooter,
} from "../../templates.js";
import HomePresenter from "./home-presenter.js";
import {
  showElement,
  hideElement,
  setElementText,
  addFadeInAnimation,
  getConfidenceCardClass,
} from "../../utils/index.js";

export default class HomePage {
  #presenter = null;

  async render() {
    return `
      <main class="main-content">
        ${generateCameraSection()}
        ${generateInfoPanel()}
      </main>
      ${generateFooter()}
    `;
  }

  async afterRender() {
    this.#presenter = new HomePresenter(this);

    // Bind controls
    const btnToggle = document.getElementById("btn-toggle");
    const fpsSlider = document.getElementById("fps-slider");
    const fpsLabel = document.getElementById("fps-label");
    const toneSelect = document.getElementById("tone-select");
    const btnCopy = document.getElementById("btn-copy");

    btnToggle?.addEventListener("click", () => this.#presenter.toggleCamera());

    fpsSlider?.addEventListener("input", (e) => {
      const fps = e.target.value;
      if (fpsLabel) fpsLabel.textContent = `${fps} FPS`;
      this.#presenter.setFPS(fps);
    });

    toneSelect?.addEventListener("change", (e) => {
      this.#presenter.setTone(e.target.value);
    });

    btnCopy?.addEventListener("click", () => this.#presenter.copyFacts());

    // Init lucide icons
    if (typeof lucide !== "undefined") lucide.createIcons();

    // Initialize presenter (load models)
    await this.#presenter.initialize();
  }

  // ── View methods (dipanggil oleh Presenter) ──────────────────────────

  updateStatus(text, isReady) {
    const statusText = document.getElementById("status-text");
    const statusDot = document.getElementById("status-dot");
    if (statusText) statusText.textContent = text;
    if (statusDot) {
      statusDot.className = "status-dot" + (isReady ? " ready" : "");
    }
  }

  updateLoadingProgress(pct, msg) {
    const bar = document.getElementById("model-progress-bar");
    const label = document.getElementById("model-progress-label");
    const wrap = document.getElementById("model-progress-wrap");

    if (wrap) showElement(wrap);
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = msg || `${pct}%`;
  }

  hideLoadingProgress() {
    const wrap = document.getElementById("model-progress-wrap");
    if (wrap) {
      setTimeout(() => hideElement(wrap), 800);
    }
  }

  setCameraActive(active) {
    const placeholder = document.getElementById("camera-placeholder");
    const overlay = document.getElementById("camera-overlay");
    const btn = document.getElementById("btn-toggle");

    if (active) {
      hideElement(placeholder);
      showElement(overlay);
      if (btn) btn.classList.add("active");
    } else {
      showElement(placeholder);
      hideElement(overlay);
      if (btn) btn.classList.remove("active");
    }
  }

  showState(state) {
    ["idle", "loading", "result"].forEach((s) => {
      const el = document.getElementById(`state-${s}`);
      if (el) {
        if (s === state) {
          showElement(el);
          addFadeInAnimation(el);
        } else {
          hideElement(el);
        }
      }
    });
  }

  updateDetectedLabel(label, confidence) {
    const nameEl = document.getElementById("detected-name");
    const confEl = document.getElementById("detected-confidence");
    const fillEl = document.getElementById("confidence-fill");
    const card = document.getElementById("state-result");

    if (nameEl) nameEl.textContent = label;
    if (confEl) confEl.textContent = `${confidence}%`;
    if (fillEl) fillEl.style.width = `${confidence}%`;

    if (card) {
      card.className = "result-card result-main " + getConfidenceCardClass(confidence);
    }
  }

  showFactsLoading(show) {
    const loadingEl = document.getElementById("fun-fact-loading");
    const contentEl = document.getElementById("fun-fact-content");
    const card = document.getElementById("fun-fact-card");

    if (show) {
      showElement(loadingEl);
      hideElement(contentEl);
      if (card) card.style.opacity = "0.6";
    } else {
      hideElement(loadingEl);
      showElement(contentEl);
      if (card) card.style.opacity = "1";
    }
  }

  updateFacts(text) {
    const el = document.getElementById("fun-fact-text");
    if (el) {
      el.textContent = text;
      addFadeInAnimation(el);
    }
  }

  showCopyFeedback() {
    const btn = document.getElementById("btn-copy");
    if (!btn) return;
    const original = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="check" width="18" height="18"></i>`;
    if (typeof lucide !== "undefined") lucide.createIcons();
    setTimeout(() => {
      btn.innerHTML = original;
      if (typeof lucide !== "undefined") lucide.createIcons();
    }, 1500);
  }
}
