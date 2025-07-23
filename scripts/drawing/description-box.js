import { closeSubSidebar, setDrawingModeCursors, handleObjectDeletion, setupColorPicker, stopCurrentDrawingMode, registerDrawingMode, toggleDrawingModePopup } from "./drawing-utils.js";

export function initDescriptionBox(fabricCanvas) {
  const addDescButton = document.getElementById("add-description-btn");
  const subSidebar = document.getElementById("sub-sidebar");

  setupColorPicker(fabricCanvas);

  // Handle scaling for textboxes to resize width without scaling font size
  fabricCanvas.on("object:scaling", (e) => {
    const obj = e.target;
    if (obj && obj.type === "textbox") {
      obj.set({
        width: Math.max(100, obj.width * obj.scaleX), // Enforce min width
        scaleX: 1,
        scaleY: 1,
      });
      obj.setCoords();
    }
  });

  addDescButton.addEventListener("click", () => {
    closeSubSidebar(subSidebar);
    registerDrawingMode(fabricCanvas, "description", stopDrawing);
    toggleDrawingModePopup(true);
    setDrawingModeCursors(fabricCanvas, true);
    fabricCanvas.on("mouse:down", handleDescMouseDown);
  });

  function handleDescMouseDown(o) {
    o.e.preventDefault();
    o.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(o.e);
    const desc = new fabric.Textbox("Enter Description", {
      left: pointer.x,
      top: pointer.y,
      width: 170, // Initial width, can be resized
      fontFamily: "Poppins, sans-serif",
      fontSize: 20,
      fill: "#000000",
      selectable: true,
      editable: true,
      cursorColor: "#FE8800",
      borderColor: "#FE8800",
      borderScaleFactor: 2,
      cornerSize: 8,
      cornerColor: "#FE8800",
      cornerStrokeColor: "#000000",
      cornerStyle: "circle",
      transparentCorners: false,
      padding: 5,
      originX: "center",
      originY: "center",

      stroke: "#000000",
      strokeWidth: 1,
    });

    fabricCanvas.add(desc);
    fabricCanvas.setActiveObject(desc);
    stopCurrentDrawingMode(fabricCanvas); // Exit mode and hide popup
  }

  function stopDrawing() {
    setDrawingModeCursors(fabricCanvas, false);
    fabricCanvas.off("mouse:down", handleDescMouseDown);
    fabricCanvas.requestRenderAll();
  }

  handleObjectDeletion(fabricCanvas, [], (obj) => obj.type === "textbox" && !obj.isEditing);
}
