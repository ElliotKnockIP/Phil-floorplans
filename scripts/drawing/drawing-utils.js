let currentTool = null;
let currentCanvas = null;
let keyHandler = null; // Store reference to the key handler
let toolCleanupFunction = null; // Store reference to tool-specific cleanup

// Show drawing mode popup
export function showDrawingPopup() {
  const popup = document.getElementById("drawing-mode-popup");
  if (popup) popup.style.display = "block";
}

// Hide drawing mode popup
export function hideDrawingPopup() {
  const popup = document.getElementById("drawing-mode-popup");
  if (popup) popup.style.display = "none";
}

// Set crosshair cursor for drawing
export function setCrosshairCursor(fabricCanvas) {
  fabricCanvas.defaultCursor = "crosshair";
  fabricCanvas.hoverCursor = "crosshair";
  fabricCanvas.selection = false;
  fabricCanvas.getObjects().forEach((obj) => {
    if (!obj.isBackground) obj.set({ selectable: false });
  });
  fabricCanvas.requestRenderAll();
}

// Set default cursor and restore selection
export function setDefaultCursor(fabricCanvas) {
  fabricCanvas.defaultCursor = "move";
  fabricCanvas.hoverCursor = "default";
  fabricCanvas.selection = true;
  fabricCanvas.getObjects().forEach((obj) => {
    if (!obj.isBackground && !obj.isWallCircle && !obj.isDeviceLabel) {
      obj.set({ selectable: true });
    }
  });
  fabricCanvas.requestRenderAll();
}

// Register a cleanup function for the current tool
export function registerToolCleanup(cleanupFn) {
  toolCleanupFunction = cleanupFn;
}

// Clear the tool cleanup function
export function clearToolCleanup() {
  toolCleanupFunction = null;
}

// Standard object styling for consistency
export function getStandardObjectStyle() {
  return {
    borderColor: "#f8794b",
    borderScaleFactor: 1,
    cornerSize: 8,
    cornerColor: "#f8794b",
    cornerStrokeColor: "#000000",
    cornerStyle: "circle",
    padding: 5,
    transparentCorners: false,
    hasControls: true,
    hasBorders: true,
    selectable: true,
    evented: true,
  };
}

// Apply standard styling to an object
export function applyStandardStyling(obj) {
  const standardStyle = getStandardObjectStyle();
  obj.set(standardStyle);
  return obj;
}

// Start a drawing tool
export function startTool(fabricCanvas, toolName, clickHandler, moveHandler = null, customKeyHandler = null) {
  stopCurrentTool();

  currentTool = { name: toolName, clickHandler, moveHandler, customKeyHandler };
  currentCanvas = fabricCanvas;

  showDrawingPopup();
  setCrosshairCursor(fabricCanvas);

  fabricCanvas.on("mouse:down", clickHandler);
  if (moveHandler) fabricCanvas.on("mouse:move", moveHandler);

  // Set up key handler for this specific tool - ONLY ESC key, completely block Enter
  keyHandler = (e) => {
    // Check if any text is being edited - if so, don't interfere
    const isTextEditing = fabricCanvas.getObjects().some((obj) => (obj.type === "i-text" || obj.type === "textbox") && obj.isEditing);

    // If text is being edited, let Fabric.js handle it
    if (isTextEditing) {
      return;
    }

    // Handle ESC key
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();

      // Call tool-specific cleanup first
      if (toolCleanupFunction) {
        toolCleanupFunction();
      }

      // Then stop the tool
      stopCurrentTool();
      return false; // Prevent further propagation
    }

    // COMPLETELY BLOCK Enter key during drawing mode
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false; // Block Enter completely
    }
    // Do nothing for any other keys
  };

  // Add the key handler with capture=true for higher priority
  document.addEventListener("keydown", keyHandler, true);

  // Set up the popup button handlers
  setupPopupButtons();
}

// Stop the current drawing tool
export function stopCurrentTool() {
  if (!currentCanvas || !currentTool) return;

  hideDrawingPopup();
  setDefaultCursor(currentCanvas);

  // Remove canvas event listeners
  currentCanvas.off("mouse:down", currentTool.clickHandler);
  if (currentTool.moveHandler) {
    currentCanvas.off("mouse:move", currentTool.moveHandler);
  }

  // Remove the tool-specific key handler
  if (keyHandler) {
    document.removeEventListener("keydown", keyHandler, true);
    keyHandler = null;
  }

  // Clean up popup button handlers
  cleanupPopupButtons();

  // Clear tool cleanup function
  clearToolCleanup();

  currentTool = null;
  currentCanvas = null;
}

