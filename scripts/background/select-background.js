import { initCropBackground } from "./crop-background.js";
import { initCustomBackground } from "./custom-background.js";
import { initMapBackground } from "./map-background.js";
import { initScaleBackground } from "./scale-background.js";

export function initSelectBackground(fabricCanvas) {
  // Bootstrap Modal Elements (from HTML)
  const customModal = document.getElementById("customModal");
  const uploadFileBtn = document.getElementById("upload-file-btn");
  const uploadPdfBtn = document.getElementById("upload-pdf-btn");
  const googleMapsBtn = document.getElementById("google-maps-btn");
  const customStyleBtn = document.getElementById("custom-style-btn");
  const subSidebar = document.getElementById("sub-sidebar");

  // File inputs
  let modalImageInput = null;
  let modalPdfInput = null;
  let isFileUpload = false;
  let selectedBackground = null;

  // Create file inputs
  function createFileInputs() {
    if (!modalImageInput) {
      modalImageInput = document.createElement("input");
      modalImageInput.type = "file";
      modalImageInput.accept = "image/*";
      modalImageInput.style.display = "none";
      document.body.appendChild(modalImageInput);
      modalImageInput.addEventListener("change", handleFileChange);
    }

    if (!modalPdfInput) {
      modalPdfInput = document.createElement("input");
      modalPdfInput.type = "file";
      modalPdfInput.accept = ".pdf";
      modalPdfInput.style.display = "none";
      document.body.appendChild(modalPdfInput);
      modalPdfInput.addEventListener("change", handlePdfChange);
    }
  }

  createFileInputs();

  function resetFileInput() {
    if (modalImageInput) modalImageInput.value = "";
    if (modalPdfInput) modalPdfInput.value = "";
  }

  // Handle file selection and send to cropping step
  function handleFileChange() {
    const file = modalImageInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, etc.)");
      return;
    }

    setIsFileUpload(true);
    setBackgroundSource("file");

    const url = URL.createObjectURL(file);

    // Hide main modal
    const modalInstance = bootstrap.Modal.getInstance(customModal);
    if (modalInstance) modalInstance.hide();

    // Go to crop step
    cropHandler.handleCrop(url);
    updateStepIndicators(2);
    resetFileInput();
  }

  // Handle PDF file selection
  function handlePdfChange() {
    const file = modalPdfInput.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please select a valid PDF file");
      return;
    }

    const modalInstance = bootstrap.Modal.getInstance(customModal);
    if (modalInstance) modalInstance.hide();

    convertPdfToImage(file);
  }

  // Convert PDF to image using PDF.js
  async function convertPdfToImage(file) {
    try {
      if (!window.pdfjsLib) {
        throw new Error("PDF.js library not loaded");
      }

      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const dataUrl = canvas.toDataURL("image/png");

      setIsFileUpload(true);
      setBackgroundSource("pdf");

      cropHandler.handleCrop(dataUrl);
      updateStepIndicators(2);

      pdf.destroy();
    } catch (error) {
      alert("Error converting PDF to image. Please try again or use an image file instead.");
    }
  }

  // Returns the currently visible modal/popup element
  function getVisibleModal() {
    const modals = ["customModal", "mapModal", "cropModal", "customBackgroundModal", "scaleModal"];
    return modals.find((id) => {
      const modal = document.getElementById(id);
      return modal && modal.classList.contains("show");
    });
  }

  // Updates UI step indicators for multi-step flows
  function updateStepIndicators(activeStep) {
    const visibleModalId = getVisibleModal();
    if (!visibleModalId) return;

    const visibleModal = document.getElementById(visibleModalId);
    const steps = visibleModal?.querySelectorAll(".modal-header-center .step");
    steps?.forEach((step, index) => {
      step.classList.remove("active", "finish");
      if (index + 1 === activeStep) {
        step.classList.add("active");
      } else if (index + 1 < activeStep) {
        step.classList.add("finish");
      }
    });
  }

  // Closes all background-related modals and resets selection state
  function closeAllPopups() {
    const modals = ["customModal", "mapModal", "cropModal", "customBackgroundModal", "scaleModal"];

    modals.forEach((id) => {
      const modal = document.getElementById(id);
      if (modal && modal.classList.contains("show")) {
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) modalInstance.hide();
      }
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

  // Accessors
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
  const cropHandler = initCropBackground(fabricCanvas, customModal, updateStepIndicators, getIsFileUpload, setIsFileUpload, getBackgroundSource);
  cropHandler.setScaleHandler(scaleHandler);

  // Store crop handler globally so scale can access it
  window.cropHandlerInstance = cropHandler;

  // Initialize custom and map background modules
  initCustomBackground(fabricCanvas, customModal, updateStepIndicators, cropHandler.handleCrop, setBackgroundSource);
  initMapBackground(fabricCanvas, customModal, updateStepIndicators, cropHandler.handleCrop, setBackgroundSource);

  // DISABLE ESC KEY FOR ALL MODALS
  document.addEventListener(
    "keydown",
    function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    },
    true
  );

  // Disable ESC on specific modals
  const modals = ["customModal", "mapModal", "cropModal", "customBackgroundModal", "scaleModal"];
  modals.forEach((modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      });
    }
  });

  // Event listeners for Bootstrap modal
  uploadFileBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    resetFileInput();
    modalImageInput.click();
  });

  uploadPdfBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    resetFileInput();
    modalPdfInput.click();
  });

  googleMapsBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBackgroundSource("maps");

    const modalInstance = bootstrap.Modal.getInstance(customModal);
    if (modalInstance) modalInstance.hide();

    // Show map modal immediately without delay
    const mapModal = document.getElementById("mapModal");
    const mapModalInstance = bootstrap.Modal.getInstance(mapModal) || new bootstrap.Modal(mapModal);
    mapModalInstance.show();
  });

  customStyleBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBackgroundSource("custom");

    const modalInstance = bootstrap.Modal.getInstance(customModal);
    if (modalInstance) modalInstance.hide();

    // Show custom background modal immediately without delay
    const customBackgroundModal = document.getElementById("customBackgroundModal");
    const customModalInstance = bootstrap.Modal.getInstance(customBackgroundModal) || new bootstrap.Modal(customBackgroundModal);
    customModalInstance.show();
  });

  return {
    closeAllPopups,
    updateStepIndicators,
    setIsFileUpload,
    getIsFileUpload,
    setBackgroundSource,
    getBackgroundSource,
  };
}
