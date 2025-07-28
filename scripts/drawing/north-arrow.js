import { closeSubSidebar, setDrawingModeCursors, handleObjectDeletion, setupSelectionTracking, stopCurrentDrawingMode, registerDrawingMode, toggleDrawingModePopup } from "./drawing-utils.js";

export function initNorthArrow(fabricCanvas) {
  const addNorthArrowBtn = document.getElementById("north-arrow-btn");
  const subSidebar = document.getElementById("sub-sidebar");
  let isPlacing = false;

  setupSelectionTracking(fabricCanvas);

  addNorthArrowBtn.addEventListener("click", activateNorthArrowPlacement);

  function activateNorthArrowPlacement() {
    closeSubSidebar(subSidebar);
    registerDrawingMode(fabricCanvas, "north-arrow", stopPlacement);
    toggleDrawingModePopup(true);
    setDrawingModeCursors(fabricCanvas, true);
    isPlacing = true;
    fabricCanvas.on("mouse:down", handlePlacement);
  }

  function handlePlacement(o) {
    if (!isPlacing) return;

    o.e.preventDefault();
    o.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(o.e);

    // Create the north arrow at the clicked position
    const northArrow = createNorthArrow(pointer.x, pointer.y);

    fabricCanvas.add(northArrow);
    fabricCanvas.setActiveObject(northArrow);
    fabricCanvas.requestRenderAll();

    // Exit placement mode
    stopCurrentDrawingMode(fabricCanvas);
  }

  function createNorthArrow(x, y) {
    // Create the "N" text
    const nText = new fabric.Text("N", {
      left: 0,
      top: -40,
      fontSize: 32,
      fill: "black",
      fontFamily: "Arial, sans-serif",
      fontWeight: "bold",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });

    // Create the arrow shape using a path
    // This creates a triangular arrow pointing upward with one half filled black
    const arrowPath = new fabric.Path("M 0,-20 L -15,15 L 0,5 L 15,15 Z", {
      fill: "white",
      stroke: "black",
      strokeWidth: 2,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });

    // Create the black half of the arrow (right side)
    const blackHalf = new fabric.Path("M 0,-20 L 0,5 L 15,15 Z", {
      fill: "black",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });

    // Group all elements together
    const northArrowGroup = new fabric.Group([arrowPath, blackHalf, nText], {
      left: x,
      top: y,
      originX: "center",
      originY: "center",
      hasControls: true,
      cornerSize: 8,
      cornerColor: "#FE8800",
      cornerStrokeColor: "#000000",
      borderColor: "#FE8800",
      transparentCorners: false,
      hoverCursor: "move",
      lockUniScaling: true, // Maintain aspect ratio when scaling
    });

    return northArrowGroup;
  }

  function stopPlacement() {
    isPlacing = false;
    setDrawingModeCursors(fabricCanvas, false);
    fabricCanvas.off("mouse:down", handlePlacement);
    fabricCanvas.requestRenderAll();
  }

  // Handle deletion of north arrow objects
  handleObjectDeletion(fabricCanvas, [], (obj) => {
    return obj.type === "group" && obj._objects?.some((subObj) => (subObj.type === "i-text" && subObj.text === "N") || (subObj.type === "text" && subObj.text === "N"));
  });
}
