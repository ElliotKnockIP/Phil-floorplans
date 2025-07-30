// Import utility functions for drawing operations
import { closeSidebar, startTool, stopCurrentTool, setupDeletion, setupColorPicker } from "./drawing-utils.js";

// Sets up text and description box tools
export function setupTextTools(canvas) {
  const textBtn = document.getElementById("add-text-btn");
  const descBtn = document.getElementById("add-description-btn");

  // Initialize color picker and deletion for text objects
  setupColorPicker(canvas);
  setupDeletion(canvas, (obj) => (obj.type === "i-text" || obj.type === "textbox") && !obj.isEditing);

  // Activate simple text tool
  textBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "text", handleTextClick);
  });

  // Activate description box tool
  descBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "description", handleDescriptionClick);
  });

  // Create simple text on click
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

  // Create description box on click
  function handleDescriptionClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = canvas.getPointer(e.e);
    const desc = new fabric.IText("Enter Description", {
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
