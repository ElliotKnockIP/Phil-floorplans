export let layers = {
  zones: { objects: [], visible: true, opacity: 1 },
  drawings: { objects: [], visible: true, opacity: 1 },
  devices: { objects: [], visible: true, opacity: 1 },
  background: { objects: [], visible: true, opacity: 1 },
  cctv: { objects: [], visible: true, opacity: 1 },
  intruder: { objects: [], visible: true, opacity: 1 },
  fire: { objects: [], visible: true, opacity: 1 },
  access: { objects: [], visible: true, opacity: 1 },
};

// Device type mappings
const DEVICE_CATEGORIES = {
  cctv: ["fixed-camera.png", "box-camera.png", "dome-camera.png", "ptz-camera.png", "bullet-camera.png", "thermal-camera.png"],
  access: ["access-system.png", "door-entry.png", "gates.png", "vehicle-entry.png", "turnstiles.png", "mobile-entry.png"],
  intruder: ["intruder-alarm.png", "panic-alarm.png", "motion-detector.png", "infrared-sensors.png", "pressure-mat.png", "glass-contact.png"],
  fire: ["fire-alarm.png", "fire-extinguisher.png", "fire-blanket.png", "emergency-exit.png", "assembly-point.png", "emergency-telephone.png"],
};

const SYSTEM_LAYERS = ["cctv", "intruder", "fire", "access"];

