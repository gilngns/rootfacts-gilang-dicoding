const APP_CONFIG = {
  detectionConfidenceThreshold: 70,
  analyzingDelay: 2000,
  factsGenerationDelay: 2000,
  detectionRetryInterval: 100,
  defaultFPS: 30,
};

const UI_CONFIG = {
  animationDuration: 300,
  fadeAnimation: "fadeIn 0.5s ease-out forwards",
  confidenceThresholds: {
    excellent: 90,
    good: 80,
  },
  factsCardOpacity: {
    loading: 0.6,
    normal: 1.0,
  },
};

const CAMERA_CONFIG = {
  video: {
    facingMode: "environment",
    width: { ideal: 640 },
    height: { ideal: 480 },
  },
};

const MODEL_CONFIG = {
  tfModelPath: "./model/model.json",
  metadataPath: "./model/metadata.json",
  transformersModel: "Xenova/flan-t5-small",
  transformersDtype: "q4",
};

export { APP_CONFIG, UI_CONFIG, CAMERA_CONFIG, MODEL_CONFIG };
