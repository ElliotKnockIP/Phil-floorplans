// Simplified text-tools.js (combines text.js and description-box.js)
import { closeSidebar, startTool, stopCurrentTool, setupDeletion, setupColorPicker } from "./drawing-utils.js";

export function setupTextTools(canvas) {
  const textBtn = document.getElementById("add-text-btn");
  const descBtn = document.getElementById("add-description-btn");

  setupColorPicker(canvas);
  setupDeletion(canvas, (obj) => (obj.type === "i-text" || obj.type === "textbox") && !obj.isEditing);

  // Handle textbox scaling to resize width without scaling font
  canvas.on("object:scaling", (e) => {
    const obj = e.target;
    if (obj && obj.type === "textbox") {
      obj.set({
        width: Math.max(100, obj.width * obj.scaleX),
        scaleX: 1,
        scaleY: 1,
      });
      obj.setCoords();
    }
  });

  // Simple text tool
  textBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "text", handleTextClick);
  });

  // Description box tool
  descBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "description", handleDescriptionClick);
  });

  function handleTextClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = canvas.getPointer(e.e);
    const text = new fabric.IText("Enter Text", {
      left: pointer.x,
      top: pointer.y,
      fontSize: 20,
      fill: "#000000",
      fontFamily: "Poppins, sans-serif",
      originX: "center",
      originY: "center",
      cursorColor: "#FE8800",
      borderColor: "#FE8800",
      cornerColor: "#FE8800",
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    stopCurrentTool();
  }

  function handleDescriptionClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = canvas.getPointer(e.e);
    const desc = new fabric.Textbox("Enter Description", {
      left: pointer.x,
      top: pointer.y,
      width: 170,
      fontSize: 20,
      fill: "#000000",
      fontFamily: "Poppins, sans-serif",
      originX: "center",
      originY: "center",
      stroke: "#000000",
      strokeWidth: 1,
      cursorColor: "#FE8800",
      borderColor: "#FE8800",
      cornerColor: "#FE8800",
    });

    canvas.add(desc);
    canvas.setActiveObject(desc);
    stopCurrentTool();
  }
}
