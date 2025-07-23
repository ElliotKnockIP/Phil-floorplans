import { initCanvasOperations } from "./canvas-operations.js";
import { initDragDropDevices } from "../devices/drag-drop-devices.js";
import { initAddWalls } from "../drawing/walls.js";
import { initSelectBackground } from "../background/select-background.js";
import { initCreateZones } from "../drawing/zones.js";
import { initSquare } from "../drawing/square.js";
import { initLine } from "../drawing/line.js";
import { initConnection } from "../drawing/connection.js";
import { initText } from "../drawing/text.js";
import { initArrow } from "../drawing/arrow.js";
import { initCircle } from "../drawing/circle.js";
import { initMeasurement } from "../drawing/measurement.js";
import { initApexMeasurement } from "../drawing/apex.js";
import { initTitleBlock } from "../drawing/titleblock.js";
import { initCameraControls } from "../devices/camera-controls.js";
import { initImageUpload } from "../drawing/upload-image.js";
import { initCanvasLayers } from "./canvas-layers.js";
import { initSaveProject } from "../save/save-project.js";
import { initCanvasPrint } from "./canvas-print.js";
import { initDescriptionBox } from "../drawing/description-box.js";
import { initCanvasCrop } from "./canvas-crop.js";
import { initBuildingFront } from "../drawing/building-front.js";

// Patch CanvasRenderingContext2D.textBaseline setter to fix "alphabetical" typo
(function () {
  const ctxProto = CanvasRenderingContext2D.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(ctxProto, "textBaseline");

  if (descriptor && descriptor.set) {
    const originalSetter = descriptor.set;
    Object.defineProperty(ctxProto, "textBaseline", {
      set: function (value) {
        if (value === "alphabetical") {
          value = "alphabetic";
        }
        originalSetter.call(this, value);
      },
    });
  }
})();

// Fix for Canvas2D willReadFrequently warning
(function () {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (contextType, contextAttributes) {
    if (contextType === "2d" || contextType === "webgl" || contextType === "webgl2") {
      contextAttributes = contextAttributes || {};
      if (contextType === "2d") {
        contextAttributes.willReadFrequently = true;
      }
    }
    return originalGetContext.call(this, contextType, contextAttributes);
  };
})();

window.onload = function () {
  const container = document.querySelector(".canvas-container");
  const fabricCanvas = new fabric.Canvas("canvas-layout", {
    width: container.clientWidth,
    height: container.clientHeight,
  });

  // Initialize canvas features
  initCanvasOperations(fabricCanvas);
  initDragDropDevices(fabricCanvas);
  initAddWalls(fabricCanvas);
  initSelectBackground(fabricCanvas);
  initCreateZones(fabricCanvas);
  initSquare(fabricCanvas);
  initLine(fabricCanvas);
  initText(fabricCanvas);
  initArrow(fabricCanvas);
  initCircle(fabricCanvas);
  initMeasurement(fabricCanvas);
  initApexMeasurement(fabricCanvas);
  initCameraControls(fabricCanvas);
  initImageUpload(fabricCanvas);
  initCanvasLayers(fabricCanvas);
  initConnection(fabricCanvas);
  initSaveProject(fabricCanvas);
  initCanvasPrint(fabricCanvas);
  initTitleBlock(fabricCanvas);
  initDescriptionBox(fabricCanvas);
  initCanvasCrop(fabricCanvas);
  initBuildingFront(fabricCanvas);

  // Handle window resize
  window.addEventListener("resize", () => {
    fabricCanvas.setDimensions({
      width: container.clientWidth,
      height: container.clientHeight,
    });

    const vpt = fabricCanvas.viewportTransform;
    const zoom = fabricCanvas.getZoom();
    vpt[4] = (container.clientWidth - fabricCanvas.getWidth() * zoom) / 2;
    vpt[5] = (container.clientHeight - fabricCanvas.getHeight() * zoom) / 2;
    fabricCanvas.setViewportTransform(vpt);

    fabricCanvas.requestRenderAll();
  });
};
