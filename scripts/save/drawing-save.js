// Serializes and loads drawing objects (shapes, text, lines, arrows, etc.)
class DrawingObjectSerializer {
  constructor(fabricCanvas) {
    this.fabricCanvas = fabricCanvas;
  }

  // Standard styling configuration that should be applied to drawing objects
  getStandardObjectStyle() {
    return {
      borderColor: "#f8794b",
      borderScaleFactor: 2,
      cornerSize: 8,
      cornerColor: "#f8794b",
      cornerStrokeColor: "#000000",
      cornerStyle: "circle",
      padding: 5,
      transparentCorners: false,
      hasControls: true,
      hasBorders: true,
      selectable: true,
      evented: true,
    };
  }

  // Apply standard styling to an object
  applyStandardStyling(obj, customControls = null) {
    const standardStyle = this.getStandardObjectStyle();
    obj.set(standardStyle);

    // Override hasControls if specified
    if (customControls !== null) {
      obj.set({ hasControls: customControls });
    }

    return obj;
  }

  // Check if object is a drawing object (not camera/device/background)
  isDrawingObject(obj) {
    if (obj.isCoverage) return false;
    if (obj.isBackground) return false;
    if (obj.type === "group" && obj.deviceType && obj.deviceType !== "title-block") return false;
    if (obj.type === "text" && obj.isDeviceLabel) return false;
    if (obj.type === "polygon" && obj.fill?.includes("165, 155, 155")) return false;
    if (obj.isResizeIcon === true) return false;
    if (obj.type === "circle" && obj.fill === "#f8794b" && obj.radius < 30 && !obj.isWallCircle) return false;

    // Include specific drawing object types
    if (obj.type === "image" && obj.isUploadedImage) return true;
    if (obj.type === "group" && obj.deviceType === "title-block") return true;
    if (obj.type === "group" && obj.isArrow) return true; // Include arrows
    if (obj.type === "line" && obj.isConnectionLine) return true; // Include connection lines
    if (this.isZoneObject(obj) || this.isWallObject(obj)) return true;
    if (obj.type === "image" && !obj.selectable && !obj.evented) return false;

    return true;
  }

  // Check if object is a zone
  isZoneObject(obj) {
    return (obj.type === "polygon" && obj.class === "zone-polygon") || (obj.type === "i-text" && obj.class === "zone-text");
  }

  // Check if object is a wall component
  isWallObject(obj) {
    return (obj.type === "line" && !obj.deviceType && !obj.isResizeIcon && obj.stroke !== "grey" && obj.stroke !== "blue") || (obj.type === "circle" && obj.isWallCircle === true);
  }

  // Check if object is a titleblock
  isTitleBlockObject(obj) {
    return obj.type === "group" && obj.deviceType === "title-block";
  }

  // Serialize all drawing objects
  serializeDrawingObjects() {
    const drawingObjects = this.fabricCanvas
      .getObjects()
      .filter((obj) => this.isDrawingObject(obj))
      .map((obj) => this.serializeDrawingObject(obj))
      .filter(Boolean);

    const zones = this.serializeZones();
    const walls = this.serializeWalls();
    const titleblocks = this.serializeTitleBlocks();

    return {
      drawingObjects,
      zones,
      walls,
      titleblocks,
      canvasSettings: {
        pixelsPerMeter: this.fabricCanvas.pixelsPerMeter || 17.5,
        zoom: this.fabricCanvas.getZoom(),
        viewportTransform: [...this.fabricCanvas.viewportTransform],
      },
      globalState: {
        zonesArray: window.zones || [],
      },
    };
  }

