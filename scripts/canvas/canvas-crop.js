import { getPrintInputs, proceedWithPrint } from "./canvas-print.js";

export function initCanvasCrop(fabricCanvas, subSidebar, canvasContainer) {
  const cropModal = document.getElementById("crop-modal");
  const cropPreviewImage = document.getElementById("crop-preview-image");
  const cropConfirmBtn = document.getElementById("crop-confirm-btn");
  const cropCancelBtn = document.getElementById("crop-cancel-btn");
  const cropResetBtn = document.getElementById("crop-reset-btn");
  let cropperInstance = null;
  let currentCanvasDataURL = null;
  const screenshots = []; // Store screenshots for print inclusion

  function initializeCropper() {
    if (cropperInstance) {
      cropperInstance.destroy();
    }
    cropperInstance = new Cropper(cropPreviewImage, {
      viewMode: 1,
      dragMode: "move",
      autoCropArea: 0.8,
      movable: true,
      restore: false,
      guides: true,
      center: true,
      highlight: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      background: true,
      responsive: true,
      modal: true,
      minContainerWidth: 300,
      minContainerHeight: 200,
      aspectRatio: NaN,
      ready: function () {
        console.log("Cropper initialized");
      },
    });
  }

  function showCropModal() {
    cropPreviewImage.src = currentCanvasDataURL;
    cropModal.classList.add("show");
    cropPreviewImage.onload = () => {
      initializeCropper();
    };
  }

  function closeCropModal() {
    cropModal.classList.remove("show");
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
    subSidebar.classList.remove("hidden");
  }

  function getCroppedCanvas() {
    if (!cropperInstance) {
      console.error("Cropper not initialized");
      return null;
    }
    return cropperInstance.getCroppedCanvas({
      width: 1200,
      height: "auto",
      minWidth: 800,
      maxWidth: 2400,
      fillColor: "#ffffff",
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
  }

  cropCancelBtn.addEventListener("click", () => {
    closeCropModal();
  });

  cropResetBtn.addEventListener("click", () => {
    if (cropperInstance) {
      cropperInstance.reset();
    }
  });

  return {
    startCropForDownload: () => {
      const selectPopup = document.getElementById("select-background-popup");
      if (selectPopup) selectPopup.style.display = "none";
      subSidebar.classList.add("hidden");
      fabricCanvas.renderAll();
      currentCanvasDataURL = fabricCanvas.toDataURL({
        format: "png",
        multiplier: 3,
        quality: 1.0,
      });
      showCropModal();
      cropConfirmBtn.onclick = () => {
        const croppedCanvas = getCroppedCanvas();
        if (!croppedCanvas) return;
        const croppedDataURL = croppedCanvas.toDataURL("image/png", 1.0);
        const imageName = "floorplan";
        const a = document.createElement("a");
        a.href = croppedDataURL;
        a.download = imageName.endsWith(".png") ? imageName : `${imageName}.png`;
        a.click();
        closeCropModal();
      };
    },
    startCropForScreenshot: () => {
      const selectPopup = document.getElementById("select-background-popup");
      if (selectPopup) selectPopup.style.display = "none";
      subSidebar.classList.add("hidden");
      fabricCanvas.renderAll();
      currentCanvasDataURL = fabricCanvas.toDataURL({
        format: "png",
        multiplier: 3,
        quality: 1.0,
      });
      showCropModal();
      cropConfirmBtn.onclick = () => {
        const croppedCanvas = getCroppedCanvas();
        if (!croppedCanvas) return;
        const croppedDataURL = croppedCanvas.toDataURL("image/png", 1.0);

        // Create screenshot object with unique ID
        const screenshot = {
          dataURL: croppedDataURL,
          includeInPrint: false,
          id: Date.now() + Math.random(), // Unique identifier
        };

        screenshots.push(screenshot);
        console.log("Added screenshot. Total screenshots:", screenshots.length);

        // Get screenshot previews container
        const screenshotPreviews = document.getElementById("screenshot-previews");

        // Clone the template
        const template = document.getElementById("screenshot-preview-template");
        const previewContainer = template.content.cloneNode(true);

        // Get the root element of the cloned template
        const previewItem = previewContainer.querySelector(".screenshot-preview-item");

        // Update the cloned elements
        const img = previewItem.querySelector(".screenshot-image");
        img.src = croppedDataURL;
        img.alt = `Screenshot ${screenshots.length}`;

        const checkbox = previewItem.querySelector(".screenshot-checkbox");
        checkbox.id = `screenshot-${screenshot.id}`;

        const label = previewItem.querySelector(".screenshot-checkbox-label");
        label.setAttribute("for", checkbox.id);

        // Add event listeners
        checkbox.addEventListener("change", () => {
          screenshot.includeInPrint = checkbox.checked;
          console.log(`Screenshot ${screenshot.id} includeInPrint:`, screenshot.includeInPrint);
        });

        const deleteBtn = previewItem.querySelector(".screenshot-delete-btn");
        deleteBtn.addEventListener("click", () => {
          const index = screenshots.indexOf(screenshot);
          if (index > -1) {
            screenshots.splice(index, 1);
            previewItem.remove(); // Remove the entire preview item
            console.log(`Deleted screenshot ${screenshot.id}. Remaining screenshots:`, screenshots.length);
          }
        });

        // Append the preview item to the container
        screenshotPreviews.appendChild(previewContainer);

        closeCropModal();
      };
    },
    cancelCrop: closeCropModal,
    resetCrop: () => {
      if (cropperInstance) {
        cropperInstance.reset();
      }
    },
    getScreenshots: () => screenshots,
    clearScreenshots: () => {
      screenshots.length = 0;
      const screenshotPreviews = document.getElementById("screenshot-previews");
      if (screenshotPreviews) {
        screenshotPreviews.innerHTML = "";
      }
    },
  };
}
