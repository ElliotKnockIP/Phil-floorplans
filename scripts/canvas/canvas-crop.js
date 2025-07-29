export function initCanvasCrop(fabricCanvas, subSidebar) {
  // DOM Elements related to the cropping UI
  const cropModal = document.getElementById("crop-screenshot-modal");
  const cropPreviewImage = document.getElementById("crop-screenshot-preview");
  const cropConfirmBtn = document.getElementById("crop-confirm-screenshot-btn");
  const cropCancelBtn = document.getElementById("crop-cancel-screenshot-btn");

  let cropperInstance = null;
  let currentCanvasDataURL = null;
  const screenshots = []; // Store screenshots for print inclusion

  // Initializes Cropper.js on the preview image element
  function initializeCropper() {
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }

    // Force the image container to take more space like crop-background
    const imageContainer = cropPreviewImage.parentElement;
    if (imageContainer && imageContainer.classList.contains("crop-image-container")) {
      imageContainer.style.maxHeight = "calc(90vh - 200px)";
      imageContainer.style.height = "calc(90vh - 200px)";
      imageContainer.style.width = "100%";
    }

    cropperInstance = new Cropper(cropPreviewImage, {
      aspectRatio: NaN,
      viewMode: 1,
      autoCropArea: 0.8,
      responsive: true,
      background: true,
      movable: true,
      zoomable: true,
      scalable: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
      wheelZoomRatio: 0.1,
      checkOrientation: false,
    });
  }

  // Resets the cropper and image element state
  function resetCropper() {
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
    cropPreviewImage.src = "";
    cropPreviewImage.removeAttribute("src");
    cropPreviewImage.onload = null;
  }

  // Shows the crop modal and initializes cropper
  function showCropModal() {
    subSidebar.classList.add("hidden");
    cropModal.style.display = "block";
    resetCropper();

    cropPreviewImage.onload = () => {
      initializeCropper();
      cropPreviewImage.onload = null;
    };

    cropPreviewImage.src = currentCanvasDataURL;
  }

  // Closes the cropping modal and resets state
  function closeCropModal() {
    cropModal.style.display = "none";
    resetCropper();
    subSidebar.classList.remove("hidden");
  }

  // Retrieves the cropped image as a canvas element
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

  // Event listener for cancel button
  cropCancelBtn.addEventListener("click", () => {
    closeCropModal();
  });

  return {
    startCropForDownload: () => {
      const selectPopup = document.getElementById("select-background-popup");
      if (selectPopup) selectPopup.style.display = "none";

      fabricCanvas.renderAll();
      currentCanvasDataURL = fabricCanvas.toDataURL({
        format: "png",
        multiplier: 3,
        quality: 1.0,
      });

      showCropModal();

      // Set up confirm button handler for download
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

      fabricCanvas.renderAll();
      currentCanvasDataURL = fabricCanvas.toDataURL({
        format: "png",
        multiplier: 3,
        quality: 1.0,
      });

      showCropModal();

      // Set up confirm button handler for screenshot
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
