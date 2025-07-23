let activeDrawingMode = null;
let currentFabricCanvas = null;

// Function to stop the current drawing mode
export function stopCurrentDrawingMode(fabricCanvas) {
  if (!fabricCanvas) {
    console.error("Fabric canvas not provided");
    return;
  }
  if (activeDrawingMode && activeDrawingMode.stopDrawing) {
    activeDrawingMode.stopDrawing();
  }
  activeDrawingMode = null;
  currentFabricCanvas = null;
  setDrawingModeCursors(fabricCanvas, false);
  toggleDrawingModePopup(false);
  fabricCanvas.requestRenderAll();
}

// Function to reset drawing state without stopping the mode
export function resetDrawingState(fabricCanvas) {
  if (activeDrawingMode && activeDrawingMode.resetDrawing) {
    activeDrawingMode.resetDrawing();
  }
  toggleDrawingModePopup(true); // Ensure popup remains visible
  fabricCanvas.requestRenderAll();
}

// Function to register a new drawing mode
export function registerDrawingMode(fabricCanvas, modeName, stopDrawingFn, resetDrawingFn = null, keyDownHandler = null) {
  if (!fabricCanvas) {
    console.error("Fabric canvas not provided");
    return;
  }
  if (activeDrawingMode) {
    // Stop the current mode without hiding the popup
    if (activeDrawingMode.stopDrawing) {
      activeDrawingMode.stopDrawing();
    }
    activeDrawingMode = null;
    currentFabricCanvas = null;
    setDrawingModeCursors(fabricCanvas, false);
    fabricCanvas.requestRenderAll();
  }
  activeDrawingMode = { name: modeName, stopDrawing: stopDrawingFn, resetDrawing: resetDrawingFn, keyDownHandler };
  currentFabricCanvas = fabricCanvas;
  toggleDrawingModePopup(true); // Show popup when entering new mode
}

// Centralized keydown handler
document.addEventListener("keydown", (e) => {
  if (activeDrawingMode && currentFabricCanvas) {
    // Call the mode-specific keydown handler if it exists
    if (activeDrawingMode.keyDownHandler && activeDrawingMode.keyDownHandler(e)) {
      return; // Key was handled
    }
    // Default Escape key handling
    if (e.key === "Escape") {
      stopCurrentDrawingMode(currentFabricCanvas);
    }
  }
});

export function closeSubSidebar(subSidebar) {
  subSidebar.classList.add("hidden");
  document.querySelectorAll(".submenu").forEach((submenu) => {
    submenu.classList.add("hidden");
    submenu.classList.remove("show");
  });
}

export function toggleDrawingModePopup(show) {
  const popup = document.getElementById("drawing-mode-popup");
  if (popup) {
    popup.style.display = show ? "block" : "none";
  } else {
    console.warn("drawing-mode-popup element not found");
  }
}

export function setDrawingModeCursors(fabricCanvas, enable, excludeCameraImages = true) {
  fabricCanvas.selection = !enable;
  fabricCanvas.defaultCursor = enable ? "crosshair" : "move";
  fabricCanvas.hoverCursor = enable ? "crosshair" : "default";

  fabricCanvas.getObjects().forEach((obj) => {
    let cursor = enable ? "crosshair" : "default";
    if (!enable) {
      if (obj.type === "line" || obj.type === "arrow" || obj.type === "rect" || obj.type === "circle" || obj.type === "polygon") {
        cursor = "pointer";
      } else if (obj.type === "i-text") {
        cursor = "text";
      }
    }

    // Always exclude camera objects from being selectable during drawing mode
    if (obj.type === "group" && (obj.coverageConfig || obj.cameraId)) {
      // This is a camera object - keep it non-selectable and non-evented during drawing
      obj.set({ selectable: false, evented: false, hoverCursor: "default" });
    } else if (excludeCameraImages && obj.type === "image" && !obj._element?.src?.includes("camera")) {
      obj.set({ selectable: false, evented: false, hoverCursor: "default" });
    } else {
      obj.set({
        selectable: !enable,
        evented: !enable,
        hoverCursor: cursor,
      });
    }
  });

  fabricCanvas.requestRenderAll();
}