  // Serialize individual drawing object
  serializeDrawingObject(obj) {
    try {
      if (this.isZoneObject(obj) || this.isWallObject(obj) || this.isTitleBlockObject(obj)) {
        return null; // These are handled separately
      }

      const baseData = {
        id: obj.id || `drawing_${Date.now()}_${Math.random()}`,
        type: obj.type,
        position: { left: obj.left, top: obj.top, originX: obj.originX, originY: obj.originY },
        transform: {
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1,
          angle: obj.angle || 0,
          skewX: obj.skewX || 0,
          skewY: obj.skewY || 0,
        },
        visual: {
          opacity: obj.opacity || 1,
          visible: obj.visible !== false,
          selectable: obj.selectable !== false,
          evented: obj.evented !== false,
          hasControls: obj.hasControls || false,
          hasBorders: obj.hasBorders !== false,
          // Preserve styling properties
          borderColor: obj.borderColor || "#f8794b",
          borderScaleFactor: obj.borderScaleFactor || 2,
          cornerSize: obj.cornerSize || 8,
          cornerColor: obj.cornerColor || "#f8794b",
          cornerStrokeColor: obj.cornerStrokeColor || "#000000",
          cornerStyle: obj.cornerStyle || "circle",
          transparentCorners: obj.transparentCorners !== undefined ? obj.transparentCorners : false,
        },
        customProperties: this.extractCustomProperties(obj),
      };

      if (obj.type === "image" && obj.isUploadedImage) {
        return {
          ...baseData,
          drawingType: "uploadedImage",
          properties: {
            width: obj.width,
            height: obj.height,
            src: obj._element ? obj._element.src : null,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
          },
          lockState: {
            isLocked: obj.isLocked || false,
            lockMovementX: obj.lockMovementX || false,
            lockMovementY: obj.lockMovementY || false,
            lockRotation: obj.lockRotation || false,
            lockScalingX: obj.lockScalingX || false,
            lockScalingY: obj.lockScalingY || false,
          },
          isUploadedImage: true,
        };
      }

      switch (obj.type) {
        case "circle":
          return {
            ...baseData,
            drawingType: "circle",
            properties: {
              radius: obj.radius,
              fill: obj.fill,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              strokeDashArray: obj.strokeDashArray,
              strokeUniform: obj.strokeUniform,
            },
          };
        case "rect":
          return {
            ...baseData,
            drawingType: "rectangle",
            properties: {
              width: obj.width,
              height: obj.height,
              fill: obj.fill,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              strokeDashArray: obj.strokeDashArray,
              strokeUniform: obj.strokeUniform,
            },
          };
        case "i-text":
        case "textbox":
          return {
            ...baseData,
            drawingType: "text",
            properties: {
              text: obj.text,
              fontSize: obj.fontSize,
              fontFamily: obj.fontFamily,
              fill: obj.fill,
              backgroundColor: obj.backgroundColor,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              width: obj.width,
              height: obj.height,
              textAlign: obj.textAlign,
              lineHeight: obj.lineHeight,
              charSpacing: obj.charSpacing,
              cursorColor: obj.cursorColor,
            },
          };
        case "line":
          return {
            ...baseData,
            drawingType: "line",
            properties: {
              x1: obj.x1,
              y1: obj.y1,
              x2: obj.x2,
              y2: obj.y2,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
              strokeDashArray: obj.strokeDashArray, // Preserve dash array for connection lines
            },
          };
        case "triangle":
          return {
            ...baseData,
            drawingType: "triangle",
            properties: {
              width: obj.width,
              height: obj.height,
              fill: obj.fill,
              stroke: obj.stroke,
              strokeWidth: obj.strokeWidth,
            },
          };
        case "group":
          const groupType = this.determineGroupType(obj);

          // Special handling for arrows
          if (groupType === "arrow" || obj.isArrow) {
            const objects = obj.getObjects();
            const lineObj = objects.find((o) => o.type === "line");
            const triangleObj = objects.find((o) => o.type === "triangle");

            return {
              ...baseData,
              drawingType: "arrow",
              properties: {
                width: obj.width,
                height: obj.height,
              },
              arrowData: {
                line: {
                  x1: lineObj.x1,
                  y1: lineObj.y1,
                  x2: lineObj.x2,
                  y2: lineObj.y2,
                  stroke: lineObj.stroke,
                  strokeWidth: lineObj.strokeWidth,
                  strokeDashArray: lineObj.strokeDashArray,
                },
                triangle: {
                  width: triangleObj.width,
                  height: triangleObj.height,
                  fill: triangleObj.fill,
                  angle: triangleObj.angle,
                },
                endPoint: {
                  x: lineObj.x2,
                  y: lineObj.y2,
                },
              },
            };
          }

          if (groupType === "measurement") {
            const [lineObj, textObj] = obj.getObjects();
            const groupCenter = obj.getCenterPoint();
            const lineData = {
              type: "line",
              properties: {
                x1: lineObj.x1,
                y1: lineObj.y1,
                x2: lineObj.x2,
                y2: lineObj.y2,
                stroke: lineObj.stroke,
                strokeWidth: lineObj.strokeWidth,
                strokeDashArray: lineObj.strokeDashArray,
              },
              visual: {
                selectable: lineObj.selectable !== false,
                evented: lineObj.evented !== false,
              },
            };
            const textData = {
              type: "i-text",
              properties: {
                text: textObj.text,
                fontSize: textObj.fontSize,
                fontFamily: textObj.fontFamily,
                fill: textObj.fill,
                originX: textObj.originX,
                originY: textObj.originY,
              },
              visual: {
                selectable: textObj.selectable !== false,
                evented: textObj.evented !== false,
              },
              position: {
                left: textObj.left,
                top: textObj.top,
              },
            };
            return {
              ...baseData,
              drawingType: "group",
              groupType: "measurement",
              properties: {
                width: obj.width,
                height: obj.height,
              },
              measurementData: {
                line: lineData,
                text: textData,
                groupCenter: { x: groupCenter.x, y: groupCenter.y },
              },
            };
          }
          return {
            ...baseData,
            drawingType: "group",
            groupType,
            properties: {
              width: obj.width,
              height: obj.height,
            },
            objects: obj.getObjects().map((subObj) => this.serializeDrawingObject(subObj)),
          };
        case "image":
          return this.serializeImage(obj, baseData);
        default:
          return { ...baseData, drawingType: "generic", fabricObject: obj.toObject() };
      }
    } catch (error) {
      console.error("Error serializing drawing object:", error, obj);
      return null;
    }
  }

