export function initCanvasSnapping(fabricCanvas) {
  let snapThreshold = 10; // Distance threshold for snapping
  let snapLines = [];
  let isSnapping = false;
  let ZONE_SNAP_THRESHOLD = 25; // For zone snapping
  let deviceSnappingEnabled = true; // Control device snapping - default ON

  // Check if device snapping is enabled based on checkbox state
  function isDeviceSnappingEnabled() {
    const snapToggle = document.getElementById("snap-device-toggle");
    // If checkbox exists and is checked, snapping is OFF
    // If checkbox doesn't exist or is unchecked, snapping is ON (default)
    return !snapToggle || !snapToggle.checked;
  }
  function hasBackgroundImage() {
    const backgroundImage = fabricCanvas.getObjects().find((obj) => obj.isBackground === true);
    return backgroundImage && backgroundImage.width && backgroundImage.height;
  }

  // Get background image boundaries and calculate snap points
  function getSnapPoints() {
    const backgroundImage = fabricCanvas.getObjects().find((obj) => obj.isBackground === true);

    if (!backgroundImage || !backgroundImage.width || !backgroundImage.height) {
      return null;
    }

    const imgLeft = backgroundImage.left;
    const imgTop = backgroundImage.top;
    const imgWidth = backgroundImage.getScaledWidth();
    const imgHeight = backgroundImage.getScaledHeight();
    const imgRight = imgLeft + imgWidth;
    const imgBottom = imgTop + imgHeight;
    const imgCenterX = imgLeft + imgWidth / 2;
    const imgCenterY = imgTop + imgHeight / 2;

    return {
      // Corner points
      topLeft: { x: imgLeft, y: imgTop },
      topRight: { x: imgRight, y: imgTop },
      bottomLeft: { x: imgLeft, y: imgBottom },
      bottomRight: { x: imgRight, y: imgBottom },
      // Center points
      center: { x: imgCenterX, y: imgCenterY },
      centerTop: { x: imgCenterX, y: imgTop },
      centerBottom: { x: imgCenterX, y: imgBottom },
      centerLeft: { x: imgLeft, y: imgCenterY },
      centerRight: { x: imgRight, y: imgCenterY },
      // Edges
      edges: {
        top: imgTop,
        bottom: imgBottom,
        left: imgLeft,
        right: imgRight,
        centerH: imgCenterY,
        centerV: imgCenterX,
      },
      // Bounds for line limits
      bounds: {
        left: imgLeft,
        top: imgTop,
        right: imgRight,
        bottom: imgBottom,
      },
    };
  }

  // Create snap line
  function createSnapLine(x1, y1, x2, y2) {
    return new fabric.Line([x1, y1, x2, y2], {
      stroke: "#FF6B35",
      strokeWidth: 1,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      excludeFromExport: true,
      isSnapLine: true,
      opacity: 0.8,
    });
  }

  // Clear all snap lines
  function clearSnapLines() {
    snapLines.forEach((line) => {
      fabricCanvas.remove(line);
    });
    snapLines = [];
    fabricCanvas.renderAll();
  }

  // Show snap lines for the given position
  function showSnapLines(objCenter, snapPoint, type, bounds) {
    clearSnapLines();

    const lineLeft = bounds.left;
    const lineRight = bounds.right;
    const lineTop = bounds.top;
    const lineBottom = bounds.bottom;

    switch (type) {
      case "corner":
        const hLine = createSnapLine(lineLeft, snapPoint.y, lineRight, snapPoint.y);
        const vLine = createSnapLine(snapPoint.x, lineTop, snapPoint.x, lineBottom);
        snapLines.push(hLine, vLine);
        fabricCanvas.add(hLine);
        fabricCanvas.add(vLine);
        break;
      case "centerH":
        const centerHLine = createSnapLine(lineLeft, snapPoint.y, lineRight, snapPoint.y);
        snapLines.push(centerHLine);
        fabricCanvas.add(centerHLine);
        break;
      case "centerV":
        const centerVLine = createSnapLine(snapPoint.x, lineTop, snapPoint.x, lineBottom);
        snapLines.push(centerVLine);
        fabricCanvas.add(centerVLine);
        break;
      case "center":
        const centerH = createSnapLine(lineLeft, snapPoint.y, lineRight, snapPoint.y);
        const centerV = createSnapLine(snapPoint.x, lineTop, snapPoint.x, lineBottom);
        snapLines.push(centerH, centerV);
        fabricCanvas.add(centerH);
        fabricCanvas.add(centerV);
        break;
      case "edge":
        if (snapPoint.isVertical) {
          const edgeLine = createSnapLine(snapPoint.x, lineTop, snapPoint.x, lineBottom);
          snapLines.push(edgeLine);
          fabricCanvas.add(edgeLine);
        } else {
          const edgeLine = createSnapLine(lineLeft, snapPoint.y, lineRight, snapPoint.y);
          snapLines.push(edgeLine);
          fabricCanvas.add(edgeLine);
        }
        break;
    }

    // Bring snap lines to front but behind the object being moved
    snapLines.forEach((line) => {
      line.moveTo(fabricCanvas.getObjects().length - 2);
    });
    fabricCanvas.renderAll();
  }

  // Check if object should snap to any point
  function checkSnapping(obj) {
    if (!hasBackgroundImage()) {
      return { snapped: false };
    }

    const objCenter = obj.getCenterPoint();
    const snapData = getSnapPoints();

    if (!snapData) {
      return { snapped: false };
    }

    // Check corner points
    const corners = [
      { point: snapData.topLeft, type: "corner", name: "topLeft" },
      { point: snapData.topRight, type: "corner", name: "topRight" },
      { point: snapData.bottomLeft, type: "corner", name: "bottomLeft" },
      { point: snapData.bottomRight, type: "corner", name: "bottomRight" },
    ];

    for (let corner of corners) {
      const distance = Math.sqrt(Math.pow(objCenter.x - corner.point.x, 2) + Math.pow(objCenter.y - corner.point.y, 2));
      if (distance <= snapThreshold) {
        obj.set({
          left: corner.point.x,
          top: corner.point.y,
        });
        obj.setCoords();
        showSnapLines(objCenter, corner.point, corner.type, snapData.bounds);
        return { snapped: true, point: corner.point, type: corner.type };
      }
    }

    // Check center point
    const centerDistance = Math.sqrt(Math.pow(objCenter.x - snapData.center.x, 2) + Math.pow(objCenter.y - snapData.center.y, 2));
    if (centerDistance <= snapThreshold) {
      obj.set({
        left: snapData.center.x,
        top: snapData.center.y,
      });
      obj.setCoords();
      showSnapLines(objCenter, snapData.center, "center", snapData.bounds);
      return { snapped: true, point: snapData.center, type: "center" };
    }

    // Check center lines
    const centerPoints = [
      { point: snapData.centerTop, type: "centerV", name: "centerTop" },
      { point: snapData.centerBottom, type: "centerV", name: "centerBottom" },
      { point: snapData.centerLeft, type: "centerH", name: "centerLeft" },
      { point: snapData.centerRight, type: "centerH", name: "centerRight" },
    ];

    for (let centerPoint of centerPoints) {
      const distance = Math.sqrt(Math.pow(objCenter.x - centerPoint.point.x, 2) + Math.pow(objCenter.y - centerPoint.point.y, 2));
      if (distance <= snapThreshold) {
        obj.set({
          left: centerPoint.point.x,
          top: centerPoint.point.y,
        });
        obj.setCoords();
        showSnapLines(objCenter, centerPoint.point, centerPoint.type, snapData.bounds);
        return { snapped: true, point: centerPoint.point, type: centerPoint.type };
      }
    }

    // Check alignment with background edges
    const edges = snapData.edges;

    // Vertical alignment
    if (Math.abs(objCenter.x - edges.left) <= snapThreshold) {
      obj.set({ left: edges.left });
      obj.setCoords();
      showSnapLines(objCenter, { x: edges.left, y: objCenter.y, isVertical: true }, "edge", snapData.bounds);
      return { snapped: true, point: { x: edges.left, y: objCenter.y }, type: "edge" };
    }
    if (Math.abs(objCenter.x - edges.right) <= snapThreshold) {
      obj.set({ left: edges.right });
      obj.setCoords();
      showSnapLines(objCenter, { x: edges.right, y: objCenter.y, isVertical: true }, "edge", snapData.bounds);
      return { snapped: true, point: { x: edges.right, y: objCenter.y }, type: "edge" };
    }
    if (Math.abs(objCenter.x - edges.centerV) <= snapThreshold) {
      obj.set({ left: edges.centerV });
      obj.setCoords();
      showSnapLines(objCenter, { x: edges.centerV, y: objCenter.y, isVertical: true }, "edge", snapData.bounds);
      return { snapped: true, point: { x: edges.centerV, y: objCenter.y }, type: "edge" };
    }

    // Horizontal alignment
    if (Math.abs(objCenter.y - edges.top) <= snapThreshold) {
      obj.set({ top: edges.top });
      obj.setCoords();
      showSnapLines(objCenter, { x: objCenter.x, y: edges.top, isVertical: false }, "edge", snapData.bounds);
      return { snapped: true, point: { x: objCenter.x, y: edges.top }, type: "edge" };
    }
    if (Math.abs(objCenter.y - edges.bottom) <= snapThreshold) {
      obj.set({ top: edges.bottom });
      obj.setCoords();
      showSnapLines(objCenter, { x: objCenter.x, y: edges.bottom, isVertical: false }, "edge", snapData.bounds);
      return { snapped: true, point: { x: objCenter.x, y: edges.bottom }, type: "edge" };
    }
    if (Math.abs(objCenter.y - edges.centerH) <= snapThreshold) {
      obj.set({ top: edges.centerH });
      obj.setCoords();
      showSnapLines(objCenter, { x: objCenter.x, y: edges.centerH, isVertical: false }, "edge", snapData.bounds);
      return { snapped: true, point: { x: objCenter.x, y: edges.centerH }, type: "edge" };
    }

    return { snapped: false };
  }

  // Check if object is a device (snappable)
  function isDeviceObject(obj) {
    // Only devices (groups with deviceType that are actual devices, not title blocks)
    return obj.type === "group" && obj.deviceType && obj.deviceType !== "title-block";
  }

  // Zone snapping utility functions
  function isNearOriginal(currentCenter, originalCenter) {
    const distance = Math.sqrt(Math.pow(currentCenter.x - originalCenter.x, 2) + Math.pow(currentCenter.y - originalCenter.y, 2));
    return distance <= ZONE_SNAP_THRESHOLD;
  }

  function snapZoneToOriginal(polygon, textObject) {
    if (!polygon.originalCenter) return false;

    const currentCenter = polygon.getCenterPoint();
    if (isNearOriginal(currentCenter, polygon.originalCenter)) {
      const deltaX = polygon.originalCenter.x - currentCenter.x;
      const deltaY = polygon.originalCenter.y - currentCenter.y;

      polygon.set({
        left: polygon.left + deltaX,
        top: polygon.top + deltaY,
      });

      if (textObject) {
        const newCenter = polygon.getCenterPoint();
        textObject.set({
          left: newCenter.x + (textObject.offsetX || 0),
          top: newCenter.y + (textObject.offsetY || 0),
        });
        textObject.setCoords();
      }

      polygon.setCoords();
      return true;
    }
    return false;
  }

  // Handle object moving
  fabricCanvas.on("object:moving", (e) => {
    const obj = e.target;

    // Handle device snapping (only if enabled)
    if (isDeviceSnappingEnabled() && hasBackgroundImage() && isDeviceObject(obj)) {
      const snapResult = checkSnapping(obj);
      isSnapping = snapResult.snapped;
      return;
    }

    // Handle zone snapping (always enabled)
    if (obj && obj.type === "polygon" && obj.class === "zone-polygon") {
      const currentCenter = obj.getCenterPoint();

      if (obj.originalCenter && isNearOriginal(currentCenter, obj.originalCenter)) {
        const deltaX = obj.originalCenter.x - currentCenter.x;
        const deltaY = obj.originalCenter.y - currentCenter.y;

        obj.set({
          left: obj.left + deltaX,
          top: obj.top + deltaY,
        });

        // Update associated text
        const zone = window.zones?.find((z) => z.polygon === obj);
        if (zone && zone.text && fabricCanvas.getObjects().includes(zone.text)) {
          const newCenter = obj.getCenterPoint();
          zone.text.set({
            left: newCenter.x + (zone.text.offsetX || 0),
            top: newCenter.y + (zone.text.offsetY || 0),
          });
          zone.text.setCoords();
        }

        obj.setCoords();
      }
      return;
    }

    // Clear snap lines for non-snappable objects or when device snapping is disabled
    if (snapLines.length > 0) {
      clearSnapLines();
      isSnapping = false;
    }
  });

  // Handle object moved (when movement is complete)
  fabricCanvas.on("object:moved", (e) => {
    setTimeout(() => {
      clearSnapLines();
      isSnapping = false;
    }, 100);
  });

  // Clear snap lines when object is deselected
  fabricCanvas.on("selection:cleared", () => {
    clearSnapLines();
    isSnapping = false;
  });

  // Clear snap lines when canvas is cleared
  fabricCanvas.on("canvas:cleared", () => {
    snapLines = [];
    isSnapping = false;
  });

  // Initialize the snapping toggle
  const snapToggle = document.getElementById("snap-device-toggle");
  if (snapToggle) {
    // Set initial state (checkbox unchecked = snapping ON)
    deviceSnappingEnabled = !snapToggle.checked;

    snapToggle.addEventListener("change", () => {
      deviceSnappingEnabled = !snapToggle.checked;

      // Clear any existing snap lines when toggling
      if (!deviceSnappingEnabled) {
        clearSnapLines();
        isSnapping = false;
      }
    });
  }

  // Public methods
  return {
    setSnapThreshold: (threshold) => {
      snapThreshold = threshold;
    },
    getSnapThreshold: () => snapThreshold,
    setZoneSnapThreshold: (threshold) => {
      ZONE_SNAP_THRESHOLD = Math.max(10, Math.min(100, threshold));
    },
    isDeviceSnappingEnabled: isDeviceSnappingEnabled,
    clearSnapLines: clearSnapLines,
    isSnapping: () => isSnapping,
    hasBackgroundImage: hasBackgroundImage,
  };
}
