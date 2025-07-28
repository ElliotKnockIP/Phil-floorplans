import { closeSubSidebar, setDrawingModeCursors, handleObjectDeletion, stopCurrentDrawingMode, registerDrawingMode, toggleDrawingModePopup } from "./drawing-utils.js";

export function initImageUpload(fabricCanvas) {
  const uploadImageButton = document.getElementById("upload-image-btn");
  const subSidebar = document.getElementById("sub-sidebar");
  const uploadedImages = [];

  if (!uploadImageButton) {
    console.error("upload-image-btn element not found");
    return;
  }

  uploadImageButton.addEventListener("click", () => {
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
              selectable: true,
              evented: true,
              hoverCursor: "pointer",
              borderColor: "#FE8800",
              borderScaleFactor: 2,
              cornerSize: 8,
              cornerColor: "#FE8800",
              cornerStrokeColor: "#000000",
              cornerStyle: "circle",
              transparentCorners: false,
              isUploadedImage: true,
            });

            const maxWidth = fabricCanvas.getWidth() * 0.8;
            const maxHeight = fabricCanvas.getHeight() * 0.8;
            if (fabricImage.width > maxWidth || fabricImage.height > maxHeight) {
              const scale = Math.min(maxWidth / fabricImage.width, maxHeight / fabricImage.height);
              fabricImage.scale(scale);
            }

            fabricCanvas.add(fabricImage);
            uploadedImages.push(fabricImage);
            fabricCanvas.setActiveObject(fabricImage);
            fabricCanvas.selection = true;
            setDrawingModeCursors(fabricCanvas, false);
            fabricImage.set({ selectable: true, evented: true, hoverCursor: "pointer" });
            fabricCanvas.requestRenderAll();

            closeSubSidebar(subSidebar);
          };
        };
        reader.readAsDataURL(file);
      }

      document.body.removeChild(fileInput);
    });
  });

  handleObjectDeletion(fabricCanvas, uploadedImages, (obj) => obj.type === "image" && obj.isUploadedImage);

  return { uploadedImages };
}
