import { layers, initCanvasLayers } from "../canvas/canvas-layers.js";

export function initScaleBackground(fabricCanvas, getCroppedCanvas, updateStepIndicators, closeAllPopups) {
  // DOM Elements - Bootstrap modal
  const scaleModal = document.getElementById("scaleModal");
  const scaleBackBtn = document.getElementById("scale-back-btn");
  const finishScaleBtn = document.getElementById("finish-scale-btn");
  const scaleWrapper = document.getElementById("scale-result-container");
  const scaleDistanceInput = document.getElementById("scale-distance-input");
  const scaleIconSizeInput = document.getElementById("scale-icon-size-input");
  const subSidebar = document.getElementById("sub-sidebar");

  // State Variables
  let scaleCanvas;
  let line, startCircle, endCircle, distanceText;
  let backgroundImage;
  let croppedCanvasData = null;

  // Preview device icons
  let previewCamera, previewDevice;
  let cameraCircle, deviceCircle;
  let cameraText, deviceText;

  function updateStepIndicators(activeStep) {
    const steps = scaleModal?.querySelectorAll(".modal-header-center .step");
    steps?.forEach((step, index) => {
      step.classList.remove("active", "finish");
      if (index + 1 === activeStep) {
        step.classList.add("active");
      } else if (index + 1 < activeStep) {
        step.classList.add("finish");
      }
    });
  }

  // Setup input event listeners for distance and icon size
  function setupInputListeners() {
    if (scaleDistanceInput && !scaleDistanceInput.hasAttribute("data-listener-attached")) {
      scaleDistanceInput.addEventListener("input", handleDistanceChange);
      scaleDistanceInput.setAttribute("data-listener-attached", "true");
    }

    if (scaleIconSizeInput && !scaleIconSizeInput.hasAttribute("data-listener-attached")) {
      scaleIconSizeInput.addEventListener("input", handleIconSizeChange);
      scaleIconSizeInput.setAttribute("data-listener-attached", "true");
    }
  }

  // Handle distance input changes
  function handleDistanceChange() {
    if (distanceText && scaleCanvas) {
      const value = parseFloat(scaleDistanceInput.value);
      if (!isNaN(value) && value > 0) {
        distanceText.set({ text: value + " m" });
        scaleCanvas.requestRenderAll();
      }
    }
  }

  // Handle icon size input changes and update preview devices
  function handleIconSizeChange() {
    let iconSize = parseInt(scaleIconSizeInput.value);

    // Clamp the value between 1 and 100
    if (isNaN(iconSize) || iconSize < 1) iconSize = 1;
    if (iconSize > 100) iconSize = 100;

    // Update the input field if it was clamped
    if (scaleIconSizeInput.value != iconSize) {
      scaleIconSizeInput.value = iconSize;
    }

    // Update preview device icons, NOT measurement circles
    updatePreviewDeviceSize(iconSize);

    if (scaleCanvas) {
      scaleCanvas.requestRenderAll();
    }
  }

  // Update the size of preview device icons
  function updatePreviewDeviceSize(iconSize) {
    if (!scaleCanvas || !backgroundImage) return;

    const scaleFactor = iconSize / 30; // 30 is the default icon size
    const baseIconSize = 30; // Base size for calculations
    const baseCircleRadius = 20;

    // Update camera circle and icon
    if (cameraCircle && previewCamera) {
      const circleRadius = baseCircleRadius * scaleFactor;
      cameraCircle.set({
        radius: circleRadius,
        scaleX: 1,
        scaleY: 1,
      });

      previewCamera.set({
        scaleX: scaleFactor * (baseIconSize / previewCamera.width),
        scaleY: scaleFactor * (baseIconSize / previewCamera.height),
      });

      // Update camera text position and size
      if (cameraText) {
        const cameraCenter = cameraCircle.getCenterPoint();
        cameraText.set({
          top: cameraCenter.y + circleRadius + 10,
          fontSize: 12 * scaleFactor,
        });
      }
    }

    // Update device circle and icon
    if (deviceCircle && previewDevice) {
      const circleRadius = baseCircleRadius * scaleFactor;
      deviceCircle.set({
        radius: circleRadius,
        scaleX: 1,
        scaleY: 1,
      });

      previewDevice.set({
        scaleX: scaleFactor * (baseIconSize / previewDevice.width),
        scaleY: scaleFactor * (baseIconSize / previewDevice.height),
      });

      // Update device text position and size
      if (deviceText) {
        const deviceCenter = deviceCircle.getCenterPoint();
        deviceText.set({
          top: deviceCenter.y + circleRadius + 10,
          fontSize: 12 * scaleFactor,
        });
      }
    }
  }

  // Create preview device icons on the scale canvas
  function createPreviewDevices(canvasWidth, canvasHeight) {
    if (!backgroundImage) return;

    const imgLeft = backgroundImage.left;
    const imgTop = backgroundImage.top;
    const imgWidth = backgroundImage.width * backgroundImage.scaleX;
    const imgHeight = backgroundImage.height * backgroundImage.scaleY;

    // Position devices in the corners of the background image
    const cameraX = imgLeft + imgWidth * 0.2;
    const cameraY = imgTop + imgHeight * 0.2;
    const deviceX = imgLeft + imgWidth * 0.8;
    const deviceY = imgTop + imgHeight * 0.2;

    const initialIconSize = parseInt(scaleIconSizeInput?.value) || 30;
    const scaleFactor = initialIconSize / 30;
    const baseIconSize = 30;
    const baseCircleRadius = 20;
    const circleRadius = baseCircleRadius * scaleFactor;

    // Create camera preview
    cameraCircle = new fabric.Circle({
      left: cameraX,
      top: cameraY,
      radius: circleRadius,
      fill: "#f8794b",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });

    // Load camera icon
    fabric.Image.fromURL(
      "./images/devices/fixed-camera.png",
      (img) => {
        previewCamera = img;
        img.set({
          left: cameraX,
          top: cameraY,
          scaleX: scaleFactor * (baseIconSize / img.width),
          scaleY: scaleFactor * (baseIconSize / img.height),
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
        });

        scaleCanvas.add(img);
        scaleCanvas.bringToFront(img);
      },
      { crossOrigin: "anonymous" }
    );

    // Create camera text
    cameraText = new fabric.Text("Camera 1", {
      left: cameraX,
      top: cameraY + circleRadius + 10,
      fontFamily: "Poppins, sans-serif",
      fontSize: 12 * scaleFactor,
      fill: "#FFFFFF",
      backgroundColor: "rgba(20, 18, 18, 0.8)",
      originX: "center",
      originY: "top",
      selectable: false,
      evented: false,
    });

    // Create device preview
    deviceCircle = new fabric.Circle({
      left: deviceX,
      top: deviceY,
      radius: circleRadius,
      fill: "#f8794b",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });

    // Load device icon
    fabric.Image.fromURL(
      "./images/devices/access-system.png",
      (img) => {
        previewDevice = img;
        img.set({
          left: deviceX,
          top: deviceY,
          scaleX: scaleFactor * (baseIconSize / img.width),
          scaleY: scaleFactor * (baseIconSize / img.height),
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
        });

        scaleCanvas.add(img);
        scaleCanvas.bringToFront(img);
      },
      { crossOrigin: "anonymous" }
    );

    // Create device text
    deviceText = new fabric.Text("Device 1", {
      left: deviceX,
      top: deviceY + circleRadius + 10,
      fontFamily: "Poppins, sans-serif",
      fontSize: 12 * scaleFactor,
      fill: "#FFFFFF",
      backgroundColor: "rgba(20, 18, 18, 0.8)",
      originX: "center",
      originY: "top",
      selectable: false,
      evented: false,
    });

    // Add all elements to canvas
    scaleCanvas.add(cameraCircle, deviceCircle, cameraText, deviceText);

    // Ensure proper layering
    scaleCanvas.bringToFront(cameraCircle);
    scaleCanvas.bringToFront(deviceCircle);
    scaleCanvas.bringToFront(cameraText);
    scaleCanvas.bringToFront(deviceText);
  }

  function initScaleCanvas(croppedCanvas) {
    if (subSidebar) subSidebar.classList.add("hidden");

    // Store cropped canvas data
    croppedCanvasData = croppedCanvas.toDataURL("image/png");

    // Clean up existing canvas
    if (scaleCanvas) {
      scaleCanvas.clear();
      scaleCanvas.dispose();
      scaleCanvas = null;
    }

    // Reset preview elements
    previewCamera = previewDevice = null;
    cameraCircle = deviceCircle = null;
    cameraText = deviceText = null;

    // Pre-create canvas HTML immediately
    scaleWrapper.innerHTML = '<canvas id="scaleCanvas"></canvas>';
    const scaleCanvasElement = document.getElementById("scaleCanvas");

    // Set canvas size to match scaled image
    fabric.Image.fromURL(
      croppedCanvasData,
      (img) => {
        const containerRect = scaleWrapper.getBoundingClientRect();
        const maxWidth = containerRect.width - 20;
        const maxHeight = containerRect.height - 20;
        const imgWidth = img.width;
        const imgHeight = img.height;
        const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        const canvasWidth = imgWidth * scale;
        const canvasHeight = imgHeight * scale;

        scaleCanvasElement.width = canvasWidth;
        scaleCanvasElement.height = canvasHeight;
        scaleCanvasElement.style.width = canvasWidth + "px";
        scaleCanvasElement.style.height = canvasHeight + "px";

        scaleCanvas = new fabric.Canvas("scaleCanvas", {
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: "#ffffff",
          selection: false, // Disable canvas-wide selection
        });

        img.set({
          left: 0,
          top: 0,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
          hoverCursor: "default",
        });

        scaleCanvas.add(img);
        scaleCanvas.sendToBack(img);
        backgroundImage = img;

        // Initialize input values
        if (scaleDistanceInput) scaleDistanceInput.value = 50;
        if (scaleIconSizeInput) {
          scaleIconSizeInput.value = 30;
          scaleIconSizeInput.min = 1;
          scaleIconSizeInput.max = 100;
        }

        // Create scale elements
        const lineLength = imgWidth * scale;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const distance = 50;

        startCircle = new fabric.Circle({
          left: centerX - lineLength / 2,
          top: centerY,
          radius: 5, // Fixed radius
          fill: "#000000",
          originX: "center",
          originY: "center",
          selectable: true,
          evented: true,
          hoverCursor: "move",
          borderColor: "#f8794b",
          borderScaleFactor: 2,
          cornerSize: 8,
          cornerColor: "#f8794b",
          cornerStrokeColor: "#000000",
          cornerStyle: "circle",
          transparentCorners: false,
          padding: 5,
          hasControls: false,
        });

        endCircle = new fabric.Circle({
          left: centerX + lineLength / 2,
          top: centerY,
          radius: 5, // Fixed radius
          fill: "#000000",
          originX: "center",
          originY: "center",
          selectable: true,
          evented: true,
          hoverCursor: "move",
          borderColor: "#f8794b",
          borderScaleFactor: 2,
          cornerSize: 8,
          cornerColor: "#f8794b",
          cornerStrokeColor: "#000000",
          cornerStyle: "circle",
          transparentCorners: false,
          padding: 5,
          hasControls: false,
        });

        line = new fabric.Line([startCircle.left, startCircle.top, endCircle.left, endCircle.top], {
          stroke: "red",
          strokeWidth: 3,
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
        });

        distanceText = new fabric.IText(distance + " m", {
          left: centerX,
          top: centerY - 30,
          fontFamily: "Poppins, sans-serif",
          fontSize: 20,
          fill: "#000000",
          selectable: false,
          editable: false,
          originX: "center",
          originY: "center",
          cursorColor: "#f8794b",
          borderColor: "#f8794b",
          borderScaleFactor: 2,
          cornerSize: 8,
          cornerColor: "#f8794b",
          cornerStrokeColor: "#000000",
          cornerStyle: "circle",
          transparentCorners: false,
          padding: 5,
        });

        function updateLine() {
          const startCenter = startCircle.getCenterPoint();
          const endCenter = endCircle.getCenterPoint();
          line.set({
            x1: startCenter.x,
            y1: startCenter.y,
            x2: endCenter.x,
            y2: endCenter.y,
          });
          line.setCoords();

          const midX = (startCenter.x + endCenter.x) / 2;
          const midY = (startCenter.y + endCenter.y) / 2;
          distanceText.set({
            left: midX,
            top: midY - 30,
          });
          distanceText.setCoords();

          scaleCanvas.requestRenderAll();
        }

        function restrictToImageBounds(circle) {
          if (!backgroundImage) return;

          const imgLeft = backgroundImage.left;
          const imgTop = backgroundImage.top;
          const imgRight = imgLeft + backgroundImage.width * backgroundImage.scaleX;
          const imgBottom = imgTop + backgroundImage.height * backgroundImage.scaleY;

          const circleCenter = circle.getCenterPoint();
          const radius = circle.radius * Math.max(circle.scaleX || 1, circle.scaleY || 1);

          const newLeft = Math.max(imgLeft + radius, Math.min(imgRight - radius, circleCenter.x));
          const newTop = Math.max(imgTop + radius, Math.min(imgBottom - radius, circleCenter.y));

          circle.set({
            left: newLeft,
            top: newTop,
          });
          circle.setCoords();
        }

        startCircle.on("moving", () => {
          restrictToImageBounds(startCircle);
          updateLine();
        });

        endCircle.on("moving", () => {
          restrictToImageBounds(endCircle);
          updateLine();
        });

        distanceText.on("mousedblclick", () => {
          scaleCanvas.setActiveObject(distanceText);
          distanceText.enterEditing();
          distanceText.selectAll();
          scaleCanvas.requestRenderAll();
        });

        distanceText.on("editing:exited", () => {
          let textValue = distanceText.text.trim();
          if (!textValue.endsWith(" m")) {
            textValue = textValue.replace(/[^0-9.]/g, "") + " m";
          }
          distanceText.set({ text: textValue });

          if (scaleDistanceInput) {
            const numericValue = parseFloat(textValue.replace(" m", ""));
            if (!isNaN(numericValue)) {
              scaleDistanceInput.value = numericValue;
            }
          }
          scaleCanvas.requestRenderAll();
        });

        scaleCanvas.add(line, startCircle, endCircle, distanceText);
        scaleCanvas.bringToFront(startCircle);
        scaleCanvas.bringToFront(endCircle);
        scaleCanvas.bringToFront(distanceText);

        createPreviewDevices(canvasWidth, canvasHeight);

        scaleCanvas.requestRenderAll();

        setupInputListeners();
      },
      { crossOrigin: "anonymous" }
    );
  }

  function cleanup() {
    if (scaleCanvas) {
      scaleCanvas.clear();
      scaleCanvas.dispose();
      scaleCanvas = null;
    }
    backgroundImage = null;
    line = startCircle = endCircle = distanceText = null;
    previewCamera = previewDevice = null;
    cameraCircle = deviceCircle = null;
    cameraText = deviceText = null;
    croppedCanvasData = null;

    if (scaleDistanceInput) {
      scaleDistanceInput.removeAttribute("data-listener-attached");
    }
    if (scaleIconSizeInput) {
      scaleIconSizeInput.removeAttribute("data-listener-attached");
    }
  }

  function handleScaleBack() {
    const scaleModalInstance = bootstrap.Modal.getInstance(scaleModal);
    if (scaleModalInstance) scaleModalInstance.hide();

    cleanup();

    setTimeout(() => {
      const cropHandler = window.cropHandlerInstance;
      if (cropHandler && cropHandler.restoreCropModal) {
        cropHandler.restoreCropModal();
      } else {
        const cropModal = document.getElementById("cropModal");
        const cropModalInstance = bootstrap.Modal.getInstance(cropModal) || new bootstrap.Modal(cropModal);
        cropModalInstance.show();
        updateStepIndicators(2);
      }
    }, 200);
  }

  function handleFinish() {
    if (!scaleCanvas || !backgroundImage) return;

    const distanceTextValue = parseFloat(distanceText.text.replace(" m", ""));
    if (isNaN(distanceTextValue) || distanceTextValue <= 0) {
      alert("Please enter a valid distance in meters.");
      return;
    }

    const iconSize = parseInt(scaleIconSizeInput?.value) || 30;
    const validIconSize = Math.max(1, Math.min(100, iconSize));

    const startCenter = startCircle.getCenterPoint();
    const endCenter = endCircle.getCenterPoint();
    const pixelDistance = Math.sqrt(Math.pow(endCenter.x - startCenter.x, 2) + Math.pow(endCenter.y - startCenter.y, 2));

    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();
    const imgWidth = backgroundImage.width;
    const imgHeight = backgroundImage.height;

    const baseScale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight) * 0.8;
    const left = (canvasWidth - imgWidth * baseScale) / 2;
    const top = (canvasHeight - imgHeight * baseScale) / 2;
    const scaledPixelWidth = imgWidth * baseScale;

    const imageWidthInPixels = backgroundImage.width * backgroundImage.scaleX;
    const scaleLineFraction = pixelDistance / imageWidthInPixels;
    const pixelsPerMeter = scaledPixelWidth / (distanceTextValue / scaleLineFraction);

    fabricCanvas.pixelsPerMeter = pixelsPerMeter;

    window.defaultDeviceIconSize = validIconSize;

    fabricCanvas.getObjects().forEach((obj) => {
      if (obj.type === "group" && obj.deviceType) {
        if (obj.textObject) fabricCanvas.remove(obj.textObject);
        if (obj.coverageArea) fabricCanvas.remove(obj.coverageArea);
        if (obj.leftResizeIcon) fabricCanvas.remove(obj.leftResizeIcon);
        if (obj.rightResizeIcon) fabricCanvas.remove(obj.rightResizeIcon);
        if (obj.rotateResizeIcon) fabricCanvas.remove(obj.rotateResizeIcon);
      }
      if (obj.type === "polygon" && obj.class === "zone-polygon" && obj.associatedText) {
        fabricCanvas.remove(obj.associatedText);
      }
      fabricCanvas.remove(obj);
    });
    fabricCanvas.clear();

    layers.zones = { objects: [], visible: true, opacity: 1 };
    layers.drawings = { objects: [], visible: true, opacity: 1 };
    layers.devices = { objects: [], visible: true, opacity: 1 };
    layers.background = { objects: [], visible: true, opacity: 1 };

    window.cameraCounter = 1;
    window.deviceCounter = 1;
    window.zones = [];

    fabric.Image.fromURL(
      backgroundImage._element.src,
      (img) => {
        img.set({
          scaleX: baseScale,
          scaleY: baseScale,
          left: left,
          top: top,
          selectable: false,
          evented: false,
          hoverCursor: "default",
          isBackground: true,
        });

        fabricCanvas.add(img);
        fabricCanvas.sendToBack(img);
        layers.background.objects.push(img);

        initCanvasLayers(fabricCanvas);

        fabricCanvas.setZoom(1);
        fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        fabricCanvas.requestRenderAll();

        const scaleModalInstance = bootstrap.Modal.getInstance(scaleModal);
        if (scaleModalInstance) scaleModalInstance.hide();

        cleanup();
        closeAllPopups();

        if (window.resetCanvasState) {
          window.resetCanvasState();
        }

        console.log(`Default device icon size set to: ${validIconSize}px`);
      },
      { crossOrigin: "anonymous" }
    );
  }

  function handleCropNext(croppedCanvas) {
    if (!croppedCanvas) return;

    const scaleModalInstance = bootstrap.Modal.getInstance(scaleModal) || new bootstrap.Modal(scaleModal);
    scaleModalInstance.show();

    initScaleCanvas(croppedCanvas);
    updateStepIndicators(3);
  }

  if (scaleBackBtn) {
    scaleBackBtn.addEventListener("click", handleScaleBack);
  }

  if (finishScaleBtn) {
    finishScaleBtn.addEventListener("click", handleFinish);
  }

  if (scaleModal) {
    scaleModal.addEventListener("hidden.bs.modal", cleanup);
  }

  return { initScaleCanvas, handleCropNext };
}