  // Load individual drawing object
  async loadDrawingObject(objectData) {
    return new Promise((resolve, reject) => {
      try {
        const duplicate = this.fabricCanvas.getObjects().find((obj) => obj.id === objectData.id || (obj.type === objectData.type && Math.abs(obj.left - objectData.position.left) < 1 && Math.abs(obj.top - objectData.position.top) < 1));

        if (duplicate) return resolve(duplicate);

        switch (objectData.drawingType) {
          case "circle":
            const circle = new fabric.Circle({
              ...objectData.position,
              ...objectData.transform,
              ...objectData.visual,
              ...objectData.properties,
              ...objectData.customProperties,
            });
            circle.id = objectData.id;

            // Apply standard styling if it wasn't preserved
            if (!objectData.visual.borderColor || objectData.visual.borderColor !== "#f8794b") {
              this.applyStandardStyling(circle);
            }

            this.fabricCanvas.add(circle);
            resolve(circle);
            break;

          case "rectangle":
            const rect = new fabric.Rect({
              ...objectData.position,
              ...objectData.transform,
              ...objectData.visual,
              ...objectData.properties,
              ...objectData.customProperties,
            });
            rect.id = objectData.id;

            // Apply standard styling if it wasn't preserved
            if (!objectData.visual.borderColor || objectData.visual.borderColor !== "#f8794b") {
              this.applyStandardStyling(rect);
            }

            this.fabricCanvas.add(rect);
            resolve(rect);
            break;

          case "text":
            const TextClass = objectData.properties.width ? fabric.Textbox : fabric.IText;
            const text = new TextClass(objectData.properties.text, {
              ...objectData.position,
              ...objectData.transform,
              ...objectData.visual,
              ...objectData.properties,
              ...objectData.customProperties,
            });
            text.id = objectData.id;

            // Apply standard styling if it wasn't preserved
            if (!objectData.visual.borderColor || objectData.visual.borderColor !== "#f8794b") {
              this.applyStandardStyling(text);
            }

            this.fabricCanvas.add(text);
            resolve(text);
            break;

          case "line":
            const line = new fabric.Line([objectData.properties.x1, objectData.properties.y1, objectData.properties.x2, objectData.properties.y2], {
              ...objectData.position,
              ...objectData.transform,
              ...objectData.visual,
              stroke: objectData.properties.stroke,
              strokeWidth: objectData.properties.strokeWidth,
              strokeDashArray: objectData.properties.strokeDashArray, // Preserve dash array
              ...objectData.customProperties,
            });
            line.id = objectData.id;

            // Always ensure lines have orange borders but no controls
            line.set({
              borderColor: "#f8794b",
              borderScaleFactor: 2,
              cornerSize: 8,
              cornerColor: "#f8794b",
              cornerStrokeColor: "#000000",
              cornerStyle: "circle",
              transparentCorners: false,
              hasControls: false, // Lines don't need resize controls
              hasBorders: true,
              selectable: true,
              evented: true,
            });

            this.fabricCanvas.add(line);
            resolve(line);
            break;

          case "triangle":
            const triangle = new fabric.Triangle({
              ...objectData.position,
              ...objectData.transform,
              ...objectData.visual,
              ...objectData.properties,
              ...objectData.customProperties,
            });
            triangle.id = objectData.id;

            // Apply standard styling if it wasn't preserved
            if (!objectData.visual.borderColor || objectData.visual.borderColor !== "#f8794b") {
              this.applyStandardStyling(triangle);
            }

            this.fabricCanvas.add(triangle);
            resolve(triangle);
            break;

          case "arrow":
            // Proper arrow reconstruction using the same method as original creation
            const { line: lineData, endPoint } = objectData.arrowData;
            const dx = lineData.x2 - lineData.x1;
            const dy = lineData.y2 - lineData.y1;
            const angle = Math.atan2(dy, dx);

            const lineObj = new fabric.Line([lineData.x1, lineData.y1, lineData.x2, lineData.y2], {
              stroke: lineData.stroke,
              strokeWidth: lineData.strokeWidth,
              strokeDashArray: lineData.strokeDashArray,
              selectable: false,
              evented: false,
            });

            const triangleObj = new fabric.Triangle({
              left: lineData.x2,
              top: lineData.y2,
              originX: "center",
              originY: "center",
              width: 10,
              height: 10,
              fill: lineData.stroke,
              angle: (angle * 180) / Math.PI + 90,
              selectable: false,
              evented: false,
            });

            const group = new fabric.Group([lineObj, triangleObj], {
              left: objectData.position.left,
              top: objectData.position.top,
              originX: objectData.position.originX || "center",
              originY: objectData.position.originY || "center",
              scaleX: objectData.transform.scaleX,
              scaleY: objectData.transform.scaleY,
              angle: objectData.transform.angle,
              selectable: true,
              evented: true,
              hasControls: false,
              hasBorders: true,
              borderColor: "#f8794b",
              borderScaleFactor: 2,
              cornerSize: 8,
              cornerColor: "#f8794b",
              cornerStrokeColor: "#000000",
              cornerStyle: "circle",
              transparentCorners: false,
            });

            group.id = objectData.id;
            group.isArrow = true; // Mark as arrow for proper identification
            this.fabricCanvas.add(group);
            resolve(group);
            break;

          case "group":
            if (objectData.groupType === "measurement") {
              const { line, text, groupCenter } = objectData.measurementData;
              const lineObj = new fabric.Line([line.properties.x1, line.properties.y1, line.properties.x2, line.properties.y2], {
                stroke: line.properties.stroke,
                strokeWidth: line.properties.strokeWidth,
                strokeDashArray: line.properties.strokeDashArray,
                selectable: line.visual.selectable,
                evented: line.visual.evented,
              });
              const midX = (line.properties.x1 + line.properties.x2) / 2;
              const midY = (line.properties.y1 + line.properties.y2) / 2;
              const textObj = new fabric.IText(text.properties.text, {
                left: midX,
                top: midY - 20,
                fontSize: text.properties.fontSize,
                fontFamily: text.properties.fontFamily,
                fill: text.properties.fill,
                originX: text.properties.originX || "center",
                originY: text.properties.originY || "center",
                selectable: text.visual.selectable,
                evented: text.visual.evented,
              });
              const group = new fabric.Group([lineObj, textObj], {
                left: groupCenter.x,
                top: groupCenter.y,
                originX: "center",
                originY: "center",
                selectable: objectData.visual.selectable,
              });

              // Always ensure measurements have orange borders but no controls
              group.set({
                borderColor: "#f8794b",
                borderScaleFactor: 2,
                cornerSize: 8,
                cornerColor: "#f8794b",
                cornerStrokeColor: "#000000",
                cornerStyle: "circle",
                transparentCorners: false,
                hasControls: false, // Measurements don't need resize controls
                hasBorders: true,
                selectable: true,
                evented: true,
              });

              group.id = objectData.id;
              group.groupType = "measurement";
              this.fabricCanvas.add(group);
              this.fabricCanvas.fire("object:added", { target: group });
              resolve(group);
            } else {
              Promise.all(objectData.objects.map((subData) => this.loadDrawingObject(subData)))
                .then((subObjects) => {
                  const group = new fabric.Group(subObjects, {
                    ...objectData.position,
                    ...objectData.transform,
                    ...objectData.visual,
                    ...objectData.customProperties,
                  });
                  group.id = objectData.id;
                  group.type = objectData.groupType || "group";

                  // Handle different group types appropriately
                  if (objectData.groupType === "arrow") {
                    // Arrows get orange borders but no controls
                    group.set({
                      borderColor: "#f8794b",
                      borderScaleFactor: 2,
                      cornerSize: 8,
                      cornerColor: "#f8794b",
                      cornerStrokeColor: "#000000",
                      cornerStyle: "circle",
                      transparentCorners: false,
                      hasControls: false,
                      hasBorders: true,
                      selectable: true,
                      evented: true,
                    });
                  } else {
                    // Other groups (like building fronts) get full controls
                    if (!objectData.visual.borderColor || objectData.visual.borderColor !== "#f8794b") {
                      this.applyStandardStyling(group, true); // true = with controls
                    }
                  }

                  subObjects.forEach((obj) => this.fabricCanvas.remove(obj));
                  this.fabricCanvas.add(group);
                  this.fabricCanvas.fire("object:added", { target: group });
                  resolve(group);
                })
                .catch(reject);
            }
            break;

          case "uploadedImage":
            if (!objectData.properties.src) {
              return reject(new Error("No image source provided for uploaded image"));
            }

            fabric.Image.fromURL(
              objectData.properties.src,
              (img) => {
                if (!img) {
                  return reject(new Error(`Failed to load uploaded image: ${objectData.properties.src}`));
                }

                img.set({
                  ...objectData.position,
                  ...objectData.transform,
                  ...objectData.visual,
                  width: objectData.properties.width,
                  height: objectData.properties.height,
                  isUploadedImage: true,
                  ...objectData.customProperties,
                });

                // Restore lock state
                if (objectData.lockState) {
                  img.set({
                    isLocked: objectData.lockState.isLocked,
                    lockMovementX: objectData.lockState.lockMovementX,
                    lockMovementY: objectData.lockState.lockMovementY,
                    lockRotation: objectData.lockState.lockRotation,
                    lockScalingX: objectData.lockState.lockScalingX,
                    lockScalingY: objectData.lockState.lockScalingY,
                  });

                  if (objectData.lockState.isLocked) {
                    img.set({
                      hasControls: true,
                      hasBorders: true,
                    });
                    img.setControlsVisibility({
                      lockControl: true,
                      mtr: false,
                      ml: false,
                      mr: false,
                      mt: false,
                      mb: false,
                      tl: false,
                      tr: false,
                      bl: false,
                      br: false,
                    });
                  } else {
                    this.applyStandardStyling(img);
                  }
                } else {
                  this.applyStandardStyling(img);
                  img.set({ isLocked: false });
                }

                img.id = objectData.id;
                this.fabricCanvas.add(img);
                resolve(img);
              },
              { crossOrigin: "anonymous" }
            );
            break;

          case "image":
            if (!objectData.properties.src) {
              return reject(new Error("No image source provided"));
            }
            fabric.Image.fromURL(
              objectData.properties.src,
              (img) => {
                if (!img) {
                  return reject(new Error(`Failed to load image: ${objectData.properties.src}`));
                }
                img.set({
                  ...objectData.position,
                  ...objectData.transform,
                  ...objectData.visual,
                  width: objectData.properties.width,
                  height: objectData.properties.height,
                  ...objectData.customProperties,
                });
                img.id = objectData.id;

                // Apply standard styling if it wasn't preserved
                if (!objectData.visual.borderColor || objectData.visual.borderColor !== "#f8794b") {
                  this.applyStandardStyling(img);
                }

                this.fabricCanvas.add(img);
                resolve(img);
              },
              { crossOrigin: "anonymous" }
            );
            break;

          default:
            fabric.util.enlivenObjects([objectData.fabricObject], (objects) => {
              if (objects && objects[0]) {
                const obj = objects[0];
                obj.id = objectData.id;

                // Apply standard styling if it wasn't preserved
                if (!obj.borderColor || obj.borderColor !== "#f8794b") {
                  this.applyStandardStyling(obj);
                }

                this.fabricCanvas.add(obj);
                resolve(obj);
              } else {
                reject(new Error("Failed to create generic object"));
              }
            });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // Determine group type for special handling
  determineGroupType(group) {
    if (group.isArrow) return "arrow"; // Check arrow flag first

    const objects = group.getObjects();

    if (objects.length === 2 && objects.some((obj) => obj.type === "line") && objects.some((obj) => obj.type === "triangle")) {
      return "arrow";
    }

    if (objects.length === 2 && objects.some((obj) => obj.type === "line") && objects.some((obj) => obj.type === "i-text" || obj.type === "text")) {
      return "measurement";
    }

    return "generic";
  }

  // Extract custom properties from an object
  extractCustomProperties(obj) {
    const customProps = {};
    if (obj.isUploadedImage) customProps.isUploadedImage = true;
    if (obj.isLocked) customProps.isLocked = true;
    if (obj.northArrowImage) customProps.northArrowImage = true;
    if (obj.lockUniScaling) customProps.lockUniScaling = true;
    if (obj.strokeUniform) customProps.strokeUniform = true;
    if (obj.cursorColor) customProps.cursorColor = obj.cursorColor;
    if (obj.isConnectionLine) customProps.isConnectionLine = true; // Store connection line flag
    if (obj.isArrow) customProps.isArrow = true; // Store arrow flag
    return customProps;
  }

  // Serialize image with styling preservation
  serializeImage(obj, baseData) {
    const imageData = { ...baseData, drawingType: "image", properties: { width: obj.width, height: obj.height, src: null } };

    if (obj._element && obj._element.src) {
      if (obj._element.src.startsWith("data:")) {
        imageData.properties.src = obj._element.src;
        imageData.properties.isDataURL = true;
      } else {
        imageData.properties.src = obj._element.src;
        imageData.properties.isExternal = true;
      }
    }

    return imageData;
  }

  // Serialize title blocks (unchanged from original)
  serializeTitleBlocks() {
    const titleblocks = this.fabricCanvas.getObjects().filter((obj) => this.isTitleBlockObject(obj));

    return titleblocks
      .map((titleblock, index) => {
        try {
          const objects = titleblock.getObjects();

          const serializedObjects = objects.map((obj) => {
            const baseData = {
              type: obj.type,
              left: obj.left,
              top: obj.top,
              width: obj.width,
              height: obj.height,
              angle: obj.angle || 0,
              scaleX: obj.scaleX || 1,
              scaleY: obj.scaleY || 1,
              originX: obj.originX,
              originY: obj.originY,
              visible: obj.visible !== false,
            };

            if (obj.type === "rect") {
              return {
                ...baseData,
                fill: obj.fill,
                stroke: obj.stroke,
                strokeWidth: obj.strokeWidth,
              };
            } else if (obj.type === "textbox") {
              return {
                ...baseData,
                text: obj.text,
                fontSize: obj.fontSize,
                fontFamily: obj.fontFamily,
                fill: obj.fill,
                textAlign: obj.textAlign,
                isHeader: obj.isHeader || false,
                isDateField: obj.isDateField || false,
                isClientName: obj.isClientName || false,
                isClientAddress: obj.isClientAddress || false,
                isReportTitle: obj.isReportTitle || false,
                isRev1: obj.isRev1 || false,
                isRev2: obj.isRev2 || false,
                isRev3: obj.isRev3 || false,
                isClientLogo: obj.isClientLogo || false,
                editable: obj.editable || false,
              };
            } else if (obj.type === "image" && obj.isClientLogo) {
              return {
                ...baseData,
                src: obj._element ? obj._element.src : null,
                isClientLogo: true,
                containerBounds: obj.containerBounds,
              };
            }

            return baseData;
          });

          return {
            id: `titleblock_${index}`,
            position: {
              left: titleblock.left,
              top: titleblock.top,
            },
            transform: {
              scaleX: titleblock.scaleX || 1,
              scaleY: titleblock.scaleY || 1,
              angle: titleblock.angle || 0,
              originX: titleblock.originX,
              originY: titleblock.originY,
            },
            visual: {
              selectable: titleblock.selectable !== false,
              hasControls: titleblock.hasControls || false,
              hasBorders: titleblock.hasBorders !== false,
              borderColor: titleblock.borderColor,
              borderScaleFactor: titleblock.borderScaleFactor,
              cornerSize: titleblock.cornerSize,
              cornerColor: titleblock.cornerColor,
              cornerStrokeColor: titleblock.cornerStrokeColor,
              cornerStyle: titleblock.cornerStyle,
              transparentCorners: titleblock.transparentCorners,
            },
            objects: serializedObjects,
            deviceType: "title-block",
          };
        } catch (error) {
          console.error("Error serializing titleblock:", error, titleblock);
          return null;
        }
      })
      .filter(Boolean);
  }

  // Serialize zones (unchanged from original)
  serializeZones() {
    if (!window.zones || !Array.isArray(window.zones)) {
      return [];
    }

    return window.zones
      .map((zone, index) => {
        try {
          const polygon = zone.polygon;
          const text = zone.text;

          if (!polygon || !text) return null;

          return {
            id: `zone_${index}`,
            zoneName: polygon.zoneName || `Zone ${index + 1}`,
            zoneNotes: polygon.zoneNotes || "",
            area: polygon.area || 0,
            height: polygon.height || 2.4,
            volume: polygon.volume || 0,
            polygon: {
              points: polygon.points || [],
              fill: polygon.fill,
              stroke: polygon.stroke,
              strokeWidth: polygon.strokeWidth,
              left: polygon.left,
              top: polygon.top,
              scaleX: polygon.scaleX || 1,
              scaleY: polygon.scaleY || 1,
              angle: polygon.angle || 0,
              class: polygon.class,
              selectable: polygon.selectable,
              evented: polygon.evented,
              hasControls: polygon.hasControls,
              hasBorders: polygon.hasBorders,
              hoverCursor: polygon.hoverCursor,
              perPixelTargetFind: polygon.perPixelTargetFind,
            },
            text: {
              text: text.text,
              left: text.left,
              top: text.top,
              fontSize: text.fontSize,
              fontFamily: text.fontFamily,
              fill: text.fill,
              class: text.class,
              selectable: text.selectable,
              evented: text.evented,
              editable: text.editable,
              hasControls: text.hasControls,
              hasBorders: text.hasBorders,
              hoverCursor: text.hoverCursor,
              originX: text.originX,
              originY: text.originY,
              cursorColor: text.cursorColor,
              offsetX: text.offsetX || 0,
              offsetY: text.offsetY || 0,
              borderColor: text.borderColor,
              borderScaleFactor: text.borderScaleFactor,
              cornerSize: text.cornerSize,
              cornerColor: text.cornerColor,
              cornerStrokeColor: text.cornerStrokeColor,
              cornerStyle: text.cornerStyle,
              transparentCorners: text.transparentCorners,
              padding: text.padding,
              controlsVisibility: text.__controlsVisibility || {},
            },
          };
        } catch (error) {
          console.error("Error serializing zone:", error, zone);
          return null;
        }
      })
      .filter(Boolean);
  }

  // Serialize walls (unchanged from original)
  serializeWalls() {
    const walls = [];
    const circles = this.fabricCanvas.getObjects().filter((obj) => obj.type === "circle" && obj.isWallCircle === true);
    const lines = this.fabricCanvas.getObjects().filter((obj) => obj.type === "line" && !obj.deviceType && !obj.isResizeIcon && obj.stroke !== "grey" && obj.stroke !== "blue");

    const circleData = circles.map((circle, index) => {
      const data = {
        id: `wall_circle_${index}`,
        left: circle.left,
        top: circle.top,
        radius: circle.radius,
        fill: circle.fill,
        stroke: circle.stroke,
        strokeWidth: circle.strokeWidth,
        strokeDashArray: circle.strokeDashArray,
        originX: circle.originX,
        originY: circle.originY,
        selectable: circle.selectable,
        evented: circle.evented,
        hasControls: circle.hasControls,
        hasBorders: circle.hasBorders,
        hoverCursor: circle.hoverCursor,
        isWallCircle: true,
        borderColor: circle.borderColor,
        deletable: circle.deletable,
      };
      return data;
    });

    const lineData = lines.map((line, index) => {
      const startCircleIndex = circles.findIndex((c) => {
        const center = c.getCenterPoint();
        return Math.abs(center.x - line.x1) < 10 && Math.abs(center.y - line.y1) < 10;
      });

      const endCircleIndex = circles.findIndex((c) => {
        const center = c.getCenterPoint();
        return Math.abs(center.x - line.x2) < 10 && Math.abs(center.y - line.y2) < 10;
      });

      const data = {
        id: `wall_line_${index}`,
        x1: line.x1,
        y1: line.y1,
        x2: line.x2,
        y2: line.y2,
        stroke: line.stroke,
        strokeWidth: line.strokeWidth,
        selectable: line.selectable,
        evented: line.evented,
        hasControls: line.hasControls,
        hasBorders: line.hasBorders,
        lockMovementX: line.lockMovementX,
        lockMovementY: line.lockMovementY,
        perPixelTargetFind: line.perPixelTargetFind,
        borderColor: line.borderColor,
        startCircleIndex: startCircleIndex >= 0 ? startCircleIndex : null,
        endCircleIndex: endCircleIndex >= 0 ? endCircleIndex : null,
      };

      return data;
    });

    return {
      circles: circleData,
      lines: lineData,
    };
  }

  // Load drawing objects with styling restoration
  async loadDrawingObjects(serializedData) {
    try {
      if (serializedData.canvasSettings) {
        const { pixelsPerMeter, zoom, viewportTransform } = serializedData.canvasSettings;
        this.fabricCanvas.pixelsPerMeter = pixelsPerMeter || 17.5;
        if (zoom) this.fabricCanvas.setZoom(zoom);
        if (viewportTransform) this.fabricCanvas.setViewportTransform(viewportTransform);
      }

      if (serializedData.globalState) {
        window.zones = serializedData.globalState.zonesArray || [];
      }

      const existingObjects = this.fabricCanvas.getObjects();
      const potentialConflicts = existingObjects.filter((obj) => (obj.type === "polygon" && obj.fill && obj.fill.includes("165, 155, 155")) || (obj.type === "circle" && obj.fill === "#f8794b" && !obj.isWallCircle && obj.radius < 30));

      if (potentialConflicts.length > 0) {
        potentialConflicts.forEach((obj) => this.fabricCanvas.remove(obj));
      }

      if (serializedData.drawingObjects?.length) {
        for (let i = 0; i < serializedData.drawingObjects.length; i++) {
          try {
            await this.loadDrawingObject(serializedData.drawingObjects[i]);
            if (i < serializedData.drawingObjects.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          } catch (error) {
            console.error(`Failed to load drawing object ${i + 1}:`, error);
          }
        }
      }

      if (serializedData.zones?.length) {
        await this.loadZones(serializedData.zones);
      }

      if (serializedData.walls && (serializedData.walls.circles?.length || serializedData.walls.lines?.length)) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        await this.loadWalls(serializedData.walls);
      }

      if (serializedData.titleblocks?.length) {
        await this.loadTitleBlocks(serializedData.titleblocks);
      }

      this.fabricCanvas.requestRenderAll();

      setTimeout(() => {
        this.reinitializeDrawingTools();
      }, 300);

      return true;
    } catch (error) {
      console.error("Error loading drawing objects:", error);
      return false;
    }
  }

  // Load titleblocks with styling preservation
  async loadTitleBlocks(titleblocksData) {
    for (const titleblockData of titleblocksData) {
      try {
        const objects = [];

        for (const objData of titleblockData.objects) {
          if (objData.type === "rect") {
            const rect = new fabric.Rect({
              left: objData.left,
              top: objData.top,
              width: objData.width,
              height: objData.height,
              fill: objData.fill,
              stroke: objData.stroke,
              strokeWidth: objData.strokeWidth,
              angle: objData.angle,
              scaleX: objData.scaleX,
              scaleY: objData.scaleY,
              originX: objData.originX,
              originY: objData.originY,
              visible: objData.visible,
            });
            objects.push(rect);
          } else if (objData.type === "textbox") {
            const textbox = new fabric.Textbox(objData.text, {
              left: objData.left,
              top: objData.top,
              width: objData.width,
              height: objData.height,
              fontSize: objData.fontSize,
              fontFamily: objData.fontFamily,
              fill: objData.fill,
              textAlign: objData.textAlign,
              angle: objData.angle,
              scaleX: objData.scaleX,
              scaleY: objData.scaleY,
              originX: objData.originX,
              originY: objData.originY,
              visible: objData.visible,
              isHeader: objData.isHeader,
              isDateField: objData.isDateField,
              isClientName: objData.isClientName,
              isClientAddress: objData.isClientAddress,
              isReportTitle: objData.isReportTitle,
              isRev1: objData.isRev1,
              isRev2: objData.isRev2,
              isRev3: objData.isRev3,
              isClientLogo: objData.isClientLogo,
              editable: objData.editable,
            });
            objects.push(textbox);
          } else if (objData.type === "image" && objData.isClientLogo && objData.src) {
            await new Promise((resolve, reject) => {
              fabric.Image.fromURL(
                objData.src,
                (img) => {
                  if (img) {
                    img.set({
                      left: objData.left,
                      top: objData.top,
                      width: objData.width,
                      height: objData.height,
                      scaleX: objData.scaleX,
                      scaleY: objData.scaleY,
                      angle: objData.angle,
                      originX: objData.originX,
                      originY: objData.originY,
                      visible: objData.visible,
                      isClientLogo: true,
                      containerBounds: objData.containerBounds,
                    });
                    objects.push(img);
                    resolve();
                  } else {
                    reject(new Error("Failed to load client logo"));
                  }
                },
                { crossOrigin: "anonymous" }
              );
            });
          }
        }

        const titleblockGroup = new fabric.Group(objects, {
          left: titleblockData.position.left,
          top: titleblockData.position.top,
          scaleX: titleblockData.transform.scaleX,
          scaleY: titleblockData.transform.scaleY,
          angle: titleblockData.transform.angle,
          originX: titleblockData.transform.originX,
          originY: titleblockData.transform.originY,
          selectable: titleblockData.visual.selectable,
          hasControls: titleblockData.visual.hasControls,
          hasBorders: titleblockData.visual.hasBorders,
          deviceType: "title-block",
          cursorColor: "#f8794b",
          borderColor: titleblockData.visual.borderColor || "#f8794b",
          borderScaleFactor: titleblockData.visual.borderScaleFactor || 2,
          cornerSize: titleblockData.visual.cornerSize || 8,
          cornerColor: titleblockData.visual.cornerColor || "#f8794b",
          cornerStrokeColor: titleblockData.visual.cornerStrokeColor || "#000000",
          cornerStyle: titleblockData.visual.cornerStyle || "circle",
          transparentCorners: titleblockData.visual.transparentCorners || false,
        });

        titleblockGroup.id = titleblockData.id;
        this.fabricCanvas.add(titleblockGroup);

        if (window.activeTitleBlocks && Array.isArray(window.activeTitleBlocks)) {
          window.activeTitleBlocks.push(titleblockGroup);
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        console.error("Failed to load titleblock:", error, titleblockData);
      }
    }
  }

  // Load zones with styling preservation
  async loadZones(zonesData) {
    window.zones = window.zones || [];

    const existingZones = [...window.zones];
    existingZones.forEach((zone) => {
      if (zone.polygon && this.fabricCanvas.getObjects().includes(zone.polygon)) {
        this.fabricCanvas.remove(zone.polygon);
      }
      if (zone.text && this.fabricCanvas.getObjects().includes(zone.text)) {
        this.fabricCanvas.remove(zone.text);
      }
    });
    window.zones = [];

    for (const zoneData of zonesData) {
      try {
        const polygon = new fabric.Polygon(zoneData.polygon.points, {
          ...zoneData.polygon,
          zoneName: zoneData.zoneName,
          zoneNotes: zoneData.zoneNotes,
          area: zoneData.area,
          height: zoneData.height,
          volume: zoneData.volume,
        });

        const text = new fabric.IText(zoneData.text.text, {
          ...zoneData.text,
        });

        polygon.associatedText = text;
        text.associatedPolygon = polygon;

        this.fabricCanvas.add(polygon);
        this.fabricCanvas.add(text);

        window.zones.push({ polygon, text });

        this.addZoneEventHandlers(polygon, text);

        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        console.error("Failed to load zone:", error, zoneData);
      }
    }

    setTimeout(() => {
      if (window.maintainZoneLayerOrder) {
        window.maintainZoneLayerOrder();
      }
    }, 100);
  }

  // Load walls with styling preservation
  async loadWalls(wallsData) {
    if (!wallsData || !wallsData.circles || !wallsData.lines) {
      return;
    }

    const { circles: circleData, lines: lineData } = wallsData;
    const loadedCircles = [];

    const existingWallObjects = this.fabricCanvas.getObjects().filter((obj) => (obj.type === "circle" && obj.isWallCircle) || (obj.type === "line" && !obj.deviceType && !obj.isResizeIcon));

    if (existingWallObjects.length > 0) {
      existingWallObjects.forEach((obj) => {
        if (obj._wallUpdateHandler) {
          obj.off("moving", obj._wallUpdateHandler);
        }
        this.fabricCanvas.remove(obj);
      });
    }

    for (let i = 0; i < circleData.length; i++) {
      try {
        const circleInfo = circleData[i];
        const circle = new fabric.Circle({
          left: circleInfo.left,
          top: circleInfo.top,
          radius: circleInfo.radius || 3,
          fill: circleInfo.fill || "black",
          stroke: circleInfo.stroke,
          strokeWidth: circleInfo.strokeWidth || 0,
          strokeDashArray: circleInfo.strokeDashArray,
          originX: circleInfo.originX || "center",
          originY: circleInfo.originY || "center",
          selectable: circleInfo.selectable !== false,
          evented: circleInfo.evented !== false,
          hasControls: circleInfo.hasControls || false,
          hasBorders: circleInfo.hasBorders || false,
          borderColor: circleInfo.borderColor || "#f8794b",
          hoverCursor: "pointer",
          moveCursor: "move",
          isWallCircle: true,
          deletable: circleInfo.deletable !== undefined ? circleInfo.deletable : false,
        });

        circle._wallUpdateHandler = () => this.updateConnectedWallLines(circle);
        circle.on("moving", circle._wallUpdateHandler);

        this.fabricCanvas.add(circle);
        loadedCircles.push(circle);
      } catch (error) {
        console.error("Failed to load wall circle:", error, circleData[i]);
        loadedCircles.push(null);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const loadedLines = [];
    for (let j = 0; j < lineData.length; j++) {
      try {
        const lineInfo = lineData[j];
        const line = new fabric.Line([lineInfo.x1, lineInfo.y1, lineInfo.x2, lineInfo.y2], {
          stroke: lineInfo.stroke || "red",
          strokeWidth: lineInfo.strokeWidth || 2,
          selectable: lineInfo.selectable !== false,
          evented: lineInfo.evented !== false,
          hasControls: lineInfo.hasControls || false,
          hasBorders: lineInfo.hasBorders !== false,
          lockMovementX: lineInfo.lockMovementX !== false,
          lockMovementY: lineInfo.lockMovementY !== false,
          perPixelTargetFind: lineInfo.perPixelTargetFind !== false,
          borderColor: lineInfo.borderColor || "#f8794b",
        });

        if (lineInfo.startCircleIndex !== null && lineInfo.startCircleIndex >= 0 && loadedCircles[lineInfo.startCircleIndex]) {
          line.startCircle = loadedCircles[lineInfo.startCircleIndex];
        }
        if (lineInfo.endCircleIndex !== null && lineInfo.endCircleIndex >= 0 && loadedCircles[lineInfo.endCircleIndex]) {
          line.endCircle = loadedCircles[lineInfo.endCircleIndex];
        }

        line.on("removed", () => {
          this.handleWallLineDeletion(line);
        });

        this.fabricCanvas.add(line);
        loadedLines.push(line);
      } catch (error) {
        console.error("Failed to load wall line:", error, lineInfo);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 50));

    this.organizeWallLayers();

    setTimeout(() => {
      this.ensureCameraResizeIconsOnTop();
      this.fabricCanvas.requestRenderAll();
    }, 200);
  }

  // Helper methods for wall management
  updateConnectedWallLines(movedCircle) {
    const center = movedCircle.getCenterPoint();
    const lines = this.fabricCanvas.getObjects().filter((obj) => obj.type === "line" && !obj.deviceType && !obj.isResizeIcon);

    lines.forEach((line) => {
      let updated = false;
      if (line.startCircle === movedCircle) {
        line.set({ x1: center.x, y1: center.y });
        line.setCoords();
        updated = true;
      }
      if (line.endCircle === movedCircle) {
        line.set({ x2: center.x, y2: center.y });
        line.setCoords();
        updated = true;
      }

      if (updated) {
        const backgroundObjects = this.fabricCanvas.getObjects().filter((obj) => obj.isBackground);
        if (backgroundObjects.length > 0) {
          line.moveTo(backgroundObjects.length);
        }
      }
    });

    movedCircle.bringToFront();
    this.fabricCanvas.requestRenderAll();
  }

  handleWallLineDeletion(deletedLine) {
    const remainingLines = this.fabricCanvas.getObjects().filter((obj) => obj.type === "line" && !obj.deviceType && !obj.isResizeIcon && obj !== deletedLine);

    const circlesToCheck = [];
    if (deletedLine.startCircle) circlesToCheck.push(deletedLine.startCircle);
    if (deletedLine.endCircle) circlesToCheck.push(deletedLine.endCircle);

    circlesToCheck.forEach((circle) => {
      if (!circle || !this.fabricCanvas.getObjects().includes(circle)) return;

      const isStillConnected = remainingLines.some((line) => line.startCircle === circle || line.endCircle === circle);

      if (!isStillConnected) {
        this.fabricCanvas.remove(circle);
      }
    });

    this.fabricCanvas.getObjects("group").forEach((obj) => {
      if (obj.coverageConfig && obj.createOrUpdateCoverageArea) {
        obj.createOrUpdateCoverageArea();
      }
    });

    this.fabricCanvas.renderAll();
  }

  organizeWallLayers() {
    // Placeholder for layer organization logic
  }

  ensureCameraResizeIconsOnTop() {
    // Placeholder for camera icon management logic
  }

  addZoneEventHandlers(polygon, text) {
    polygon.off();
    text.off();

    setTimeout(() => {
      if (polygon && this.fabricCanvas.getObjects().includes(polygon)) {
        polygon.originalCenter = polygon.getCenterPoint();
      }
    }, 100);

    const polygonMovingHandler = () => {
      if (!polygon || !this.fabricCanvas.getObjects().includes(polygon)) return;
      if (text && this.fabricCanvas.getObjects().includes(text)) {
        const newCenter = polygon.getCenterPoint();
        text.set({
          left: newCenter.x + (text.offsetX || 0),
          top: newCenter.y + (text.offsetY || 0),
        });
        text.setCoords();
      }
      this.fabricCanvas.requestRenderAll();
    };

    const textMovingHandler = () => {
      if (!text || !polygon || !this.fabricCanvas.getObjects().includes(text) || !this.fabricCanvas.getObjects().includes(polygon)) return;
      const polygonCenter = polygon.getCenterPoint();
      text.offsetX = text.left - polygonCenter.x;
      text.offsetY = text.top - polygonCenter.y;
      text.setCoords();
      this.fabricCanvas.requestRenderAll();
    };

    const showProperties = () => {
      if (window.showDeviceProperties) {
        window.showDeviceProperties("zone-polygon", text, polygon, polygon.height);
      }
    };

    const hideProperties = () => {
      if (window.hideDeviceProperties) {
        window.hideDeviceProperties();
      }
    };

    const polygonMouseDownHandler = (e) => {
      const pointer = this.fabricCanvas.getPointer(e.e);
      polygon.set("evented", false);
      const devicesUnderneath = this.fabricCanvas.getObjects().filter((obj) => obj !== polygon && obj !== text && obj.type === "group" && obj.deviceType && obj.containsPoint(pointer));
      polygon.set("evented", true);

      e.e.preventDefault();
      e.e.stopPropagation();
      this.fabricCanvas.setActiveObject(devicesUnderneath.length > 0 ? devicesUnderneath[0] : text);
      this.fabricCanvas.requestRenderAll();
    };

    polygon.on("moving", polygonMovingHandler);
    polygon.on("moved", () => {
      setTimeout(() => {
        if (window.maintainZoneLayerOrder) {
          window.maintainZoneLayerOrder();
        }
      }, 10);
    });
    polygon.on("selected", () => {
      showProperties();
      this.fabricCanvas.requestRenderAll();
    });
    polygon.on("deselected", hideProperties);
    polygon.on("mousedown", polygonMouseDownHandler);

    text.on("moving", textMovingHandler);
    text.on("selected", () => {
      showProperties();
      this.fabricCanvas.requestRenderAll();
    });
    text.on("deselected", hideProperties);
  }

  reinitializeDrawingTools() {
    if (typeof setupShapeTools === "function") setupShapeTools(this.fabricCanvas);
    if (typeof setupTextTools === "function") setupTextTools(this.fabricCanvas);
    if (typeof setupLineTools === "function") setupLineTools(this.fabricCanvas);
    if (typeof setupMeasurementTools === "function") setupMeasurementTools(this.fabricCanvas);
    if (typeof setupImageUploadTool === "function") setupImageUploadTool(this.fabricCanvas);
    if (typeof setupNorthArrowTool === "function") setupNorthArrowTool(this.fabricCanvas);
    if (typeof setupColorPicker === "function") setupColorPicker(this.fabricCanvas);
    if (typeof setupTitleBlockTool === "function") setupTitleBlockTool(this.fabricCanvas);

    if (typeof setupDeletion === "function") {
      setupDeletion(this.fabricCanvas, (obj) => this.isDrawingObject(obj));
    }

    if (window.setupZoneTool) {
      try {
        window.setupZoneTool(this.fabricCanvas);
      } catch (error) {
        console.warn("Could not reinitialize zone tool:", error);
      }
    }

    if (window.setupWallTool) {
      try {
        window.setupWallTool(this.fabricCanvas);
      } catch (error) {
        console.warn("Could not reinitialize wall tool:", error);
      }
    }

    setTimeout(() => {
      const wallCircles = this.fabricCanvas.getObjects().filter((obj) => obj.type === "circle" && obj.isWallCircle);

      wallCircles.forEach((circle) => {
        circle.set({
          selectable: true,
          evented: true,
          hoverCursor: "pointer",
          moveCursor: "move",
        });
        circle.bringToFront();

        if (!circle._wallUpdateHandler) {
          circle._wallUpdateHandler = () => this.updateConnectedWallLines(circle);
          circle.on("moving", circle._wallUpdateHandler);
        }
      });

      if (window.maintainZoneLayerOrder) {
        window.maintainZoneLayerOrder();
      }

      this.fabricCanvas.requestRenderAll();
    }, 200);
  }

  // Storage operations
  saveToLocalStorage(key = "drawingObjectsData") {
    try {
      const data = this.serializeDrawingObjects();
      localStorage.setItem(key, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error("Error saving drawing objects to localStorage:", error);
      return false;
    }
  }

  async loadFromLocalStorage(key = "drawingObjectsData") {
    try {
      const jsonString = localStorage.getItem(key);
      if (!jsonString) return false;
      return await this.loadDrawingObjects(JSON.parse(jsonString));
    } catch (error) {
      console.error("Error loading drawing objects from localStorage:", error);
      return false;
    }
  }

  exportAsFile(filename = "drawing_objects_export.json") {
    try {
      const data = this.serializeDrawingObjects();
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
      return true;
    } catch (error) {
      console.error("Error exporting drawing objects:", error);
      return false;
    }
  }

  async importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const success = await this.loadDrawingObjects(data);
          success ? resolve(true) : reject(new Error("Failed to load drawing objects"));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Error reading file"));
      reader.readAsText(file);
    });
  }
}

export { DrawingObjectSerializer };
