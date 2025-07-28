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

  // Initializes the preview canvas for showing a visual representation of the custom background
  function initPreviewCanvas() {
    // Calculate available height by subtracting the inputs container height
    const inputsContainer = document.querySelector(".inputs-container");
    const inputsHeight = inputsContainer ? inputsContainer.offsetHeight + 32 : 100; // Add gap

    const containerWidth = customPreviewWrapper.clientWidth;
    const containerHeight = customPreviewWrapper.clientHeight - inputsHeight;

    // Set canvas element dimensions directly
    customPreviewCanvas.width = containerWidth;
    customPreviewCanvas.height = Math.max(containerHeight, 200); // Minimum height

    // Create fabric canvas with calculated dimensions
    previewCanvas = new fabric.Canvas("custom-preview-canvas", {
      width: containerWidth,
      height: Math.max(containerHeight, 200),
      backgroundColor: "#42434a",
    });

    updatePreviewCanvas();
  }

  // New function to handle canvas resizing
  function resizeCanvas() {
    if (!previewCanvas) return;

    // Calculate available height by subtracting the inputs container height
    const inputsContainer = document.querySelector(".inputs-container");
    const inputsHeight = inputsContainer ? inputsContainer.offsetHeight + 32 : 100; // Add gap

    const containerWidth = customPreviewWrapper.clientWidth;
    const containerHeight = customPreviewWrapper.clientHeight - inputsHeight;

    // Set canvas element dimensions directly
    customPreviewCanvas.width = containerWidth;
    customPreviewCanvas.height = Math.max(containerHeight, 200); // Minimum height

    // Set canvas dimensions to match calculated space
    previewCanvas.setDimensions({
      width: containerWidth,
      height: Math.max(containerHeight, 200),
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

  // Add ResizeObserver for container size changes (like scale-background.js approach)
  function setupResizeObserver() {
    if (!customPreviewWrapper) return;

    const resizeObserver = new ResizeObserver((entries) => {
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

    // Store observer for cleanup
    customPreviewWrapper._resizeObserver = resizeObserver;
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

    // Small delay to ensure popup is visible before initializing canvas
    setTimeout(() => {
      initPreviewCanvas();
      setupResizeObserver(); // Set up resize observer
      updateStepIndicators(1);
    }, 10);
  });

  // Add resize event listener (keep as fallback)
  window.addEventListener("resize", () => {
    if (previewCanvas && customPopup.style.display !== "none") {
      setTimeout(() => {
        resizeCanvas();
      }, 50);
    }
  });

  customWidthInput.addEventListener("input", updatePreviewCanvas);
  customHeightInput.addEventListener("input", updatePreviewCanvas);
  customColorSelect.addEventListener("change", updatePreviewCanvas);

  // Go back to background selection screen and clean up canvas
  customBackBtn.addEventListener("click", () => {
    customPopup.style.display = "none";
    selectBackgroundPopup.style.display = "block";
    updateStepIndicators(1);

    // Clean up resize observer
    if (customPreviewWrapper._resizeObserver) {
      customPreviewWrapper._resizeObserver.disconnect();
      customPreviewWrapper._resizeObserver = null;
    }

    if (previewCanvas) {
      previewCanvas.clear();
      previewCanvas.dispose();
      previewCanvas = null;
    }
  });

  // Close custom popup and reset state
  closecustomBtn.addEventListener("click", () => {
    customPopup.style.display = "none";
    updateStepIndicators(1);

    // Clean up resize observer
    if (customPreviewWrapper._resizeObserver) {
      customPreviewWrapper._resizeObserver.disconnect();
      customPreviewWrapper._resizeObserver = null;
    }

    if (previewCanvas) {
      previewCanvas.clear();
      previewCanvas.dispose();
      previewCanvas = null;
    }
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
}
