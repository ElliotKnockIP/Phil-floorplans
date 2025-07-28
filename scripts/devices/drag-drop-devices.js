import { addCameraCoverage } from "./camera-coverage.js";

export function initDragDropDevices(fabricCanvas) {
  window.cameraCounter = window.cameraCounter || 1; // Initialize if not set (e.g., on first load)
  window.deviceCounter = window.deviceCounter || 1;

  function isCameraIcon(imgSrc) {
    return imgSrc.includes("camera");
  }

  const canvasElement = fabricCanvas.getElement();
  const canvasContainer = canvasElement.parentElement;

  canvasContainer.style.position = "relative";
  canvasContainer.style.zIndex = "10";

  canvasContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  function closeSubSidebar() {
    const subSidebar = document.getElementById("sub-sidebar");
    subSidebar.classList.add("hidden");
    document.querySelectorAll(".submenu").forEach((submenu) => {
      submenu.classList.add("hidden");
      submenu.classList.remove("show");
    });
  }

  canvasContainer.addEventListener("drop", (e) => {
    e.preventDefault();

    closeSubSidebar();

    const imgSrc = e.dataTransfer.getData("text/plain");
    const rect = canvasElement.getBoundingClientRect();

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const vpt = fabricCanvas.viewportTransform;
    const zoom = fabricCanvas.getZoom();

    const canvasX = (clientX - vpt[4]) / zoom;
    const canvasY = (clientY - vpt[5]) / zoom;

    // Determine label based on device type
    const isCamera = isCameraIcon(imgSrc);
    const labelText = isCamera ? `Camera ${window.cameraCounter++}` : `Device ${window.deviceCounter++}`;

    fabric.Image.fromURL(
      imgSrc,
      (img) => {
        // Set initial image properties with adjusted scaling
        const iconSize = 30; // Target size for the icon
        const scaleFactor = 1; // Initial scale factor
        img.set({
          scaleX: iconSize / img.width,
          scaleY: iconSize / img.height,
          originX: "center",
          originY: "center",
          selectable: false,
          hasControls: false,
          deviceType: imgSrc.split("/").pop(),
          coverageConfig:
            isCamera && (imgSrc.includes("fixed-camera.png") || imgSrc.includes("box-camera.png") || imgSrc.includes("dome-camera.png") || imgSrc.includes("ptz-camera.png") || imgSrc.includes("bullet-camera.png") || imgSrc.includes("thermal-camera.png")) // Add more includes here
              ? {
                  startAngle: 270,
                  endAngle: 0,
                  fillColor: "rgba(165, 155, 155, 0.3)",
                  visible: true,
                  radius: 175,
                  isInitialized: true, // Set flag on creation
                }
              : null,
        });

        // Create an orange circle around the icon
        const circleRadius = 20; // Base radius of the circle
        const circle = new fabric.Circle({
          radius: circleRadius,
          fill: "#FE8800",
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
          hoverCursor: "default",
        });

        // Create a group of the circle and image
        const group = new fabric.Group([circle, img], {
          left: canvasX,
          top: canvasY,
          originX: "center",
          originY: "center",
          selectable: true,
          hasControls: false,
          cornerSize: 8,
          cornerColor: "#FE8800",
          cornerStrokeColor: "#000000",
          cornerStyle: "circle",
          transparentCorners: false,
          borderColor: "#000000",
          borderScaleFactor: 2,
          hoverCursor: isCamera ? "move" : "default",
          subTargetCheck: true,
          scaleFactor: scaleFactor, // Store initial scale factor
        });

        // Store deviceType and coverageConfig on the group
        group.deviceType = img.deviceType;
        group.coverageConfig = img.coverageConfig;

        // Create text label with wrapping
        const text = new fabric.Text(labelText, {
          left: canvasX,
          top: canvasY + circleRadius * scaleFactor + 10, // Position below scaled circle
          fontFamily: "Poppins, sans-serif",
          fontSize: 12,
          fill: "#FFFFFF",
          selectable: false,
          width: 100,
          textAlign: "center",
          lineHeight: 1.2,
          splitByGrapheme: false,
          cursorColor: "#FE8800",
          borderColor: "#FE8800",
          borderScaleFactor: 2,
          cornerSize: 8,
          cornerColor: "#FE8800",
          cornerStrokeColor: "#000000",
          backgroundColor: "rgba(20, 18, 18, 0.8)",
          cornerStyle: "circle",
          transparentCorners: false,
          padding: 5,
          originX: "center",
          originY: "top",
          lockScalingX: true,
          lockScalingY: true,
          isDeviceLabel: true,
        });

        // Store text object in group for easy access
        group.textObject = text;

        // Bind text to group movement, adjusting for wrapped text height
        group.on("moving", () => {
          const groupCenter = group.getCenterPoint();
          const currentScaleFactor = group.scaleFactor || 1;
          text.set({
            left: groupCenter.x,
            top: groupCenter.y + 20 * currentScaleFactor + 10, // Position below scaled circle
          });
          text.setCoords();
          group.bringToFront();
          text.bringToFront();
          fabricCanvas.requestRenderAll();
        });

        // Update text position after text changes
        text.on("changed", () => {
          const groupCenter = group.getCenterPoint();
          const currentScaleFactor = group.scaleFactor || 1;
          text.set({
            left: groupCenter.x,
            top: groupCenter.y + 20 * currentScaleFactor + 10,
          });
          text.setCoords();
          fabricCanvas.renderAll();
        });

        group.on("selected", () => {
          const deviceType = group.deviceType;
          window.showDeviceProperties(deviceType, group.textObject, group);
          group.bringToFront();
          text.bringToFront();
          fabricCanvas.renderAll();
        });

        group.on("deselected", () => {
          window.hideDeviceProperties();
        });

        // Update removal to include text and group
        group.on("removed", () => {
          if (text) fabricCanvas.remove(text);
          if (group.coverageArea) fabricCanvas.remove(group.coverageArea);
          if (group.leftResizeIcon) fabricCanvas.remove(group.leftResizeIcon);
          if (group.rightResizeIcon) fabricCanvas.remove(group.rightResizeIcon);
          if (group.rotateResizeIcon) fabricCanvas.remove(group.rotateResizeIcon);
          fabricCanvas.renderAll();
        });

        // Add group and text to canvas
        fabricCanvas.add(group);
        fabricCanvas.add(text);
        group.bringToFront();
        text.bringToFront();
        fabricCanvas.setActiveObject(group);

        if ((isCamera && imgSrc.includes("fixed-camera.png")) || imgSrc.includes("box-camera.png") || imgSrc.includes("dome-camera.png") || imgSrc.includes("ptz-camera.png") || imgSrc.includes("bullet-camera.png") || imgSrc.includes("thermal-camera.png")) {
          addCameraCoverage(fabricCanvas, group);
        }

        fabricCanvas.renderAll();
      },
      { crossOrigin: "anonymous" }
    );
  });

  document.addEventListener("keydown", (e) => {
    const deviceLabelInput = document.getElementById("device-label-input");
    // Only proceed with deletion if the device label input is not focused
    if ((e.key === "Delete" || e.key === "Backspace") && fabricCanvas.getActiveObject() && document.activeElement !== deviceLabelInput) {
      const activeObj = fabricCanvas.getActiveObject();
      if (activeObj.type === "group") {
        activeObj.fire("removed");
        fabricCanvas.remove(activeObj);
        fabricCanvas.discardActiveObject();
        window.hideDeviceProperties();
        fabricCanvas.renderAll();
      }
    }
  });
}