// Set up popup button event handlers
function setupPopupButtons() {
  const escBtn = document.getElementById("drawing-esc-btn");
  const enterBtn = document.getElementById("drawing-enter-btn");

  if (escBtn) {
    escBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Call tool-specific cleanup first
      if (toolCleanupFunction) {
        toolCleanupFunction();
      }

      // Then stop the tool
      stopCurrentTool();
    };
  }

  // Disable the ENTER button completely - remove all functionality
  if (enterBtn) {
    enterBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Do nothing - Enter button is now completely disabled
      return false;
    };
  }
}

// Centralized deletion logic for different object types
export function handleObjectDeletion(fabricCanvas, activeObject) {
  if (!activeObject) return false;

  // Don't delete if text is being edited
  if (activeObject.type === "i-text" && activeObject.isEditing) return false;
  if (fabricCanvas.getObjects().some((obj) => obj.type === "i-text" && obj.isEditing)) return false;

  // Handle zone deletion
  if (activeObject.type === "polygon" && activeObject.class === "zone-polygon") {
    return deleteZone(fabricCanvas, activeObject);
  }

  // Prevent deletion of zone text
  if (activeObject.class === "zone-text") {
    return false; // Don't delete zone text directly
  }

  // Handle wall circle deletion (delete connected lines too)
  if (activeObject.type === "circle" && activeObject.isWallCircle) {
    return deleteWallCircle(fabricCanvas, activeObject);
  }

  // Handle wall line deletion (delete orphaned circles)
  if (activeObject.type === "line" && activeObject.stroke === "red") {
    return deleteWallLine(fabricCanvas, activeObject);
  }

  // Handle regular object deletion
  fabricCanvas.remove(activeObject);
  fabricCanvas.discardActiveObject();
  fabricCanvas.requestRenderAll();
  return true;
}

// Delete a zone (both polygon and text together)
function deleteZone(fabricCanvas, zoneToDelete) {
  const zoneIndex = window.zones ? window.zones.findIndex((zone) => zone.polygon === zoneToDelete || zone.text === zoneToDelete) : -1;
  if (zoneIndex === -1) return false;

  const zone = window.zones[zoneIndex];
  [zone.polygon, zone.text].forEach((obj) => obj && (obj.off(), fabricCanvas.remove(obj)));
  window.zones.splice(zoneIndex, 1);
  fabricCanvas.discardActiveObject();
  window.hideDeviceProperties?.();
  fabricCanvas.requestRenderAll();
  return true;
}

// Delete wall circle and all connected lines
function deleteWallCircle(fabricCanvas, circle) {
  // Find all lines connected to this circle
  const connectedLines = fabricCanvas.getObjects().filter((obj) => obj.type === "line" && obj.stroke === "red" && (obj.startCircle === circle || obj.endCircle === circle));

  const allObjectsToDelete = [circle, ...connectedLines];
  const orphanedCircles = [];

  // Find circles that will become orphaned
  connectedLines.forEach((line) => {
    const otherCircle = line.startCircle === circle ? line.endCircle : line.startCircle;
    if (otherCircle && !orphanedCircles.includes(otherCircle)) {
      const remainingConnections = fabricCanvas.getObjects().filter((obj) => obj.type === "line" && obj.stroke === "red" && !connectedLines.includes(obj) && (obj.startCircle === otherCircle || obj.endCircle === otherCircle));
      if (remainingConnections.length === 0) {
        orphanedCircles.push(otherCircle);
      }
    }
  });

  allObjectsToDelete.push(...orphanedCircles);

  // Remove all objects
  allObjectsToDelete.forEach((obj) => fabricCanvas.remove(obj));
  fabricCanvas.discardActiveObject();

  // Update camera coverage
  fabricCanvas.getObjects("group").forEach((obj) => {
    if (obj.coverageConfig && obj.createOrUpdateCoverageArea) {
      obj.createOrUpdateCoverageArea();
    }
  });

  fabricCanvas.requestRenderAll();
  return true;
}

// Delete wall line and any orphaned circles
function deleteWallLine(fabricCanvas, line) {
  fabricCanvas.remove(line);

  // Find circles connected to this line
  const connectedCircles = [line.startCircle, line.endCircle].filter((circle) => circle);

  connectedCircles.forEach((circle) => {
    if (!circle) return;

    // Find other lines connected to this circle (excluding the deleted one)
    const otherLines = fabricCanvas.getObjects().filter((obj) => obj.type === "line" && obj !== line && obj.stroke === "red" && (obj.startCircle === circle || obj.endCircle === circle));

    // If no other lines are connected, remove the orphaned circle
    if (otherLines.length === 0) {
      fabricCanvas.remove(circle);
    }
  });

  fabricCanvas.discardActiveObject();

  // Update camera coverage
  fabricCanvas.getObjects("group").forEach((obj) => {
    if (obj.coverageConfig && obj.createOrUpdateCoverageArea) {
      obj.createOrUpdateCoverageArea();
    }
  });

  fabricCanvas.requestRenderAll();
  return true;
}

