import { closeSubSidebar, setDrawingModeCursors, handleObjectDeletion, setupSelectionTracking, stopCurrentDrawingMode, registerDrawingMode, toggleDrawingModePopup } from "./drawing-utils.js";

export function initBuildingFront(fabricCanvas) {
  const addCompassBtn = document.getElementById("add-buildingfront-btn");
  const subSidebar = document.getElementById("sub-sidebar");
  let startPoint = null;
  let tempLine = null;

  setupSelectionTracking(fabricCanvas);

  addCompassBtn.addEventListener("click", activateArrowDrawing);

  function activateArrowDrawing() {
    closeSubSidebar(subSidebar);
    registerDrawingMode(fabricCanvas, "draw-compass", stopDrawing);
    toggleDrawingModePopup(true);
    setDrawingModeCursors(fabricCanvas, true);
    fabricCanvas.skipTargetFind = true; // Prevent selecting other objects
    fabricCanvas.on("mouse:down", handleMouseDown);
    fabricCanvas.on("mouse:move", handleMouseMove);
  }

  function handleMouseDown(o) {
    o.e.preventDefault();
    o.e.stopPropagation();
    const pointer = fabricCanvas.getPointer(o.e);

    if (!startPoint) {
      // First click: set start point
      startPoint = { x: pointer.x, y: pointer.y };
      fabricCanvas.on("mouse:move", handleMouseMove);
      fabricCanvas.on("mouse:down", handleMouseDown); // Rebind to handle second click
    } else {
      // Second click: create arrow and text
      const endPoint = { x: pointer.x, y: pointer.y };

      // Calculate angle based on drawing direction (from start to end)
      const dx = endPoint.x - startPoint.x;
      const dy = endPoint.y - startPoint.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // Add 90 degrees to align triangle's tip

      // Create arrow shape (triangle) pointing in the direction of the line
      const arrow = new fabric.Triangle({
        left: endPoint.x,
        top: endPoint.y,
        width: 30,
        height: 50,
        fill: "grey",
        originX: "center",
        originY: "center",
        angle: angle, // Arrow points toward the end point
        selectable: false,
        evented: false,
      });

      // Create text label, positioned relative to the arrow, always vertical
      const textOffset = 60;
      const textX = endPoint.x + textOffset * Math.cos((angle - 90) * (Math.PI / 180)); // Adjust for original line angle
      const textY = endPoint.y + textOffset * Math.sin((angle - 90) * (Math.PI / 180));

      const text = new fabric.Text("Front", {
        left: textX,
        top: textY,
        fontSize: 18,
        fill: "black",
        originX: "center",
        originY: "center",
        angle: 0, // Keep text vertical
        selectable: false,
        evented: false,
      });

      // Group arrow and text
      const compassGroup = new fabric.Group([arrow, text], {
        left: endPoint.x,
        top: endPoint.y,
        hasControls: true,
        cornerSize: 8,
        cornerColor: "#FE8800",
        cornerStrokeColor: "#000000",
        borderColor: "#FE8800",
        transparentCorners: false,
        hoverCursor: "move",
      });

      fabricCanvas.add(compassGroup);
      fabricCanvas.setActiveObject(compassGroup);
      fabricCanvas.requestRenderAll();

      // Cleanup
      if (tempLine) {
        fabricCanvas.remove(tempLine);
        tempLine = null;
      }
      startPoint = null;

      stopDrawing();
      stopCurrentDrawingMode(fabricCanvas);
    }
  }

  function handleMouseMove(o) {
    if (!startPoint) return;
    const pointer = fabricCanvas.getPointer(o.e);

    if (tempLine) fabricCanvas.remove(tempLine);

    tempLine = new fabric.Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
      stroke: "red",
      strokeWidth: 2,
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
    fabricCanvas.skipTargetFind = false;
    setDrawingModeCursors(fabricCanvas, false);
    fabricCanvas.off("mouse:down", handleMouseDown);
    fabricCanvas.off("mouse:move", handleMouseMove);
    fabricCanvas.requestRenderAll();
  }

  handleObjectDeletion(fabricCanvas, [], (obj) => obj.type === "group" && obj._objects?.some((subObj) => subObj.type === "triangle"));
}
