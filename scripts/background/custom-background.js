export function initCustomBackground(fabricCanvas, selectBackgroundPopup, updateStepIndicators, handleCrop, setBackgroundSource) {
  // DOM Elements
  const customPopup = document.getElementById("custom-popup");
  const closecustomBtn = document.getElementById("close-custom-btn");
  const customBackBtn = document.getElementById("custom-back-btn");
  const customNextBtn = document.getElementById("custom-next-btn");
  const customWidthInput = document.getElementById("custom-width");
  const customHeightInput = document.getElementById("custom-height");
  const customColorSelect = document.getElementById("custom-colour");
  const customPreviewWrapper = document.getElementById("custom-style-container");
  const customPreviewCanvas = document.getElementById("custom-preview-canvas");
  const customBackground = document.getElementById("custom-style-btn");
  const subSidebar = document.getElementById("sub-sidebar");

  let previewCanvas;
  let customBackgroundRect;
  let resizeObserver;

  // Clean up function to properly dispose of canvas and observers
  function cleanup() {
    // Clean up resize observer
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    // Clean up canvas
    if (previewCanvas) {
      previewCanvas.clear();
      previewCanvas.dispose();
      previewCanvas = null;
    }

    // Reset custom background rect reference
    customBackgroundRect = null;
  }

  // Initializes the preview canvas for showing a visual representation of the custom background
  function initPreviewCanvas() {
    // Clean up any existing canvas first
    cleanup();

    // Force a reflow to ensure proper measurements
    customPreviewWrapper.offsetHeight;

    // Calculate available height by subtracting the inputs container height
    const inputsContainer = document.querySelector(".inputs-container");
    const inputsHeight = inputsContainer ? inputsContainer.offsetHeight + 32 : 100; // Add gap

    const containerWidth = customPreviewWrapper.clientWidth;
    const containerHeight = customPreviewWrapper.clientHeight - inputsHeight;

    // Ensure minimum dimensions
    const canvasWidth = Math.max(containerWidth, 200);
    const canvasHeight = Math.max(containerHeight, 200);

    // Set canvas element dimensions directly
    customPreviewCanvas.width = canvasWidth;
    customPreviewCanvas.height = canvasHeight;

    // Create fabric canvas with calculated dimensions
    previewCanvas = new fabric.Canvas("custom-preview-canvas", {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "#42434a",
    });

    // Setup resize observer after canvas is created
    setupResizeObserver();

    // Update the preview
    updatePreviewCanvas();
  }

  // Handle canvas resizing
  function resizeCanvas() {
    if (!previewCanvas || !customPreviewWrapper) return;

    // Force a reflow to get accurate measurements
    customPreviewWrapper.offsetHeight;

    // Calculate available height by subtracting the inputs container height
    const inputsContainer = document.querySelector(".inputs-container");
    const inputsHeight = inputsContainer ? inputsContainer.offsetHeight + 32 : 100; // Add gap

    const containerWidth = customPreviewWrapper.clientWidth;
    const containerHeight = customPreviewWrapper.clientHeight - inputsHeight;

    // Ensure minimum dimensions
    const canvasWidth = Math.max(containerWidth, 200);
    const canvasHeight = Math.max(containerHeight, 200);

    // Set canvas element dimensions directly
    customPreviewCanvas.width = canvasWidth;
    customPreviewCanvas.height = canvasHeight;

    // Set canvas dimensions to match calculated space
    previewCanvas.setDimensions({
      width: canvasWidth,
      height: canvasHeight,
    });

    // Re-render with new dimensions
    updatePreviewCanvas();
  }

  // Updates the preview canvas based on input dimensions and selected color
  function updatePreviewCanvas() {
    if (!previewCanvas) return;

    const width = parseInt(customWidthInput.value) || 800;
    const height = parseInt(customHeightInput.value) || 600;
    const color = customColorSelect.value;

    // Calculate scale to fit custom dimensions inside the preview area
    const canvasWidth = previewCanvas.getWidth();
    const canvasHeight = previewCanvas.getHeight();
    const scale = Math.min(canvasWidth / width, canvasHeight / height, 1);
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const left = (canvasWidth - scaledWidth) / 2;
    const top = (canvasHeight - scaledHeight) / 2;

    // Remove existing rectangle if any
    if (customBackgroundRect) {
      previewCanvas.remove(customBackgroundRect);
    }

    // Create a new rectangle to represent the custom background
    customBackgroundRect = new fabric.Rect({
      left: left,
      top: top,
      width: width,
      height: height,
      scaleX: scale,
      scaleY: scale,
      fill: color,
      selectable: false,
      evented: false,
      hoverCursor: "default",
    });

    previewCanvas.add(customBackgroundRect);
    previewCanvas.sendToBack(customBackgroundRect);
    previewCanvas.requestRenderAll();
  }

  // Setup ResizeObserver for container size changes
  function setupResizeObserver() {
    if (!customPreviewWrapper || resizeObserver) return;

    resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === customPreviewWrapper && previewCanvas) {
          // Debounce resize calls
          clearTimeout(window.customCanvasResizeTimeout);
          window.customCanvasResizeTimeout = setTimeout(() => {
            resizeCanvas();
          }, 10);
        }
      }
    });

    resizeObserver.observe(customPreviewWrapper);
  }

  // Opens the custom background popup and initializes preview
  customBackground.addEventListener("click", () => {
    subSidebar.classList.add("hidden"); // Hide side menu
    document.querySelectorAll(".submenu").forEach((submenu) => {
      submenu.classList.add("hidden");
      submenu.classList.remove("show");
    });

    selectBackgroundPopup.style.display = "none";
    customPopup.style.display = "block";

    // Wait for the popup to be fully displayed before initializing
    setTimeout(() => {
      initPreviewCanvas();
      updateStepIndicators(1);
    }, 50); // Increased timeout to ensure proper layout
  });

  // Add resize event listener as fallback
  window.addEventListener("resize", () => {
    if (previewCanvas && customPopup.style.display !== "none") {
      clearTimeout(window.customCanvasResizeTimeout);
      window.customCanvasResizeTimeout = setTimeout(() => {
        resizeCanvas();
      }, 100);
    }
  });

  // Input event listeners
  customWidthInput.addEventListener("input", updatePreviewCanvas);
  customHeightInput.addEventListener("input", updatePreviewCanvas);
  customColorSelect.addEventListener("change", updatePreviewCanvas);

  // Go back to background selection screen and clean up canvas
  customBackBtn.addEventListener("click", () => {
    customPopup.style.display = "none";
    selectBackgroundPopup.style.display = "block";
    updateStepIndicators(1);
    cleanup();
  });

  // Close custom popup and reset state
  closecustomBtn.addEventListener("click", () => {
    customPopup.style.display = "none";
    updateStepIndicators(1);
    cleanup();
  });

  // Proceed to next step: generate image from custom config and send it to crop handler
  customNextBtn.addEventListener("click", () => {
    const width = parseInt(customWidthInput.value) || 800;
    const height = parseInt(customHeightInput.value) || 600;
    const color = customColorSelect.value;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    const dataUrl = tempCanvas.toDataURL("image/png");

    // Hide custom popup and move to cropping step
    customPopup.style.display = "none";
    setBackgroundSource("custom");
    handleCrop(dataUrl);
    updateStepIndicators(2);
  });

  // Clean up when popup is hidden (additional safety)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "style") {
        if (customPopup.style.display === "none") {
          cleanup();
        }
      }
    });
  });

  observer.observe(customPopup, {
    attributes: true,
    attributeFilter: ["style"],
  });
}
