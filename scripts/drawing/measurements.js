// Simplified measurements.js (combines measurement.js and apex.js)
import { closeSidebar, startTool, stopCurrentTool, setupDeletion } from "./drawing-utils.js";

export function setupMeasurementTools(canvas) {
  const measureBtn = document.getElementById("measure-btn");
  const apexBtn = document.getElementById("apex-btn");

  let startPoint = null;
  let tempLine = null;
  let tempText = null;

  setupDeletion(canvas, (obj) => obj.type === "group" && obj._objects);

  // Distance measurement
  measureBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "measure", handleMeasureClick, handleMeasureMove);
  });

  // Apex measurement
  apexBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "apex", handleApexClick, handleApexMove);
  });

  function handleMeasureClick(e) {
    measureClick(e, "purple", "m");
  }

  function handleApexClick(e) {
    measureClick(e, "pink", "Apex:");
  }

  function handleMeasureMove(e) {
    measureMove(e, "purple", "m");
  }

  function handleApexMove(e) {
    measureMove(e, "pink", "Apex:");
  }

  function measureClick(e, color, prefix) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = canvas.getPointer(e.e);

    if (!startPoint) {
      startPoint = { x: pointer.x, y: pointer.y };
    } else {
      // Remove temp objects
      if (tempLine) canvas.remove(tempLine);
      if (tempText) canvas.remove(tempText);

      // Create final measurement
      const distance = Math.hypot(pointer.x - startPoint.x, pointer.y - startPoint.y);
      const meters = (distance / (canvas.pixelsPerMeter || 17.5)).toFixed(2);
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
        borderColor: "#FE8800",
      });

      canvas.add(group);
      canvas.setActiveObject(group);

      // Reset
      startPoint = null;
      tempLine = null;
      tempText = null;
      stopCurrentTool();
    }
  }

  function measureMove(e, color, prefix) {
    if (!startPoint) return;

    const pointer = canvas.getPointer(e.e);

    // Remove previous temp objects
    if (tempLine) canvas.remove(tempLine);
    if (tempText) canvas.remove(tempText);

    // Create new temp objects
    const distance = Math.hypot(pointer.x - startPoint.x, pointer.y - startPoint.y);
    const meters = (distance / (canvas.pixelsPerMeter || 17.5)).toFixed(2);
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

    canvas.add(tempLine);
    canvas.add(tempText);
    canvas.requestRenderAll();
  }
}