// Clean up popup button handlers
function cleanupPopupButtons() {
  const escBtn = document.getElementById("drawing-esc-btn");
  const enterBtn = document.getElementById("drawing-enter-btn");

  if (escBtn) escBtn.onclick = null;
  if (enterBtn) enterBtn.onclick = null;
}

// Close sidebar and submenus
export function closeSidebar() {
  const sidebar = document.getElementById("sub-sidebar");
  if (sidebar) sidebar.classList.add("hidden");

  document.querySelectorAll(".submenu").forEach((menu) => {
    menu.classList.add("hidden");
    menu.classList.remove("show");
  });
}

// Set up object deletion with centralized logic
export function setupDeletion(fabricCanvas, condition = () => true) {
  // Remove any existing deletion handler to prevent duplicates
  if (window.deletionHandler) {
    document.removeEventListener("keydown", window.deletionHandler);
  }

  window.deletionHandler = (e) => {
    // Don't handle deletion if we're in drawing mode
    if (currentTool) return;

    if (e.key === "Delete" || e.key === "Backspace") {
      const active = fabricCanvas.getActiveObject();

      if (active && condition(active)) {
        const wasDeleted = handleObjectDeletion(fabricCanvas, active);
        if (wasDeleted) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }
  };

  document.addEventListener("keydown", window.deletionHandler);
}

// Set up color picker for shapes, text, arrows, and building fronts
export function setupColorPicker(fabricCanvas) {
  const picker = document.getElementById("shapes-text-color-picker");
  if (!picker) return;

  fabricCanvas.on("selection:created", updateColorPicker);
  fabricCanvas.on("selection:updated", updateColorPicker);
  // Use 6-character hex format instead of 8-character
  fabricCanvas.on("selection:cleared", () => (picker.value = "#ffffff"));

  function updateColorPicker(e) {
    const obj = e.selected[0];
    if (!obj) return;

    let color = "#000000";

    // Handle arrows specifically (groups with type "arrow")
    if (obj.type === "arrow" || (obj.type === "group" && obj._objects?.some((subObj) => subObj.type === "line" || subObj.type === "triangle"))) {
      const lineOrTriangle = obj._objects.find((subObj) => subObj.type === "line" || subObj.type === "triangle");
      if (lineOrTriangle && (lineOrTriangle.fill || lineOrTriangle.stroke)) {
        color = lineOrTriangle.fill || lineOrTriangle.stroke;
      }
    } else if (obj.fill && typeof obj.fill === "string") {
      color = obj.fill;
    } else if (obj.stroke && typeof obj.stroke === "string") {
      color = obj.stroke;
    }

    // Convert color to 6-character hex format if needed
    color = normalizeColorForPicker(color);
    picker.value = color;
  }

  picker.addEventListener("input", () => {
    const active = fabricCanvas.getActiveObject();
    if (!active) return;

    const newColor = picker.value;

    if (active.type === "i-text") {
      active.set({ fill: newColor });
    } else if (active.type === "arrow" || (active.type === "group" && active._objects?.some((subObj) => subObj.type === "line" || subObj.type === "triangle"))) {
      // Update colors for arrows and building fronts
      active._objects.forEach((subObj) => {
        if (subObj.type === "line" || subObj.type === "triangle") {
          if (subObj.fill !== undefined) subObj.set({ fill: newColor });
          if (subObj.stroke !== undefined) subObj.set({ stroke: newColor });
        }
      });
      // Force the group to re-render
      active.dirty = true;
    } else {
      // Update both fill and stroke for shapes
      if (active.fill !== undefined) {
        // Preserve alpha channel for fill if present
        const currentFill = active.fill || "rgba(0, 0, 0, 1)";
        const alpha = currentFill.match(/rgba?\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/)?.[1] || 1;
        active.set({ fill: `rgba(${parseInt(newColor.slice(1, 3), 16)}, ${parseInt(newColor.slice(3, 5), 16)}, ${parseInt(newColor.slice(5, 7), 16)}, ${alpha})` });
      }
      if (active.stroke !== undefined) {
        active.set({ stroke: newColor });
      }
    }

    fabricCanvas.requestRenderAll();
  });
}

// Helper function to normalize colors for the color picker
function normalizeColorForPicker(color) {
  if (!color || typeof color !== "string") {
    return "#000000";
  }

  // If it's already a 6-character hex color, return as-is
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color;
  }

  // If it's an 8-character hex color (with alpha), remove the alpha
  if (/^#[0-9A-Fa-f]{8}$/.test(color)) {
    return color.substring(0, 7);
  }

  // If it's an rgba/rgb color, convert to hex
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, "0");
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, "0");
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }

  // If it's a named color or other format, return default
  return "#000000";
}
