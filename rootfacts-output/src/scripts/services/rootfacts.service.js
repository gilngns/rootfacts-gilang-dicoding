import { MODEL_CONFIG } from "../config.js";
import { isWebGPUSupported } from "../utils/index.js";

const TONE_PROMPTS = {
  normal: (veg) =>
    `Write a short, interesting fun fact about ${veg} vegetable in 2-3 sentences. Focus on nutrition or history.`,
  funny: (veg) =>
    `Write a funny and humorous fun fact about ${veg} vegetable in 2-3 sentences. Use a playful and witty tone.`,
  professional: (veg) =>
    `Write a professional and scientific fun fact about ${veg} vegetable in 2-3 sentences. Include nutritional data or research findings.`,
  casual: (veg) =>
    `Write a casual and friendly fun fact about ${veg} vegetable in 2-3 sentences. Write like you are talking to a friend.`,
};

// Loader Transformers.js dari CDN (di luar webpack bundle)
let _transformersPromise = null;
function loadTransformers() {
  if (_transformersPromise) return _transformersPromise;
  _transformersPromise = import(
    /* webpackIgnore: true */ "https://unpkg.com/@huggingface/transformers@3.8.1/dist/transformers.min.js"
  );
  return _transformersPromise;
}

class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = MODEL_CONFIG;
    this.currentBackend = null;
    this.currentTone = "normal";
  }

  async loadModel(onProgress) {
    try {
      if (onProgress) onProgress(5, "Memuat pustaka AI...");

      const { pipeline, env } = await loadTransformers();

      env.allowLocalModels = false;
      env.useBrowserCache = true;
      
      // Disable multithreading (Web Worker) for WASM backend.
      // Cross-origin Web Workers bypass the Service Worker, which breaks offline mode.
      // Running it on the main thread ensures the SW can intercept and serve the cached .wasm files.
      env.backends.onnx.wasmPaths = 'https://unpkg.com/@huggingface/transformers@3.8.1/dist/';
      if (env.backends && env.backends.onnx) {
        env.backends.onnx.wasm = env.backends.onnx.wasm || {};
        env.backends.onnx.wasm.wasmPaths = 'https://unpkg.com/@huggingface/transformers@3.8.1/dist/';
        env.backends.onnx.wasm.numThreads = 1;
      }

      this.currentBackend = isWebGPUSupported() ? "webgpu" : "wasm";
      console.log(`✅ Transformers.js backend: ${this.currentBackend}`);

      if (onProgress) onProgress(10, "Mengunduh model bahasa...");

      this.generator = await pipeline(
        "text2text-generation",
        this.config.transformersModel,
        {
          dtype: this.config.transformersDtype,
          device: this.currentBackend,
          progress_callback: (info) => {
            if (onProgress && info.status === "progress" && info.total) {
              const pct = Math.min(Math.round((info.loaded / info.total) * 80) + 10, 95);
              onProgress(pct, `Mengunduh model AI... ${pct}%`);
            }
          },
        }
      );

      this.isModelLoaded = true;
      if (onProgress) onProgress(100, "Model AI siap!");
      console.log("✅ Transformers.js model loaded");
      return true;
    } catch (error) {
      console.error("❌ Failed to load Transformers model:", error);
      throw error;
    }
  }

  setTone(tone) {
    if (TONE_PROMPTS[tone]) this.currentTone = tone;
  }

  async generateFacts(vegetable, tone = null) {
    if (!this.isReady()) throw new Error("Model belum siap");
    if (this.isGenerating) return null;

    const maxLen = 50;
    const cleanVeg = String(vegetable)
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .trim()
      .slice(0, maxLen);

    if (!cleanVeg) throw new Error("Input sayuran tidak valid");

    const activeTone = tone || this.currentTone;
    const promptFn = TONE_PROMPTS[activeTone] || TONE_PROMPTS["normal"];
    const prompt = promptFn(cleanVeg);

    this.isGenerating = true;
    try {
      const output = await this.generator(prompt, {
        max_new_tokens: 120,
        temperature: 0.8,
        top_p: 0.9,
        do_sample: true,
        repetition_penalty: 1.3,
      });

      return (
        output?.[0]?.generated_text?.trim() ||
        `${cleanVeg} is a nutritious vegetable packed with vitamins and minerals.`
      );
    } finally {
      this.isGenerating = false;
    }
  }

  isReady() {
    return this.isModelLoaded && this.generator !== null;
  }
}

export default RootFactsService;