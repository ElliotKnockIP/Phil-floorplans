import { initCreateZones } from "../drawing/zones.js";

export function saveZones(fabricCanvas) {
  const zones = [];
  const processedPolygons = new Set(); // Track processed polygons to avoid duplicates

  fabricCanvas.getObjects().forEach((obj) => {
    if (
      obj.class === "zone-polygon" &&
      obj.associatedText &&
      !processedPolygons.has(obj) &&
      obj.type === "polygon" &&
      obj.zoneName // Ensure it's a valid zone with a name
    ) {
      console.log("Saving zone:", obj.zoneName, obj);
      const zoneData = {
        polygon: obj.toJSON(["zoneName", "zoneNotes", "area", "height", "volume", "fill", "stroke", "strokeWidth", "selectable", "evented", "hasControls", "hasBorders", "hoverCursor", "perPixelTargetFind", "class", "points"]),
        text: obj.associatedText.toJSON(["class", "fontFamily", "fontSize", "fill", "selectable", "evented", "editable", "hasControls", "hasBorders", "hoverCursor", "originX", "originY", "cursorColor", "offsetX", "offsetY", "displayHeight", "text", "left", "top", "angle"]),
      };
      zones.push(zoneData);
      processedPolygons.add(obj); // Mark as processed
    }
  });
  console.log("Saved zones (count: " + zones.length + "):", zones);
  return zones;
}

export function loadZones(fabricCanvas, zonesData) {
  console.log("Loading zones (count: " + zonesData.length + "):", zonesData);
  // Clear existing zones to prevent duplicates
  fabricCanvas.getObjects().forEach((obj) => {
    if (obj.class === "zone-polygon" || obj.class === "zone-text") {
      fabricCanvas.remove(obj);
    }
  });

  zonesData.forEach((zoneData, index) => {
    try {
      console.log(`Restoring zone ${index + 1} (${zoneData.polygon.zoneName})...`);
      // Create polygon
      const polygon = new fabric.Polygon(zoneData.polygon.points, {
        ...zoneData.polygon,
        selectable: true, // Allow selection for sidebar
        evented: true,
        hasControls: false,
        hasBorders: false,
        hoverCursor: "pointer",
        associatedText: null, // Will be set after text is created
      });

      // Create text
      const text = new fabric.IText(zoneData.text.text, {
        ...zoneData.text,
        selectable: true,
        evented: true,
        editable: false,
        hasControls: true,
        hasBorders: true,
        hoverCursor: "move",
        offsetX: zoneData.text.offsetX || 0,
        offsetY: zoneData.text.offsetY || 0,
      });

      // Link polygon and text
      polygon.associatedText = text;

      // Set text controls visibility
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

      // Reattach event handlers
      polygon.on("moving", () => {
        const polygonCenter = polygon.getCenterPoint();
        text.set({
          left: polygonCenter.x + (text.offsetX || 0),
          top: polygonCenter.y + (text.offsetY || 0),
        });
        text.setCoords();
        fabricCanvas.requestRenderAll();
      });

      text.on("moving", () => {
        const polygonCenter = polygon.getCenterPoint();
        text.offsetX = text.left - polygonCenter.x;
        text.offsetY = text.top - polygonCenter.y;
        text.setCoords();
        fabricCanvas.requestRenderAll();
      });

      polygon.on("selected", () => {
        console.log("Polygon selected:", polygon.zoneName);
        window.showDeviceProperties("zone-polygon", text, polygon, text.displayHeight);
        polygon.bringToFront();
        text.bringToFront();
        fabricCanvas.requestRenderAll();
      });

      polygon.on("deselected", () => {
        console.log("Polygon deselected");
        window.hideDeviceProperties();
      });

      text.on("selected", () => {
        console.log("Text selected:", text.text);
        window.showDeviceProperties("zone-polygon", text, polygon, text.displayHeight);
        polygon.bringToFront();
        text.bringToFront();
        fabricCanvas.requestRenderAll();
      });

      text.on("deselected", () => {
        console.log("Text deselected");
        window.hideDeviceProperties();
      });

      // Add objects to canvas
      fabricCanvas.add(polygon, text);
      text.bringToFront();
      console.log(`Zone ${index + 1} restored:`, { polygon, text });
    } catch (error) {
      console.error(`Error restoring zone ${index + 1}:`, error);
    }
  });

  // Reinitialize zone deletion and creation handling
  fabricCanvas.on("object:added", () => {
    fabricCanvas.requestRenderAll();
  });

  initCreateZones(fabricCanvas);
  console.log("Zones loaded and initialized");
}
