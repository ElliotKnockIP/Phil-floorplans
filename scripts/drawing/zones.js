// Fixed zones.js with snapping logic removed (now handled in canvas-snapping.js)
import { closeSubSidebar, toggleDrawingModePopup, setDrawingModeCursors, handleObjectDeletion, stopCurrentDrawingMode, registerDrawingMode, resetDrawingState } from "./drawing-utils.js";

export function initCreateZones(fabricCanvas) {
  const createZoneButton = document.getElementById("create-zone-btn");
  const subSidebar = document.getElementById("sub-sidebar");

  let isCreatingZone = false;
  let currentZonePoints = [];
  let currentPolygon = null;
  let previewLine = null;
  window.zones = window.zones || [];

  const zoneColorsMap = new Map();
  let nextColorIndex = 0;

  const distinctHues = [0, 120, 240, 60, 180, 300, 30, 150, 270, 90, 15, 135, 255, 75, 195, 315, 45, 165, 285, 105];

  function generateZoneColor(index) {
    const hue = distinctHues[index % distinctHues.length];
    return `hsla(${hue}, 70%, 60%, 0.2)`;
  }

  function getColorForZoneName(name) {
    if (zoneColorsMap.has(name)) {
      return zoneColorsMap.get(name);
    }
    const fillColor = generateZoneColor(nextColorIndex);
    zoneColorsMap.set(name, fillColor);
    nextColorIndex++;
    return fillColor;
  }

  function calculatePolygonArea(points, pixelsPerMeter) {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    return area / (pixelsPerMeter * pixelsPerMeter);
  }

  function calculatePolygonCenter(points) {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  }

  function storeOriginalPosition(polygon, textObject) {
    const polygonCenter = polygon.getCenterPoint();
    polygon.originalCenter = { x: polygonCenter.x, y: polygonCenter.y };
  }

  // Proper zone deletion function
  function deleteZone(zoneToDelete) {
    const zoneIndex = window.zones.findIndex((zone) => zone.polygon === zoneToDelete || zone.text === zoneToDelete);

    if (zoneIndex === -1) return false;

    const zone = window.zones[zoneIndex];

    // Remove all event listeners before deletion
    if (zone.polygon) {
      zone.polygon.off(); // Remove all fabric.js event listeners
      fabricCanvas.remove(zone.polygon);
    }

    if (zone.text) {
      zone.text.off(); // Remove all fabric.js event listeners
      fabricCanvas.remove(zone.text);
    }

    // Remove from zones array
    window.zones.splice(zoneIndex, 1);

    // Clear active object and hide properties
    fabricCanvas.discardActiveObject();
    if (window.hideDeviceProperties) {
      window.hideDeviceProperties();
    }

    fabricCanvas.requestRenderAll();
    return true;
  }

  createZoneButton.addEventListener("click", activateZoneCreation);

  function activateZoneCreation() {
    if (isCreatingZone) return;
    isCreatingZone = true;

    toggleDrawingModePopup(true);
    closeSubSidebar(subSidebar);
    registerDrawingMode(fabricCanvas, "zones", stopCreatingZone, resetDrawing, handleKeyDown);
    setDrawingModeCursors(fabricCanvas, true);
    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:move", handleMouseMove);
    fabricCanvas.requestRenderAll();
  }

  function handleMouseDown(o) {
    o.e.preventDefault();
    o.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(o.e);
    currentZonePoints.push({ x: pointer.x, y: pointer.y });

    if (currentZonePoints.length > 1) {
      if (currentPolygon) {
        fabricCanvas.remove(currentPolygon);
      }
      currentPolygon = new fabric.Polygon(currentZonePoints.slice(), {
        fill: "rgba(0,0,0,0.1)",
        stroke: "rgba(0,0,0,0.5)",
        strokeWidth: 2,
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        perPixelTargetFind: true,
      });
      fabricCanvas.add(currentPolygon);
    }

    fabricCanvas.requestRenderAll();
  }

  function handleMouseMove(o) {
    if (currentZonePoints.length === 0) return;

    const pointer = fabricCanvas.getPointer(o.e);

    if (previewLine) {
      fabricCanvas.remove(previewLine);
    }

    const lastPoint = currentZonePoints[currentZonePoints.length - 1];
    previewLine = new fabric.Line([lastPoint.x, lastPoint.y, pointer.x, pointer.y], {
      stroke: "blue",
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      perPixelTargetFind: true,
    });

    fabricCanvas.add(previewLine);
    fabricCanvas.requestRenderAll();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && isCreatingZone && currentZonePoints.length > 2) {
      if (previewLine) {
        fabricCanvas.remove(previewLine);
        previewLine = null;
      }
      if (currentPolygon) {
        fabricCanvas.remove(currentPolygon);
      }

      let zoneName = `Zone ${window.zones.length + 1}`;
      let zoneNotes = "";
      let height = 2.4;

      const pixelsPerMeter = fabricCanvas.pixelsPerMeter || 17.5;
      const area = calculatePolygonArea(currentZonePoints, pixelsPerMeter);
      const volume = area * height;

      const fillColor = getColorForZoneName(zoneName);
      const strokeColor = fillColor.replace("0.2", "1") || "#FE8800";

      const polygonPoints = currentZonePoints.slice();
      const finalPolygon = new fabric.Polygon(polygonPoints, {
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: 2,
        selectable: true,
        evented: true,
        hasControls: false,
        hasBorders: false,
        hoverCursor: "pointer",
        zoneName: zoneName,
        zoneNotes: zoneNotes,
        class: "zone-polygon",
        perPixelTargetFind: true,
        area: area,
        height: height,
        volume: volume,
        perPixelTargetFind: false,
      });

      const center = calculatePolygonCenter(polygonPoints);
      const text = new fabric.IText(`${zoneName}\nArea: ${area.toFixed(2)} m²\nVolume: ${volume.toFixed(2)} m³`, {
        class: "zone-text",
        left: center.x,
        top: center.y,
        fontFamily: "Poppins, sans-serif",
        fontSize: 15,
        fill: "#000000",
        selectable: true,
        evented: true,
        editable: false,
        hasControls: true,
        hasBorders: true,
        hoverCursor: "move",
        originX: "center",
        originY: "center",
        cursorColor: strokeColor,
        offsetX: 0,
        offsetY: 0,
        borderColor: "#FE8800",
        borderScaleFactor: 2,
        cornerSize: 8,
        cornerColor: "#FE8800",
        cornerStrokeColor: "#000000",
        cornerStyle: "circle",
        transparentCorners: false,
        padding: 5,
      });

      text.setControlsVisibility({
        mt: false,
        mb: false,
        ml: false,
        mr: false,
        bl: false,
        br: false,
        tl: false,
        tr: false,
        mtr: true,
      });

      // Store reference to associated objects
      finalPolygon.associatedText = text;
      text.associatedPolygon = finalPolygon;

      // Store original positions after creation
      setTimeout(() => {
        storeOriginalPosition(finalPolygon, text);
      }, 100);

      // Polygon movement handler - basic movement
      finalPolygon.on("moving", () => {
        if (!finalPolygon || !fabricCanvas.getObjects().includes(finalPolygon)) return;

        if (text && fabricCanvas.getObjects().includes(text)) {
          const newCenter = finalPolygon.getCenterPoint();
          text.set({
            left: newCenter.x + (text.offsetX || 0),
            top: newCenter.y + (text.offsetY || 0),
          });
          text.setCoords();
        }
        fabricCanvas.requestRenderAll();
      });

      // Text movement handler
      text.on("moving", () => {
        if (!text || !finalPolygon || !fabricCanvas.getObjects().includes(text)) return;
        if (!fabricCanvas.getObjects().includes(finalPolygon)) return;

        const polygonCenter = finalPolygon.getCenterPoint();
        text.offsetX = text.left - polygonCenter.x;
        text.offsetY = text.top - polygonCenter.y;
        text.setCoords();
        fabricCanvas.requestRenderAll();
      });

      // Event handlers for properties panel
      text.on("selected", () => {
        if (window.showDeviceProperties) {
          window.showDeviceProperties("zone-polygon", text, finalPolygon, height);
        }
        finalPolygon.bringToFront();
        text.bringToFront();
        fabricCanvas.requestRenderAll();
      });

      text.on("deselected", () => {
        if (window.hideDeviceProperties) {
          window.hideDeviceProperties();
        }
      });

      finalPolygon.on("selected", () => {
        if (window.showDeviceProperties) {
          window.showDeviceProperties("zone-polygon", text, finalPolygon, height);
        }
        finalPolygon.bringToFront();
        text.bringToFront();
        fabricCanvas.requestRenderAll();
      });

      finalPolygon.on("mousedown", (e) => {
        e.e.preventDefault();
        e.e.stopPropagation();
        fabricCanvas.setActiveObject(text);
        fabricCanvas.requestRenderAll();
      });

      finalPolygon.on("deselected", () => {
        if (window.hideDeviceProperties) {
          window.hideDeviceProperties();
        }
      });

      window.zones.push({ polygon: finalPolygon, text });
      fabricCanvas.add(finalPolygon, text);
      text.bringToFront();

      resetDrawingState(fabricCanvas);
      return true;
    } else if (e.key === "Delete" || e.key === "Backspace") {
      const activeObject = fabricCanvas.getActiveObject();

      if (activeObject && ((activeObject.type === "polygon" && activeObject.class === "zone-polygon") || (activeObject.type === "i-text" && activeObject.class === "zone-text"))) {
        // Prevent deletion while editing text
        if (activeObject.type === "i-text" && activeObject.isEditing) {
          e.preventDefault();
          e.stopPropagation();
          return true;
        }

        deleteZone(activeObject);
        e.preventDefault();
        e.stopPropagation();
        return true;
      }

      return false;
    }
    return false;
  }

  function resetDrawing() {
    currentZonePoints = [];
    if (currentPolygon) {
      fabricCanvas.remove(currentPolygon);
      currentPolygon = null;
    }
    if (previewLine) {
      fabricCanvas.remove(previewLine);
      previewLine = null;
    }
  }

  function stopCreatingZone() {
    isCreatingZone = false;
    resetDrawing();
    fabricCanvas.off("mouse:down", handleMouseDown);
    fabricCanvas.off("mouse:move", handleMouseMove);
  }

  fabricCanvas.on("object:added", () => {
    fabricCanvas.requestRenderAll();
  });

  // Zone deletion handler
  document.addEventListener("keydown", (e) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      const activeObject = fabricCanvas.getActiveObject();

      if (activeObject && ((activeObject.type === "polygon" && activeObject.class === "zone-polygon") || (activeObject.type === "i-text" && activeObject.class === "zone-text"))) {
        if (activeObject.type === "i-text" && activeObject.isEditing) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        deleteZone(activeObject);
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
}
