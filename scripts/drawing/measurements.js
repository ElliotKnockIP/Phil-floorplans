// Import utility functions for drawing operations
import { closeSidebar, startTool, stopCurrentTool, setupDeletion } from "./drawing-utils.js";

// Sets up distance and apex measurement tools
export function setupMeasurementTools(fabricCanvas) {
  const measureBtn = document.getElementById("measure-btn");
  const apexBtn = document.getElementById("apex-btn");

  let startPoint = null;
  let tempLine = null;
  let tempText = null;

  // Enable deletion of measurement groups
  setupDeletion(fabricCanvas, (obj) => obj.type === "group" && obj._objects);

  // Activate distance measurement tool
  measureBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(fabricCanvas, "measure", handleMeasureClick, handleMeasureMove);
  });

  // Activate apex measurement tool
  apexBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(fabricCanvas, "apex", handleApexClick, handleApexMove);
  });

  // Handle distance measurement click
  function handleMeasureClick(e) {
    measureClick(e, "purple", "m");
  }

  // Handle apex measurement click
  function handleApexClick(e) {
    measureClick(e, "pink", "Apex:");
  }

  // Handle distance measurement movement
  function handleMeasureMove(e) {
    measureMove(e, "purple", "m");
  }

  // Handle apex measurement movement
  function handleApexMove(e) {
    measureMove(e, "pink", "Apex:");
  }

  // Create measurement on click
  function measureClick(e, color, prefix) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(e.e);

    if (!startPoint) {
      startPoint = { x: pointer.x, y: pointer.y };
    } else {
      if (tempLine) fabricCanvas.remove(tempLine);
      if (tempText) fabricCanvas.remove(tempText);

      const distance = Math.hypot(pointer.x - startPoint.x, pointer.y - startPoint.y);
      const meters = (distance / (fabricCanvas.pixelsPerMeter || 17.5)).toFixed(2);
      const midX = (startPoint.x + pointer.x) / 2;
      const midY = (startPoint.y + pointer.y) / 2;

      const line = new fabric.Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
        stroke: color,
        strokeWidth: 3,
      });

      const text = new fabric.IText(`${prefix === "m" ? "" : prefix + " "}${meters} m`, {
        left: midX,
        top: midY - 20,
        fontSize: 16,
        fill: "#000000",
        fontFamily: "Poppins, sans-serif",
        originX: "center",
        originY: "center",
        selectable: false,
        evented: false,
      });

      const group = new fabric.Group([line, text], {
        selectable: true,
        hasControls: false,
        borderColor: "#f8794b",
      });

      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);

      startPoint = null;
      tempLine = null;
      tempText = null;
      stopCurrentTool();
    }
  }

  // Preview measurement during movement
  function measureMove(e, color, prefix) {
    if (!startPoint) return;

    const pointer = fabricCanvas.getPointer(e.e);

    if (tempLine) fabricCanvas.remove(tempLine);
    if (tempText) fabricCanvas.remove(tempText);

    const distance = Math.hypot(pointer.x - startPoint.x, pointer.y - startPoint.y);
    const meters = (distance / (fabricCanvas.pixelsPerMeter || 17.5)).toFixed(2);
    const midX = (startPoint.x + pointer.x) / 2;
    const midY = (startPoint.y + pointer.y) / 2;

    tempLine = new fabric.Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
      stroke: color,
      strokeWidth: 3,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
    });

    tempText = new fabric.IText(`${prefix === "m" ? "" : prefix + " "}${meters} m`, {
      left: midX,
      top: midY - 20,
      fontSize: 16,
      fill: "#000000",
      fontFamily: "Poppins, sans-serif",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });

    fabricCanvas.add(tempLine);
    fabricCanvas.add(tempText);
    fabricCanvas.requestRenderAll();
  }
}
