import { MODEL_CONFIG } from "../config.js";
import { validateModelMetadata, isWebGPUSupported } from "../utils/index.js";

class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.imageSize = 224;
    this.config = MODEL_CONFIG;
    this.currentBackend = null;
    this.performanceStats = { operations: 0, totalTime: 0, averageTime: 0 };
  }

  _getTF() {
    // TF.js dimuat via CDN di index.html, tersedia sebagai global `tf`
    if (typeof tf === "undefined") throw new Error("TensorFlow.js belum dimuat");
    return tf;
  }

  async loadModel(onProgress) {
    try {
      if (onProgress) onProgress(10, "Menginisialisasi backend...");

      const tfjs = this._getTF();

      // Adaptive backend: WebGPU → WebGL fallback
      if (isWebGPUSupported()) {
        try {
          await tfjs.setBackend("webgpu");
          await tfjs.ready();
          this.currentBackend = "webgpu";
          console.log("✅ Using WebGPU backend");
        } catch {
          console.warn("⚠️ WebGPU failed, fallback ke WebGL");
          await tfjs.setBackend("webgl");
          await tfjs.ready();
          this.currentBackend = "webgl";
        }
      } else {
        await tfjs.setBackend("webgl");
        await tfjs.ready();
        this.currentBackend = "webgl";
        console.log("✅ Using WebGL backend");
      }

      if (onProgress) onProgress(20, "Memuat metadata model...");

      const metadataRes = await fetch(this.config.metadataPath);
      const metadata = await metadataRes.json();

      if (!validateModelMetadata(metadata)) throw new Error("Metadata tidak valid");

      this.labels = metadata.labels;
      this.imageSize = metadata.imageSize || 224;

      if (onProgress) onProgress(50, "Memuat bobot model...");

      this.model = await tfjs.loadLayersModel(this.config.tfModelPath);

      if (onProgress) onProgress(90, "Warm up model...");

      tfjs.tidy(() => {
        const dummy = tfjs.zeros([1, this.imageSize, this.imageSize, 3]);
        this.model.predict(dummy);
      });

      if (onProgress) onProgress(100, "Model siap!");
      console.log(`✅ Model loaded | backend: ${this.currentBackend} | labels: ${this.labels.length}`);
      return true;
    } catch (error) {
      console.error("❌ loadModel:", error);
      throw error;
    }
  }

  async predict(imageElement) {
    if (!this.model || !imageElement) return null;

    const tfjs = this._getTF();
    const startTime = performance.now();

    const result = tfjs.tidy(() => {
      const tensor = tfjs.browser
        .fromPixels(imageElement)
        .resizeBilinear([this.imageSize, this.imageSize])
        .toFloat()
        .div(127.5)
        .sub(1)
        .expandDims(0);

      const predictions = this.model.predict(tensor);
      const data = predictions.dataSync();

      let maxIndex = 0;
      let maxValue = data[0];
      for (let i = 1; i < data.length; i++) {
        if (data[i] > maxValue) { maxValue = data[i]; maxIndex = i; }
      }

      return {
        label: this.labels[maxIndex] || "Unknown",
        confidence: Math.round(maxValue * 100),
        isValid: maxValue > 0,
      };
    });

    const elapsed = performance.now() - startTime;
    this.performanceStats.operations++;
    this.performanceStats.totalTime += elapsed;
    this.performanceStats.averageTime = this.performanceStats.totalTime / this.performanceStats.operations;

    return result;
  }
}

export default DetectionService;