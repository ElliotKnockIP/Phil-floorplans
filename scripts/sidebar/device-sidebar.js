import { updateSliderTrack, createSliderInputSync, setupColorControls, preventEventPropagation, createToggleHandler, setMultipleObjectProperties, safeCanvasRender, hexToRgba } from "./sidebar-utils.js";

document.addEventListener("DOMContentLoaded", () => {
  const subSidebar = document.getElementById("sub-sidebar");
  const closeSubSidebarBtn = document.getElementById("close-sub-sidebar");
  const rightSidebar = document.getElementById("right-sidebar");
  const closeRightSidebarBtn = document.getElementById("close-right-sidebar");
  const deviceHeading = document.getElementById("device-heading");
  const cameraProperties = document.getElementById("camera-properties");
  const genericProperties = document.getElementById("generic-properties");
  const zoneProperties = document.getElementById("zone-properties");
  const deviceLabelInput = document.getElementById("device-label-input");
  const deviceLabelToggle = document.getElementById("device-label-toggle");
  const colorIcons = document.querySelectorAll(".change-icon-colour .colour-icon");
  const iconColorPicker = document.getElementById("icon-color-picker");
  const customIconInput = document.getElementById("custom-icon-input");
  const iconSizeSlider = document.getElementById("icon-size-slider");
  const iconSizeInput = document.getElementById("icon-size-input");
  const iconRotationSlider = document.getElementById("icon-rotation-slider");
  const iconRotationInput = document.getElementById("icon-rotation-input");
  const deviceTextColorPicker = document.getElementById("device-text-color-picker");
  const deviceTextColorIcons = document.querySelectorAll(".device-text-colour .colour-icon");

  // Device background text color controls
  const deviceTextBgColorPicker = document.getElementById("device-background-text-color-picker");
  const deviceTextBgColorIcons = document.querySelectorAll(".device-background-text-colour .colour-icon");

  let currentTextObject = null;
  let currentGroup = null;

  const CAMERA_TYPES = ["bullet-camera.png", "box-camera.png", "ptz-camera.png", "dome-camera.png", "fixed-camera.png", "thermal-camera.png", "custom-camera-icon.png"];

  const DEVICE_NAME_MAP = {
    "bullet-camera.png": "Camera Properties",
    "box-camera.png": "Camera Properties",
    "ptz-camera.png": "Camera Properties",
    "dome-camera.png": "Camera Properties",
    "fixed-camera.png": "Camera Properties",
    "thermal-camera.png": "Camera Properties",
    "custom-camera-icon.png": "Camera Properties",
    "zone-polygon": "Zone Properties",
  };

  function hideAllSubmenus() {
    document.querySelectorAll(".submenu").forEach((submenu) => {
      submenu.classList.add("hidden");
      submenu.classList.remove("show");
    });
  }

  function showSubmenu(menuId) {
    hideAllSubmenus();
    rightSidebar.classList.add("hidden");
    const submenu = document.getElementById(menuId);
    if (submenu) {
      submenu.classList.remove("hidden");
      submenu.classList.add("show");
      subSidebar.classList.remove("hidden");
    }
  }

  function updateIconSize(size) {
    if (!currentGroup || !currentGroup.canvas || typeof currentGroup.getObjects !== "function") return;

    const scaleFactor = size / 30;
    currentGroup.scaleFactor = scaleFactor;

    const imageObj = currentGroup.getObjects().find((obj) => obj.type === "image");
    const circleObj = currentGroup.getObjects().find((obj) => obj.type === "circle");

    if (imageObj && circleObj) {
      const baseIconSize = 30;
      setMultipleObjectProperties(imageObj, {
        scaleX: scaleFactor * (baseIconSize / imageObj.width),
        scaleY: scaleFactor * (baseIconSize / imageObj.height),
      });

      setMultipleObjectProperties(circleObj, {
        scaleX: scaleFactor,
        scaleY: scaleFactor,
        radius: 20,
      });

      setMultipleObjectProperties(currentGroup, {
        scaleX: 1,
        scaleY: 1,
        width: circleObj.getScaledWidth(),
        height: circleObj.getScaledHeight(),
      });

      if (currentTextObject) {
        const groupCenter = currentGroup.getCenterPoint();
        const textTop = groupCenter.y + 20 * scaleFactor + 10;
        setMultipleObjectProperties(currentTextObject, {
          top: textTop,
          fontSize: 12 * scaleFactor,
        });
      }

      currentGroup.setCoords();
      safeCanvasRender(currentGroup.canvas);
    }
  }

  function updateIconRotation(sliderValue) {
    if (!currentGroup || !currentGroup.canvas || typeof currentGroup.getObjects !== "function") return;

    const rotationAngle = ((sliderValue - 1) / 99) * 360;
    const imageObj = currentGroup.getObjects().find((obj) => obj.type === "image");
    const circleObj = currentGroup.getObjects().find((obj) => obj.type === "circle");

    if (imageObj && circleObj) {
      setMultipleObjectProperties(imageObj, { angle: rotationAngle });
      setMultipleObjectProperties(circleObj, { angle: rotationAngle });
      currentGroup.setCoords();
      safeCanvasRender(currentGroup.canvas);
    }
  }

  function updateIconColor(color) {
    if (currentGroup && currentGroup.canvas && typeof currentGroup.getObjects === "function") {
      const circle = currentGroup.getObjects()[0];
      if (circle && circle.type === "circle") {
        setMultipleObjectProperties(circle, { fill: color }, currentGroup.canvas);
      }
    }
  }

  function updateDeviceTextColor(color) {
    if (currentTextObject && currentTextObject.canvas) {
      setMultipleObjectProperties(currentTextObject, { fill: color }, currentTextObject.canvas);
    }
  }

  function updateDeviceTextBackgroundColor(color) {
    if (currentTextObject && currentTextObject.canvas) {
      // Convert hex to rgba with some transparency for better visibility
      const rgbaColor = hexToRgba(color, 0.8);
      setMultipleObjectProperties(currentTextObject, { backgroundColor: rgbaColor }, currentTextObject.canvas);
    }
  }

  function handleCustomIconUpload(file) {
    if (!file || !currentGroup || !currentGroup.canvas || typeof currentGroup.getObjects !== "function") return;

    if (!file.type.match("image/jpeg") && !file.type.match("image/png")) {
      alert("Please upload a valid JPG or PNG image.");
      customIconInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      const imgSrc = event.target.result;
      const originalDeviceType = currentGroup.deviceType;
      const isCameraDevice = CAMERA_TYPES.includes(originalDeviceType);

      const imageObj = currentGroup.getObjects().find((obj) => obj.type === "image");
      const circleObj = currentGroup.getObjects().find((obj) => obj.type === "circle");

      if (imageObj && circleObj) {
        fabric.Image.fromURL(
          imgSrc,
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

            currentGroup.hasCustomIcon = true;

            if (isCameraDevice) {
              if (!currentGroup.coverageConfig) {
                currentGroup.coverageConfig = {
                  startAngle: 270,
                  endAngle: 0,
                  fillColor: "rgba(165, 155, 155, 0.3)",
                  visible: true,
                };
                window.addCameraCoverage(currentGroup.canvas, currentGroup);
              }
            } else {
              if (currentGroup.coverageConfig) {
                ["coverageArea", "leftResizeIcon", "rightResizeIcon", "rotateResizeIcon"].forEach((prop) => {
                  if (currentGroup[prop]) {
                    currentGroup.canvas.remove(currentGroup[prop]);
                    currentGroup[prop] = null;
                  }
                });
                currentGroup.coverageConfig = null;
              }
            }

            currentGroup.setCoords();
            safeCanvasRender(currentGroup.canvas);
            customIconInput.value = "";
          },
          { crossOrigin: "anonymous" }
        );
      }
    };
    reader.readAsDataURL(file);
  }

  // Helper function to convert rgba to hex
  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Event listeners for sidebar navigation
  document.querySelectorAll(".sidebar-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const menuType = button.getAttribute("data-menu");
      showSubmenu(menuType);
    });
  });

  document.querySelectorAll(".toggle-device-dropdown").forEach((button) => {
    button.addEventListener("click", () => {
      window.toggleSubMenu(button);
    });
  });

  closeSubSidebarBtn.addEventListener("click", () => {
    subSidebar.classList.add("hidden");
    hideAllSubmenus();
  });

  closeRightSidebarBtn.addEventListener("click", () => {
    rightSidebar.classList.add("hidden");
    hideAllSubmenus();
    currentGroup = null;
    currentTextObject = null;
  });

  // Global functions
  window.toggleSubMenu = function (button) {
    const container = button.parentElement;
    const deviceRows = container.querySelectorAll(".device-row");
    const icon = button.querySelector(".dropdown-icon");

    deviceRows.forEach((row) => row.classList.toggle("show"));
    if (icon) icon.classList.toggle("rotate");
  };

  window.showDeviceProperties = function (deviceType, textObject, group) {
    const displayName = DEVICE_NAME_MAP[deviceType] || "Device Properties";
    deviceHeading.textContent = displayName;

    const isCamera = CAMERA_TYPES.includes(deviceType);
    const isZone = deviceType === "zone-polygon";

    cameraProperties.style.display = isCamera ? "block" : "none";
    zoneProperties.style.display = isZone ? "block" : "none";
    genericProperties.style.display = !isZone ? "block" : "none";

    if (textObject && deviceLabelInput) {
      deviceLabelInput.value = textObject.text;
      currentTextObject = textObject;
      if (deviceLabelToggle) {
        deviceLabelToggle.checked = textObject.visible;
      }

      // Initialize text color picker
      if (deviceTextColorPicker && textObject.fill) {
        deviceTextColorPicker.value = textObject.fill.startsWith("rgb") ? rgbToHex(...textObject.fill.match(/\d+/g).map(Number)) : textObject.fill;
      }

      // Initialize text background color picker
      if (deviceTextBgColorPicker && textObject.backgroundColor) {
        let bgColor = textObject.backgroundColor;
        if (bgColor.startsWith("rgba")) {
          const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbMatch) {
            const [, r, g, b] = rgbMatch;
            bgColor = rgbToHex(parseInt(r), parseInt(g), parseInt(b));
          }
        }
        deviceTextBgColorPicker.value = bgColor || "#141212";
      } else if (deviceTextBgColorPicker) {
        // Set default background color if none exists
        deviceTextBgColorPicker.value = "#141212";
      }
    } else {
      deviceLabelInput.value = "";
      if (deviceLabelToggle) {
        deviceLabelToggle.checked = true;
      }
      currentTextObject = null;
    }

    currentGroup = group;

    // Handle icon properties for groups
    if (group && typeof group.getObjects === "function") {
      if (iconSizeSlider && iconSizeInput && group.scaleFactor !== undefined) {
        const currentSize = group.scaleFactor * 30;
        iconSizeSlider.value = currentSize;
        iconSizeInput.value = currentSize.toFixed(0);
        updateSliderTrack(iconSizeSlider, currentSize, iconSizeSlider.min || 10, iconSizeSlider.max || 100);
      }

      if (iconRotationSlider && iconRotationInput) {
        const imageObj = group.getObjects().find((obj) => obj.type === "image");
        if (imageObj) {
          const currentAngle = imageObj.angle || 0;
          const sliderValue = Math.round((currentAngle / 360) * 99) + 1;
          iconRotationSlider.value = sliderValue;
          iconRotationInput.value = sliderValue;
          updateSliderTrack(iconRotationSlider, sliderValue, iconRotationSlider.min || 1, iconRotationSlider.max || 100);
        } else {
          iconRotationSlider.value = 1;
          iconRotationInput.value = 1;
          updateSliderTrack(iconRotationSlider, 1, 1, 100);
        }
      }
    }

    const devicePropertiesSubmenu = document.getElementById("device-properties");
    devicePropertiesSubmenu.classList.remove("hidden");
    devicePropertiesSubmenu.classList.add("show");
    rightSidebar.classList.remove("hidden");
  };

  window.hideDeviceProperties = function () {
    rightSidebar.classList.add("hidden");
    cameraProperties.style.display = "none";
    genericProperties.style.display = "block";
    zoneProperties.style.display = "none";
    currentTextObject = null;
    currentGroup = null;
  };

  // Device label controls
  createToggleHandler(deviceLabelToggle, (checked) => {
    if (currentTextObject && currentTextObject.canvas) {
      setMultipleObjectProperties(currentTextObject, { visible: checked }, currentTextObject.canvas);
    }
  });

  if (deviceLabelInput) {
    deviceLabelInput.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.stopPropagation();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const start = deviceLabelInput.selectionStart;
        const end = deviceLabelInput.selectionEnd;
        const value = deviceLabelInput.value;
        deviceLabelInput.value = value.substring(0, start) + "\n" + value.substring(end);
        deviceLabelInput.selectionStart = deviceLabelInput.selectionEnd = start + 1;
        const inputEvent = new Event("input", { bubbles: true });
        deviceLabelInput.dispatchEvent(inputEvent);
      }
    });

    deviceLabelInput.addEventListener("input", (e) => {
      if (currentTextObject && currentTextObject.canvas) {
        setMultipleObjectProperties(currentTextObject, { text: e.target.value }, currentTextObject.canvas);
      }
    });

    preventEventPropagation(deviceLabelInput, ["mousedown"]);
  }

  // Icon size controls
  createSliderInputSync(iconSizeSlider, iconSizeInput, updateIconSize, { min: 10, max: 100, step: 1 });

  // Icon rotation controls
  createSliderInputSync(iconRotationSlider, iconRotationInput, updateIconRotation, { min: 1, max: 100, step: 1 });

  // Icon color controls
  setupColorControls(iconColorPicker, colorIcons, updateIconColor);

  // Device text color controls
  setupColorControls(deviceTextColorPicker, deviceTextColorIcons, updateDeviceTextColor);

  // Device text background color controls
  setupColorControls(deviceTextBgColorPicker, deviceTextBgColorIcons, updateDeviceTextBackgroundColor);

  // Custom icon upload
  if (customIconInput) {
    customIconInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) handleCustomIconUpload(file);
    });
    preventEventPropagation(customIconInput, ["click"]);
  }
});
