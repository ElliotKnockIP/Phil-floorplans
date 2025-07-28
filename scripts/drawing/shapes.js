// Simplified shapes.js (combines circle.js and square.js)
import { closeSidebar, startTool, stopCurrentTool, setupDeletion } from "./drawing-utils.js";

export function setupShapeTools(canvas) {
  const circleBtn = document.getElementById("add-circle-btn");
  const squareBtn = document.getElementById("add-square-btn");

  setupDeletion(canvas, (obj) => obj.type === "circle" || obj.type === "rect");

  // Circle tool
  circleBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "circle", handleCircleClick);
  });

  // Square tool
  squareBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "square", handleSquareClick);
  });

  function handleCircleClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = canvas.getPointer(e.e);
    const circle = new fabric.Circle({
      left: pointer.x,
      top: pointer.y,
      radius: 50,
      fill: "rgba(255, 0, 0, 0.3)",
      stroke: "red",
      strokeWidth: 1,
      originX: "center",
      originY: "center",
      borderColor: "#FE8800",
      cornerColor: "#FE8800",
      strokeUniform: true,
    });

    canvas.add(circle);
    canvas.setActiveObject(circle);
    stopCurrentTool();
  }

  function handleSquareClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = canvas.getPointer(e.e);
    const square = new fabric.Rect({
      left: pointer.x - 50,
      top: pointer.y - 50,
      width: 100,
      height: 100,
      fill: "rgba(0, 0, 255, 0.3)",
      stroke: "blue",
      strokeWidth: 1,
      borderColor: "#FE8800",
      cornerColor: "#FE8800",
      strokeUniform: true,
    });

    canvas.add(square);
    canvas.setActiveObject(square);
    stopCurrentTool();
  }
}
