import { closeSubSidebar, setDrawingModeCursors, handleObjectDeletion, setupSelectionTracking, stopCurrentDrawingMode, registerDrawingMode, toggleDrawingModePopup } from "./drawing-utils.js";

export function initLine(fabricCanvas) {
  const addLineButton = document.getElementById("add-line-btn");
  const subSidebar = document.getElementById("sub-sidebar");
  let startPoint = null;
  let tempLine = null;

  setupSelectionTracking(fabricCanvas);

  addLineButton.addEventListener("click", activateLineDrawing);

  function activateLineDrawing() {
    closeSubSidebar(subSidebar);
    registerDrawingMode(fabricCanvas, "line", stopDrawing);
    toggleDrawingModePopup(true);
    setDrawingModeCursors(fabricCanvas, true);
    fabricCanvas.on("mouse:down", handleLineMouseDown);
    fabricCanvas.on("mouse:move", handleLineMouseMove);
  }

  function handleLineMouseDown(o) {
    o.e.preventDefault();
    o.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(o.e);

    if (!startPoint) {
      startPoint = { x: pointer.x, y: pointer.y };
    } else {
      if (tempLine) {
        fabricCanvas.remove(tempLine);
        tempLine = null;
      }

      const line = new fabric.Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
        stroke: "green",
        strokeWidth: 2,
        selectable: true,
        evented: true,
        hasControls: false,
        lockMovementX: false,
        lockMovementY: false,
        hoverCursor: "move",
        borderColor: "#FE8800",
        borderScaleFactor: 2,
        cornerSize: 8,
        cornerColor: "#FE8800",
        cornerStrokeColor: "#000000",
        cornerStyle: "circle",
        transparentCorners: false,
        targetFindTolerance: 10,
        padding: 10,
      });

      fabricCanvas.add(line);
      fabricCanvas.setActiveObject(line);
      fabricCanvas.requestRenderAll();

      startPoint = null;
      stopCurrentDrawingMode(fabricCanvas); // Exit mode and hide popup
    }
  }

  function handleLineMouseMove(o) {
    if (!startPoint) return;

    const pointer = fabricCanvas.getPointer(o.e);

    if (tempLine) {
      fabricCanvas.remove(tempLine);
    }

    tempLine = new fabric.Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
      stroke: "green",
      strokeWidth: 3,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
    });

    fabricCanvas.add(tempLine);
    fabricCanvas.requestRenderAll();
  }

  function stopDrawing() {
    if (tempLine) {
      fabricCanvas.remove(tempLine);
      tempLine = null;
    }
    setDrawingModeCursors(fabricCanvas, false);
    fabricCanvas.off("mouse:down", handleLineMouseDown);
    fabricCanvas.off("mouse:move", handleLineMouseMove);
    fabricCanvas.requestRenderAll();
  }

  handleObjectDeletion(fabricCanvas, [], (obj) => obj.type === "line");
}
