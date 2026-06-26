import { CAMERA_CONFIG } from "../config.js";
import { getCameraErrorMessage } from "../utils/index.js";

class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = CAMERA_CONFIG;
    this.fps = 30;
    this.fpsInterval = 1000 / 30;
    this.lastFrameTime = 0;
  }

  initializeElements(videoId, canvasId) {
    this.video = document.getElementById(videoId);
    this.canvas = document.getElementById(canvasId);
  }

  async loadCameras(cameraSelect) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      if (cameraSelect && videoDevices.length > 0) {
        cameraSelect.innerHTML = "";
        videoDevices.forEach((device, index) => {
          const option = document.createElement("option");
          option.value = device.deviceId;
          option.textContent = device.label || `Camera ${index + 1}`;
          cameraSelect.appendChild(option);
        });
      }
      return videoDevices;
    } catch (error) {
      console.error("Failed to enumerate cameras:", error);
      return [];
    }
  }

  _getConstraints(selectedDeviceId) {
    const base = { ...this.config.video };
    if (selectedDeviceId && selectedDeviceId !== "default" && selectedDeviceId !== "front") {
      return { video: { ...base, deviceId: { exact: selectedDeviceId } } };
    }
    if (selectedDeviceId === "front") {
      return { video: { ...base, facingMode: "user" } };
    }
    return { video: base };
  }

  async startCamera(videoId, canvasId, cameraSelect) {
    this.initializeElements(videoId, canvasId);

    if (this.stream) {
      this.stopCamera();
    }

    const selectedDeviceId = cameraSelect ? cameraSelect.value : null;
    const constraints = this._getConstraints(selectedDeviceId);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => resolve();
      });
      this.video.play();

      await this.loadCameras(cameraSelect);
      return true;
    } catch (error) {
      throw new Error(getCameraErrorMessage(error));
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  setFPS(fps) {
    this.fps = parseInt(fps, 10);
    this.fpsInterval = 1000 / this.fps;
  }

  shouldProcessFrame() {
    const now = performance.now();
    if (now - this.lastFrameTime >= this.fpsInterval) {
      this.lastFrameTime = now;
      return true;
    }
    return false;
  }

  isActive() {
    return !!(this.stream && this.video && this.video.readyState >= 2);
  }
}

export default CameraService;
