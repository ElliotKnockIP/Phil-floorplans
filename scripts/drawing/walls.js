import { closeSubSidebar, toggleDrawingModePopup, setDrawingModeCursors, handleObjectDeletion, stopCurrentDrawingMode, registerDrawingMode, resetDrawingState } from "./drawing-utils.js";

export function initAddWalls(fabricCanvas) {
  const addLineButton = document.getElementById("add-wall-btn");
  const subSidebar = document.getElementById("sub-sidebar");
  let isAddingLine = false;
  let currentLine = null;
  let lastPoint = null;
  let pointCircle = null;
  const lineSegments = [];
  const tempSegments = [];
  const tempCircles = [];

  fabricCanvas.on("object:added", (e) => {
    fabricCanvas.getObjects("circle").forEach((circle) => circle.bringToFront());
    fabricCanvas.requestRenderAll();
  });

  function updateAllCameraCoverage() {
    fabricCanvas.getObjects("group").forEach((obj) => {
      if (obj.coverageConfig && obj.createOrUpdateCoverageArea) {
        obj.createOrUpdateCoverageArea();
      }
    });
  }

  addLineButton.addEventListener("click", activateAddingLine);

  function activateAddingLine() {
    if (isAddingLine) return;
    isAddingLine = true;

    toggleDrawingModePopup(true);
    closeSubSidebar(subSidebar);
    registerDrawingMode(fabricCanvas, "walls", stopDrawing, resetDrawing, handleKeyDown);
    setDrawingModeCursors(fabricCanvas, true, false);
    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:move", handleMouseMove);
    fabricCanvas.requestRenderAll();
  }

  function handleMouseDown(o) {
    o.e.preventDefault();
    o.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(o.e);

    const newCircle = new fabric.Circle({
      left: pointer.x,
      top: pointer.y,
      radius: 3,
      fill: "black",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: true,
      hasControls: false,
      // Add a custom property to identify wall circles
      isWallCircle: true,
    });

    newCircle.on("moving", () => {
      const circleCenter = newCircle.getCenterPoint();
      lineSegments.forEach((segment) => {
        if (segment.startCircle === newCircle) {
          segment.line.set({ x1: circleCenter.x, y1: circleCenter.y });
          segment.line.setCoords();
        }
        if (segment.endCircle === newCircle) {
          segment.line.set({ x2: circleCenter.x, y2: circleCenter.y });
          segment.line.setCoords();
        }
      });
      tempSegments.forEach((segment) => {
        if (segment.startCircle === newCircle) {
          segment.line.set({ x1: circleCenter.x, y1: circleCenter.y });
          segment.line.setCoords();
        }
        if (segment.endCircle === newCircle) {
          segment.line.set({ x2: circleCenter.x, y2: circleCenter.y });
          segment.line.setCoords();
        }
      });
      fabricCanvas.requestRenderAll();
    });

    fabricCanvas.add(newCircle);
    tempCircles.push(newCircle);
    newCircle.bringToFront();

    if (!lastPoint) {
      lastPoint = { x: pointer.x, y: pointer.y };
      pointCircle = newCircle;
      fabricCanvas.requestRenderAll();
    } else {
      if (currentLine) {
        fabricCanvas.remove(currentLine);
        currentLine = null;
      }

      const newLine = new fabric.Line([lastPoint.x, lastPoint.y, pointer.x, pointer.y], {
        stroke: "red",
        strokeWidth: 2,
        selectable: true,
        evented: true,
        hasControls: false,
        hasBorders: true,
        lockMovementX: true,
        lockMovementY: true,
        perPixelTargetFind: true,
        borderColor: "#FE8800",
      });

      fabricCanvas.add(newLine);
      tempSegments.push({
        line: newLine,
        startCircle: pointCircle,
        endCircle: newCircle,
      });

      lastPoint = { x: pointer.x, y: pointer.y };
      pointCircle = newCircle;
      fabricCanvas.requestRenderAll();
    }
  }

  function handleMouseMove(o) {
    if (!lastPoint) return;

    const pointer = fabricCanvas.getPointer(o.e);

    if (!currentLine) {
      currentLine = new fabric.Line([lastPoint.x, lastPoint.y, pointer.x, pointer.y], {
        stroke: "red",
        strokeWidth: 3,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        perPixelTargetFind: true,
      });
      fabricCanvas.add(currentLine);
    } else {
      currentLine.set({ x2: pointer.x, y2: pointer.y });
    }

    fabricCanvas.requestRenderAll();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && isAddingLine && tempSegments.length > 0) {
      if (currentLine) {
        fabricCanvas.remove(currentLine);
        currentLine = null;
      }
      tempSegments.forEach((segment) => {
        lineSegments.push(segment);
      });
      tempSegments.length = 0;
      tempCircles.forEach((circle) => {
        circle.set({ selectable: true, hoverCursor: "pointer" });
      });
      tempCircles.length = 0;
      pointCircle = null;
      lastPoint = null;

      updateAllCameraCoverage();
      resetDrawingState(fabricCanvas);
      return true;
    }
    return false;
  }

  function resetDrawing() {
    lastPoint = null;
    pointCircle = null;
    if (currentLine) {
      fabricCanvas.remove(currentLine);
      currentLine = null;
    }
    tempSegments.forEach((segment) => {
      fabricCanvas.remove(segment.line);
    });
    tempCircles.forEach((circle) => {
      fabricCanvas.remove(circle);
    });
    tempSegments.length = 0;
    tempCircles.length = 0;
  }

  function stopDrawing() {
    isAddingLine = false;
    resetDrawing();
    fabricCanvas.off("mouse:down", handleMouseDown);
    fabricCanvas.off("mouse:move", handleMouseMove);
    updateAllCameraCoverage(); // Update camera coverage after stopping
  }

  // Modified to exclude wall circles from deletion
  handleObjectDeletion(fabricCanvas, lineSegments, (obj) => {
    // Only allow deletion of lines, not wall circles
    return obj.type === "line" && !obj.isWallCircle;
  });
}
