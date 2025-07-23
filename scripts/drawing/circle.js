import { closeSubSidebar, setDrawingModeCursors, handleObjectDeletion, stopCurrentDrawingMode, registerDrawingMode, toggleDrawingModePopup } from "./drawing-utils.js";

export function initCircle(fabricCanvas) {
  const addCircleButton = document.getElementById("add-circle-btn");
  const subSidebar = document.getElementById("sub-sidebar");

  addCircleButton.addEventListener("click", activateCircleDrawing);

  function activateCircleDrawing() {
    closeSubSidebar(subSidebar);
    registerDrawingMode(fabricCanvas, "circle", stopDrawing);
    toggleDrawingModePopup(true);
    setDrawingModeCursors(fabricCanvas, true);
    fabricCanvas.on("mouse:down", handleCircleMouseDown);
  }

  function handleCircleMouseDown(o) {
    o.e.preventDefault();
    o.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(o.e);
    const circle = new fabric.Circle({
      left: pointer.x,
      top: pointer.y,
      radius: 50,
      fill: "rgba(255, 0, 0, 0.3)",
      stroke: "red",
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
      originX: "center",
      originY: "center",
      strokeUniform: true,
    });

    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    stopCurrentDrawingMode(fabricCanvas); // Exit mode and hide popup
  }

  function stopDrawing() {
    setDrawingModeCursors(fabricCanvas, false);
    fabricCanvas.off("mouse:down", handleCircleMouseDown);
    fabricCanvas.requestRenderAll();
  }

  handleObjectDeletion(fabricCanvas, [], (obj) => obj.type === "circle");
}
