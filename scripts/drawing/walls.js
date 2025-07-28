// Simplified walls.js
import { closeSidebar, showDrawingPopup, hideDrawingPopup, setCrosshairCursor, setDefaultCursor } from "./drawing-utils.js";

export function setupWallTool(fabricCanvas) {
  const addLineButton = document.getElementById("add-wall-btn");
  let isAddingLine = false;
  let currentLine = null;
  let lastPoint = null;
  let pointCircle = null;
  const lineSegments = [];
  const tempSegments = [];
  const tempCircles = [];

  fabricCanvas.on("object:added", () => {
    fabricCanvas.getObjects("circle").forEach((circle) => circle.bringToFront());
    fabricCanvas.requestRenderAll();
  });

  addLineButton.addEventListener("click", () => {
    if (isAddingLine) return;
    isAddingLine = true;
    showDrawingPopup();
    closeSidebar();
    setCrosshairCursor(fabricCanvas, false);
    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:move", handleMouseMove);
    fabricCanvas.requestRenderAll();
  });

  function updateConnectedLines(circle) {
    const center = circle.getCenterPoint();
    [...lineSegments, ...tempSegments].forEach((segment) => {
      if (segment.startCircle === circle) {
        segment.line.set({ x1: center.x, y1: center.y });
        segment.line.setCoords();
      }
      if (segment.endCircle === circle) {
        segment.line.set({ x2: center.x, y2: center.y });
        segment.line.setCoords();
      }
    });
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
      isWallCircle: true,
      borderColor: "#FE8800",
    });

    newCircle.on("moving", () => updateConnectedLines(newCircle));
    fabricCanvas.add(newCircle);
    tempCircles.push(newCircle);
    newCircle.bringToFront();

    if (!lastPoint) {
      lastPoint = { x: pointer.x, y: pointer.y };
      pointCircle = newCircle;
    } else {
      if (currentLine) fabricCanvas.remove(currentLine);
      currentLine = null;

      const newLine = new fabric.Line([lastPoint.x, lastPoint.y, pointer.x, pointer.y], {
        stroke: "red",
        strokeWidth: 2,
        selectable: false,
        evented: true,
        hasControls: false,
        hasBorders: true,
        lockMovementX: true,
        lockMovementY: true,
        perPixelTargetFind: true,
        borderColor: "#FE8800",
      });

      fabricCanvas.add(newLine);
      tempSegments.push({ line: newLine, startCircle: pointCircle, endCircle: newCircle });
      lastPoint = { x: pointer.x, y: pointer.y };
      pointCircle = newCircle;
    }
    fabricCanvas.requestRenderAll();
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

  function stopDrawing() {
    isAddingLine = false;
    lastPoint = null;
    pointCircle = null;
    if (currentLine) fabricCanvas.remove(currentLine);
    currentLine = null;

    tempSegments.forEach((segment) => fabricCanvas.remove(segment.line));
    tempCircles.forEach((circle) => fabricCanvas.remove(circle));
    tempSegments.length = 0;
    tempCircles.length = 0;

    fabricCanvas.off("mouse:down", handleMouseDown);
    fabricCanvas.off("mouse:move", handleMouseMove);
    fabricCanvas.getObjects("group").forEach((obj) => {
      if (obj.coverageConfig && obj.createOrUpdateCoverageArea) {
        obj.createOrUpdateCoverageArea();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (isAddingLine) {
      if (e.key === "Enter" && tempSegments.length > 0) {
        if (currentLine) fabricCanvas.remove(currentLine);
        currentLine = null;
        tempSegments.forEach((segment) => lineSegments.push(segment));
        tempSegments.length = 0;
        tempCircles.forEach((circle) => circle.set({ selectable: true, hoverCursor: "pointer" }));
        tempCircles.length = 0;
        pointCircle = null;
        lastPoint = null;
        fabricCanvas.getObjects("group").forEach((obj) => {
          if (obj.coverageConfig && obj.createOrUpdateCoverageArea) {
            obj.createOrUpdateCoverageArea();
          }
        });
        showDrawingPopup();
        fabricCanvas.requestRenderAll();
      } else if (e.key === "Escape") {
        hideDrawingPopup();
        setDefaultCursor(fabricCanvas);
        stopDrawing();
      }
    } else if (e.key === "Delete" || e.key === "Backspace") {
      const activeObject = fabricCanvas.getActiveObject();
      if (activeObject && (activeObject.type === "i-text" || activeObject.type === "textbox") && activeObject.isEditing) return;
      if (fabricCanvas.getObjects().some((obj) => (obj.type === "i-text" || obj.type === "textbox") && obj.isEditing)) return;
      if (activeObject && activeObject.type === "circle" && activeObject.isWallCircle) return;

      if (activeObject && activeObject.type === "line" && !activeObject.isWallCircle) {
        fabricCanvas.remove(activeObject);
        const segmentIndex = lineSegments.findIndex((seg) => seg.line === activeObject);
        if (segmentIndex !== -1) {
          const segment = lineSegments[segmentIndex];
          lineSegments.splice(segmentIndex, 1);

          [segment.startCircle, segment.endCircle].forEach((circle) => {
            if (circle && !lineSegments.some((seg) => seg.startCircle === circle || seg.endCircle === circle)) {
              fabricCanvas.remove(circle);
            }
          });
        }
        fabricCanvas.discardActiveObject();
        fabricCanvas.requestRenderAll();
      }
    }
  });
}
