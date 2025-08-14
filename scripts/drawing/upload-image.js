import { closeSidebar, setDefaultCursor, setupDeletion, applyStandardStyling } from "./drawing-utils.js";

export function setupImageUploadTool(fabricCanvas) {
  const button = document.getElementById("upload-image-btn");

  if (!button) {
    console.error("upload-image-btn element not found");
    return;
  }

  setupDeletion(fabricCanvas, (obj) => obj.type === "image" && obj.isUploadedImage);

  button.addEventListener("click", () => {
    closeSidebar();

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
              left: fabricCanvas.getWidth() / 2,
              top: fabricCanvas.getHeight() / 2,
              originX: "center",
              originY: "center",
              isUploadedImage: true,
            });

            // Scale image if too large
            const maxWidth = fabricCanvas.getWidth() * 0.8;
            const maxHeight = fabricCanvas.getHeight() * 0.8;
            if (fabricImage.width > maxWidth || fabricImage.height > maxHeight) {
              const scale = Math.min(maxWidth / fabricImage.width, maxHeight / fabricImage.height);
              fabricImage.scale(scale);
            }

            applyStandardStyling(fabricImage);
            fabricCanvas.add(fabricImage);
            fabricCanvas.setActiveObject(fabricImage);
            setDefaultCursor(fabricCanvas);
            fabricCanvas.requestRenderAll();
          };
        };
        reader.readAsDataURL(file);
      }

      document.body.removeChild(fileInput);
    });
  });
}
