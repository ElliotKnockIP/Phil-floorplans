import { layers } from "../canvas/canvas-layers.js";

export function createOrUpdateCoverageArea(fabricCanvas, cameraIcon) {
  let isResizingLeft = false;
  let isResizingRight = false;
  let isRotating = false;

  let leftResizeIcon = cameraIcon.leftResizeIcon || null;
  let rightResizeIcon = cameraIcon.rightResizeIcon || null;
  let rotateResizeIcon = cameraIcon.rotateResizeIcon || null;
  let coverageArea = cameraIcon.coverageArea || null;

  let initialMouseAngle = 0;
  let initialStartAngle = 0;
  let initialEndAngle = 0;

  const commonProps = {
    stroke: "black",
    strokeWidth: 1,
    originX: "left",
    originY: "top",
    hasControls: false,
    hasBorders: false,
    selectable: false,
    evented: false,
    hoverCursor: "default",
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
  };

  function updateSlider(id, inputId, value, min, max) {
    const slider = document.getElementById(id);
    const input = document.getElementById(inputId);
    if (slider) {
      slider.value = value;
      const percentage = ((value - min) / (max - min)) * 100;
      slider.style.background = `linear-gradient(to right, var(--orange-clr) ${percentage}%, var(--white-text-clr) ${percentage}%)`;
    }
    if (input) input.value = typeof value === "number" ? value.toFixed(value >= 10 ? 1 : 2) : value;
  }

  function ensureZOrder() {
    const isSelectedCamera = fabricCanvas.getActiveObject() === cameraIcon;

    // Fix z-order if coverage is above camera
    if (coverageArea && cameraIcon) {
      const coverageIndex = fabricCanvas.getObjects().indexOf(coverageArea);
      const cameraIndex = fabricCanvas.getObjects().indexOf(cameraIcon);

      if (coverageIndex > cameraIndex) {
        fabricCanvas.remove(coverageArea);
        fabricCanvas.insertAt(coverageArea, cameraIndex);
      }
    }

    if (isSelectedCamera) {
      cameraIcon.bringToFront();
      [leftResizeIcon, rightResizeIcon, rotateResizeIcon].forEach((icon) => {
        if (icon?.visible) icon.bringToFront();
      });
      if (cameraIcon.textObject) cameraIcon.textObject.bringToFront();
    }
  }

  function updateCoverage() {
    if (!cameraIcon.createCoveragePoints) return;

    const camCenter = cameraIcon.getCenterPoint();
    const angleSpan = cameraIcon.angleDiff(cameraIcon.coverageConfig.startAngle, cameraIcon.coverageConfig.endAngle);
    const isFullCircle = angleSpan >= 359.9;

    const newPoints = isFullCircle ? [] : cameraIcon.createCoveragePoints(cameraIcon.coverageConfig.startAngle, cameraIcon.coverageConfig.endAngle, camCenter.x, camCenter.y);

    if (coverageArea) fabricCanvas.remove(coverageArea);

    const opacitySlider = document.getElementById("camera-opacity-slider");
    let cameraOpacity = opacitySlider ? parseFloat(opacitySlider.value) : 0.3;
    if (isNaN(cameraOpacity) || cameraOpacity < 0) cameraOpacity = 0.3;

    const finalOpacity = cameraOpacity * layers.devices.opacity;
    let fillColor = cameraIcon.coverageConfig.fillColor;
    const rgbMatch = fillColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      fillColor = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
    } else {
      fillColor = `rgba(165, 155, 155, ${finalOpacity})`;
    }
    cameraIcon.coverageConfig.fillColor = fillColor;

    const baseProps = {
      ...commonProps,
      strokeWidth: 2,
      visible: cameraIcon.coverageConfig.visible && layers.devices.visible,
      fill: fillColor,
    };

    if (isFullCircle) {
      coverageArea = new fabric.Circle({
        ...baseProps,
        radius: cameraIcon.coverageConfig.radius,
        left: camCenter.x - cameraIcon.coverageConfig.radius,
        top: camCenter.y - cameraIcon.coverageConfig.radius,
      });
    } else {
      coverageArea = new fabric.Polygon(newPoints, baseProps);
    }

    const camIndex = fabricCanvas.getObjects().indexOf(cameraIcon);
    if (camIndex !== -1) {
      fabricCanvas.insertAt(coverageArea, camIndex);
    } else {
      fabricCanvas.add(coverageArea);
    }

    cameraIcon.coverageArea = coverageArea;

    // Update resize icons positions
    const isSmallAngle = angleSpan <= 5;
    const leftRad = fabric.util.degreesToRadians(isFullCircle || isSmallAngle ? (cameraIcon.coverageConfig.startAngle - 5 + 360) % 360 : cameraIcon.coverageConfig.startAngle);
    const rightRad = fabric.util.degreesToRadians(isFullCircle || isSmallAngle ? (cameraIcon.coverageConfig.startAngle + 5) % 360 : cameraIcon.coverageConfig.endAngle);
    const midRad = fabric.util.degreesToRadians((cameraIcon.coverageConfig.startAngle + angleSpan / 2) % 360);

    const isSelected = fabricCanvas.getActiveObject() === cameraIcon;
    const shouldShowIcons = isSelected && cameraIcon.coverageConfig.visible && layers.devices.visible;
    const iconScale = 0.03;

    if (leftResizeIcon) {
      leftResizeIcon
        .set({
          left: camCenter.x + cameraIcon.coverageConfig.radius * Math.cos(leftRad),
          top: camCenter.y + cameraIcon.coverageConfig.radius * Math.sin(leftRad),
          angle: cameraIcon.coverageConfig.startAngle + 90,
          scaleX: iconScale,
          scaleY: iconScale,
          opacity: layers.devices.opacity,
          visible: shouldShowIcons,
        })
        .setCoords();
    }

    if (rightResizeIcon) {
      rightResizeIcon
        .set({
          left: camCenter.x + cameraIcon.coverageConfig.radius * Math.cos(rightRad),
          top: camCenter.y + cameraIcon.coverageConfig.radius * Math.sin(rightRad),
          angle: isFullCircle || isSmallAngle ? (cameraIcon.coverageConfig.startAngle + 5 + 90) % 360 : cameraIcon.coverageConfig.endAngle + 90,
          scaleX: iconScale,
          scaleY: iconScale,
          opacity: layers.devices.opacity,
          visible: shouldShowIcons,
        })
        .setCoords();
    }

    if (rotateResizeIcon) {
      rotateResizeIcon
        .set({
          left: camCenter.x + cameraIcon.coverageConfig.radius * Math.cos(midRad),
          top: camCenter.y + cameraIcon.coverageConfig.radius * Math.sin(midRad),
          angle: ((cameraIcon.coverageConfig.startAngle + angleSpan / 2) % 360) + 90,
          scaleX: iconScale * 2,
          scaleY: iconScale * 2,
          opacity: layers.devices.opacity,
          visible: shouldShowIcons,
        })
        .setCoords();
    }

    coverageArea.setCoords();
    ensureZOrder();
    fabricCanvas.requestRenderAll();
  }

  cameraIcon.createOrUpdateCoverageArea = updateCoverage;

  // Event handlers
  const handlers = {
    added: (opt) => opt.target?.type === "line" && opt.target.stroke === "red" && updateCoverage(),
    modified: (opt) => opt.target?.type === "line" && opt.target.stroke === "red" && updateCoverage(),
    moving: (opt) => opt.target?.type === "circle" && updateCoverage(),
  };

  Object.entries(handlers).forEach(([event, handler]) => {
    cameraIcon[`${event}Handler`] = handler;
    fabricCanvas.on(`object:${event}`, handler);
  });

  cameraIcon.coverageConfig.visible = true;

  cameraIcon.on("selected", () => {
    const pixelsPerMeter = fabricCanvas.pixelsPerMeter || 17.5;
    const currentAngleSpan = Math.round(cameraIcon.angleDiff(cameraIcon.coverageConfig.startAngle, cameraIcon.coverageConfig.endAngle));
    const currentOpacity = coverageArea ? parseFloat(coverageArea.fill.match(/[\d.]+(?=\)$)/)?.[0] || 0.3) / layers.devices.opacity : 0.3;
    const currentDistance = cameraIcon.coverageConfig.radius / pixelsPerMeter;

    updateSlider("camera-angle-slider", "camera-angle-input", currentAngleSpan, 1, 360);
    updateSlider("camera-opacity-slider", "camera-opacity-input", currentOpacity, 0, 1);
    updateSlider("camera-distance-slider", "camera-distance-input", currentDistance, 1, 500);

    const coverageToggle = document.getElementById("camera-coverage-toggle");
    if (coverageToggle) coverageToggle.checked = cameraIcon.coverageConfig.visible;

    const devicesLayerVisible = layers.devices.visible;
    [leftResizeIcon, rightResizeIcon, rotateResizeIcon].forEach((icon) => {
      if (icon) icon.set({ visible: cameraIcon.coverageConfig.visible && devicesLayerVisible }).bringToFront();
    });

    ensureZOrder();
    fabricCanvas.renderAll();
  });

  cameraIcon.on("deselected", () => {
    if (!isResizingLeft && !isResizingRight && !isRotating) {
      [leftResizeIcon, rightResizeIcon, rotateResizeIcon].forEach((icon) => {
        if (icon) icon.set({ visible: false });
      });
      fabricCanvas.renderAll();
    }
  });

  cameraIcon.on("moving", updateCoverage);

  cameraIcon.on("removed", () => {
    Object.keys(handlers).forEach((event) => {
      if (cameraIcon[`${event}Handler`]) fabricCanvas.off(`object:${event}`, cameraIcon[`${event}Handler`]);
    });
    [coverageArea, leftResizeIcon, rightResizeIcon, rotateResizeIcon].forEach((item) => {
      if (item) fabricCanvas.remove(item);
    });
  });

  function stopResizing() {
    isResizingLeft = isResizingRight = isRotating = false;
    fabricCanvas.selection = true;
    const active = fabricCanvas.getActiveObject() === cameraIcon;
    const devicesLayerVisible = layers.devices.visible;
    [leftResizeIcon, rightResizeIcon, rotateResizeIcon].forEach((icon) => {
      if (icon) icon.set({ visible: active && cameraIcon.coverageConfig.visible && devicesLayerVisible });
    });
    fabricCanvas.renderAll();
  }

  if (!leftResizeIcon || !rightResizeIcon || !rotateResizeIcon) {
    const iconConfig = {
      scaleX: 0.05,
      scaleY: 0.05,
      originX: "center",
      originY: "center",
      hasControls: false,
      hasBorders: false,
      selectable: false,
      evented: true,
      visible: false,
      opacity: layers.devices.opacity,
      isResizeIcon: true,
    };

    const iconUrls = [
      { url: "./images/icons/left-resize.png", cursor: "col-resize", prop: "leftResizeIcon" },
      { url: "./images/icons/right-resize.png", cursor: "col-resize", prop: "rightResizeIcon" },
      { url: "./images/icons/four-arrows.png", cursor: "pointer", prop: "rotateResizeIcon" },
    ];

    let loadedCount = 0;
    iconUrls.forEach(({ url, cursor, prop }) => {
      fabric.Image.fromURL(url, (icon) => {
        if (!icon) return;
        icon.set({ ...iconConfig, hoverCursor: cursor });
        cameraIcon[prop] = icon;
        if (prop === "leftResizeIcon") leftResizeIcon = icon;
        else if (prop === "rightResizeIcon") rightResizeIcon = icon;
        else rotateResizeIcon = icon;

        fabricCanvas.add(icon);

        icon.on("mousedown", (opt) => {
          if (prop === "leftResizeIcon") isResizingLeft = true;
          else if (prop === "rightResizeIcon") isResizingRight = true;
          else {
            isRotating = true;
            const pointer = fabricCanvas.getPointer(opt.e);
            const camCenter = cameraIcon.getCenterPoint();
            const dx = pointer.x - camCenter.x;
            const dy = pointer.y - camCenter.y;
            initialMouseAngle = Math.round(fabric.util.radiansToDegrees(Math.atan2(dy, dx)));
            if (initialMouseAngle < 0) initialMouseAngle += 360;
            initialStartAngle = cameraIcon.coverageConfig.startAngle;
            initialEndAngle = cameraIcon.coverageConfig.endAngle;
          }
          fabricCanvas.setActiveObject(cameraIcon);
          fabricCanvas.selection = false;
          opt.e.preventDefault();
          document.addEventListener("mouseup", stopResizing, { once: true });
        });

        loadedCount++;
        if (loadedCount === 3) {
          fabricCanvas.on("mouse:move", (opt) => {
            if (!isResizingLeft && !isResizingRight && !isRotating) return;

            const pointer = fabricCanvas.getPointer(opt.e);
            const camCenter = cameraIcon.getCenterPoint();
            const dx = pointer.x - camCenter.x;
            const dy = pointer.y - camCenter.y;
            let currentAngle = Math.round(fabric.util.radiansToDegrees(Math.atan2(dy, dx)));
            if (currentAngle < 0) currentAngle += 360;

            const pixelsPerMeter = fabricCanvas.pixelsPerMeter || 17.5;
            const dist = Math.hypot(dx, dy);
            const maxRadius = 500 * pixelsPerMeter;

            if (isResizingLeft || isResizingRight) {
              const previousSpan = cameraIcon.angleDiff(cameraIcon.coverageConfig.startAngle, cameraIcon.coverageConfig.endAngle);
              const isLeft = isResizingLeft;
              const otherAngle = isLeft ? cameraIcon.coverageConfig.endAngle : cameraIcon.coverageConfig.startAngle;
              const tentativeSpan = cameraIcon.angleDiff(isLeft ? currentAngle : otherAngle, isLeft ? otherAngle : currentAngle);

              if (tentativeSpan < 1) {
                const offset = 5;
                if (previousSpan > 180) {
                  cameraIcon.coverageConfig.startAngle = (Math.round(currentAngle + (isLeft ? offset : -offset)) + 360) % 360;
                  cameraIcon.coverageConfig.endAngle = cameraIcon.coverageConfig.startAngle;
                } else {
                  const newAngle = (otherAngle + (isLeft ? -1 : 1) + 360) % 360;
                  if (isLeft) cameraIcon.coverageConfig.startAngle = newAngle;
                  else cameraIcon.coverageConfig.endAngle = newAngle;
                }
              } else {
                if (isLeft) cameraIcon.coverageConfig.startAngle = Math.round(currentAngle);
                else cameraIcon.coverageConfig.endAngle = Math.round(currentAngle);
              }
            } else if (isRotating) {
              const delta = (currentAngle - initialMouseAngle + 360) % 360;
              cameraIcon.coverageConfig.startAngle = Math.round((initialStartAngle + delta) % 360);
              cameraIcon.coverageConfig.endAngle = Math.round((initialEndAngle + delta) % 360);
              cameraIcon.coverageConfig.radius = Math.max(pixelsPerMeter, Math.min(dist, maxRadius));

              const currentDistance = cameraIcon.coverageConfig.radius / pixelsPerMeter;
              updateSlider("camera-distance-slider", "camera-distance-input", currentDistance, 1, 500);
            }

            cameraIcon.coverageConfig.isInitialized = true;
            const currentAngleSpan = Math.round(cameraIcon.angleDiff(cameraIcon.coverageConfig.startAngle, cameraIcon.coverageConfig.endAngle));
            updateSlider("camera-angle-slider", "camera-angle-input", currentAngleSpan, 1, 360);

            updateCoverage();
            if (rotateResizeIcon) rotateResizeIcon.bringToFront();
            if (cameraIcon.textObject) cameraIcon.textObject.bringToFront();
          });

          fabricCanvas.on("mouse:up", stopResizing);
          updateCoverage();
          fabricCanvas.setActiveObject(cameraIcon);
          [leftResizeIcon, rightResizeIcon, rotateResizeIcon].forEach((icon) => {
            if (icon) icon.set({ visible: cameraIcon.coverageConfig.visible && layers.devices.visible }).bringToFront();
          });
          fabricCanvas.renderAll();
        }
      });
    });
  }
}
