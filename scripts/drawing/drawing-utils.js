let currentTool = null;
let currentCanvas = null;

// Popup management
export function showDrawingPopup() {
  const popup = document.getElementById("drawing-mode-popup");
  if (popup) popup.style.display = "block";
}

export function hideDrawingPopup() {
  const popup = document.getElementById("drawing-mode-popup");
  if (popup) popup.style.display = "none";
}

// Cursor management
export function setCrosshairCursor(canvas) {
  canvas.defaultCursor = "crosshair";
  canvas.hoverCursor = "crosshair";
  canvas.selection = false;
  canvas.getObjects().forEach((obj) => {
    if (!obj.isBackground) obj.set({ selectable: false });
  });
  canvas.requestRenderAll();
}

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

// Tool management
export function startTool(canvas, toolName, clickHandler, moveHandler = null, keyHandler = null) {
  stopCurrentTool();

  currentTool = { name: toolName, clickHandler, moveHandler, keyHandler };
  currentCanvas = canvas;

  showDrawingPopup();
  setCrosshairCursor(canvas);

  canvas.on("mouse:down", clickHandler);
  if (moveHandler) canvas.on("mouse:move", moveHandler);
}

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

// Global escape key handler
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    stopCurrentTool();
  } else if (currentTool && currentTool.keyHandler) {
    currentTool.keyHandler(e);
  }
});

// Sidebar management
export function closeSidebar() {
  const sidebar = document.getElementById("sub-sidebar");
  if (sidebar) sidebar.classList.add("hidden");

  document.querySelectorAll(".submenu").forEach((menu) => {
    menu.classList.add("hidden");
    menu.classList.remove("show");
  });
}

// Object deletion
export function setupDeletion(canvas, condition = () => true) {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      const active = canvas.getActiveObject();

      // Don't delete if editing text
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

// Color picker
export function setupColorPicker(canvas) {
  const picker = document.getElementById("shapes-text-color-picker");
  if (!picker) return;

  // Update picker when object selected
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

  // Apply color when changed
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
