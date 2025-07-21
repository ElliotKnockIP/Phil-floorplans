import { addCameraCoverage } from "../devices/camera-coverage.js";

document.addEventListener("DOMContentLoaded", () => {
  const coverageColorIcons = document.querySelectorAll(".change-coverage-colour .colour-icon");
  const coverageColorPicker = document.getElementById("coverage-color-picker");

  let currentGroup = null;

  // Access the global showDeviceProperties to update currentGroup
  const originalShowDeviceProperties = window.showDeviceProperties;
  window.showDeviceProperties = function (deviceType, textObject, group) {
    currentGroup = group;
    originalShowDeviceProperties(deviceType, textObject, group);
  };

  // Access the global hideDeviceProperties to clear currentGroup
  const originalHideDeviceProperties = window.hideDeviceProperties;
  window.hideDeviceProperties = function () {
    currentGroup = null;
    originalHideDeviceProperties();
  };

  coverageColorIcons.forEach((icon) => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      if (currentGroup && currentGroup.canvas && currentGroup.coverageArea) {
        const color = getComputedStyle(icon).backgroundColor;
        const opacity = parseFloat(document.getElementById("camera-opacity-slider")?.value) || 0.3;
        const rgb = color.match(/\d+/g).map(Number);
        const rgbaColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
        currentGroup.coverageArea.set({ fill: rgbaColor });
        currentGroup.coverageConfig.fillColor = rgbaColor;
        currentGroup.canvas.renderAll();
      }
    });
  });

  if (coverageColorPicker) {
    coverageColorPicker.addEventListener("input", (e) => {
      e.stopPropagation();
      if (currentGroup && currentGroup.canvas && currentGroup.coverageArea) {
        const color = e.target.value;
        const opacity = parseFloat(document.getElementById("camera-opacity-slider")?.value) || 0.3;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        currentGroup.coverageArea.set({ fill: rgbaColor });
        currentGroup.coverageConfig.fillColor = rgbaColor;
        currentGroup.canvas.renderAll();
      }
    });

    coverageColorPicker.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

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

            currentGroup.setCoords();
            currentGroup.canvas.renderAll();
          },
          { crossOrigin: "anonymous" }
        );
      }
    });
  });
});
