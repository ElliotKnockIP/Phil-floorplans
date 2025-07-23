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

export function initCanvasLayers(fabricCanvas) {
  // DOM Elements
  const backgroundLayerToggle = document.getElementById("background-layer-toggle");
  const backgroundLayerSlider = document.getElementById("background-layer-opacity-slider");
  const devicesLayerToggle = document.getElementById("devices-layer-toggle");
  const devicesLayerSlider = document.getElementById("devices-layer-opacity-slider");
  const zonesLayerToggle = document.getElementById("zones-layer-toggle");
  const zonesLayerSlider = document.getElementById("zones-layer-opacity-slider");
  const drawingsLayerToggle = document.getElementById("drawings-layer-toggle");
  const drawingsLayerSlider = document.getElementById("drawings-layer-opacity-slider");
  const cctvLayerToggle = document.getElementById("cctv-layer-toggle");
  const cctvLayerSlider = document.getElementById("cctv-layer-opacity-slider");
  const intruderLayerToggle = document.getElementById("intruder-layer-toggle");
  const intruderLayerSlider = document.getElementById("intruder-layer-opacity-slider");
  const fireLayerToggle = document.getElementById("fire-layer-toggle");
  const fireLayerSlider = document.getElementById("fire-layer-opacity-slider");
  const accessLayerToggle = document.getElementById("access-layer-toggle");
  const accessLayerSlider = document.getElementById("access-layer-opacity-slider");

  // Function to update slider track appearance
  function updateSliderTrack(slider, value, min, max) {
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--orange-clr, #ffa500) ${percentage}%, var(--white-text-clr, #ffffff) ${percentage}%)`;
  }

  // Function to categorize canvas objects
  function categorizeObject(obj) {
    if (obj.isBackground) {
      layers.background.objects.push(obj); // Add to background layer
      return;
    }
    if (obj.deviceType === "title-block") {
      layers.drawings.objects.push(obj); // Explicitly categorize title-block as drawings
    } else if (obj.type === "group" && obj.deviceType) {
      // System-specific device types from index.html
      const cctvTypes = ["fixed-camera.png", "box-camera.png", "dome-camera.png", "ptz-camera.png", "bullet-camera.png", "thermal-camera.png"];
      const accessTypes = ["access-system.png", "door-entry.png", "gates.png", "vehicle-entry.png", "turnstiles.png", "mobile-entry.png"];
      const intruderTypes = ["intruder-alarm.png", "panic-alarm.png", "motion-detector.png", "infrared-sensors.png", "pressure-mat.png", "glass-contact.png"];
      const fireTypes = ["fire-alarm.png", "fire-extinguisher.png", "fire-blanket.png", "emergency-exit.png", "assembly-point.png", "emergency-telephone.png"];

      // Categorize devices into specific system layers
      if (cctvTypes.includes(obj.deviceType)) {
        layers.cctv.objects.push(obj);
        if (obj.coverageArea) layers.cctv.objects.push(obj.coverageArea);
        if (obj.leftResizeIcon) layers.cctv.objects.push(obj.leftResizeIcon);
        if (obj.rightResizeIcon) layers.cctv.objects.push(obj.rightResizeIcon);
        if (obj.rotateResizeIcon) layers.cctv.objects.push(obj.rotateResizeIcon);
        if (obj.textObject) layers.cctv.objects.push(obj.textObject);
      } else if (accessTypes.includes(obj.deviceType)) {
        layers.access.objects.push(obj);
        if (obj.textObject) layers.access.objects.push(obj.textObject);
      } else if (intruderTypes.includes(obj.deviceType)) {
        layers.intruder.objects.push(obj);
        if (obj.textObject) layers.intruder.objects.push(obj.textObject);
      } else if (fireTypes.includes(obj.deviceType)) {
        layers.fire.objects.push(obj);
        if (obj.textObject) layers.fire.objects.push(obj.textObject);
      } else {
        layers.devices.objects.push(obj);
        if (obj.textObject) layers.devices.objects.push(obj.textObject);
      }
    } else if (obj.type === "text" && obj.backgroundColor === "rgba(20, 18, 18, 0.8)") {
      // Text objects associated with devices are handled above
    } else if ((obj.type === "polygon" && obj.class === "zone-polygon") || (obj.type === "i-text" && obj.class === "zone-text")) {
      layers.zones.objects.push(obj);
    } else if (obj.type === "line" || obj.type === "rect" || obj.type === "circle" || (obj.type === "i-text" && obj.class !== "zone-text") || obj.type === "group" || obj.type === "path" || obj.type === "arrow" || obj.type === "textbox") {
      layers.drawings.objects.push(obj);
    } else if (obj.type === "image") {
      const isResizeIcon = fabricCanvas.getObjects().some((o) => o.type === "group" && o.deviceType && (o.leftResizeIcon === obj || o.rightResizeIcon === obj || o.rotateResizeIcon === obj));
      if (!isResizeIcon) {
        layers.drawings.objects.push(obj);
      }
    }
  }

  // Initialize existing objects
  fabricCanvas.getObjects().forEach((obj) => categorizeObject(obj));

  // Listen for new objects added to canvas
  fabricCanvas.on("object:added", (e) => {
    categorizeObject(e.target);
    updateLayerVisibility();
    updateLayerOpacity();
  });

  // Listen for objects removed from canvas
  fabricCanvas.on("object:removed", (e) => {
    const obj = e.target;
    for (const layer in layers) {
      layers[layer].objects = layers[layer].objects.filter((item) => item !== obj);
    }
  });

  // Update visibility of objects in a layer
  function updateLayerVisibility() {
    // Get the currently selected object
    const activeObject = fabricCanvas.getActiveObject();

    // System-specific layers
    const systemLayers = ["cctv", "intruder", "fire", "access"];
    for (const layer in layers) {
      layers[layer].objects.forEach((obj) => {
        if (obj && typeof obj.set === "function") {
          // If in a system layer, visibility depends on both devices layer and specific layer
          let isVisible = layers[layer].visible && layers[layer].opacity > 0;
          if (systemLayers.includes(layer)) {
            isVisible = isVisible && layers.devices.visible && layers.devices.opacity > 0;
          }
          obj.set({ visible: isVisible });
          // If the object has a coverageArea, update its visibility
          if (obj.coverageArea && typeof obj.coverageArea.set === "function") {
            obj.coverageArea.set({ visible: isVisible && obj.coverageConfig?.visible });
          }
          // Update visibility of resize icons for CCTV devices - ONLY if the camera is selected
          if (layer === "cctv" && (obj.leftResizeIcon || obj.rightResizeIcon || obj.rotateResizeIcon)) {
            const isCameraSelected = activeObject === obj;
            if (obj.leftResizeIcon) obj.leftResizeIcon.set({ visible: isVisible && obj.coverageConfig?.visible && isCameraSelected });
            if (obj.rightResizeIcon) obj.rightResizeIcon.set({ visible: isVisible && obj.coverageConfig?.visible && isCameraSelected });
            if (obj.rotateResizeIcon) obj.rotateResizeIcon.set({ visible: isVisible && obj.coverageConfig?.visible && isCameraSelected });
          }
        }
      });
    }
    fabricCanvas.requestRenderAll();
  }

  // Update opacity of objects in a layer
  function updateLayerOpacity() {
    // Get the currently selected object for resize icon opacity updates
    const activeObject = fabricCanvas.getActiveObject();

    const systemLayers = ["cctv", "intruder", "fire", "access"];
    for (const layer in layers) {
      layers[layer].objects.forEach((obj) => {
        if (!obj || typeof obj.set !== "function") return;

        // Effective opacity combines layer-specific and devices layer opacity for system layers
        const effectiveOpacity = systemLayers.includes(layer) ? layers[layer].opacity * layers.devices.opacity : layers[layer].opacity;

        if (layer === "zones" && obj.type === "polygon") {
          const fill = obj.fill;
          const stroke = obj.stroke;
          if (fill && fill.startsWith("rgba")) {
            const rgba = fill.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
            if (rgba) {
              obj.set({ fill: `rgba(${rgba[1]},${rgba[2]},${rgba[3]},${effectiveOpacity * 0.2})` });
            }
          } else if (fill && fill.startsWith("hsla")) {
            const hsla = fill.match(/hsla\((\d+),\s*(\d+)%,\s*(\d+)%,\s*([\d.]+)\)/);
            if (hsla) {
              obj.set({ fill: `hsla(${hsla[1]},${hsla[2]}%,${hsla[3]}%,${effectiveOpacity * 0.2})` });
            }
          }
          if (stroke && stroke.startsWith("rgba")) {
            const rgba = stroke.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
            if (rgba) {
              obj.set({ stroke: `rgba(${rgba[1]},${rgba[2]},${rgba[3]},${effectiveOpacity})` });
            }
          } else if (stroke && stroke.startsWith("hsla")) {
            const hsla = stroke.match(/hsla\((\d+),\s*(\d+)%,\s*(\d+)%,\s*([\d.]+)\)/);
            if (hsla) {
              obj.set({ stroke: `hsla(${hsla[1]},${hsla[2]}%,${hsla[3]}%,${effectiveOpacity})` });
            }
          }
        } else if (systemLayers.includes(layer) && obj.type === "polygon") {
          const fill = obj.fill;
          if (fill && fill.startsWith("rgba")) {
            const rgba = fill.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
            if (rgba) {
              const originalOpacity = parseFloat(rgba[4]);
              obj.set({ fill: `rgba(${rgba[1]},${rgba[2]},${rgba[3]},${originalOpacity * effectiveOpacity})` });
            }
          }
          const stroke = obj.stroke;
          if (stroke && stroke.startsWith("rgba")) {
            const rgba = stroke.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
            if (rgba) {
              obj.set({ stroke: `rgba(${rgba[1]},${rgba[2]},${rgba[3]},${effectiveOpacity})` });
            }
          } else if (stroke) {
            obj.set({ opacity: effectiveOpacity });
          }
        } else {
          obj.set({ opacity: effectiveOpacity });
          if (systemLayers.includes(layer) && obj.coverageArea && typeof obj.coverageArea.set === "function") {
            const fill = obj.coverageConfig?.fillColor || obj.coverageArea.fill;
            if (fill && fill.startsWith("rgba")) {
              const rgba = fill.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
              if (rgba) {
                const originalOpacity = parseFloat(rgba[4]);
                obj.coverageArea.set({
                  fill: `rgba(${rgba[1]},${rgba[2]},${rgba[3]},${originalOpacity * effectiveOpacity})`,
                  stroke: `rgba(0, 0, 0, ${effectiveOpacity})`,
                  visible: layers[layer].visible && layers.devices.visible && effectiveOpacity > 0 && obj.coverageConfig.visible,
                });
              }
            }
          }
          // Update opacity of resize icons for CCTV devices (whether visible or not)
          if (layer === "cctv" && (obj.leftResizeIcon || obj.rightResizeIcon || obj.rotateResizeIcon)) {
            const isCameraSelected = activeObject === obj;
            if (obj.leftResizeIcon) {
              obj.leftResizeIcon.set({
                opacity: effectiveOpacity,
                visible: layers[layer].visible && layers.devices.visible && effectiveOpacity > 0 && obj.coverageConfig?.visible && isCameraSelected,
              });
            }
            if (obj.rightResizeIcon) {
              obj.rightResizeIcon.set({
                opacity: effectiveOpacity,
                visible: layers[layer].visible && layers.devices.visible && effectiveOpacity > 0 && obj.coverageConfig?.visible && isCameraSelected,
              });
            }
            if (obj.rotateResizeIcon) {
              obj.rotateResizeIcon.set({
                opacity: effectiveOpacity,
                visible: layers[layer].visible && layers.devices.visible && effectiveOpacity > 0 && obj.coverageConfig?.visible && isCameraSelected,
              });
            }
          }
        }
      });
    }
    fabricCanvas.requestRenderAll();
  }

  // Initialize slider appearance
  if (zonesLayerSlider) {
    updateSliderTrack(zonesLayerSlider, zonesLayerSlider.value, zonesLayerSlider.min || 0, zonesLayerSlider.max || 100);
  }
  if (drawingsLayerSlider) {
    updateSliderTrack(drawingsLayerSlider, drawingsLayerSlider.value, drawingsLayerSlider.min || 0, drawingsLayerSlider.max || 100);
  }
  if (devicesLayerSlider) {
    updateSliderTrack(devicesLayerSlider, devicesLayerSlider.value, devicesLayerSlider.min || 0, devicesLayerSlider.max || 100);
  }
  if (backgroundLayerSlider) {
    updateSliderTrack(backgroundLayerSlider, backgroundLayerSlider.value, backgroundLayerSlider.min || 0, backgroundLayerSlider.max || 100);
  }
  if (cctvLayerSlider) {
    updateSliderTrack(cctvLayerSlider, cctvLayerSlider.value, cctvLayerSlider.min || 0, cctvLayerSlider.max || 100);
  }
  if (intruderLayerSlider) {
    updateSliderTrack(intruderLayerSlider, intruderLayerSlider.value, intruderLayerSlider.min || 0, intruderLayerSlider.max || 100);
  }
  if (fireLayerSlider) {
    updateSliderTrack(fireLayerSlider, fireLayerSlider.value, fireLayerSlider.min || 0, fireLayerSlider.max || 100);
  }
  if (accessLayerSlider) {
    updateSliderTrack(accessLayerSlider, accessLayerSlider.value, accessLayerSlider.min || 0, accessLayerSlider.max || 100);
  }

  // Event listeners for toggles
  if (zonesLayerToggle) {
    zonesLayerToggle.addEventListener("change", () => {
      layers.zones.visible = zonesLayerToggle.checked;
      updateLayerVisibility();
    });
  }

  if (drawingsLayerToggle) {
    drawingsLayerToggle.addEventListener("change", () => {
      layers.drawings.visible = drawingsLayerToggle.checked;
      updateLayerVisibility();
    });
  }

  if (devicesLayerToggle) {
    devicesLayerToggle.addEventListener("change", () => {
      layers.devices.visible = devicesLayerToggle.checked;
      // Update visibility of system-specific layers
      layers.cctv.visible = devicesLayerToggle.checked && (cctvLayerToggle ? cctvLayerToggle.checked : true);
      layers.intruder.visible = devicesLayerToggle.checked && (intruderLayerToggle ? intruderLayerToggle.checked : true);
      layers.fire.visible = devicesLayerToggle.checked && (fireLayerToggle ? fireLayerToggle.checked : true);
      layers.access.visible = devicesLayerToggle.checked && (accessLayerToggle ? accessLayerToggle.checked : true);
      updateLayerVisibility();
    });
  }

  if (backgroundLayerToggle) {
    backgroundLayerToggle.addEventListener("change", () => {
      layers.background.visible = backgroundLayerToggle.checked;
      updateLayerVisibility();
    });
  }

  if (cctvLayerToggle) {
    cctvLayerToggle.addEventListener("change", () => {
      layers.cctv.visible = cctvLayerToggle.checked && layers.devices.visible;
      updateLayerVisibility();
    });
  }

  if (intruderLayerToggle) {
    intruderLayerToggle.addEventListener("change", () => {
      layers.intruder.visible = intruderLayerToggle.checked && layers.devices.visible;
      updateLayerVisibility();
    });
  }

  if (fireLayerToggle) {
    fireLayerToggle.addEventListener("change", () => {
      layers.fire.visible = fireLayerToggle.checked && layers.devices.visible;
      updateLayerVisibility();
    });
  }

  if (accessLayerToggle) {
    accessLayerToggle.addEventListener("change", () => {
      layers.access.visible = accessLayerToggle.checked && layers.devices.visible;
      updateLayerVisibility();
    });
  }

  // Event listeners for opacity sliders
  if (zonesLayerSlider) {
    zonesLayerSlider.addEventListener("input", () => {
      layers.zones.opacity = zonesLayerSlider.value / 100;
      updateLayerOpacity();
      updateSliderTrack(zonesLayerSlider, zonesLayerSlider.value, zonesLayerSlider.min || 0, zonesLayerSlider.max || 100);
    });
  }

  if (drawingsLayerSlider) {
    drawingsLayerSlider.addEventListener("input", () => {
      layers.drawings.opacity = drawingsLayerSlider.value / 100;
      updateLayerOpacity();
      updateSliderTrack(drawingsLayerSlider, drawingsLayerSlider.value, drawingsLayerSlider.min || 0, drawingsLayerSlider.max || 100);
    });
  }

  if (devicesLayerSlider) {
    devicesLayerSlider.addEventListener("input", () => {
      layers.devices.opacity = devicesLayerSlider.value / 100;
      updateLayerOpacity();
      updateSliderTrack(devicesLayerSlider, devicesLayerSlider.value, devicesLayerSlider.min || 0, devicesLayerSlider.max || 100);
    });
  }

  if (backgroundLayerSlider) {
    backgroundLayerSlider.addEventListener("input", () => {
      layers.background.opacity = backgroundLayerSlider.value / 100;
      updateLayerOpacity();
      updateSliderTrack(backgroundLayerSlider, backgroundLayerSlider.value, backgroundLayerSlider.min || 0, backgroundLayerSlider.max || 100);
    });
  }

  if (cctvLayerSlider) {
    cctvLayerSlider.addEventListener("input", () => {
      layers.cctv.opacity = cctvLayerSlider.value / 100;
      updateLayerOpacity();
      updateSliderTrack(cctvLayerSlider, cctvLayerSlider.value, cctvLayerSlider.min || 0, cctvLayerSlider.max || 100);
    });
  }

  if (intruderLayerSlider) {
    intruderLayerSlider.addEventListener("input", () => {
      layers.intruder.opacity = intruderLayerSlider.value / 100;
      updateLayerOpacity();
      updateSliderTrack(intruderLayerSlider, intruderLayerSlider.value, intruderLayerSlider.min || 0, intruderLayerSlider.max || 100);
    });
  }

  if (fireLayerSlider) {
    fireLayerSlider.addEventListener("input", () => {
      layers.fire.opacity = fireLayerSlider.value / 100;
      updateLayerOpacity();
      updateSliderTrack(fireLayerSlider, fireLayerSlider.value, fireLayerSlider.min || 0, fireLayerSlider.max || 100);
    });
  }

  if (accessLayerSlider) {
    accessLayerSlider.addEventListener("input", () => {
      layers.access.opacity = accessLayerSlider.value / 100;
      updateLayerOpacity();
      updateSliderTrack(accessLayerSlider, accessLayerSlider.value, accessLayerSlider.min || 0, accessLayerSlider.max || 100);
    });
  }

  // Initial update
  updateLayerVisibility();
  updateLayerOpacity();
}
