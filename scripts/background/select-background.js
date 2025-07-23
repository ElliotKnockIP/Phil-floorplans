import { initCropBackground } from "./crop-background.js";
import { initCustomBackground } from "./custom-background.js";
import { initMapBackground } from "./map-background.js";
import { initScaleBackground } from "./scale-background.js";

export function initSelectBackground(fabricCanvas) {
  // DOM Elements
  const selectBackground = document.getElementById("select-background-btn");
  const cancelBackgroundBtn = document.getElementById("cancelBackgroundBtn");
  const selectBackgroundPopup = document.getElementById("select-background-popup");
  const backgroundInput = document.getElementById("uploaded-file");
  const uploadFiles = document.getElementById("upload-files-btn");
  const subSidebar = document.getElementById("sub-sidebar");
  const mapPopup = document.getElementById("map-popup");
  const customPopup = document.getElementById("custom-popup");
  const cropPopup = document.getElementById("crop-popup");
  const scalePopup = document.getElementById("scale-popup");

  let isFileUpload = false;
  let selectedBackground = null;

  // Clears the file input so selecting the same file twice still triggers the 'change' event
  function resetFileInput() {
    backgroundInput.value = "";
  }

  // Handles file selection and sends the image to cropping step
  function handleFileChange() {
    const file = backgroundInput.files[0];
    if (!file) return;

    setIsFileUpload(true);
    setBackgroundSource("file");

    const url = URL.createObjectURL(file);
    selectBackgroundPopup.style.display = "none";
    cropHandler.handleCrop(url);
    updateStepIndicators(2);

    resetFileInput();
  }

  // Returns the currently visible popup element
  function getVisiblePopup() {
    return [selectBackgroundPopup, mapPopup, customPopup, cropPopup, scalePopup].find((popup) => popup && popup.style.display === "block") || null;
  }

  // Updates UI step indicators for multi-step flows (e.g. select → crop → scale)
  function updateStepIndicators(activeStep) {
    const visiblePopup = getVisiblePopup();
    if (!visiblePopup) return;

    const steps = visiblePopup.querySelectorAll(".modal-header-center .step");
    steps.forEach((step, index) => {
      step.classList.remove("active", "finish");
      if (index + 1 === activeStep) {
        step.classList.add("active");
      } else if (index + 1 < activeStep) {
        step.classList.add("finish");
      }
    });
  }

  // Closes all background-related popups and resets selection state
  function closeAllPopups() {
    [selectBackgroundPopup, mapPopup, customPopup, cropPopup, scalePopup].forEach((popup) => {
      if (popup) popup.style.display = "none";
    });

    if (subSidebar) subSidebar.classList.add("hidden");

    document.querySelectorAll(".submenu").forEach((submenu) => {
      submenu.classList.add("hidden");
      submenu.classList.remove("show");
    });

    resetFileInput();
    isFileUpload = false;
    selectedBackground = null;
    updateStepIndicators(1);
  }

  // Accessors for upload flag and background source
  function setIsFileUpload(value) {
    isFileUpload = value;
  }

  function getIsFileUpload() {
    return isFileUpload;
  }

  function setBackgroundSource(source) {
    selectedBackground = source;
  }

  function getBackgroundSource() {
    return selectedBackground;
  }

  // Initialize submodules with necessary handlers and callbacks
  const scaleHandler = initScaleBackground(fabricCanvas, null, updateStepIndicators, closeAllPopups);
  const cropHandler = initCropBackground(fabricCanvas, selectBackgroundPopup, mapPopup, customPopup, updateStepIndicators, getIsFileUpload, setIsFileUpload, getBackgroundSource);
  cropHandler.setScaleHandler(scaleHandler);

  // Inject shared logic into custom and map background modules
  initCustomBackground(fabricCanvas, selectBackgroundPopup, updateStepIndicators, cropHandler.handleCrop, setBackgroundSource);
  initMapBackground(fabricCanvas, selectBackgroundPopup, updateStepIndicators, cropHandler.handleCrop, setBackgroundSource);

  // Open background selection popup
  selectBackground.addEventListener("click", () => {
    subSidebar.classList.add("hidden");

    document.querySelectorAll(".submenu").forEach((submenu) => {
      submenu.classList.add("hidden");
      submenu.classList.remove("show");
    });

    selectBackgroundPopup.style.display = "block";
    resetFileInput();
    updateStepIndicators(1);
  });

  // Close popups
  cancelBackgroundBtn.addEventListener("click", closeAllPopups);

  // Manual trigger to upload file (from button)
  uploadFiles.addEventListener("click", () => {
    resetFileInput();
    backgroundInput.click();
  });

  backgroundInput.addEventListener("change", handleFileChange);

  // Public accessors for other modules to control state if needed
  return {
    closeAllPopups,
    updateStepIndicators,
    setIsFileUpload,
    getIsFileUpload,
    setBackgroundSource,
    getBackgroundSource,
  };
}
