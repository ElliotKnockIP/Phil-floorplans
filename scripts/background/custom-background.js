export function initCustomBackground(fabricCanvas, mainModal, updateStepIndicators, handleCrop, setBackgroundSource) {
  // DOM Elements - Bootstrap modal
  const customBackgroundModal = document.getElementById("customBackgroundModal");
  const customBackBtn = document.getElementById("custom-back-btn");
  const customNextBtn = document.getElementById("custom-next-btn");
  const customWidthInput = document.getElementById("custom-width");
  const customHeightInput = document.getElementById("custom-height");
  const customColorSelect = document.getElementById("custom-colour");
  const customPreviewWrapper = document.getElementById("custom-style-container");
  const customPreviewCanvas = document.getElementById("custom-preview-canvas");
  const customStyleBtn = document.getElementById("custom-style-btn");
  const subSidebar = document.getElementById("sub-sidebar");

  let previewCanvas;
  let customBackgroundRect;
  let resizeObserver;

  // Clean up function to properly dispose of canvas and observers
  function cleanup() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    if (previewCanvas) {
      previewCanvas.clear();
      previewCanvas.dispose();
      previewCanvas = null;
    }

    customBackgroundRect = null;

    if (window.customCanvasResizeTimeout) {
      clearTimeout(window.customCanvasResizeTimeout);
      window.customCanvasResizeTimeout = null;
    }
  }

  // Initializes the preview canvas for showing a visual representation of the custom background
  function initPreviewCanvas() {
    cleanup();

    if (!customPreviewWrapper || !customPreviewCanvas) return;

    // Wait for modal to be fully displayed
    setTimeout(() => {
      const containerRect = customPreviewWrapper.getBoundingClientRect();
      let containerWidth = containerRect.width;
      let containerHeight = containerRect.height;

      // Use fallback dimensions if container isn't ready
      if (containerWidth === 0 || containerHeight === 0) {
        containerWidth = 600;
        containerHeight = 400;
      }

      const canvasWidth = Math.max(containerWidth - 20, 300);
      const canvasHeight = Math.max(containerHeight - 20, 200);

      customPreviewCanvas.width = canvasWidth;
      customPreviewCanvas.height = canvasHeight;
      customPreviewCanvas.style.width = canvasWidth + "px";
      customPreviewCanvas.style.height = canvasHeight + "px";

      previewCanvas = new fabric.Canvas("custom-preview-canvas", {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: "#f5f5f5",
      });

      setupResizeObserver();
      updatePreviewCanvas();
    }, 100);
  }

  // Handle canvas resizing
  function resizeCanvas() {
    if (!previewCanvas || !customPreviewWrapper) return;

    const containerRect = customPreviewWrapper.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    if (containerWidth === 0 || containerHeight === 0) return;

    const canvasWidth = Math.max(containerWidth - 20, 300);
    const canvasHeight = Math.max(containerHeight - 20, 200);

    customPreviewCanvas.width = canvasWidth;
    customPreviewCanvas.height = canvasHeight;
    customPreviewCanvas.style.width = canvasWidth + "px";
    customPreviewCanvas.style.height = canvasHeight + "px";

    previewCanvas.setDimensions({
      width: canvasWidth,
      height: canvasHeight,
    });

    updatePreviewCanvas();
  }

  // Updates the preview canvas based on input dimensions and selected color
  function updatePreviewCanvas() {
    if (!previewCanvas || !customWidthInput || !customHeightInput || !customColorSelect) {
      return;
    }

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
          clearTimeout(window.customCanvasResizeTimeout);
          window.customCanvasResizeTimeout = setTimeout(() => {
            resizeCanvas();
          }, 100);
        }
      }
    });

    resizeObserver.observe(customPreviewWrapper);
  }

  // Opens the custom background modal (from main modal button click)
  function handleCustomBackgroundSelection() {
    if (subSidebar) subSidebar.classList.add("hidden");

    document.querySelectorAll(".submenu").forEach((submenu) => {
      submenu.classList.add("hidden");
      submenu.classList.remove("show");
    });

    // Hide main modal
    const mainModalInstance = bootstrap.Modal.getInstance(mainModal);
    if (mainModalInstance) mainModalInstance.hide();

    // Show custom background modal
    setTimeout(() => {
      const customModalInstance = bootstrap.Modal.getInstance(customBackgroundModal) || new bootstrap.Modal(customBackgroundModal);
      customModalInstance.show();

      setTimeout(() => {
        initPreviewCanvas();
        updateStepIndicators(1);
      }, 100);
    }, 200);
  }

  // Go back to main background selection modal
  function handleCustomBack() {
    const customModalInstance = bootstrap.Modal.getInstance(customBackgroundModal);
    if (customModalInstance) customModalInstance.hide();

    cleanup();

    // Show main modal immediately
    const mainModalInstance = bootstrap.Modal.getInstance(mainModal) || new bootstrap.Modal(mainModal);
    mainModalInstance.show();
    updateStepIndicators(1);
  }

  // Proceed to next step: generate image from custom config and send it to crop handler
  function handleCustomNext() {
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

    // Hide custom modal
    const customModalInstance = bootstrap.Modal.getInstance(customBackgroundModal);
    if (customModalInstance) customModalInstance.hide();

    setBackgroundSource("custom");

    // Go to crop immediately
    handleCrop(dataUrl);
    updateStepIndicators(2);
  }

  // Input event listeners
  if (customWidthInput) {
    customWidthInput.addEventListener("input", updatePreviewCanvas);
  }
  if (customHeightInput) {
    customHeightInput.addEventListener("input", updatePreviewCanvas);
  }
  if (customColorSelect) {
    customColorSelect.addEventListener("change", updatePreviewCanvas);
  }

  // Navigation buttons
  if (customBackBtn) {
    customBackBtn.addEventListener("click", handleCustomBack);
  }

  if (customNextBtn) {
    customNextBtn.addEventListener("click", handleCustomNext);
  }

  // Modal event listeners
  if (customBackgroundModal) {
    customBackgroundModal.addEventListener("hidden.bs.modal", cleanup);

    customBackgroundModal.addEventListener("shown.bs.modal", () => {
      setTimeout(initPreviewCanvas, 100);
    });
  }

  // Add resize event listener as fallback
  window.addEventListener("resize", () => {
    if (previewCanvas && customBackgroundModal && customBackgroundModal.classList.contains("show")) {
      clearTimeout(window.customCanvasResizeTimeout);
      window.customCanvasResizeTimeout = setTimeout(() => {
        resizeCanvas();
      }, 100);
    }
  });

  return { initPreviewCanvas, handleCustomBackgroundSelection };
}
