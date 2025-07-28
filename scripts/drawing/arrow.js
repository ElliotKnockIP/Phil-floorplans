import { closeSubSidebar, setDrawingModeCursors, handleObjectDeletion, stopCurrentDrawingMode, registerDrawingMode, toggleDrawingModePopup } from "./drawing-utils.js";

export function initArrow(fabricCanvas) {
  const addArrowButton = document.getElementById("add-arrow-btn");
  const subSidebar = document.getElementById("sub-sidebar");
  let startPoint = null;
  let tempArrowGroup = null;

  addArrowButton.addEventListener("click", activateArrowDrawing);

  function activateArrowDrawing() {
    closeSubSidebar(subSidebar);
    registerDrawingMode(fabricCanvas, "arrow", stopDrawing);
    toggleDrawingModePopup(true);
    setDrawingModeCursors(fabricCanvas, true);
    fabricCanvas.on("mouse:down", handleArrowMouseDown);
    fabricCanvas.on("mouse:move", handleArrowMouseMove);
    fabricCanvas.requestRenderAll();
  }

  function handleArrowMouseDown(o) {
    o.e.preventDefault();
    o.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(o.e);

    if (!startPoint) {
      startPoint = { x: pointer.x, y: pointer.y };
    } else {
      if (tempArrowGroup) {
        fabricCanvas.remove(tempArrowGroup);
        tempArrowGroup = null;
      }

      const arrow = createArrow(startPoint, pointer);
      fabricCanvas.add(arrow);
      fabricCanvas.setActiveObject(arrow);
      fabricCanvas.requestRenderAll();

      startPoint = null;
      stopCurrentDrawingMode(fabricCanvas); // Exit mode and hide popup
    }
  }

  function handleArrowMouseMove(o) {
    if (!startPoint) return;

    const pointer = fabricCanvas.getPointer(o.e);

    if (tempArrowGroup) {
      fabricCanvas.remove(tempArrowGroup);
    }

    tempArrowGroup = createArrow(startPoint, pointer, true);
    fabricCanvas.add(tempArrowGroup);
    fabricCanvas.requestRenderAll();
  }

  function createArrow(start, end, isPreview = false) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);

    const line = new fabric.Line([start.x, start.y, end.x, end.y], {
      stroke: isPreview ? "blue" : "blue",
      strokeWidth: isPreview ? 3 : 2,
      strokeDashArray: isPreview ? [5, 5] : null,
      selectable: !isPreview,
      evented: !isPreview,
      hasControls: false,
      hasBorders: false,
      perPixelTargetFind: true,
    });

    const arrowHeadSize = 10;
    const arrowHead = new fabric.Triangle({
      left: end.x,
      top: end.y,
      originX: "center",
      originY: "center",
      width: arrowHeadSize,
      height: arrowHeadSize,
      fill: isPreview ? "blue" : "blue",
      angle: (angle * 180) / Math.PI + 90,
      selectable: false,
      evented: false,
    });

    const arrowGroup = new fabric.Group([line, arrowHead], {
      selectable: !isPreview,
      evented: !isPreview,
      hasControls: false,
      lockMovementX: false,
      lockMovementY: false,
      hoverCursor: isPreview ? "crosshair" : "move",
      perPixelTargetFind: true,
      borderColor: "#FE8800",
      borderScaleFactor: 2,
      cornerSize: 8,
      cornerColor: "#FE8800",
      cornerStrokeColor: "#000000",
      cornerStyle: "circle",
      transparentCorners: false,
      targetFindTolerance: 10,
      padding: 10,
      type: "arrow",
    });

    return arrowGroup;
  }

  function stopDrawing() {
    startPoint = null;
    if (tempArrowGroup) {
      fabricCanvas.remove(tempArrowGroup);
      tempArrowGroup = null;
    }
    setDrawingModeCursors(fabricCanvas, false);
    fabricCanvas.off("mouse:down", handleArrowMouseDown);
    fabricCanvas.off("mouse:move", handleArrowMouseMove);
    fabricCanvas.requestRenderAll();
  }

  handleObjectDeletion(fabricCanvas, [], (obj) => obj.type === "arrow");
}
