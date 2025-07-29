// Simplified building-front.js
import { closeSidebar, startTool, stopCurrentTool, setupDeletion } from "./drawing-utils.js";

export function setupBuildingFrontTool(canvas) {
  const button = document.getElementById("add-buildingfront-btn");

  let startPoint = null;
  let tempLine = null;

  setupDeletion(canvas, (obj) => obj.type === "group" && obj._objects?.some((subObj) => subObj.type === "triangle"));

  button.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "building-front", handleClick, handleMove);
  });

  function handleClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = canvas.getPointer(e.e);

    if (!startPoint) {
      startPoint = { x: pointer.x, y: pointer.y };
    } else {
      if (tempLine) canvas.remove(tempLine);

      // Calculate arrow direction
      const dx = pointer.x - startPoint.x;
      const dy = pointer.y - startPoint.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;

      // Create arrow (triangle)
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

      // Create text
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
        borderColor: "#FE8800",
        cornerColor: "#FE8800",
      });

      canvas.add(group);
      canvas.setActiveObject(group);

      startPoint = null;
      tempLine = null;
      stopCurrentTool();
    }
  }

  function handleMove(e) {
    if (!startPoint) return;

    const pointer = canvas.getPointer(e.e);

    if (tempLine) canvas.remove(tempLine);

    tempLine = new fabric.Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
      stroke: "grey",
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
    });

    canvas.add(tempLine);
    canvas.requestRenderAll();
  }
}
