import { initCanvasOperations } from "./canvas-operations.js";
import { initDragDropDevices } from "../devices/drag-drop-devices.js";
import { initSelectBackground } from "../background/select-background.js";
import { initCanvasLayers } from "./canvas-layers.js";
import { initCanvasPrint } from "./canvas-print.js";
import { initCanvasCrop } from "./canvas-crop.js";
import { initCanvasSnapping } from "./canvas-snapping.js";

import { setupTextTools } from "../drawing/text-tools.js";
import { setupShapeTools } from "../drawing/shapes.js";
import { setupMeasurementTools } from "../drawing/measurements.js";
import { setupWallTool } from "../drawing/walls.js";
import { setupZoneTool } from "../drawing/zones.js";
import { setupNorthArrowTool } from "../drawing/north-arrow.js";
import { setupTitleBlockTool } from "../drawing/titleblock.js";
import { setupLineTools } from "../drawing/lines.js";
import { setupBuildingFrontTool } from "../drawing/building-front.js";
import { setupImageUploadTool } from "../drawing/upload-image.js";

// Import the enhanced save system for camera integration
import { EnhancedSaveSystem } from "../save/enhanced-save-system.js";
import { addCameraCoverage } from "../devices/camera-coverage.js";

// Import the new undo system
import { CanvasUndoSystem } from "./canvas-undo.js";

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

  // Initialize canvas features (original functionality)
  initCanvasOperations(fabricCanvas);
  initDragDropDevices(fabricCanvas);
  initSelectBackground(fabricCanvas);

  initCanvasLayers(fabricCanvas);
  initCanvasPrint(fabricCanvas);
  initCanvasCrop(fabricCanvas);
  initCanvasSnapping(fabricCanvas);

  setupTextTools(fabricCanvas);
  setupShapeTools(fabricCanvas);
  setupMeasurementTools(fabricCanvas);
  setupWallTool(fabricCanvas);
  setupZoneTool(fabricCanvas);
  setupNorthArrowTool(fabricCanvas);
  setupTitleBlockTool(fabricCanvas);
  setupLineTools(fabricCanvas);
  setupBuildingFrontTool(fabricCanvas);
  setupImageUploadTool(fabricCanvas);

  // Initialize enhanced save system for camera integration
  window.addCameraCoverage = addCameraCoverage; // Make globally available
  const enhancedSaveSystem = new EnhancedSaveSystem(fabricCanvas);
  enhancedSaveSystem.setupButtonIntegration();

  // Make available globally for external use
  window.enhancedSaveSystem = enhancedSaveSystem;
  window.cameraSerializer = enhancedSaveSystem.getCameraSerializer();

  // Initialize undo system
  const undoSystem = new CanvasUndoSystem(fabricCanvas);
  window.undoSystem = undoSystem;

  // Expose command classes for external use
  window.UndoCommands = {
    AddCommand: CanvasUndoSystem.AddCommand,
    RemoveCommand: CanvasUndoSystem.RemoveCommand,
    MultipleCommand: CanvasUndoSystem.MultipleCommand,
  };

  // Handle window resize (original functionality)
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

  // Add keyboard shortcuts for enhanced save system and undo
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "s") {
        e.preventDefault();
        enhancedSaveSystem.saveProject();
      }
      if (e.key === "o") {
        e.preventDefault();
        const loadInput = document.getElementById("enhanced-load-project-input");
        if (loadInput) loadInput.click();
      }
      // Undo shortcut is handled in the undo system itself
    }
  });

  console.log("Canvas initialized with camera save/load integration and simple undo system");
};
