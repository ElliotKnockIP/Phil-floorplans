import { closeSidebar, startTool, stopCurrentTool, setupDeletion, applyStandardStyling } from "./drawing-utils.js";

export function setupNorthArrowTool(fabricCanvas) {
  const northArrowBtn = document.getElementById("north-arrow-btn");

  setupDeletion(fabricCanvas, (obj) => {
    return obj.type === "image" && obj.northArrowImage;
  });

  northArrowBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(fabricCanvas, "north-arrow", handleNorthArrowClick);
  });

  function handleNorthArrowClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(e.e);

    fabric.Image.fromURL(
      "../images/content/north-arrow.png",
      (img) => {
        img.scale(0.1);

        img.set({
          left: pointer.x,
          top: pointer.y,
          originX: "center",
          originY: "center",
          lockUniScaling: true,
          northArrowImage: true,
        });

        applyStandardStyling(img);
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        stopCurrentTool();
      },
      {
        crossOrigin: "anonymous",
      }
    );
  }
}
