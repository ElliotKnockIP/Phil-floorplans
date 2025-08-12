import { CameraDeviceSerializer } from "./camera-device-save.js";
import { DrawingObjectSerializer } from "./drawing-save.js";

class EnhancedSaveSystem {
  constructor(fabricCanvas) {
    this.fabricCanvas = fabricCanvas;
    this.cameraSerializer = new CameraDeviceSerializer(fabricCanvas);
    this.drawingSerializer = new DrawingObjectSerializer(fabricCanvas);
  }

  isCameraDevice = (deviceType) => CAMERA_TYPES.includes(deviceType);
  isDevice = (obj) => obj.type === "group" && obj.deviceType;

  isManagedObject(obj) {
    return this.isDevice(obj) || (obj.type === "text" && obj.isDeviceLabel) || (obj.type === "polygon" && obj.fill?.includes("165, 155, 155")) || obj.isResizeIcon === true || (obj.type === "circle" && obj.fill === "#f8794b" && obj.radius < 30 && !obj.isWallCircle) || obj.isCoverage === true;
  }

  // Serialize client details from sidebar
  serializeClientDetails() {
    const getValue = (id) => document.getElementById(id)?.value || "";
    const logoImg = document.querySelector("#client-logo-preview img");

    return {
      date: getValue("client-date-input"),
      clientName: getValue("client-name-test-input"),
      address: getValue("address-input"),
      reportTitle: getValue("report-title-input"),
      rev1: getValue("rev-one-input"),
      rev2: getValue("rev-two-input"),
      rev3: getValue("rev-three-input"),
      logoFile: logoImg
        ? {
            present: true,
            src: logoImg.src,
            alt: logoImg.alt || "Client Logo",
          }
        : null,
    };
  }

  saveProject() {
    try {
      // Serialize cameras/devices
      const cameraData = this.cameraSerializer.serializeCameraDevices();

      // Serialize drawing objects (including walls and zones)
      const drawingData = this.drawingSerializer.serializeDrawingObjects();

      // Serialize client details
      const clientDetails = this.serializeClientDetails();

      const allObjects = this.fabricCanvas.getObjects();

      // Store coverage states
      const coverageStates = new Map();
      allObjects.forEach((obj) => {
        if (this.isDevice(obj) && obj.coverageArea) {
          coverageStates.set(obj.id || obj, {
            visible: obj.coverageArea.visible,
            coverageArea: obj.coverageArea,
          });
          obj.coverageArea.set({ visible: true });
        }
      });

      // Temporarily remove managed objects AND drawing objects for clean background serialization
      const managedObjects = allObjects.filter((obj) => this.isManagedObject(obj));
      const drawingObjects = allObjects.filter((obj) => this.drawingSerializer.isDrawingObject(obj));
      const objectsToRemove = [...new Set([...managedObjects, ...drawingObjects])];

      objectsToRemove.forEach((obj) => this.fabricCanvas.remove(obj));

      // Serialize only the background
      const canvasData = this.fabricCanvas.toJSON(["class", "associatedText", "pixelsPerMeter", "isBackground"]);

      // Re-add all objects
      objectsToRemove.forEach((obj) => this.fabricCanvas.add(obj));

      // Restore coverage states
      allObjects.forEach((obj) => {
        if (this.isDevice(obj) && obj.coverageArea) {
          const savedState = coverageStates.get(obj.id || obj);
          if (savedState) {
            obj.coverageArea.visible = savedState.visible;
            obj.coverageArea.set({ visible: savedState.visible });
            if (savedState.visible && obj.createOrUpdateCoverageArea) {
              obj.createOrUpdateCoverageArea();
            }
          }
        }
      });

      this.fabricCanvas.renderAll();

      const projectData = {
        version: "3.2", // Updated version to include defaultDeviceIconSize
        timestamp: new Date().toISOString(),
        cameras: cameraData,
        drawing: drawingData,
        canvas: canvasData,
        clientDetails,
        settings: {
          pixelsPerMeter: this.fabricCanvas.pixelsPerMeter || 17.5,
          zoom: this.fabricCanvas.getZoom(),
          viewportTransform: [...this.fabricCanvas.viewportTransform],
          defaultDeviceIconSize: window.defaultDeviceIconSize || 30, // NEW: Save default device icon size
        },
      };

      this.downloadFile(projectData, `project_${new Date().toISOString().split("T")[0]}.json`);
      this.showNotification("Project saved successfully!", true);
      return true;
    } catch (error) {
      console.error("Error saving project:", error);
      this.showNotification("Error saving project: " + error.message, false);
      return false;
    }
  }

