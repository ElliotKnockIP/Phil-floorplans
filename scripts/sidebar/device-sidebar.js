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

  let currentTextObject = null;
  let currentGroup = null;

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

  window.toggleSubMenu = function (button) {
    const container = button.parentElement;
    const deviceRows = container.querySelectorAll(".device-row");
    const icon = button.querySelector(".dropdown-icon");

    deviceRows.forEach((row) => row.classList.toggle("show"));
    if (icon) icon.classList.toggle("rotate");
  };

  window.showDeviceProperties = function (deviceType, textObject, group) {
    const deviceNameMap = {
      "bullet-camera.png": "Camera Properties",
      "box-camera.png": "Camera Properties",
      "ptz-camera.png": "Camera Properties",
      "dome-camera.png": "Camera Properties",
      "fixed-camera.png": "Camera Properties",
      "thermal-camera.png": "Camera Properties",
      "zone-polygon": "Zone Properties",
    };

    const displayName = deviceNameMap[deviceType] || "Device Properties";
    deviceHeading.textContent = displayName;

    const isCamera = ["bullet-camera.png", "box-camera.png", "ptz-camera.png", "dome-camera.png", "fixed-camera.png", "thermal-camera.png"].includes(deviceType);
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
    } else {
      deviceLabelInput.value = "";
      if (deviceLabelToggle) {
        deviceLabelToggle.checked = true;
      }
      currentTextObject = null;
    }

    currentGroup = group;

    if (iconSizeSlider && iconSizeInput && group && group.scaleFactor !== undefined) {
      const currentSize = group.scaleFactor * 30;
      iconSizeSlider.value = currentSize;
      iconSizeInput.value = currentSize.toFixed(0);
      const min = parseFloat(iconSizeSlider.min) || 10;
      const max = parseFloat(iconSizeSlider.max) || 100;
      const percentage = ((currentSize - min) / (max - min)) * 100;
      iconSizeSlider.style.background = `linear-gradient(to right, var(--orange-clr) ${percentage}%, var(--white-text-clr) ${percentage}%)`;
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

  if (deviceLabelToggle) {
    deviceLabelToggle.addEventListener("change", () => {
      if (currentTextObject && currentTextObject.canvas) {
        currentTextObject.set({ visible: deviceLabelToggle.checked });
        currentTextObject.canvas.renderAll();
      }
    });
  }

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
        currentTextObject.set({ text: e.target.value });
        currentTextObject.setCoords();
        currentTextObject.canvas.renderAll();
      }
    });

    deviceLabelInput.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
  }

  if (iconSizeSlider) {
    iconSizeSlider.addEventListener("input", () => {
      if (currentGroup && currentGroup.canvas) {
        const size = parseFloat(iconSizeSlider.value);
        if (iconSizeInput) iconSizeInput.value = size.toFixed(0);

        const scaleFactor = size / 30;
        currentGroup.scaleFactor = scaleFactor;

        const imageObj = currentGroup.getObjects().find((obj) => obj.type === "image");
        const circleObj = currentGroup.getObjects().find((obj) => obj.type === "circle");
        if (imageObj && circleObj) {
          const baseIconSize = 30;
          imageObj.set({
            scaleX: scaleFactor * (baseIconSize / imageObj.width),
            scaleY: scaleFactor * (baseIconSize / imageObj.height),
          });
          circleObj.set({
            scaleX: scaleFactor,
            scaleY: scaleFactor,
            radius: 20,
          });

          currentGroup.set({
            scaleX: 1,
            scaleY: 1,
            width: circleObj.getScaledWidth(),
            height: circleObj.getScaledHeight(),
          });

          if (currentTextObject) {
            const groupCenter = currentGroup.getCenterPoint();
            const textTop = groupCenter.y + 20 * scaleFactor + 10;
            currentTextObject.set({
              top: textTop,
              fontSize: 12 * scaleFactor,
            });
            currentTextObject.setCoords();
          }

          currentGroup.setCoords();
          currentGroup.canvas.renderAll();
        }

        const min = parseFloat(iconSizeSlider.min) || 10;
        const max = parseFloat(iconSizeSlider.max) || 100;
        const percentage = ((size - min) / (max - min)) * 100;
        iconSizeSlider.style.background = `linear-gradient(to right, var(--orange-clr) ${percentage}%, var(--white-text-clr) ${percentage}%)`;
      }
    });
  }

  if (iconSizeInput) {
    iconSizeInput.addEventListener("input", () => {
      if (currentGroup && currentGroup.canvas) {
        let size = parseFloat(iconSizeInput.value);
        if (isNaN(size) || size < 10) size = 10;
        if (size > 100) size = 100;
        iconSizeInput.value = size.toFixed(0);
        if (iconSizeSlider) {
          iconSizeSlider.value = size;
          iconSizeSlider.dispatchEvent(new Event("input"));
        }
      }
    });
  }

  colorIcons.forEach((icon) => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      if (currentGroup && currentGroup.canvas) {
        const color = getComputedStyle(icon).backgroundColor;
        const circle = currentGroup.getObjects()[0];
        if (circle && circle.type === "circle") {
          circle.set({ fill: color });
          currentGroup.canvas.renderAll();
        }
      }
    });
  });

  if (iconColorPicker) {
    iconColorPicker.addEventListener("input", (e) => {
      e.stopPropagation();
      if (currentGroup && currentGroup.canvas) {
        const color = e.target.value;
        const circle = currentGroup.getObjects()[0];
        if (circle && circle.type === "circle") {
          circle.set({ fill: color });
          currentGroup.canvas.renderAll();
        }
      }
    });

    iconColorPicker.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  if (customIconInput) {
    customIconInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file || !currentGroup || !currentGroup.canvas) return;

      if (!file.type.match("image/jpeg") && !file.type.match("image/png")) {
        alert("Please upload a valid JPG or PNG image.");
        customIconInput.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = function (event) {
        const imgSrc = event.target.result;

        const isCamera = ["bullet-camera.png", "box-camera.png", "ptz-camera.png", "dome-camera.png", "custom-camera-icon.png"].includes(currentGroup.deviceType);

        const imageObj = currentGroup.getObjects().find((obj) => obj.type === "image");
        const circleObj = currentGroup.getObjects().find((obj) => obj.type === "circle");

        if (imageObj && circleObj) {
          fabric.Image.fromURL(
            imgSrc,
            function (newImg) {
              const scaleFactor = currentGroup.scaleFactor || 1;
              const iconSize = 30 * scaleFactor;
              newImg.scaleX = iconSize / newImg.width;
              newImg.scaleY = iconSize / newImg.height;
              newImg.angle = imageObj.angle;

              const originalLeft = imageObj.left;
              const originalTop = imageObj.top;

              const index = currentGroup._objects.indexOf(imageObj);
              currentGroup.remove(imageObj);
              newImg.set({
                left: originalLeft,
                top: originalTop,
                originX: imageObj.originX,
                originY: imageObj.originY,
              });
              currentGroup.insertAt(newImg, index, false);

              currentGroup.deviceType = isCamera ? "custom-camera-icon.png" : "custom-device-icon.png";

              cameraProperties.style.display = isCamera ? "block" : "none";

              if (isCamera) {
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
                  if (currentGroup.coverageArea) currentGroup.canvas.remove(currentGroup.coverageArea);
                  if (currentGroup.leftResizeIcon) currentGroup.canvas.remove(currentGroup.leftResizeIcon);
                  if (currentGroup.rightResizeIcon) currentGroup.canvas.remove(currentGroup.rightResizeIcon);
                  if (currentGroup.rotateResizeIcon) currentGroup.canvas.remove(currentGroup.rotateResizeIcon);
                  currentGroup.coverageConfig = null;
                  currentGroup.coverageArea = null;
                  currentGroup.leftResizeIcon = null;
                  currentGroup.rightResizeIcon = null;
                  currentGroup.rotateResizeIcon = null;
                }
              }

              deviceHeading.textContent = isCamera ? "Camera Properties" : "Custom Device";

              currentGroup.setCoords();
              currentGroup.canvas.renderAll();
              customIconInput.value = "";
            },
            { crossOrigin: "anonymous" }
          );
        }
      };
      reader.readAsDataURL(file);
    });

    customIconInput.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }
});
