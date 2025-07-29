// Simplified upload-image.js
import { closeSidebar, setDefaultCursor, setupDeletion } from "./drawing-utils.js";

export function setupImageUploadTool(canvas) {
  const button = document.getElementById("upload-image-btn");

  if (!button) {
    console.error("upload-image-btn element not found");
    return;
  }

  setupDeletion(canvas, (obj) => obj.type === "image" && obj.isUploadedImage);

  button.addEventListener("click", () => {
    closeSidebar();

    // Create file input
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";

    document.body.appendChild(fileInput);
    fileInput.click();

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgElement = new Image();
          imgElement.src = event.target.result;

          imgElement.onload = () => {
            const fabricImage = new fabric.Image(imgElement, {
              left: canvas.getWidth() / 2,
              top: canvas.getHeight() / 2,
              originX: "center",
              originY: "center",
              borderColor: "#FE8800",
              cornerColor: "#FE8800",
              isUploadedImage: true,
            });

            // Scale if too large
            const maxWidth = canvas.getWidth() * 0.8;
            const maxHeight = canvas.getHeight() * 0.8;
            if (fabricImage.width > maxWidth || fabricImage.height > maxHeight) {
              const scale = Math.min(maxWidth / fabricImage.width, maxHeight / fabricImage.height);
              fabricImage.scale(scale);
            }

            canvas.add(fabricImage);
            canvas.setActiveObject(fabricImage);
            setDefaultCursor(canvas);
            canvas.requestRenderAll();
          };
        };
        reader.readAsDataURL(file);
      }

      document.body.removeChild(fileInput);
    });
  });
}
