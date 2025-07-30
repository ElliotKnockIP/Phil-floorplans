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
export function setCrosshairCursor(canvas) {
  canvas.defaultCursor = "crosshair";
  canvas.hoverCursor = "crosshair";
  canvas.selection = false;
  canvas.getObjects().forEach((obj) => {
    if (!obj.isBackground) obj.set({ selectable: false });
  });
  canvas.requestRenderAll();
}

// Set default cursor and restore selection
export function setDefaultCursor(canvas) {
  canvas.defaultCursor = "move";
  canvas.hoverCursor = "default";
  canvas.selection = true;
  canvas.getObjects().forEach((obj) => {
    if (!obj.isBackground && !obj.isWallCircle) {
      obj.set({ selectable: true });
    }
  });
  canvas.requestRenderAll();
}

// Start a drawing tool
export function startTool(canvas, toolName, clickHandler, moveHandler = null, keyHandler = null) {
  stopCurrentTool();

  currentTool = { name: toolName, clickHandler, moveHandler, keyHandler };
  currentCanvas = canvas;

  showDrawingPopup();
  setCrosshairCursor(canvas);

  canvas.on("mouse:down", clickHandler);
  if (moveHandler) canvas.on("mouse:move", moveHandler);
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
export function setupDeletion(canvas, condition = () => true) {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      const active = canvas.getActiveObject();

      if (active && active.type === "i-text" && active.isEditing) return;
      if (canvas.getObjects().some((obj) => obj.type === "i-text" && obj.isEditing)) return;

      if (active && condition(active)) {
        canvas.remove(active);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    }
  });
}

// Set up color picker for shapes and text
export function setupColorPicker(canvas) {
  const picker = document.getElementById("shapes-text-color-picker");
  if (!picker) return;

  canvas.on("selection:created", updateColorPicker);
  canvas.on("selection:updated", updateColorPicker);
  canvas.on("selection:cleared", () => (picker.value = "#000000"));

  function updateColorPicker(e) {
    const obj = e.selected[0];
    if (!obj) return;

    let color = "#000000";
    if (obj.fill) color = obj.fill;
    else if (obj.stroke) color = obj.stroke;

    picker.value = color;
  }

  picker.addEventListener("input", () => {
    const active = canvas.getActiveObject();
    if (!active) return;

    if (active.type === "i-text") {
      active.set({ fill: picker.value });
    } else if (active.stroke !== undefined) {
      active.set({ stroke: picker.value });
    } else if (active.fill !== undefined) {
      active.set({ fill: picker.value });
    }

    canvas.requestRenderAll();
  });
}
