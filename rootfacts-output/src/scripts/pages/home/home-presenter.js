import CameraService from "../../services/camera.service.js";
import DetectionService from "../../services/detection.service.js";
import RootFactsService from "../../services/rootfacts.service.js";
import { APP_CONFIG } from "../../config.js";
import {
  isValidDetection,
  hideElement,
  showElement,
  setElementText,
  addFadeInAnimation,
  getConfidenceCardClass,
  logError,
  createDelay,
} from "../../utils/index.js";

class HomePresenter {
  #view = null;
  #cameraService = null;
  #detectionService = null;
  #rootFactsService = null;
  #isScanning = false;
  #animationFrameId = null;
  #lastDetectedLabel = null;
  #detectionLoop = null;

  constructor(view) {
    this.#view = view;
    this.#cameraService = new CameraService();
    this.#detectionService = new DetectionService();
    this.#rootFactsService = new RootFactsService();
  }

  async initialize() {
    this.#view.updateStatus("Memuat model TF...", false);

    try {
      // Load TF model dengan progress
      await this.#detectionService.loadModel((pct, msg) => {
        this.#view.updateLoadingProgress(pct, msg);
      });

      this.#view.updateStatus("Memuat model AI...", false);

      // Load Transformers.js model
      await this.#rootFactsService.loadModel((pct, msg) => {
        this.#view.updateLoadingProgress(pct, msg);
      });

      this.#view.updateStatus("Siap", true);
      this.#view.hideLoadingProgress();
      console.log("✅ All models loaded");
    } catch (error) {
      logError("initialize", error);
      this.#view.updateStatus("Error memuat model", false);
    }
  }

  async toggleCamera() {
    if (this.#cameraService.isActive()) {
      this.stopScanning();
      this.#cameraService.stopCamera();
      this.#view.setCameraActive(false);
      this.#view.showState("idle");
    } else {
      await this.startCamera();
    }
  }

  async startCamera() {
    try {
      const cameraSelect = document.getElementById("camera-select");
      await this.#cameraService.startCamera("media-video", "media-canvas", cameraSelect);
      this.#view.setCameraActive(true);
      this.#view.showState("loading");
      this.startScanning();
    } catch (error) {
      logError("startCamera", error);
      this.#view.updateStatus(error.message, false);
      alert(error.message);
    }
  }

  startScanning() {
    this.#isScanning = true;
    this.#runDetectionLoop();
  }

  stopScanning() {
    this.#isScanning = false;
    if (this.#animationFrameId) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }
    this.#lastDetectedLabel = null;
  }

  async #runDetectionLoop() {
    if (!this.#isScanning) return;

    if (this.#cameraService.shouldProcessFrame() && this.#cameraService.isActive()) {
      try {
        const video = document.getElementById("media-video");
        if (video && video.readyState >= 2) {
          const result = await this.#detectionService.predict(video);

          if (isValidDetection(result)) {
            if (result.label !== this.#lastDetectedLabel) {
              this.#lastDetectedLabel = result.label;
              await this.#handleNewDetection(result);
            }
          }
        }
      } catch (err) {
        logError("detection loop", err);
      }
    }

    this.#animationFrameId = requestAnimationFrame(() => this.#runDetectionLoop());
  }

  async #handleNewDetection(result) {
    this.#view.showState("result");
    this.#view.updateDetectedLabel(result.label, result.confidence);
    this.#view.showFactsLoading(true);

    try {
      await createDelay(APP_CONFIG.factsGenerationDelay);
      const tone = document.getElementById("tone-select")?.value || "normal";
      const facts = await this.#rootFactsService.generateFacts(result.label, tone);
      this.#view.updateFacts(facts);
    } catch (err) {
      logError("generateFacts", err);
      this.#view.updateFacts("Gagal memuat fakta. Coba lagi.");
    } finally {
      this.#view.showFactsLoading(false);
    }
  }

  setFPS(fps) {
    this.#cameraService.setFPS(fps);
  }

  setTone(tone) {
    this.#rootFactsService.setTone(tone);
    // Reset last detected agar generate ulang dengan tone baru
    this.#lastDetectedLabel = null;
  }

  async copyFacts() {
    const factEl = document.getElementById("fun-fact-text");
    if (!factEl || !factEl.textContent) return;
    try {
      await navigator.clipboard.writeText(factEl.textContent);
      this.#view.showCopyFeedback();
    } catch (err) {
      logError("copyFacts", err);
    }
  }
}

export default HomePresenter;
