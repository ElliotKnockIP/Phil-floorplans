import { closeSubSidebar, setDrawingModeCursors, handleObjectDeletion, stopCurrentDrawingMode, registerDrawingMode, toggleDrawingModePopup } from "./drawing-utils.js";

export function initSquare(fabricCanvas) {
  const addSquareButton = document.getElementById("add-square-btn");
  const subSidebar = document.getElementById("sub-sidebar");

  addSquareButton.addEventListener("click", activateSquareDrawing);

  function activateSquareDrawing() {
    closeSubSidebar(subSidebar);
    registerDrawingMode(fabricCanvas, "square", stopDrawing);
    toggleDrawingModePopup(true);
    setDrawingModeCursors(fabricCanvas, true);
    fabricCanvas.on("mouse:down", handleSquareMouseDown);
  }

  function handleSquareMouseDown(o) {
    o.e.preventDefault();
    o.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(o.e);
    const square = new fabric.Rect({
      left: pointer.x - 50,
      top: pointer.y - 50,
      width: 100,
      height: 100,
      fill: "rgba(0, 0, 255, 0.3)",
      stroke: "blue",
      strokeWidth: 1,
      selectable: true,
      evented: true,
      hoverCursor: "move",
      borderColor: "#FE8800",
      borderScaleFactor: 2,
      cornerSize: 8,
      cornerColor: "#FE8800",
      cornerStrokeColor: "#000000",
      cornerStyle: "circle",
      transparentCorners: false,
      strokeUniform: true,
    });

    fabricCanvas.add(square);
    fabricCanvas.setActiveObject(square);
    stopCurrentDrawingMode(fabricCanvas); // Exit mode and hide popup
  }

  function stopDrawing() {
    setDrawingModeCursors(fabricCanvas, false);
    fabricCanvas.off("mouse:down", handleSquareMouseDown);
    fabricCanvas.requestRenderAll();
  }

  handleObjectDeletion(fabricCanvas, [], (obj) => obj.type === "rect");
}
