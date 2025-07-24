export function initCustomBackground(fabricCanvas, selectBackgroundPopup, updateStepIndicators, handleCrop, setBackgroundSource) {
  // DOM Elements
  const customPopup = document.getElementById("custom-popup");
  const closecustomBtn = document.getElementById("closecustomBtn");
  const customBackBtn = document.getElementById("customBackBtn");
  const customNextBtn = document.getElementById("customNextBtn");
  const customWidthInput = document.getElementById("customWidth");
  const customHeightInput = document.getElementById("customHeight");
  const customColorSelect = document.getElementById("customColor");
  const customPreviewWrapper = document.getElementById("customPreviewWrapper");
  const customPreviewCanvas = document.getElementById("customPreviewCanvas");
  const customBackground = document.getElementById("custom-background-btn");
  const subSidebar = document.getElementById("sub-sidebar");

  let previewCanvas;
  let customBackgroundRect;

  // Initializes the preview canvas for showing a visual representation of the custom background
  function initPreviewCanvas() {
    customPreviewCanvas.width = customPreviewWrapper.clientWidth;
    customPreviewCanvas.height = customPreviewWrapper.clientHeight;

    previewCanvas = new fabric.Canvas("customPreviewCanvas", {
      width: customPreviewWrapper.clientWidth,
      height: customPreviewWrapper.clientHeight,
      backgroundColor: "#42434a",
    });

    updatePreviewCanvas();
  }

  // Updates the preview canvas based on input dimensions and selected color
  function updatePreviewCanvas() {
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

  // Opens the custom background popup and initializes preview
  customBackground.addEventListener("click", () => {
    subSidebar.classList.add("hidden"); // Hide side menu
    document.querySelectorAll(".submenu").forEach((submenu) => {
      submenu.classList.add("hidden");
      submenu.classList.remove("show");
    });

    selectBackgroundPopup.style.display = "none";
    customPopup.style.display = "block";
    initPreviewCanvas(); // Create preview canvas
    updateStepIndicators(1); // Indicate user is on step 1
  });

  customWidthInput.addEventListener("input", updatePreviewCanvas);
  customHeightInput.addEventListener("input", updatePreviewCanvas);
  customColorSelect.addEventListener("change", updatePreviewCanvas);

  // Go back to background selection screen and clean up canvas
  customBackBtn.addEventListener("click", () => {
    customPopup.style.display = "none";
    selectBackgroundPopup.style.display = "block";
    updateStepIndicators(1);
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
