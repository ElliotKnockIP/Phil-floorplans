export function initCropBackground(fabricCanvas, mainModal, updateStepIndicators, getIsFileUpload, setIsFileUpload, getBackgroundSource) {
  // DOM Elements - Bootstrap modals
  const cropModal = document.getElementById("cropModal");
  const cropBackBtn = document.getElementById("crop-back-btn");
  const cropNextBtn = document.getElementById("crop-next-btn");
  const croppableImage = document.getElementById("croppable-image");
  const subSidebar = document.getElementById("sub-sidebar");

  let cropper;
  let scaleHandler;

  // Store the complete state needed to restore the crop modal
  let savedState = {
    imageUrl: null,
    cropperData: null,
    isInitialized: false,
  };

  // Setter to inject the scale handler externally
  function setScaleHandler(handler) {
    scaleHandler = handler;
  }

  // Initializes Cropper.js on a given image element
  function initCropper(image) {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }

    setTimeout(() => {
      cropper = new Cropper(image, {
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
        ready() {
          cropper.resize();
          // Restore previous cropper state if available
          if (savedState.cropperData && savedState.isInitialized) {
            cropper.setData(savedState.cropperData);
          }
          savedState.isInitialized = true;
        },
      });
    }, 300);
  }

  // Resets the cropper and image element state completely
  function resetCropper() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    if (croppableImage) {
      croppableImage.src = "";
      croppableImage.removeAttribute("src");
      croppableImage.onload = null;
    }
    // Reset saved state
    savedState = {
      imageUrl: null,
      cropperData: null,
      isInitialized: false,
    };
  }

  // Handles loading and initializing the cropper with a new image
  function handleCrop(imageUrl) {
    if (subSidebar) subSidebar.classList.add("hidden");

    // Store the image URL
    savedState.imageUrl = imageUrl;
    savedState.isInitialized = false; // This is a new crop session

    // Show crop modal
    const cropModalInstance = bootstrap.Modal.getInstance(cropModal) || new bootstrap.Modal(cropModal);
    cropModalInstance.show();

    if (croppableImage) {
      croppableImage.onload = () => {
        initCropper(croppableImage);
        croppableImage.onload = null;
      };
      croppableImage.src = imageUrl;
    }

    updateStepIndicators(2);
  }

  // Restore crop modal with existing image and state - called from scale back button
  function restoreCropModal() {
    if (!savedState.imageUrl) {
      console.error("No saved crop state to restore");
      return;
    }

    if (subSidebar) subSidebar.classList.add("hidden");

    // Show crop modal
    const cropModalInstance = bootstrap.Modal.getInstance(cropModal) || new bootstrap.Modal(cropModal);
    cropModalInstance.show();

    // Restore the image and cropper
    if (croppableImage) {
      // If image src is different or empty, reload it
      if (croppableImage.src !== savedState.imageUrl) {
        croppableImage.onload = () => {
          initCropper(croppableImage);
          croppableImage.onload = null;
        };
        croppableImage.src = savedState.imageUrl;
      } else {
        // Image is already loaded, just reinitialize cropper
        initCropper(croppableImage);
      }
    }

    updateStepIndicators(2);
  }

  // Closes the cropping modal and resets state
  function closeCropModal() {
    const cropModalInstance = bootstrap.Modal.getInstance(cropModal);
    if (cropModalInstance) cropModalInstance.hide();

    resetCropper();
    setIsFileUpload(false);
    updateStepIndicators(1);
  }

  // Goes back to the appropriate background selection modal
  function handleCropBack() {
    const cropModalInstance = bootstrap.Modal.getInstance(cropModal);
    if (cropModalInstance) cropModalInstance.hide();

    resetCropper(); // Clear everything when going back to selection

    const source = getBackgroundSource();

    if (source === "file" || source === "pdf") {
      const mainModalInstance = bootstrap.Modal.getInstance(mainModal) || new bootstrap.Modal(mainModal);
      mainModalInstance.show();
    } else if (source === "custom") {
      const customBackgroundModal = document.getElementById("customBackgroundModal");
      const customModalInstance = bootstrap.Modal.getInstance(customBackgroundModal) || new bootstrap.Modal(customBackgroundModal);
      customModalInstance.show();
    } else if (source === "map" || source === "maps") {
      const mapModal = document.getElementById("mapModal");
      const mapModalInstance = bootstrap.Modal.getInstance(mapModal) || new bootstrap.Modal(mapModal);
      mapModalInstance.show();
    }

    updateStepIndicators(1);
  }

  // Completes cropping and proceeds to scale step
  function handleCropNext() {
    if (!cropper || !scaleHandler) {
      return;
    }

    // Save the current cropper state before proceeding
    savedState.cropperData = cropper.getData();

    const croppedCanvas = cropper.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });

    if (!croppedCanvas) {
      alert("Error processing crop. Please try again.");
      return;
    }

    // Hide crop modal and show scale modal immediately
    const cropModalInstance = bootstrap.Modal.getInstance(cropModal);
    if (cropModalInstance) cropModalInstance.hide();

    // Proceed to scale step immediately
    scaleHandler.handleCropNext(croppedCanvas);
  }

  // Event listeners
  if (cropBackBtn) {
    cropBackBtn.addEventListener("click", handleCropBack);
  }

  if (cropNextBtn) {
    cropNextBtn.addEventListener("click", handleCropNext);
  }

  // Modal event listeners
  if (cropModal) {
    cropModal.addEventListener("shown.bs.modal", () => {
      if (cropper) {
        setTimeout(() => cropper.resize(), 100);
      }
    });
  }

  // Retrieves the cropped image as a canvas element
  function getCroppedCanvas() {
    if (!cropper) {
      return null;
    }
    return cropper.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
  }

  // Expose selected methods to other modules
  return { handleCrop, getCroppedCanvas, resetCropper, setScaleHandler, restoreCropModal };
}
