import { closeSubSidebar, setDrawingModeCursors, handleObjectDeletion, setupColorPicker, stopCurrentDrawingMode, registerDrawingMode, toggleDrawingModePopup } from "./drawing-utils.js";

export function initText(fabricCanvas) {
  const addTextButton = document.getElementById("add-text-btn");
  const subSidebar = document.getElementById("sub-sidebar");

  setupColorPicker(fabricCanvas);

  addTextButton.addEventListener("click", () => {
    closeSubSidebar(subSidebar);
    registerDrawingMode(fabricCanvas, "text", stopDrawing);
    toggleDrawingModePopup(true);
    setDrawingModeCursors(fabricCanvas, true);
    fabricCanvas.on("mouse:down", handleTextMouseDown);
  });

  function handleTextMouseDown(o) {
    o.e.preventDefault();
    o.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(o.e);
    const text = new fabric.IText("Enter Text", {
      left: pointer.x,
      top: pointer.y,
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
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    stopCurrentDrawingMode(fabricCanvas); // Exit mode and hide popup
  }

  function stopDrawing() {
    setDrawingModeCursors(fabricCanvas, false);
    fabricCanvas.off("mouse:down", handleTextMouseDown);
    fabricCanvas.requestRenderAll();
  }

  handleObjectDeletion(fabricCanvas, [], (obj) => obj.type === "i-text" && !obj.isEditing);
}
