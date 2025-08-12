let currentTool = null;
let currentCanvas = null;

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

// Start a drawing tool
export function startTool(fabricCanvas, toolName, clickHandler, moveHandler = null, keyHandler = null) {
  stopCurrentTool();

  currentTool = { name: toolName, clickHandler, moveHandler, keyHandler };
  currentCanvas = fabricCanvas;

  showDrawingPopup();
  setCrosshairCursor(fabricCanvas);

  fabricCanvas.on("mouse:down", clickHandler);
  if (moveHandler) fabricCanvas.on("mouse:move", moveHandler);
}

// Stop the current drawing tool
export function stopCurrentTool() {
  if (!currentCanvas || !currentTool) return;

  hideDrawingPopup();
  setDefaultCursor(currentCanvas);

  currentCanvas.off("mouse:down", currentTool.clickHandler);
  if (currentTool.moveHandler) {
    currentCanvas.off("mouse:move", currentTool.moveHandler);
  }

  currentTool = null;
  currentCanvas = null;
}

// Handle global escape key to stop drawing
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    stopCurrentTool();
  } else if (currentTool && currentTool.keyHandler) {
    currentTool.keyHandler(e);
  }
});

// Close sidebar and submenus
export function closeSidebar() {
  const sidebar = document.getElementById("sub-sidebar");
  if (sidebar) sidebar.classList.add("hidden");

  document.querySelectorAll(".submenu").forEach((menu) => {
    menu.classList.add("hidden");
    menu.classList.remove("show");
  });
}

// Set up object deletion
export function setupDeletion(fabricCanvas, condition = () => true) {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      const active = fabricCanvas.getActiveObject();

      if (active && active.type === "i-text" && active.isEditing) return;
      if (fabricCanvas.getObjects().some((obj) => obj.type === "i-text" && obj.isEditing)) return;

      if (active && condition(active)) {
        fabricCanvas.remove(active);
        fabricCanvas.discardActiveObject();
        fabricCanvas.requestRenderAll();
      }
    }
  });
}

// Set up color picker for shapes, text, arrows, and building fronts
export function setupColorPicker(fabricCanvas) {
  const picker = document.getElementById("shapes-text-color-picker");
  if (!picker) return;

  fabricCanvas.on("selection:created", updateColorPicker);
  fabricCanvas.on("selection:updated", updateColorPicker);
  fabricCanvas.on("selection:cleared", () => (picker.value = "#ffffffff"));

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