export function handleObjectDeletion(fabricCanvas, objectsArray, condition = (obj) => true) {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      const activeObject = fabricCanvas.getActiveObject();

      // Check if we're currently editing text - this prevents deletion while typing
      if (activeObject && (activeObject.type === "i-text" || activeObject.type === "textbox")) {
        if (activeObject.isEditing) {
          return; // Don't delete the object if we're editing it
        }
      }

      // Also check if any text object on the canvas is being edited
      const isAnyTextBeingEdited = fabricCanvas.getObjects().some((obj) => (obj.type === "i-text" || obj.type === "textbox") && obj.isEditing);

      if (isAnyTextBeingEdited) {
        return; // Don't delete anything if any text is being edited
      }

      // Prevent deletion of wall circles
      if (activeObject && activeObject.type === "circle" && activeObject.isWallCircle) {
        return; // Don't delete wall circles
      }

      if (activeObject && condition(activeObject)) {
        // Remove the active object
        fabricCanvas.remove(activeObject);

        // If the object is a line, check for associated circles in objectsArray (lineSegments)
        if (activeObject.type === "line") {
          // Find the segment in objectsArray that matches the deleted line
          const segmentIndex = objectsArray.findIndex((seg) => seg.line === activeObject);
          if (segmentIndex !== -1) {
            const segment = objectsArray[segmentIndex];
            // Remove the segment from the array
            objectsArray.splice(segmentIndex, 1);

            // Check if startCircle and endCircle are still referenced by other segments
            const startCircleUsage = objectsArray.filter((seg) => seg.startCircle === segment.startCircle || seg.endCircle === segment.startCircle).length;
            const endCircleUsage = objectsArray.filter((seg) => seg.startCircle === segment.endCircle || seg.endCircle === segment.endCircle).length;

            // Remove circles if they are no longer referenced
            if (startCircleUsage === 0 && segment.startCircle) {
              fabricCanvas.remove(segment.startCircle);
            }
            if (endCircleUsage === 0 && segment.endCircle) {
              fabricCanvas.remove(segment.endCircle);
            }
          }
        }

        // If the object is a zone polygon, also remove its associated text
        if (activeObject.class === "zone-polygon" && activeObject.associatedText) {
          fabricCanvas.remove(activeObject.associatedText);
        }

        fabricCanvas.discardActiveObject();
        fabricCanvas.requestRenderAll();
      }
    }
  });
}

export function setupSelectionTracking(fabricCanvas, onSelectionChange) {
  let lastSelectedObject = null;

  fabricCanvas.on("selection:created", (e) => {
    lastSelectedObject = e.selected[0];
    if (onSelectionChange) onSelectionChange(lastSelectedObject);
  });

  fabricCanvas.on("selection:updated", (e) => {
    lastSelectedObject = e.selected[0];
    if (onSelectionChange) onSelectionChange(lastSelectedObject);
  });

  fabricCanvas.on("selection:cleared", () => {
    lastSelectedObject = null;
    if (onSelectionChange) onSelectionChange(null);
  });

  return () => lastSelectedObject;
}

export function setupColorPicker(fabricCanvas) {
  const colorPicker = document.getElementById("shapes-text-color-picker");

  if (!colorPicker) {
    console.error("shapes-text-color-picker element not found");
    return;
  }

  function updateColorPicker(activeObject) {
    if (!activeObject) {
      colorPicker.value = "#FFFFFF";
      return;
    }

    let color = "#FFFFFF";
    if (activeObject.type === "i-text") {
      color = activeObject.fill || color;
    } else if (activeObject.type === "circle") {
      color = activeObject.stroke || activeObject.fill || color;
    } else if (activeObject.type === "rect") {
      color = activeObject.stroke || color;
    } else if (activeObject.type === "line") {
      color = activeObject.stroke || color;
    } else if (activeObject.type === "arrow") {
      const line = activeObject.getObjects().find((obj) => obj.type === "line");
      color = line ? line.stroke : color;
    } else if (activeObject.type === "group") {
      const line = activeObject.getObjects().find((obj) => obj.type === "line");
      const text = activeObject.getObjects().find((obj) => obj.type === "i-text");
      color = line ? line.stroke : text ? text.fill : color;
    }

    if (color && /^#[0-9A-F]{6}$/i.test(color)) {
      colorPicker.value = color;
    } else {
      colorPicker.value = "#FFFFFF";
    }
  }

  setupSelectionTracking(fabricCanvas, updateColorPicker);

  colorPicker.addEventListener("input", (e) => {
    e.stopPropagation();
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      if (activeObject.type === "i-text") {
        activeObject.set({ fill: colorPicker.value });
      } else if (activeObject.type === "circle") {
        activeObject.set({ stroke: colorPicker.value, fill: colorPicker.value });
      } else if (activeObject.type === "rect") {
        activeObject.set({ stroke: colorPicker.value, fill: `rgba(${hexToRgb(colorPicker.value)}, 0.3)` });
      } else if (activeObject.type === "line") {
        activeObject.set({ stroke: colorPicker.value });
      } else if (activeObject.type === "arrow") {
        activeObject.getObjects().forEach((obj) => {
          if (obj.type === "line" || obj.type === "triangle") {
            obj.set({ stroke: colorPicker.value, fill: colorPicker.value });
          }
        });
      } else if (activeObject.type === "group") {
        activeObject.getObjects().forEach((obj) => {
          if (obj.type === "line") {
            obj.set({ stroke: colorPicker.value });
          } else if (obj.type === "i-text") {
            obj.set({ fill: colorPicker.value });
          }
        });
      }
      fabricCanvas.requestRenderAll();
    }
  });

  colorPicker.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
