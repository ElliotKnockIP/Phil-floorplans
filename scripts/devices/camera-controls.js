import { layers } from "../canvas/canvas-layers.js";

export function initCameraControls(fabricCanvas) {
  let initialized = false;
  if (initialized) return;
  initialized = true;

  const coverageToggle = document.getElementById("camera-coverage-toggle");
  const angleSlider = document.getElementById("camera-angle-slider");
  const angleInput = document.getElementById("camera-angle-input");
  const opacitySlider = document.getElementById("camera-opacity-slider");
  const opacityInput = document.getElementById("camera-opacity-input");
  const distanceSlider = document.getElementById("camera-distance-slider");
  const distanceInput = document.getElementById("camera-distance-input");

  let isInitializing = true;

  if (angleSlider) {
    angleSlider.value = 90;
    if (angleInput) angleInput.value = 90;
  }

  if (distanceSlider) {
    distanceSlider.min = 1;
    distanceSlider.max = 500;
    distanceSlider.step = 0.1;
    distanceSlider.value = 10;
    if (distanceInput) distanceInput.value = 10;
  }

  function updateSliderTrack(slider, value, min, max) {
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--orange-clr, #ffa500) ${percentage}%, var(--white-text-clr, #ffffff) ${percentage}%)`;
  }

  function updateAngleSliderTrack() {
    if (angleSlider) {
      const value = parseFloat(angleSlider.value) || 90;
      const min = parseFloat(angleSlider.min) || 1;
      const max = parseFloat(angleSlider.max) || 360;
      updateSliderTrack(angleSlider, value, min, max);
    }
  }

  function updateOpacitySliderTrack() {
    if (opacitySlider) {
      const value = parseFloat(opacitySlider.value) || 0.3;
      const min = parseFloat(opacitySlider.min) || 0;
      const max = parseFloat(opacitySlider.max) || 1;
      updateSliderTrack(opacitySlider, value, min, max);
    }
  }

  function updateDistanceSliderTrack() {
    if (distanceSlider) {
      const value = parseFloat(distanceSlider.value) || 10;
      const min = parseFloat(distanceSlider.min) || 1;
      const max = parseFloat(distanceSlider.max) || 500;
      updateSliderTrack(distanceSlider, value, min, max);
    }
  }

  if (coverageToggle) {
    coverageToggle.addEventListener("change", () => {
      const activeObject = fabricCanvas.getActiveObject();
      if (activeObject && activeObject.coverageConfig) {
        activeObject.coverageConfig.visible = coverageToggle.checked;
        activeObject.coverageArea.set({ visible: coverageToggle.checked && layers.devices.visible });
        if (activeObject.leftResizeIcon) activeObject.leftResizeIcon.set({ visible: coverageToggle.checked && layers.devices.visible });
        if (activeObject.rightResizeIcon) activeObject.rightResizeIcon.set({ visible: coverageToggle.checked && layers.devices.visible });
        if (activeObject.rotateResizeIcon) activeObject.rotateResizeIcon.set({ visible: coverageToggle.checked && layers.devices.visible });
        fabricCanvas.renderAll();
      }
    });
  }

  if (angleSlider) {
    angleSlider.addEventListener("input", () => {
      if (isInitializing) return;
      const activeObject = fabricCanvas.getActiveObject();
      if (activeObject && activeObject.coverageConfig && activeObject.angleDiff) {
        const angleSpan = Math.round(parseFloat(angleSlider.value));
        if (angleInput) angleInput.value = angleSpan;
        const midAngle = (activeObject.coverageConfig.startAngle + activeObject.angleDiff(activeObject.coverageConfig.startAngle, activeObject.coverageConfig.endAngle) / 2) % 360;
        activeObject.coverageConfig.startAngle = (midAngle - angleSpan / 2 + 360) % 360;
        activeObject.coverageConfig.endAngle = (midAngle + angleSpan / 2) % 360;
        if (angleSpan >= 359) {
          activeObject.coverageConfig.startAngle = 0;
          activeObject.coverageConfig.endAngle = 360;
        }
        activeObject.coverageConfig.isInitialized = true;
        if (activeObject.createOrUpdateCoverageArea) activeObject.createOrUpdateCoverageArea();
        updateAngleSliderTrack();
      }
    });
  }

  if (angleInput) {
    angleInput.addEventListener("input", () => {
      if (isInitializing) return;
      const activeObject = fabricCanvas.getActiveObject();
      if (activeObject && activeObject.coverageConfig && activeObject.angleDiff) {
        let angleSpan = parseFloat(angleInput.value);
        if (isNaN(angleSpan) || angleSpan < 1) angleSpan = 1;
        if (angleSpan > 360) angleSpan = 360;
        angleInput.value = angleSpan;
        if (angleSlider) {
          angleSlider.value = angleSpan;
          angleSlider.dispatchEvent(new Event("input"));
        }
        const midAngle = (activeObject.coverageConfig.startAngle + activeObject.angleDiff(activeObject.coverageConfig.startAngle, activeObject.coverageConfig.endAngle) / 2) % 360;
        activeObject.coverageConfig.startAngle = (midAngle - angleSpan / 2 + 360) % 360;
        activeObject.coverageConfig.endAngle = (midAngle + angleSpan / 2) % 360;
        if (angleSpan >= 359) {
          activeObject.coverageConfig.startAngle = 0;
          activeObject.coverageConfig.endAngle = 360;
        }
        activeObject.coverageConfig.isInitialized = true;
        if (activeObject.createOrUpdateCoverageArea) activeObject.createOrUpdateCoverageArea();
        updateAngleSliderTrack();
      }
    });
  }

  if (opacitySlider) {
    opacitySlider.addEventListener("input", () => {
      const activeObject = fabricCanvas.getActiveObject();
      if (activeObject && activeObject.coverageConfig && activeObject.coverageArea) {
        const cameraOpacity = parseFloat(opacitySlider.value);
        if (opacityInput) opacityInput.value = cameraOpacity.toFixed(2);
        const rgbMatch = activeObject.coverageConfig.fillColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        const devicesLayerOpacity = layers.devices.opacity;
        const finalOpacity = cameraOpacity * devicesLayerOpacity;
        if (rgbMatch) {
          const [, r, g, b] = rgbMatch;
          const newFill = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
          activeObject.coverageArea.set({ fill: newFill });
          activeObject.coverageConfig.fillColor = newFill;
        } else {
          const newFill = `rgba(165, 155, 155, ${finalOpacity})`;
          activeObject.coverageArea.set({ fill: newFill });
          activeObject.coverageConfig.fillColor = newFill;
        }
        fabricCanvas.renderAll();
        updateOpacitySliderTrack();
      }
    });
  }

  if (opacityInput) {
    opacityInput.addEventListener("input", () => {
      const activeObject = fabricCanvas.getActiveObject();
      if (activeObject && activeObject.coverageConfig && activeObject.coverageArea) {
        let cameraOpacity = parseFloat(opacityInput.value);
        if (isNaN(cameraOpacity) || cameraOpacity < 0) cameraOpacity = 0;
        if (cameraOpacity > 1) cameraOpacity = 1;
        opacityInput.value = cameraOpacity.toFixed(2);
        if (opacitySlider) {
          opacitySlider.value = cameraOpacity;
          opacitySlider.dispatchEvent(new Event("input"));
        }
        const rgbMatch = activeObject.coverageConfig.fillColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        const devicesLayerOpacity = layers.devices.opacity;
        const finalOpacity = cameraOpacity * devicesLayerOpacity;
        if (rgbMatch) {
          const [, r, g, b] = rgbMatch;
          const newFill = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
          activeObject.coverageArea.set({ fill: newFill });
          activeObject.coverageConfig.fillColor = newFill;
        } else {
          const newFill = `rgba(165, 155, 155, ${finalOpacity})`;
          activeObject.coverageArea.set({ fill: newFill });
          activeObject.coverageConfig.fillColor = newFill;
        }
        fabricCanvas.renderAll();
        updateOpacitySliderTrack();
      }
    });
  }

  if (distanceSlider) {
    distanceSlider.addEventListener("input", () => {
      const activeObject = fabricCanvas.getActiveObject();
      if (activeObject && activeObject.coverageConfig && activeObject.coverageArea) {
        const pixelsPerMeter = fabricCanvas.pixelsPerMeter || 17.5;
        const distance = Math.min(parseFloat(distanceSlider.value), 500);
        activeObject.coverageConfig.radius = distance * pixelsPerMeter;
        if (distanceInput) distanceInput.value = distance.toFixed(2);
        if (activeObject.createOrUpdateCoverageArea) activeObject.createOrUpdateCoverageArea();
        updateDistanceSliderTrack();
      }
    });
  }

  if (distanceInput) {
    distanceInput.addEventListener("input", () => {
      const activeObject = fabricCanvas.getActiveObject();
      if (activeObject && activeObject.coverageConfig && activeObject.coverageArea) {
        const pixelsPerMeter = fabricCanvas.pixelsPerMeter || 17.5;
        let distance = parseFloat(distanceInput.value);
        if (isNaN(distance) || distance < 1) distance = 1;
        if (distance > 500) distance = 500;
        activeObject.coverageConfig.radius = distance * pixelsPerMeter;
        distanceInput.value = distance.toFixed(2);
        if (distanceSlider) {
          distanceSlider.value = distance;
          distanceSlider.dispatchEvent(new Event("input"));
        }
        if (activeObject.createOrUpdateCoverageArea) activeObject.createOrUpdateCoverageArea();
        updateDistanceSliderTrack();
      }
    });
  }

  updateAngleSliderTrack();
  updateOpacitySliderTrack();
  updateDistanceSliderTrack();

  isInitializing = false;
}
