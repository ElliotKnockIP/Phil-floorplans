import { closeSidebar, startTool, stopCurrentTool, setupDeletion } from "./drawing-utils.js";

// Sets up the north arrow tool
export function setupNorthArrowTool(fabricCanvas) {
  const northArrowBtn = document.getElementById("north-arrow-btn");

  // Enable deletion of north arrow images
  setupDeletion(fabricCanvas, (obj) => {
    return obj.type === "image" && obj.northArrowImage;
  });

  // Activate tool on button click
  northArrowBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(fabricCanvas, "north-arrow", handleNorthArrowClick);
  });

  // Handle click to place north arrow
  function handleNorthArrowClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = fabricCanvas.getPointer(e.e);

    // Load north arrow image
    fabric.Image.fromURL(
      "../images/content/north-arrow.png",
      (img) => {
        // Scale the image to appropriate size
        img.scale(0.1); // Adjust scale as needed

        // Set image properties
        img.set({
          left: pointer.x,
          top: pointer.y,
          originX: "center",
          originY: "center",
          hasControls: true,
          borderColor: "#f8794b",
          cornerColor: "#f8794b",
          lockUniScaling: true,
          northArrowImage: true, // Custom property to identify this as a north arrow image
        });

        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        stopCurrentTool();
      },
      {
        // Options for image loading
        crossOrigin: "anonymous", // Add if loading from external domain
      }
    );
  }
}
