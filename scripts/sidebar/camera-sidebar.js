import { addCameraCoverage } from "../devices/camera-coverage.js";
import { layers } from "../canvas/canvas-layers.js";
import { updateSliderTrack, createSliderInputSync, setupColorControls, hexToRgba, wrapGlobalFunction, setObjectProperty, setMultipleObjectProperties, safeCanvasRender } from "./sidebar-utils.js";

document.addEventListener("DOMContentLoaded", () => {
  const coverageColorIcons = document.querySelectorAll(".change-coverage-colour .colour-icon");
  const coverageColorPicker = document.getElementById("coverage-color-picker");

  // Camera controls elements
  const coverageToggle = document.getElementById("camera-coverage-toggle");
  const angleSlider = document.getElementById("camera-angle-slider");
  const angleInput = document.getElementById("camera-angle-input");
  const opacitySlider = document.getElementById("camera-opacity-slider");
  const opacityInput = document.getElementById("camera-opacity-input");
  const distanceSlider = document.getElementById("camera-distance-slider");
  const distanceInput = document.getElementById("camera-distance-input");

  let currentGroup = null;
  let isInitializing = true;
  let controlsInitialized = false;

  function updateCoverageOpacity(activeObject, cameraOpacity) {
    const rgbMatch = activeObject.coverageConfig.fillColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const devicesLayerOpacity = layers.devices.opacity;
    const finalOpacity = cameraOpacity * devicesLayerOpacity;

    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      const newFill = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
      setMultipleObjectProperties(activeObject.coverageArea, { fill: newFill });
      activeObject.coverageConfig.fillColor = newFill;
    } else {
      const newFill = `rgba(165, 155, 155, ${finalOpacity})`;
      setMultipleObjectProperties(activeObject.coverageArea, { fill: newFill });
      activeObject.coverageConfig.fillColor = newFill;
    }
  }

  function updateAngle(activeObject, angleSpan) {
    const midAngle = (activeObject.coverageConfig.startAngle + activeObject.angleDiff(activeObject.coverageConfig.startAngle, activeObject.coverageConfig.endAngle) / 2) % 360;
    activeObject.coverageConfig.startAngle = (midAngle - angleSpan / 2 + 360) % 360;
    activeObject.coverageConfig.endAngle = (midAngle + angleSpan / 2) % 360;

    if (angleSpan >= 359) {
      activeObject.coverageConfig.startAngle = 0;
      activeObject.coverageConfig.endAngle = 360;
    }

    activeObject.coverageConfig.isInitialized = true;
    if (activeObject.createOrUpdateCoverageArea) activeObject.createOrUpdateCoverageArea();
  }

  // Initialize camera controls
  function initCameraControls(fabricCanvas) {
    if (controlsInitialized) return;
    controlsInitialized = true;

    // Set initial values
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

    // Coverage toggle
    if (coverageToggle) {
      coverageToggle.addEventListener("change", () => {
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject && activeObject.coverageConfig) {
          const visible = coverageToggle.checked && layers.devices.visible;
          activeObject.coverageConfig.visible = coverageToggle.checked;

          setObjectProperty(activeObject.coverageArea, "visible", visible, fabricCanvas);
          if (activeObject.leftResizeIcon) setObjectProperty(activeObject.leftResizeIcon, "visible", visible);
          if (activeObject.rightResizeIcon) setObjectProperty(activeObject.rightResizeIcon, "visible", visible);
          if (activeObject.rotateResizeIcon) setObjectProperty(activeObject.rotateResizeIcon, "visible", visible);
        }
      });
    }

    // Angle controls
    createSliderInputSync(
      angleSlider,
      angleInput,
      (value) => {
        if (isInitializing) return;
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject && activeObject.coverageConfig && activeObject.angleDiff) {
          const angleSpan = Math.round(value);
          updateAngle(activeObject, angleSpan);
        }
      },
      { min: 1, max: 360, step: 1 }
    );

    // Opacity controls
    createSliderInputSync(
      opacitySlider,
      opacityInput,
      (value) => {
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject && activeObject.coverageConfig && activeObject.coverageArea) {
          updateCoverageOpacity(activeObject, value);
        }
      },
      { min: 0, max: 1, step: 0.01, precision: 2 }
    );

    // Distance controls
    createSliderInputSync(
      distanceSlider,
      distanceInput,
      (value) => {
        const activeObject = fabricCanvas.getActiveObject();
        if (activeObject && activeObject.coverageConfig && activeObject.coverageArea) {
          const pixelsPerMeter = fabricCanvas.pixelsPerMeter || 17.5;
          const distance = Math.min(value, 500);
          activeObject.coverageConfig.radius = distance * pixelsPerMeter;
          if (activeObject.createOrUpdateCoverageArea) activeObject.createOrUpdateCoverageArea();
        }
      },
      { min: 1, max: 500, step: 0.1, precision: 2 }
    );

    // Initialize slider tracks
    updateSliderTrack(angleSlider, 90, 1, 360);
    updateSliderTrack(opacitySlider, 0.3, 0, 1);
    updateSliderTrack(distanceSlider, 10, 1, 500);

    isInitializing = false;
  }

  // Wrap global functions
  wrapGlobalFunction("showDeviceProperties", (deviceType, textObject, group) => {
    currentGroup = group;
    if (group && group.canvas && !controlsInitialized) {
      initCameraControls(group.canvas);
    }
  });

  wrapGlobalFunction("hideDeviceProperties", () => {
    currentGroup = null;
  });

  // Coverage color controls
  setupColorControls(coverageColorPicker, coverageColorIcons, (color) => {
    if (currentGroup && currentGroup.canvas && currentGroup.coverageArea) {
      const opacity = parseFloat(opacitySlider?.value) || 0.3;
      const rgbaColor = hexToRgba(color, opacity);
      setMultipleObjectProperties(currentGroup.coverageArea, { fill: rgbaColor }, currentGroup.canvas);
      currentGroup.coverageConfig.fillColor = rgbaColor;
    }
  });

  // Camera icon change handlers
  document.querySelectorAll(".change-camera-icons img").forEach((img) => {
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!currentGroup || !currentGroup.canvas) return;

      const newSrc = img.getAttribute("src");
      const imageObj = currentGroup.getObjects().find((obj) => obj.type === "image");
      const circleObj = currentGroup.getObjects().find((obj) => obj.type === "circle");

      if (imageObj && circleObj) {
        fabric.Image.fromURL(
          newSrc,
          function (newImg) {
            const scaleFactor = currentGroup.scaleFactor || 1;
            const iconSize = 30 * scaleFactor;

            setMultipleObjectProperties(newImg, {
              scaleX: iconSize / newImg.width,
              scaleY: iconSize / newImg.height,
              angle: imageObj.angle,
              left: imageObj.left,
              top: imageObj.top,
              originX: imageObj.originX,
              originY: imageObj.originY,
            });

            const index = currentGroup._objects.indexOf(imageObj);
            currentGroup.remove(imageObj);
            currentGroup.insertAt(newImg, index, false);

            currentGroup.deviceType = newImg._element.src.split("/").pop();
            const isCamera = ["fixed-camera.png", "box-camera.png", "ptz-camera.png", "dome-camera.png"].includes(currentGroup.deviceType);

            document.getElementById("camera-properties").style.display = isCamera ? "block" : "none";

            if (isCamera && !currentGroup.coverageConfig) {
              currentGroup.coverageConfig = {
                startAngle: 270,
                endAngle: 0,
                fillColor: "rgba(165, 155, 155, 0.3)",
                visible: true,
              };
              addCameraCoverage(currentGroup.canvas, currentGroup);
            } else if (!isCamera && currentGroup.coverageConfig) {
              // Remove coverage elements
              ["coverageArea", "leftResizeIcon", "rightResizeIcon", "rotateResizeIcon"].forEach((prop) => {
                if (currentGroup[prop]) {
                  currentGroup.canvas.remove(currentGroup[prop]);
                  currentGroup[prop] = null;
                }
              });
              currentGroup.coverageConfig = null;
            }

            currentGroup.setCoords();
            safeCanvasRender(currentGroup.canvas);
          },
          { crossOrigin: "anonymous" }
        );
      }
    });
  });

  // Expose globally
  window.initCameraControls = initCameraControls;
});
