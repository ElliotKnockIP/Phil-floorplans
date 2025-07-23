export function initCropBackground(fabricCanvas, selectBackgroundPopup, mapPopup, customPopup, updateStepIndicators, getIsFileUpload, setIsFileUpload, getBackgroundSource) {
  // DOM Elements related to the cropping UI
  const cropPopup = document.getElementById("crop-popup");
  const closeCropBtn = document.getElementById("closeCropBtn");
  const cropBackBtn = document.getElementById("cropBackBtn");
  const cropNextBtn = document.getElementById("cropNextBtn");
  const croppableImage = document.getElementById("croppableImage");
  const subSidebar = document.getElementById("sub-sidebar");

  let cropper;
  let scaleHandler;

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
    cropper = new Cropper(image, {
      aspectRatio: NaN,
      viewMode: 1,
      autoCropArea: 0.8,
      responsive: true,
      background: false,
      movable: true,
      zoomable: true,
      scalable: true,
      cropBoxMovable: true,
      cropBoxResizable: true,
    });
  }

  // Resets the cropper and image element state
  function resetCropper() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    croppableImage.src = "";
    croppableImage.removeAttribute("src");
    croppableImage.onload = null;
  }

  // Handles loading and initializing the cropper with a new image
  function handleCrop(imageUrl) {
    subSidebar.classList.add("hidden");
    cropPopup.style.display = "block";
    resetCropper();

    croppableImage.onload = () => {
      initCropper(croppableImage);
      croppableImage.onload = null;
    };

    croppableImage.src = imageUrl;
  }

  // Closes the cropping popup and resets state
  closeCropBtn.addEventListener("click", () => {
    cropPopup.style.display = "none";
    resetCropper();
    setIsFileUpload(false);
    updateStepIndicators(1);
  });

  // Goes back to the appropriate background selection popup
  cropBackBtn.addEventListener("click", () => {
    cropPopup.style.display = "none";
    const source = getBackgroundSource();
    if (source === "file") {
      selectBackgroundPopup.style.display = "block";
    } else if (source === "custom") {
      customPopup.style.display = "block";
    } else {
      mapPopup.style.display = "block";
    }
    resetCropper();
    updateStepIndicators(1);
  });

  // Completes cropping and proceeds to scale step
  cropNextBtn.addEventListener("click", () => {
    if (!cropper || !scaleHandler) {
      return;
    }
    cropPopup.style.display = "none";
    const croppedCanvas = cropper.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    scaleHandler.handleCropNext(croppedCanvas);
  });

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
  return { handleCrop, getCroppedCanvas, resetCropper, setScaleHandler };
}
