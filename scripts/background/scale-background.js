import { layers, initCanvasLayers } from "../canvas/canvas-layers.js";

export function initScaleBackground(fabricCanvas, getCroppedCanvas, updateStepIndicators, closeAllPopups) {
  // DOM Elements
  const scalePopup = document.getElementById("scale-popup");
  const closeScaleBtn = document.getElementById("closeScaleBtn");
  const scaleBackBtn = document.getElementById("scaleBackBtn");
  const finishScaleBtn = document.getElementById("finishScaleBtn");
  const scaleWrapper = document.getElementById("scaleWrapper");
  const cropPopup = document.getElementById("crop-popup");
  const subSidebar = document.getElementById("sub-sidebar");

  // State Variables
  let scaleCanvas;
  let line, startCircle, endCircle, distanceText;
  let backgroundImage;

  function initScaleCanvas(croppedCanvas) {
    subSidebar.classList.add("hidden");
    scaleWrapper.innerHTML = '<canvas id="scaleCanvas"></canvas>';
    const scaleCanvasElement = document.getElementById("scaleCanvas");

    scaleCanvasElement.width = scaleWrapper.clientWidth;
    scaleCanvasElement.height = scaleWrapper.clientHeight;

    scaleCanvas = new fabric.Canvas("scaleCanvas", {
      width: scaleWrapper.clientWidth,
      height: scaleWrapper.clientHeight,
      backgroundColor: "#42434a",
    });

    const dataUrl = croppedCanvas.toDataURL("image/png");
    fabric.Image.fromURL(
      dataUrl,
      (img) => {
        const canvasWidth = scaleCanvas.getWidth();
        const canvasHeight = scaleCanvas.getHeight();
        const imgWidth = img.width;
        const imgHeight = img.height;

        const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
        const left = (canvasWidth - imgWidth * scale) / 2;
        const top = (canvasHeight - imgHeight * scale) / 2;

        img.set({
          left: left,
          top: top,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
          hoverCursor: "default",
        });

        scaleCanvas.add(img);
        scaleCanvas.sendToBack(img);
        backgroundImage = img; // Store background image reference

        const lineLength = imgWidth * scale; // Initial line spans image width
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        startCircle = new fabric.Circle({
          left: centerX - lineLength / 2,
          top: centerY,
          radius: 5,
          fill: "black",
          stroke: "#FE8800",
          strokeWidth: 2,
          originX: "center",
          originY: "center",
          selectable: true,
          evented: true,
          hasControls: false,
          borderColor: "#FE8800",
          borderScaleFactor: 2,
          cornerSize: 8,
          cornerColor: "#FE8800",
          cornerStrokeColor: "#000000",
          cornerStyle: "circle",
          transparentCorners: false,
          padding: 5,
        });

        endCircle = new fabric.Circle({
          left: centerX + lineLength / 2,
          top: centerY,
          radius: 5,
          fill: "black",
          stroke: "#FE8800",
          strokeWidth: 2,
          originX: "center",
          originY: "center",
          selectable: true,
          evented: true,
          hasControls: false,
          borderColor: "#FE8800",
          borderScaleFactor: 2,
          cornerSize: 8,
          cornerColor: "#FE8800",
          cornerStrokeColor: "#000000",
          cornerStyle: "circle",
          transparentCorners: false,
          padding: 5,
        });

        line = new fabric.Line([startCircle.left, startCircle.top, endCircle.left, endCircle.top], {
          stroke: "red",
          strokeWidth: 3,
          selectable: false,
          evented: false,
          lockMovementX: true,
          lockMovementY: true,
        });

        distanceText = new fabric.IText("50 m", {
          left: centerX,
          top: centerY - 30,
          fontFamily: "Poppins, sans-serif",
          fontSize: 20,
          fill: "#000000",
          selectable: true,
          editable: true,
          originX: "center",
          originY: "center",
          cursorColor: "#FE8800",
          borderColor: "#FE8800",
          borderScaleFactor: 2,
          cornerSize: 8,
          cornerColor: "#FE8800",
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
          scaleCanvas.requestRenderAll();
        });

        scaleCanvas.add(line, startCircle, endCircle, distanceText);
        scaleCanvas.bringToFront(startCircle);
        scaleCanvas.bringToFront(endCircle);
        scaleCanvas.bringToFront(distanceText);
        scaleCanvas.requestRenderAll();
      },
      { crossOrigin: "anonymous" }
    );
  }

  closeScaleBtn.addEventListener("click", closeAllPopups);

  scaleBackBtn.addEventListener("click", () => {
    scalePopup.style.display = "none";
    cropPopup.style.display = "block";
    updateStepIndicators(2);
    if (scaleCanvas) {
      scaleCanvas.clear();
      scaleCanvas.dispose();
      scaleCanvas = null;
    }
  });

  finishScaleBtn.addEventListener("click", () => {
    if (!scaleCanvas || !backgroundImage) return;

    const distanceTextValue = parseFloat(distanceText.text.replace(" m", ""));
    if (isNaN(distanceTextValue) || distanceTextValue <= 0) {
      alert("Please enter a valid distance in meters.");
      return;
    }

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

    // Thoroughly clear the canvas
    fabricCanvas.getObjects().forEach((obj) => {
      // Handle devices (e.g., cameras) with associated objects
      if (obj.type === "group" && obj.deviceType) {
        if (obj.textObject) fabricCanvas.remove(obj.textObject);
        if (obj.coverageArea) fabricCanvas.remove(obj.coverageArea);
        if (obj.leftResizeIcon) fabricCanvas.remove(obj.leftResizeIcon);
        if (obj.rightResizeIcon) fabricCanvas.remove(obj.rightResizeIcon);
        if (obj.rotateResizeIcon) fabricCanvas.remove(obj.rotateResizeIcon);
      }
      // Handle zones with associated text
      if (obj.type === "polygon" && obj.class === "zone-polygon" && obj.associatedText) {
        fabricCanvas.remove(obj.associatedText);
      }
      fabricCanvas.remove(obj);
    });
    fabricCanvas.clear(); // Ensure internal state is cleared

    // Reset layers object
    layers.zones = { objects: [], visible: true, opacity: 1 };
    layers.drawings = { objects: [], visible: true, opacity: 1 };
    layers.devices = { objects: [], visible: true, opacity: 1 };
    layers.background = { objects: [], visible: true, opacity: 1 };

    window.cameraCounter = 1;
    window.deviceCounter = 1;
    window.zones = [];

    // Add the new background image
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
          isBackground: true, // Flag to identify background image
        });

        fabricCanvas.add(img);
        fabricCanvas.sendToBack(img);
        layers.background.objects.push(img); // Add to layers for proper management

        // Reinitialize canvas layers to restore event listeners and update layer states
        initCanvasLayers(fabricCanvas);

        // Reset canvas properties
        fabricCanvas.setZoom(1);
        fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

        fabricCanvas.requestRenderAll();
        closeAllPopups();

        // Clean up scale canvas
        if (scaleCanvas) {
          scaleCanvas.clear();
          scaleCanvas.dispose();
          scaleCanvas = null;
        }
      },
      { crossOrigin: "anonymous" }
    );

    // Reset global state
    if (window.resetCanvasState) {
      window.resetCanvasState();
    }

    // Reset camera and device counters
    window.cameraCounter = 1;
    window.deviceCounter = 1;
  });

  function handleCropNext(croppedCanvas) {
    if (!croppedCanvas) return;
    scalePopup.style.display = "block";
    initScaleCanvas(croppedCanvas);
    updateStepIndicators(3);
  }

  return { initScaleCanvas, handleCropNext };
}
