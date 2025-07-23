import { closeSubSidebar, setDrawingModeCursors, handleObjectDeletion, stopCurrentDrawingMode, registerDrawingMode, toggleDrawingModePopup } from "./drawing-utils.js";

export function initMeasurement(fabricCanvas) {
  const measureButton = document.getElementById("measure-btn");
  const subSidebar = document.getElementById("sub-sidebar");

  measureButton.addEventListener("click", activateMeasurementDrawing);

  function activateMeasurementDrawing() {
    closeSubSidebar(subSidebar);
    registerDrawingMode(fabricCanvas, "measurement", stopDrawing);
    toggleDrawingModePopup(true);
    setDrawingModeCursors(fabricCanvas, true);
    fabricCanvas.skipTargetFind = true;
    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:move", handleMouseMove);
  }

  let startPoint = null;
  let tempLine = null;
  let tempText = null;
  const measureSegments = [];

  function handleMouseDown(o) {
    o.e.preventDefault();
    o.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(o.e);

    if (!startPoint) {
      startPoint = { x: pointer.x, y: pointer.y };
    } else {
      if (tempLine) fabricCanvas.remove(tempLine);
      if (tempText) fabricCanvas.remove(tempText);

      const endPoint = { x: pointer.x, y: pointer.y };
      const line = new fabric.Line([startPoint.x, startPoint.y, endPoint.x, endPoint.y], {
        stroke: "purple",
        strokeWidth: 3,
        selectable: true,
        evented: true,
      });

      const pixelDistance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
      const meters = (pixelDistance / (fabricCanvas.pixelsPerMeter || 17.5)).toFixed(2);
      const midX = (startPoint.x + endPoint.x) / 2;
      const midY = (startPoint.y + endPoint.y) / 2;

      const distanceText = new fabric.IText(`${meters} m`, {
        left: midX,
        top: midY - 20,
        fontFamily: "Poppins, sans-serif",
        fontSize: 16,
        fill: "#000000",
        selectable: false,
        evented: false,
        originX: "center",
        originY: "center",
      });

      const group = new fabric.Group([line, distanceText], {
        selectable: true,
        hasControls: false,
        borderColor: "#FE8800",
      });

      measureSegments.push(group);
      fabricCanvas.add(group);
      startPoint = null;
      stopCurrentDrawingMode(fabricCanvas); // Exit mode and hide popup
    }
  }

  function handleMouseMove(o) {
    if (!startPoint) return;

    const pointer = fabricCanvas.getPointer(o.e);

    if (tempLine) fabricCanvas.remove(tempLine);
    if (tempText) fabricCanvas.remove(tempText);

    tempLine = new fabric.Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
      stroke: "purple",
      strokeWidth: 3,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
    });

    const pixelDistance = Math.hypot(pointer.x - startPoint.x, pointer.y - startPoint.y);
    const meters = (pixelDistance / (fabricCanvas.pixelsPerMeter || 17.5)).toFixed(2);
    const midX = (startPoint.x + pointer.x) / 2;
    const midY = (startPoint.y + pointer.y) / 2;

    tempText = new fabric.IText(`${meters} m`, {
      left: midX,
      top: midY - 20,
      fontFamily: "Poppins, sans-serif",
      fontSize: 16,
      fill: "#000000",
      selectable: false,
      evented: false,
      originX: "center",
      originY: "center",
    });

    fabricCanvas.add(tempLine, tempText);
    fabricCanvas.requestRenderAll();
  }

  function stopDrawing() {
    if (tempLine) fabricCanvas.remove(tempLine);
    if (tempText) fabricCanvas.remove(tempText);
    tempLine = null;
    tempText = null;
    fabricCanvas.skipTargetFind = false;
    setDrawingModeCursors(fabricCanvas, false);
    fabricCanvas.off("mouse:down", handleMouseDown);
    fabricCanvas.off("mouse:move", handleMouseMove);
    fabricCanvas.requestRenderAll();
  }

  handleObjectDeletion(fabricCanvas, measureSegments);
}
