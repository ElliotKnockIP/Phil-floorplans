import { closeSidebar, startTool, stopCurrentTool, setupDeletion } from "./drawing-utils.js";

// Sets up the north arrow tool
export function setupNorthArrowTool(canvas) {
  const northArrowBtn = document.getElementById("north-arrow-btn");

  // Enable deletion of north arrow groups
  setupDeletion(canvas, (obj) => {
    return obj.type === "group" && obj._objects?.some((subObj) => subObj.type === "text" && subObj.text === "N");
  });

  // Activate tool on button click
  northArrowBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "north-arrow", handleNorthArrowClick);
  });

  // Handle click to place north arrow
  function handleNorthArrowClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = canvas.getPointer(e.e);

    // Create text for "N"
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

    // Create arrow path
    const arrowPath = new fabric.Path("M 0,-20 L -15,15 L 0,5 L 15,15 Z", {
      fill: "white",
      stroke: "black",
      strokeWidth: 2,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });

    // Create black half of arrow
    const blackHalf = new fabric.Path("M 0,-20 L 0,5 L 15,15 Z", {
      fill: "black",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });

    // Group arrow components
    const group = new fabric.Group([arrowPath, blackHalf, nText], {
      left: pointer.x,
      top: pointer.y,
      originX: "center",
      originY: "center",
      hasControls: true,
      borderColor: "#FE8800",
      cornerColor: "#FE8800",
      lockUniScaling: true,
    });

    canvas.add(group);
    canvas.setActiveObject(group);
    stopCurrentTool();
  }
}
