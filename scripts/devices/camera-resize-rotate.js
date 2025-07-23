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

  function updateCoverage() {
    if (!cameraIcon.createCoveragePoints) return;

    const camCenter = cameraIcon.getCenterPoint();
    const newPoints = cameraIcon.createCoveragePoints(cameraIcon.coverageConfig.startAngle, cameraIcon.coverageConfig.endAngle, camCenter.x, camCenter.y);

    const pixelsPerMeter = fabricCanvas.pixelsPerMeter || 17.5;
    const baseRadius = 10 * pixelsPerMeter;

    const scaleBasedFactor = Math.max(0.3, Math.min(2.0, 17.5 / pixelsPerMeter));

    if (coverageArea) {
      fabricCanvas.remove(coverageArea);
    }

    const opacitySlider = document.getElementById("camera-opacity-slider");
    let cameraOpacity = opacitySlider ? parseFloat(opacitySlider.value) : 0.3;
    if (isNaN(cameraOpacity) || cameraOpacity < 0) cameraOpacity = 0.3;

    const devicesLayerOpacity = layers.devices.opacity;
    const finalOpacity = cameraOpacity * devicesLayerOpacity;

    const baseStrokeWidth = 2;
    let fillColor = cameraIcon.coverageConfig.fillColor;
    const rgbMatch = fillColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      fillColor = `rgba(${r}, ${g}, ${b}, ${finalOpacity})`;
    } else {
      fillColor = `rgba(165, 155, 155, ${finalOpacity})`;
    }
    cameraIcon.coverageConfig.fillColor = fillColor;

    coverageArea = new fabric.Polygon(newPoints, {
      ...commonProps,
      strokeWidth: baseStrokeWidth,
      visible: cameraIcon.coverageConfig.visible && layers.devices.visible,
      fill: fillColor,
    });

    const camIndex = fabricCanvas.getObjects().indexOf(cameraIcon);
    if (camIndex !== -1) {
      fabricCanvas.insertAt(coverageArea, camIndex);
    } else {
      fabricCanvas.add(coverageArea);
    }

    cameraIcon.coverageArea = coverageArea;

    const angleSpan = cameraIcon.angleDiff(cameraIcon.coverageConfig.startAngle, cameraIcon.coverageConfig.endAngle);
    const isFullCircle = angleSpan >= 359;
    const isSmallAngle = angleSpan <= 5;

    let leftRad, rightRad;
    if (isFullCircle || isSmallAngle) {
      // For full circle or small angles (≤ 5 degrees), position resize icons slightly apart to avoid overlap
      leftRad = fabric.util.degreesToRadians((cameraIcon.coverageConfig.startAngle - 5 + 360) % 360);
      rightRad = fabric.util.degreesToRadians((cameraIcon.coverageConfig.startAngle + 5) % 360); // 5-degree offset
    } else {
      leftRad = fabric.util.degreesToRadians(cameraIcon.coverageConfig.startAngle);
      rightRad = fabric.util.degreesToRadians(cameraIcon.coverageConfig.endAngle);
    }

    const midAngle = (cameraIcon.coverageConfig.startAngle + angleSpan / 2) % 360;
    const midRad = fabric.util.degreesToRadians(midAngle);

    const camX = camCenter.x;
    const camY = camCenter.y;

    const iconScale = 0.03;

    if (leftResizeIcon) {
      leftResizeIcon
        .set({
          left: camX + cameraIcon.coverageConfig.radius * Math.cos(leftRad),
          top: camY + cameraIcon.coverageConfig.radius * Math.sin(leftRad),
          angle: cameraIcon.coverageConfig.startAngle + 90,
          scaleX: iconScale,
          scaleY: iconScale,
          opacity: layers.devices.opacity,
          visible: cameraIcon.coverageConfig.visible && layers.devices.visible,
        })
        .setCoords();
    }

    if (rightResizeIcon) {
      rightResizeIcon
        .set({
          left: camX + cameraIcon.coverageConfig.radius * Math.cos(rightRad),
          top: camY + cameraIcon.coverageConfig.radius * Math.sin(rightRad),
          angle: isFullCircle || isSmallAngle ? (cameraIcon.coverageConfig.startAngle + 5 + 90) % 360 : cameraIcon.coverageConfig.endAngle + 90,
          scaleX: iconScale,
          scaleY: iconScale,
          opacity: layers.devices.opacity,
          visible: cameraIcon.coverageConfig.visible && layers.devices.visible,
        })
        .setCoords();
    }

    if (rotateResizeIcon) {
      const rotateOffset = 1;
      rotateResizeIcon
        .set({
          left: camX + cameraIcon.coverageConfig.radius * rotateOffset * Math.cos(midRad),
          top: camY + cameraIcon.coverageConfig.radius * rotateOffset * Math.sin(midRad),
          angle: midAngle + 90,
          scaleX: iconScale * 2,
          scaleY: iconScale * 2,
          opacity: layers.devices.opacity,
        })
        .setCoords();
    }

    coverageArea.setCoords();
    fabricCanvas.requestRenderAll();
  }

  cameraIcon.createOrUpdateCoverageArea = updateCoverage;

  // Define handlers as named functions and store on cameraIcon
  const addedHandler = (opt) => {
    const target = opt.target;
    if (target?.type === "line" && target.stroke === "red") {
      updateCoverage();
    }
  };
  const modifiedHandler = (opt) => {
    const target = opt.target;
    if (target?.type === "line" && target.stroke === "red") {
      updateCoverage();
    }
  };
  const movingHandler = (opt) => {
    const target = opt.target;
    if (target?.type === "circle") {
      updateCoverage();
    }
  };

  cameraIcon.addedHandler = addedHandler;
  cameraIcon.modifiedHandler = modifiedHandler;
  cameraIcon.movingHandler = movingHandler;

  fabricCanvas.on("object:added", addedHandler);
  fabricCanvas.on("object:modified", modifiedHandler);
  fabricCanvas.on("object:moving", movingHandler);

  cameraIcon.coverageConfig.visible = true;

  cameraIcon.on("selected", () => {
    const devicesLayerVisible = layers.devices.visible;
    const angleSlider = document.getElementById("camera-angle-slider");
    const angleInput = document.getElementById("camera-angle-input");
    const opacitySlider = document.getElementById("camera-opacity-slider");
    const opacityInput = document.getElementById("camera-opacity-input");
    const distanceSlider = document.getElementById("camera-distance-slider");
    const distanceInput = document.getElementById("camera-distance-input");
    const coverageToggle = document.getElementById("camera-coverage-toggle");

    const pixelsPerMeter = fabricCanvas.pixelsPerMeter || 17.5;

    if (angleSlider && angleInput) {
      const currentAngleSpan = Math.round(cameraIcon.angleDiff(cameraIcon.coverageConfig.startAngle, cameraIcon.coverageConfig.endAngle));
      angleSlider.value = currentAngleSpan;
      angleInput.value = currentAngleSpan;
      const min = parseFloat(angleSlider.min) || 1;
      const max = parseFloat(angleSlider.max) || 360;
      const percentage = ((currentAngleSpan - min) / (max - min)) * 100;
      angleSlider.style.background = `linear-gradient(to right, var(--orange-clr) ${percentage}%, var(--white-text-clr) ${percentage}%)`;
    }

    if (opacitySlider && opacityInput && coverageArea) {
      const currentOpacity = parseFloat(coverageArea.fill.match(/[\d.]+(?=\)$)/)?.[0] || 0.3) / layers.devices.opacity;
      opacitySlider.value = currentOpacity;
      opacityInput.value = currentOpacity.toFixed(2);
      const min = parseFloat(opacitySlider.min) || 0;
      const max = parseFloat(opacitySlider.max) || 1;
      const percentage = ((currentOpacity - min) / (max - min)) * 100;
      opacitySlider.style.background = `linear-gradient(to right, var(--orange-clr) ${percentage}%, var(--white-text-clr) ${percentage}%)`;
    }

    if (distanceSlider && distanceInput) {
      const currentDistance = cameraIcon.coverageConfig.radius / pixelsPerMeter;
      distanceSlider.value = currentDistance;
      distanceInput.value = currentDistance.toFixed(1);
      const maxDistance = 500;
      distanceSlider.max = maxDistance;
      const min = parseFloat(distanceSlider.min) || 1;
      const max = parseFloat(distanceSlider.max) || maxDistance;
      const percentage = ((currentDistance - min) / (max - min)) * 100;
      distanceSlider.style.background = `linear-gradient(to right, var(--orange-clr) ${percentage}%, var(--white-text-clr) ${percentage}%)`;
    }

    if (coverageToggle) {
      coverageToggle.checked = cameraIcon.coverageConfig.visible;
    }

    if (leftResizeIcon) leftResizeIcon.set({ visible: cameraIcon.coverageConfig.visible && devicesLayerVisible }).bringToFront();
    if (rightResizeIcon) rightResizeIcon.set({ visible: cameraIcon.coverageConfig.visible && devicesLayerVisible }).bringToFront();
    if (rotateResizeIcon) rotateResizeIcon.set({ visible: cameraIcon.coverageConfig.visible && devicesLayerVisible }).bringToFront();
    cameraIcon.bringToFront();
    fabricCanvas.renderAll();
  });

  cameraIcon.on("deselected", () => {
    if (!isResizingLeft && !isResizingRight && !isRotating) {
      if (leftResizeIcon) leftResizeIcon.set({ visible: false });
      if (rightResizeIcon) rightResizeIcon.set({ visible: false });
      if (rotateResizeIcon) rotateResizeIcon.set({ visible: false });
      fabricCanvas.renderAll();
    }
  });

  cameraIcon.on("moving", updateCoverage);

  cameraIcon.on("removed", () => {
    // Remove the canvas event listeners
    if (cameraIcon.addedHandler) fabricCanvas.off("object:added", cameraIcon.addedHandler);
    if (cameraIcon.modifiedHandler) fabricCanvas.off("object:modified", cameraIcon.modifiedHandler);
    if (cameraIcon.movingHandler) fabricCanvas.off("object:moving", cameraIcon.movingHandler);

    if (coverageArea) fabricCanvas.remove(coverageArea);
    if (leftResizeIcon) fabricCanvas.remove(leftResizeIcon);
    if (rightResizeIcon) fabricCanvas.remove(rightResizeIcon);
    if (rotateResizeIcon) fabricCanvas.remove(rotateResizeIcon);
  });

  function stopResizing() {
    isResizingLeft = false;
    isResizingRight = false;
    isRotating = false;
    fabricCanvas.selection = true;
    const active = fabricCanvas.getActiveObject() === cameraIcon;
    const devicesLayerVisible = layers.devices.visible;
    if (leftResizeIcon) {
      leftResizeIcon.set({ visible: active && cameraIcon.coverageConfig.visible && devicesLayerVisible });
    }
    if (rightResizeIcon) {
      rightResizeIcon.set({ visible: active && cameraIcon.coverageConfig.visible && devicesLayerVisible });
    }
    if (rotateResizeIcon) {
      rotateResizeIcon.set({ visible: active && cameraIcon.coverageConfig.visible && devicesLayerVisible });
    }
    fabricCanvas.renderAll();
  }

  if (!leftResizeIcon || !rightResizeIcon || !rotateResizeIcon) {
    fabric.Image.fromURL("./images/icons/left-resize.png", (leftIcon) => {
      if (!leftIcon) return;
      leftResizeIcon = leftIcon.set({
        scaleX: 0.05,
        scaleY: 0.05,
        originX: "center",
        originY: "center",
        hasControls: false,
        hasBorders: false,
        selectable: false,
        hoverCursor: "col-resize",
        evented: true,
        visible: false,
        opacity: layers.devices.opacity,
      });

      fabric.Image.fromURL("./images/icons/right-resize.png", (rightIcon) => {
        if (!rightIcon) return;
        rightResizeIcon = rightIcon.set({
          scaleX: 0.05,
          scaleY: 0.05,
          originX: "center",
          originY: "center",
          hasControls: false,
          hasBorders: false,
          selectable: false,
          hoverCursor: "col-resize",
          evented: true,
          visible: false,
          opacity: layers.devices.opacity,
        });

        fabric.Image.fromURL("./images/icons/four-arrows.png", (resizeIcon) => {
          if (!resizeIcon) return;
          rotateResizeIcon = resizeIcon.set({
            scaleX: 0.05,
            scaleY: 0.05,
            originX: "center",
            originY: "center",
            hasControls: false,
            hasBorders: false,
            selectable: false,
            hoverCursor: "pointer",
            evented: true,
            visible: false,
            opacity: layers.devices.opacity,
          });

          cameraIcon.leftResizeIcon = leftResizeIcon;
          cameraIcon.rightResizeIcon = rightResizeIcon;
          cameraIcon.rotateResizeIcon = rotateResizeIcon;

          fabricCanvas.add(leftResizeIcon);
          fabricCanvas.add(rightResizeIcon);
          fabricCanvas.add(rotateResizeIcon);

          leftResizeIcon.on("mousedown", (opt) => {
            isResizingLeft = true;
            fabricCanvas.setActiveObject(cameraIcon);
            fabricCanvas.selection = false;
            opt.e.preventDefault();
            document.addEventListener("mouseup", stopResizing, { once: true });
          });

          rightResizeIcon.on("mousedown", (opt) => {
            isResizingRight = true;
            fabricCanvas.setActiveObject(cameraIcon);
            fabricCanvas.selection = false;
            opt.e.preventDefault();
            document.addEventListener("mouseup", stopResizing, { once: true });
          });

          rotateResizeIcon.on("mousedown", (opt) => {
            isRotating = true;
            fabricCanvas.setActiveObject(cameraIcon);
            fabricCanvas.selection = false;
            const pointer = fabricCanvas.getPointer(opt.e);
            const camCenter = cameraIcon.getCenterPoint();
            const dx = pointer.x - camCenter.x;
            const dy = pointer.y - camCenter.y;
            initialMouseAngle = Math.round(fabric.util.radiansToDegrees(Math.atan2(dy, dx)));
            if (initialMouseAngle < 0) initialMouseAngle += 360;
            initialStartAngle = cameraIcon.coverageConfig.startAngle;
            initialEndAngle = cameraIcon.coverageConfig.endAngle;
            opt.e.preventDefault();
            document.addEventListener("mouseup", stopResizing, { once: true });
          });

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
            const maxDistance = 500;
            const maxRadius = maxDistance * pixelsPerMeter;

            if (isResizingLeft) {
              const previousSpan = cameraIcon.angleDiff(cameraIcon.coverageConfig.startAngle, cameraIcon.coverageConfig.endAngle);
              let newStartAngle = currentAngle;
              const tentativeSpan = cameraIcon.angleDiff(newStartAngle, cameraIcon.coverageConfig.endAngle);
              if (tentativeSpan < 1) {
                if (previousSpan > 180) {
                  const offset = 5;
                  cameraIcon.coverageConfig.startAngle = (Math.round(currentAngle + offset) + 360) % 360;
                  cameraIcon.coverageConfig.endAngle = cameraIcon.coverageConfig.startAngle;
                } else {
                  newStartAngle = (cameraIcon.coverageConfig.endAngle - 1 + 360) % 360;
                  cameraIcon.coverageConfig.startAngle = newStartAngle;
                }
              } else {
                cameraIcon.coverageConfig.startAngle = Math.round(newStartAngle);
              }
              cameraIcon.coverageConfig.isInitialized = true;
            } else if (isResizingRight) {
              const previousSpan = cameraIcon.angleDiff(cameraIcon.coverageConfig.startAngle, cameraIcon.coverageConfig.endAngle);
              let newEndAngle = currentAngle;
              const tentativeSpan = cameraIcon.angleDiff(cameraIcon.coverageConfig.startAngle, newEndAngle);
              if (tentativeSpan < 1) {
                if (previousSpan > 180) {
                  const offset = 5;
                  cameraIcon.coverageConfig.startAngle = (Math.round(currentAngle - offset) + 360) % 360;
                  cameraIcon.coverageConfig.endAngle = cameraIcon.coverageConfig.startAngle;
                } else {
                  newEndAngle = (cameraIcon.coverageConfig.startAngle + 1) % 360;
                  cameraIcon.coverageConfig.endAngle = newEndAngle;
                }
              } else {
                cameraIcon.coverageConfig.endAngle = Math.round(newEndAngle);
              }
              cameraIcon.coverageConfig.isInitialized = true;
            } else if (isRotating) {
              const delta = (currentAngle - initialMouseAngle + 360) % 360;
              const newStart = (initialStartAngle + delta) % 360;
              const newEnd = (initialEndAngle + delta) % 360;
              cameraIcon.coverageConfig.startAngle = Math.round(newStart);
              cameraIcon.coverageConfig.endAngle = Math.round(newEnd);
              cameraIcon.coverageConfig.radius = Math.max(pixelsPerMeter, Math.min(dist, maxRadius));
              cameraIcon.coverageConfig.isInitialized = true;

              const distanceSlider = document.getElementById("camera-distance-slider");
              const distanceInput = document.getElementById("camera-distance-input");
              if (distanceSlider && distanceInput) {
                const currentDistance = cameraIcon.coverageConfig.radius / pixelsPerMeter;
                distanceSlider.value = currentDistance;
                distanceInput.value = currentDistance.toFixed(1);
                distanceSlider.max = maxDistance;
                const min = parseFloat(distanceSlider.min) || 1;
                const max = parseFloat(distanceSlider.max) || maxDistance;
                const percentage = ((currentDistance - min) / (max - min)) * 100;
                distanceSlider.style.background = `linear-gradient(to right, var(--orange-clr) ${percentage}%, var(--white-text-clr) ${percentage}%)`;
              }
            }

            const angleSlider = document.getElementById("camera-angle-slider");
            const angleInput = document.getElementById("camera-angle-input");
            if (angleSlider && angleInput) {
              const currentAngleSpan = Math.round(cameraIcon.angleDiff(cameraIcon.coverageConfig.startAngle, cameraIcon.coverageConfig.endAngle));
              angleSlider.value = currentAngleSpan;
              angleInput.value = currentAngleSpan;
              const min = parseFloat(angleSlider.min) || 1;
              const max = parseFloat(angleSlider.max) || 360;
              const percentage = ((currentAngleSpan - min) / (max - min)) * 100;
              angleSlider.style.background = `linear-gradient(to right, var(--orange-clr) ${percentage}%, var(--white-text-clr) ${percentage}%)`;
            }

            updateCoverage();
            if (rotateResizeIcon) rotateResizeIcon.bringToFront();
          });

          fabricCanvas.on("mouse:up", stopResizing);

          updateCoverage();
          fabricCanvas.setActiveObject(cameraIcon);
          if (leftResizeIcon) leftResizeIcon.set({ visible: cameraIcon.coverageConfig.visible && layers.devices.visible }).bringToFront();
          if (rightResizeIcon) rightResizeIcon.set({ visible: cameraIcon.coverageConfig.visible && layers.devices.visible }).bringToFront();
          if (rotateResizeIcon) rotateResizeIcon.set({ visible: cameraIcon.coverageConfig.visible && layers.devices.visible }).bringToFront();
          fabricCanvas.renderAll();
        });
      });
    });
  }
}
