import { closeSidebar, startTool, stopCurrentTool, setupDeletion } from "./drawing-utils.js";

// Sets up circle and square drawing tools
export function setupShapeTools(fabricCanvas) {
  const circleBtn = document.getElementById("add-circle-btn");
  const squareBtn = document.getElementById("add-square-btn");

  // Enable deletion of shapes
  setupDeletion(fabricCanvas, (obj) => obj.type === "circle" || obj.type === "rect");

  // Activate circle tool
  circleBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(fabricCanvas, "circle", handleCircleClick);
  });

  // Activate square tool
  squareBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(fabricCanvas, "square", handleSquareClick);
  });

  // Handle click to place circle
  function handleCircleClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(e.e);
    const circle = new fabric.Circle({
      left: pointer.x,
      top: pointer.y,
      radius: 50,
      fill: "rgba(255, 0, 0, 0.3)",
      stroke: "red",
      strokeWidth: 1,
      originX: "center",
      originY: "center",
      borderColor: "#f8794b",
      cornerColor: "#f8794b",
      strokeUniform: true,
    });

    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    stopCurrentTool();
  }

  // Handle click to place square
  function handleSquareClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(e.e);
    const square = new fabric.Rect({
      left: pointer.x - 50,
      top: pointer.y - 50,
      width: 100,
      height: 100,
      fill: "rgba(0, 0, 255, 0.3)",
      stroke: "blue",
      strokeWidth: 1,
      borderColor: "#f8794b",
      cornerColor: "#f8794b",
      strokeUniform: true,
    });

    fabricCanvas.add(square);
    fabricCanvas.setActiveObject(square);
    stopCurrentTool();
  }
}
