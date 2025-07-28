// Simplified zones.js with maintained functionality
import { closeSidebar, showDrawingPopup, hideDrawingPopup, setCrosshairCursor, setDefaultCursor } from "./drawing-utils.js";

export function setupZoneTool(fabricCanvas) {
  const createZoneButton = document.getElementById("create-zone-btn");

  let isCreatingZone = false;
  let currentZonePoints = [];
  let currentPolygon = null;
  let previewLine = null;
  window.zones = window.zones || [];

  // Color management
  const zoneColorsMap = new Map();
  let nextColorIndex = 0;
  const distinctHues = [0, 120, 240, 60, 180, 300, 30, 150, 270, 90, 15, 135, 255, 75, 195, 315, 45, 165, 285, 105];

  const generateZoneColor = (index) => `hsla(${distinctHues[index % distinctHues.length]}, 70%, 60%, 0.2)`;
  const getColorForZoneName = (name) => {
    if (!zoneColorsMap.has(name)) {
      zoneColorsMap.set(name, generateZoneColor(nextColorIndex++));
    }
    return zoneColorsMap.get(name);
  };

  // Utility calculations
  const calculatePolygonArea = (points, pixelsPerMeter) => {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return Math.abs(area) / (2 * pixelsPerMeter * pixelsPerMeter);
  };

  const calculatePolygonCenter = (points) => ({
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  });

  // Layer management
  const maintainLayerOrder = () => {
    const objects = fabricCanvas.getObjects();
    const backgroundImage = objects.find((obj) => obj.isBackground);

    backgroundImage?.sendToBack();

    window.zones.forEach((zone) => {
      if (zone.polygon && objects.includes(zone.polygon)) {
        backgroundImage ? fabricCanvas.bringForward(zone.polygon, false) : zone.polygon.sendToBack();
      }
    });

    objects.forEach((obj) => {
      if ((obj.type === "group" && obj.deviceType) || ["line", "circle", "rect"].includes(obj.type) || (obj.type === "i-text" && !obj.class)) {
        obj.bringToFront();
        obj.textObject?.bringToFront();
      }
    });

    window.zones.forEach((zone) => {
      if (zone.text && objects.includes(zone.text)) {
        zone.text.bringToFront();
        objects.forEach((obj) => {
          if (obj.type === "group" && obj.deviceType) {
            obj.bringToFront();
            obj.textObject?.bringToFront();
          }
        });
      }
    });

    fabricCanvas.requestRenderAll();
  };

  // Zone deletion
  const deleteZone = (zoneToDelete) => {
    const zoneIndex = window.zones.findIndex((zone) => zone.polygon === zoneToDelete || zone.text === zoneToDelete);
    if (zoneIndex === -1) return false;

    const zone = window.zones[zoneIndex];
    [zone.polygon, zone.text].forEach((obj) => {
      if (obj) {
        obj.off();
        fabricCanvas.remove(obj);
      }
    });

    window.zones.splice(zoneIndex, 1);
    fabricCanvas.discardActiveObject();
    window.hideDeviceProperties?.();
    fabricCanvas.requestRenderAll();
    return true;
  };

  // Drawing handlers
  const handleMouseDown = (o) => {
    o.e.preventDefault();
    o.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(o.e);
    currentZonePoints.push({ x: pointer.x, y: pointer.y });

    if (currentZonePoints.length > 1) {
      currentPolygon && fabricCanvas.remove(currentPolygon);
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
  };

  const handleMouseMove = (o) => {
    if (currentZonePoints.length === 0) return;

    const pointer = fabricCanvas.getPointer(o.e);
    previewLine && fabricCanvas.remove(previewLine);

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
  };

  // Create zone objects
  const createZoneObjects = (polygonPoints, zoneName, zoneNotes, height, area, volume) => {
    const fillColor = getColorForZoneName(zoneName);
    const strokeColor = fillColor.replace("0.2", "1") || "#FE8800";
    const center = calculatePolygonCenter(polygonPoints);

    const finalPolygon = new fabric.Polygon(polygonPoints, {
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: 2,
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
      hoverCursor: "pointer",
      zoneName,
      zoneNotes,
      class: "zone-polygon",
      area,
      height,
      volume,
      perPixelTargetFind: false,
    });

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

    return { finalPolygon, text, strokeColor };
  };

  // Add event handlers to zone objects
  const addZoneEventHandlers = (finalPolygon, text) => {
    finalPolygon.associatedText = text;
    text.associatedPolygon = finalPolygon;

    setTimeout(() => {
      const polygonCenter = finalPolygon.getCenterPoint();
      finalPolygon.originalCenter = { x: polygonCenter.x, y: polygonCenter.y };
    }, 100);

    // Movement handlers
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

    finalPolygon.on("moved", () => setTimeout(maintainLayerOrder, 10));

    text.on("moving", () => {
      if (!text || !finalPolygon || !fabricCanvas.getObjects().includes(text) || !fabricCanvas.getObjects().includes(finalPolygon)) return;
      const polygonCenter = finalPolygon.getCenterPoint();
      text.offsetX = text.left - polygonCenter.x;
      text.offsetY = text.top - polygonCenter.y;
      text.setCoords();
      fabricCanvas.requestRenderAll();
    });

    // Selection handlers
    const showProperties = () => window.showDeviceProperties?.("zone-polygon", text, finalPolygon, finalPolygon.height);
    const hideProperties = () => window.hideDeviceProperties?.();

    [text, finalPolygon].forEach((obj) => {
      obj.on("selected", () => {
        showProperties();
        fabricCanvas.requestRenderAll();
      });
      obj.on("deselected", hideProperties);
    });

    // Special click handler for polygon to prioritize devices
    finalPolygon.on("mousedown", (e) => {
      const pointer = fabricCanvas.getPointer(e.e);
      finalPolygon.set("evented", false);

      const devicesUnderneath = fabricCanvas.getObjects().filter((obj) => {
        return obj !== finalPolygon && obj !== text && obj.type === "group" && obj.deviceType && obj.containsPoint(pointer);
      });

      finalPolygon.set("evented", true);

      if (devicesUnderneath.length > 0) {
        e.e.preventDefault();
        e.e.stopPropagation();
        fabricCanvas.setActiveObject(devicesUnderneath[0]);
      } else {
        e.e.preventDefault();
        e.e.stopPropagation();
        fabricCanvas.setActiveObject(text);
      }
      fabricCanvas.requestRenderAll();
    });
  };

  // Key handler
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && isCreatingZone && currentZonePoints.length > 2) {
      [previewLine, currentPolygon].forEach((obj) => obj && fabricCanvas.remove(obj));
      previewLine = currentPolygon = null;

      const zoneName = `Zone ${window.zones.length + 1}`;
      const zoneNotes = "";
      const height = 2.4;
      const pixelsPerMeter = fabricCanvas.pixelsPerMeter || 17.5;
      const area = calculatePolygonArea(currentZonePoints, pixelsPerMeter);
      const volume = area * height;

      const { finalPolygon, text } = createZoneObjects(currentZonePoints.slice(), zoneName, zoneNotes, height, area, volume);
      addZoneEventHandlers(finalPolygon, text);

      window.zones.push({ polygon: finalPolygon, text });
      fabricCanvas.add(finalPolygon, text);
      setTimeout(maintainLayerOrder, 10);
      resetDrawingState();
      return true;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      const activeObject = fabricCanvas.getActiveObject();
      if (activeObject && ((activeObject.type === "polygon" && activeObject.class === "zone-polygon") || (activeObject.type === "i-text" && activeObject.class === "zone-text"))) {
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
  };

  // State management
  const resetDrawingState = () => {
    currentZonePoints = [];
    [currentPolygon, previewLine].forEach((obj) => obj && fabricCanvas.remove(obj));
    currentPolygon = previewLine = null;
    showDrawingPopup();
  };

  const stopCreatingZone = () => {
    isCreatingZone = false;
    currentZonePoints = [];
    [currentPolygon, previewLine].forEach((obj) => obj && fabricCanvas.remove(obj));
    currentPolygon = previewLine = null;
    fabricCanvas.off("mouse:down", handleMouseDown);
    fabricCanvas.off("mouse:move", handleMouseMove);
  };

  const activateZoneCreation = () => {
    if (isCreatingZone) return;
    isCreatingZone = true;
    showDrawingPopup();
    closeSidebar();
    setCrosshairCursor(fabricCanvas);
    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:move", handleMouseMove);
    fabricCanvas.requestRenderAll();
  };

  // Event listeners
  createZoneButton.addEventListener("click", activateZoneCreation);
  fabricCanvas.on("object:added", () => fabricCanvas.requestRenderAll());
  fabricCanvas.on("object:modified", () => setTimeout(maintainLayerOrder, 10));

  // Global key handlers
  document.addEventListener("keydown", (e) => {
    if (isCreatingZone && handleKeyDown(e)) return;

    if (e.key === "Escape" && isCreatingZone) {
      hideDrawingPopup();
      setDefaultCursor(fabricCanvas);
      stopCreatingZone();
    }

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

  // Expose globally
  window.maintainZoneLayerOrder = maintainLayerOrder;
}
