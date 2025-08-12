export function initCanvasCrop(fabricCanvas, subSidebar) {
  // DOM Elements related to the cropping UI - Updated for Bootstrap modal
  const cropModal = document.getElementById("cropScreenshotModal");
  const cropPreviewImage = document.getElementById("crop-screenshot-preview");
  const cropConfirmBtn = document.getElementById("crop-confirm-screenshot-btn");

  let cropperInstance = null;
  let currentCanvasDataURL = null;
  let cropModalInstance = null;
  const screenshots = []; // Store screenshots for print inclusion

  // Initialize Bootstrap Modal instance
  if (cropModal && typeof bootstrap !== "undefined") {
    cropModalInstance = new bootstrap.Modal(cropModal);
  }

  // Initializes Cropper.js on the preview image element
  function initializeCropper() {
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }

    // Wait for modal animation to complete before initializing cropper
    setTimeout(() => {
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
        ready() {
          // Ensure cropper is properly sized after modal is shown
          cropperInstance.resize();
        },
      });
    }, 300);
  }

  // Resets the cropper and image element state
  function resetCropper() {
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
    if (cropPreviewImage) {
      cropPreviewImage.src = "";
      cropPreviewImage.removeAttribute("src");
      cropPreviewImage.onload = null;
    }
  }

  // Shows the crop modal and initializes cropper
  function showCropModal() {
    // Hide sidebar
    if (subSidebar) subSidebar.classList.add("hidden");

    // Reset cropper state
    resetCropper();

    // Set up image loading
    if (cropPreviewImage) {
      cropPreviewImage.onload = () => {
        initializeCropper();
        cropPreviewImage.onload = null;
      };

      cropPreviewImage.onerror = () => {
        alert("Failed to load screenshot. Please try again.");
        cropPreviewImage.onload = null;
      };

      // Set image source
      cropPreviewImage.src = currentCanvasDataURL;
    }

    // Show the Bootstrap modal
    if (cropModalInstance) {
      cropModalInstance.show();
    }
  }

  // Closes the cropping modal and resets state
  function closeCropModal() {
    if (cropModalInstance) {
      cropModalInstance.hide();
    }
    resetCropper();
    if (subSidebar) subSidebar.classList.remove("hidden");
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

  // Add explicit close button event listener
  const closeButton = cropModal?.querySelector(".btn-close");
  if (closeButton) {
    closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeCropModal();
    });
  }

  // Modal event listeners
  if (cropModal) {
    // Clean up when modal is hidden (this handles both close button and ESC key)
    cropModal.addEventListener("hidden.bs.modal", () => {
      resetCropper();
      if (subSidebar) subSidebar.classList.remove("hidden");
    });

    // Handle modal shown event
    cropModal.addEventListener("shown.bs.modal", () => {
      // Resize cropper if it exists
      if (cropperInstance) {
        setTimeout(() => {
          cropperInstance.resize();
        }, 100);
      }
    });

    // Add click event to modal backdrop for closing
    cropModal.addEventListener("click", (e) => {
      if (e.target === cropModal) {
        closeCropModal();
      }
    });
  }

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
      if (cropConfirmBtn) {
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
      }
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
      if (cropConfirmBtn) {
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
          });

          const deleteBtn = previewItem.querySelector(".screenshot-delete-btn");
          deleteBtn.addEventListener("click", () => {
            const index = screenshots.indexOf(screenshot);
            if (index > -1) {
              screenshots.splice(index, 1);
              previewItem.remove(); // Remove the entire preview item
            }
          });

          // Append the preview item to the container
          screenshotPreviews.appendChild(previewContainer);

          closeCropModal();
        };
      }
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