export function initCanvasLayers(fabricCanvas) {
  // Get DOM elements dynamically
  const getLayerElements = (layerName) => ({
    toggle: document.getElementById(`${layerName}-layer-toggle`),
    slider: document.getElementById(`${layerName}-layer-opacity-slider`),
  });

  // Update slider track appearance
  const updateSliderTrack = (slider, value, min = 0, max = 100) => {
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--orange-clr, #ffa500) ${percentage}%, var(--white-text-clr, #ffffff) ${percentage}%)`;
  };

  // Categorize canvas objects
  const categorizeObject = (obj) => {
    if (obj.isBackground) {
      layers.background.objects.push(obj);
      return;
    }

    if (obj.deviceType === "title-block") {
      layers.drawings.objects.push(obj);
      return;
    }

    if (obj.type === "group" && obj.deviceType) {
      // Find which category this device belongs to
      const category = Object.keys(DEVICE_CATEGORIES).find((cat) => DEVICE_CATEGORIES[cat].includes(obj.deviceType)) || "devices";

      layers[category].objects.push(obj);

      // Add related objects
      ["coverageArea", "leftResizeIcon", "rightResizeIcon", "rotateResizeIcon", "textObject"].forEach((prop) => {
        if (obj[prop]) layers[category].objects.push(obj[prop]);
      });
      return;
    }

    // Handle other object types
    if ((obj.type === "polygon" && obj.class === "zone-polygon") || (obj.type === "i-text" && obj.class === "zone-text")) {
      layers.zones.objects.push(obj);
    } else if (["line", "rect", "circle", "group", "path", "arrow", "textbox"].includes(obj.type) || (obj.type === "i-text" && obj.class !== "zone-text")) {
      layers.drawings.objects.push(obj);
    } else if (obj.type === "image") {
      const isResizeIcon = fabricCanvas.getObjects().some((o) => o.type === "group" && o.deviceType && [o.leftResizeIcon, o.rightResizeIcon, o.rotateResizeIcon].includes(obj));
      if (!isResizeIcon) {
        layers.drawings.objects.push(obj);
      }
    }
  };

  // Update visibility of objects in a layer
  const updateLayerVisibility = () => {
    const activeObject = fabricCanvas.getActiveObject();

    Object.keys(layers).forEach((layerName) => {
      layers[layerName].objects.forEach((obj) => {
        if (!obj?.set) return;

        let isVisible = layers[layerName].visible && layers[layerName].opacity > 0;
        if (SYSTEM_LAYERS.includes(layerName)) {
          isVisible = isVisible && layers.devices.visible && layers.devices.opacity > 0;
        }

        obj.set({ visible: isVisible });

        // Handle coverage area visibility
        if (obj.coverageArea?.set) {
          obj.coverageArea.set({ visible: isVisible && obj.coverageConfig?.visible });
        }

        // Handle CCTV resize icons (only visible when camera is selected)
        if (layerName === "cctv" && activeObject === obj) {
          ["leftResizeIcon", "rightResizeIcon", "rotateResizeIcon"].forEach((iconType) => {
            if (obj[iconType]) {
              obj[iconType].set({
                visible: isVisible && obj.coverageConfig?.visible,
              });
            }
          });
        }
      });
    });
    fabricCanvas.requestRenderAll();
  };

  // Update opacity with color handling
  const updateColorOpacity = (colorStr, newOpacity, isZone = false) => {
    const rgbaMatch = colorStr?.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    const hslaMatch = colorStr?.match(/hsla\((\d+),\s*(\d+)%,\s*(\d+)%,\s*([\d.]+)\)/);

    if (rgbaMatch) {
      const baseOpacity = isZone ? 0.2 : parseFloat(rgbaMatch[4]);
      return `rgba(${rgbaMatch[1]},${rgbaMatch[2]},${rgbaMatch[3]},${baseOpacity * newOpacity})`;
    }
    if (hslaMatch) {
      const baseOpacity = isZone ? 0.2 : parseFloat(hslaMatch[4]);
      return `hsla(${hslaMatch[1]},${hslaMatch[2]}%,${hslaMatch[3]}%,${baseOpacity * newOpacity})`;
    }
    return colorStr;
  };

  // Update opacity of objects in a layer
  const updateLayerOpacity = () => {
    const activeObject = fabricCanvas.getActiveObject();

    Object.keys(layers).forEach((layerName) => {
      const effectiveOpacity = SYSTEM_LAYERS.includes(layerName) ? layers[layerName].opacity * layers.devices.opacity : layers[layerName].opacity;

      layers[layerName].objects.forEach((obj) => {
        if (!obj?.set) return;

        if (layerName === "zones" && obj.type === "polygon") {
          // Handle zone polygon colors specially
          obj.set({
            fill: updateColorOpacity(obj.fill, effectiveOpacity, true),
            stroke: updateColorOpacity(obj.stroke, effectiveOpacity),
          });
        } else if (SYSTEM_LAYERS.includes(layerName) && obj.type === "polygon") {
          // Handle system layer polygons
          obj.set({
            fill: updateColorOpacity(obj.fill, effectiveOpacity),
            stroke: updateColorOpacity(obj.stroke, effectiveOpacity) || obj.stroke,
          });
          if (!updateColorOpacity(obj.stroke, effectiveOpacity)) {
            obj.set({ opacity: effectiveOpacity });
          }
        } else {
          obj.set({ opacity: effectiveOpacity });

          // Handle coverage areas for system layers
          if (SYSTEM_LAYERS.includes(layerName) && obj.coverageArea?.set) {
            const fill = obj.coverageConfig?.fillColor || obj.coverageArea.fill;
            obj.coverageArea.set({
              fill: updateColorOpacity(fill, effectiveOpacity),
              stroke: `rgba(0, 0, 0, ${effectiveOpacity})`,
              visible: layers[layerName].visible && layers.devices.visible && effectiveOpacity > 0 && obj.coverageConfig?.visible,
            });
          }

          // Handle CCTV resize icons
          if (layerName === "cctv") {
            const isCameraSelected = activeObject === obj;
            ["leftResizeIcon", "rightResizeIcon", "rotateResizeIcon"].forEach((iconType) => {
              if (obj[iconType]) {
                obj[iconType].set({
                  opacity: effectiveOpacity,
                  visible: layers[layerName].visible && layers.devices.visible && effectiveOpacity > 0 && obj.coverageConfig?.visible && isCameraSelected,
                });
              }
            });
          }
        }
      });
    });
    fabricCanvas.requestRenderAll();
  };

  // Setup layer controls
  const setupLayerControls = () => {
    Object.keys(layers).forEach((layerName) => {
      const { toggle, slider } = getLayerElements(layerName);

      // Initialize slider appearance
      if (slider) {
        updateSliderTrack(slider, slider.value, slider.min || 0, slider.max || 100);

        // Opacity slider event
        slider.addEventListener("input", () => {
          layers[layerName].opacity = slider.value / 100;
          updateLayerOpacity();
          updateSliderTrack(slider, slider.value, slider.min || 0, slider.max || 100);
        });
      }

      // Toggle event
      if (toggle) {
        toggle.addEventListener("change", () => {
          layers[layerName].visible = toggle.checked;

          // Special handling for devices layer affecting system layers
          if (layerName === "devices") {
            SYSTEM_LAYERS.forEach((sysLayer) => {
              const sysToggle = getLayerElements(sysLayer).toggle;
              layers[sysLayer].visible = toggle.checked && (sysToggle?.checked ?? true);
            });
          }

          // System layers depend on devices layer
          if (SYSTEM_LAYERS.includes(layerName)) {
            layers[layerName].visible = toggle.checked && layers.devices.visible;
          }

          updateLayerVisibility();
        });
      }
    });
  };

  // Initialize existing objects
  fabricCanvas.getObjects().forEach(categorizeObject);

  // Canvas event listeners
  fabricCanvas.on("object:added", (e) => {
    categorizeObject(e.target);
    updateLayerVisibility();
    updateLayerOpacity();
  });

  fabricCanvas.on("object:removed", (e) => {
    const obj = e.target;
    Object.keys(layers).forEach((layerName) => {
      layers[layerName].objects = layers[layerName].objects.filter((item) => item !== obj);
    });
  });

  // Initialize everything
  setupLayerControls();
  updateLayerVisibility();
  updateLayerOpacity();
}
