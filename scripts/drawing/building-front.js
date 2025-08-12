import { closeSidebar, startTool, stopCurrentTool, setupDeletion } from "./drawing-utils.js";

// Sets up the building front tool
export function setupBuildingFrontTool(fabricCanvas) {
  const buildingFrontBtn = document.getElementById("add-buildingfront-btn");

  let startPoint = null;
  let tempLine = null;

  // Enable deletion of building front groups
  setupDeletion(fabricCanvas, (obj) => obj.type === "group" && obj._objects?.some((subObj) => subObj.type === "triangle"));

  // Activate tool on button click
  buildingFrontBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(fabricCanvas, "building-front", handleClick, handleMove);
  });

  // Handle click to place start or end point
  function handleClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(e.e);

    if (!startPoint) {
      startPoint = { x: pointer.x, y: pointer.y };
    } else {
      if (tempLine) fabricCanvas.remove(tempLine);

      // Calculate arrow direction
      const dx = pointer.x - startPoint.x;
      const dy = pointer.y - startPoint.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

      // Create arrow triangle
      const arrow = new fabric.Triangle({
        left: pointer.x,
        top: pointer.y,
        width: 30,
        height: 50,
        fill: "grey",
        originX: "center",
        originY: "center",
        angle: angle,
        selectable: false,
        evented: false,
      });

      // Create "Front" text
      const textOffset = 60;
      const textX = pointer.x + textOffset * Math.cos((angle - 90) * (Math.PI / 180));
      const textY = pointer.y + textOffset * Math.sin((angle - 90) * (Math.PI / 180));

      const text = new fabric.Text("Front", {
        left: textX,
        top: textY,
        fontSize: 18,
        fill: "black",
        originX: "center",
        originY: "center",
        angle: 0,
        selectable: false,
        evented: false,
      });

      // Group arrow and text
      const group = new fabric.Group([arrow, text], {
        left: pointer.x,
        top: pointer.y,
        hasControls: true,
        borderColor: "#f8794b",
        cornerColor: "#f8794b",
      });

      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);

      startPoint = null;
      tempLine = null;
      stopCurrentTool();
    }
  }

  // Handle mouse movement to preview line
  function handleMove(e) {
    if (!startPoint) return;

    const pointer = fabricCanvas.getPointer(e.e);

    if (tempLine) fabricCanvas.remove(tempLine);

    tempLine = new fabric.Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
      stroke: "grey",
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
    });

    fabricCanvas.add(tempLine);
    fabricCanvas.requestRenderAll();
  }
}