  // Load client details to sidebar form fields
  async loadClientDetailsToSidebar(clientDetails) {
    try {
      // Set form field values
      const setValue = (id, value) => {
        const element = document.getElementById(id);
        if (element && value !== undefined && value !== null) {
          element.value = value;
          // Trigger change event to update any listeners
          element.dispatchEvent(new Event("change", { bubbles: true }));
          element.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };

      setValue("client-date-input", clientDetails.date);
      setValue("client-name-test-input", clientDetails.clientName);
      setValue("address-input", clientDetails.address);
      setValue("report-title-input", clientDetails.reportTitle);
      setValue("rev-one-input", clientDetails.rev1);
      setValue("rev-two-input", clientDetails.rev2);
      setValue("rev-three-input", clientDetails.rev3);

      // Handle client logo
      const logoPreview = document.getElementById("client-logo-preview");
      if (logoPreview && clientDetails.logoFile && clientDetails.logoFile.present) {
        logoPreview.innerHTML = `<img src="${clientDetails.logoFile.src}" alt="${clientDetails.logoFile.alt}" style="max-width: 100%; max-height: 100px;">`;

        // Trigger any logo change events
        const logoChangeEvent = new CustomEvent("logoChanged", {
          detail: { src: clientDetails.logoFile.src },
        });
        logoPreview.dispatchEvent(logoChangeEvent);
      } else if (logoPreview) {
        logoPreview.innerHTML = '<span style="color: #999">No logo selected</span>';
      }

      // Trigger any global update events that the titleblock system might be listening for
      if (typeof window.updateAllTitleBlocks === "function") {
        setTimeout(() => window.updateAllTitleBlocks(), 100);
      }

      console.log("Client details successfully loaded to sidebar");
    } catch (error) {
      console.error("Error loading client details to sidebar:", error);
    }
  }

  downloadFile(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: filename,
    });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async loadProject(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const projectData = JSON.parse(e.target.result);

          // CRITICAL: Reinitialize undo system when loading new project
          if (window.undoSystem) {
            window.undoSystem.reinitialize();
            console.log("Undo system reinitialized for new project load");
          }

          // Unregister coverage event listeners from existing devices
          const existingObjects = this.fabricCanvas.getObjects();
          existingObjects.forEach((obj) => {
            if (this.isDevice(obj) && obj.coverageConfig) {
              ["added", "modified", "moving"].forEach((event) => {
                const handler = obj[`${event}Handler`];
                if (handler) {
                  this.fabricCanvas.off(`object:${event}`, handler);
                }
              });
            }
          });

          // Clear canvas
          this.fabricCanvas.clear();
          this.fabricCanvas.getObjects().forEach((obj) => this.fabricCanvas.remove(obj));
          this.fabricCanvas.renderAll();

          // Reset global state
          const counters = projectData.cameras?.counters || {};
          Object.assign(window, {
            cameraCounter: counters.cameraCounter || 1,
            deviceCounter: counters.deviceCounter || 1,
            zones: [],
            defaultDeviceIconSize: projectData.settings?.defaultDeviceIconSize || 30, // NEW: Restore default device icon size
          });

          // Apply settings
          if (projectData.settings) {
            const { pixelsPerMeter, zoom, viewportTransform } = projectData.settings;
            this.fabricCanvas.pixelsPerMeter = pixelsPerMeter || 17.5;
            if (zoom) this.fabricCanvas.setZoom(zoom);
            if (viewportTransform) this.fabricCanvas.setViewportTransform(viewportTransform);
          }

          // Load client details to sidebar FIRST
          if (projectData.clientDetails) {
            console.log("Loading client details to sidebar...");
            await this.loadClientDetailsToSidebar(projectData.clientDetails);
            console.log("Client details loaded to sidebar");
          }

          // Load background first
          if (projectData.canvas?.objects) {
            const backgroundObjects = projectData.canvas.objects.filter((obj) => obj.type === "image" && (obj.isBackground || (!obj.selectable && !obj.evented)));

            if (backgroundObjects.length > 0) {
              await new Promise((resolveCanvas) => {
                this.fabricCanvas.loadFromJSON(
                  {
                    version: projectData.canvas.version,
                    objects: backgroundObjects,
                  },
                  () => {
                    // Set background flags
                    this.fabricCanvas.getObjects().forEach((obj) => {
                      if (obj.isBackground) {
                        obj.set({
                          selectable: false,
                          evented: false,
                          hoverCursor: "default",
                        });
                      }
                    });
                    this.fabricCanvas.requestRenderAll();
                    resolveCanvas();
                  }
                );
              });
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 100));

          // Load drawing objects (including walls and zones)
          if (projectData.drawing) {
            try {
              await this.drawingSerializer.loadDrawingObjects(projectData.drawing);
            } catch (error) {
              console.error("Error loading drawing objects:", error);
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 200));

          // Load devices last to ensure they're on top
          const devices = projectData.cameras?.cameraDevices;
          if (devices?.length) {
            for (let i = 0; i < devices.length; i++) {
              try {
                await this.cameraSerializer.loadCameraDevice(devices[i]);
                if (i < devices.length - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 50));
                }
              } catch (error) {
                console.error(`Failed to load device ${i + 1}:`, error);
              }
            }
          }

          // Initialize layers
          if (window.initCanvasLayers) window.initCanvasLayers(this.fabricCanvas);

          // Re-categorize layers and ensure proper ordering
          setTimeout(() => {
            const allObjects = this.fabricCanvas.getObjects();

            // Categorize device labels
            allObjects.forEach((obj) => {
              if (obj.type === "text" && obj.isDeviceLabel) {
                const parentDevice = allObjects.find((device) => device.type === "group" && device.deviceType && device.textObject === obj);
                if (parentDevice) obj.parentDeviceType = parentDevice.deviceType;
              }
            });

            // Ensure proper layer order
            if (window.maintainZoneLayerOrder) {
              window.maintainZoneLayerOrder();
            }

            if (window.initCanvasLayers) window.initCanvasLayers(this.fabricCanvas);

            // Trigger titleblock updates after everything is loaded
            if (typeof window.updateAllTitleBlocks === "function") {
              setTimeout(() => window.updateAllTitleBlocks(), 500);
            }

            // CRITICAL: Re-enable undo tracking ONLY after everything is fully loaded
            if (window.undoSystem) {
              setTimeout(() => {
                window.undoSystem.enableTracking();
                console.log("Undo system fully reactivated - ready for user actions");
              }, 100);
            }
          }, 300);

          this.fabricCanvas.requestRenderAll();
          this.showNotification("Project loaded successfully!", true);
          resolve(true);
        } catch (error) {
          console.error("Error loading project:", error);
          this.showNotification("Error loading project: " + error.message, false);
          reject(error);
        }
      };

      reader.onerror = () => {
        this.showNotification("Error reading file", false);
        reject(new Error("Error reading file"));
      };

      reader.readAsText(file);
    });
  }

  isSerializedDevice(obj) {
    return this.isDevice(obj) || (obj.type === "text" && obj.isDeviceLabel) || (obj.type === "polygon" && obj.fill?.includes("165, 155, 155")) || obj.isResizeIcon === true || (obj.type === "circle" && obj.fill === "#f8794b" && obj.radius < 30 && !obj.isWallCircle) || obj.isCoverage === true;
  }

  setupButtonIntegration() {
    const checkButtons = setInterval(() => {
      const saveButton = document.getElementById("save-project-btn");
      const loadButton = document.getElementById("load-project-btn");

      if (saveButton && loadButton) {
        clearInterval(checkButtons);

        // Setup save button
        const originalSaveHandler = saveButton.onclick;
        saveButton.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Call original handler if exists
          if (typeof originalSaveHandler === "function") {
            try {
              originalSaveHandler.call(saveButton, e);
            } catch (err) {
              console.warn("Original save handler failed:", err);
            }
          }

          this.saveProject();
          return false;
        };

        // Setup load button
        this.setupLoadButton(loadButton);
      }
    }, 100);

    setTimeout(() => clearInterval(checkButtons), 10000);
  }

  setupLoadButton(loadButton) {
    // Find the existing file input in the HTML
    const existingFileInput = document.getElementById("load-project-input");

    if (existingFileInput) {
      // Remove any existing event listeners to prevent duplicates
      const newFileInput = existingFileInput.cloneNode(true);
      existingFileInput.parentNode.replaceChild(newFileInput, existingFileInput);

      // Use the existing input from HTML
      newFileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file && confirm("This will replace the current project. Continue?")) {
          try {
            await this.loadProject(file);
          } catch (error) {
            console.error("Load failed:", error);
            this.showNotification("Failed to load project: " + error.message, false);
          }
          newFileInput.value = "";
        }
      });

      // Remove existing click listeners from load button
      const newLoadButton = loadButton.cloneNode(true);
      loadButton.parentNode.replaceChild(newLoadButton, loadButton);

      // Make the load button trigger the file input
      newLoadButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        newFileInput.click();
        return false;
      });
    } else {
      console.warn("Could not find existing load-project-input element");
    }
  }

  showNotification(message, isSuccess = true) {
    const notification = Object.assign(document.createElement("div"), {
      textContent: message,
    });

    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px; padding: 12px 24px;
      background: ${isSuccess ? "#ff6f42" : "#dc3545"}; color: white;
      border-radius: 4px; z-index: 10000; font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2); transition: opacity 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  getCameraSerializer() {
    return this.cameraSerializer;
  }

  getDrawingSerializer() {
    return this.drawingSerializer;
  }
}

export { EnhancedSaveSystem };
