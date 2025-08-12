class DrawingObjectSerializer {
  constructor(fabricCanvas) {
    this.fabricCanvas = fabricCanvas;
  }

  // Check if object is a drawing object (not camera/device/background)
  isDrawingObject(obj) {
    if (obj.isCoverage) return false;
    if (obj.isBackground) return false;
    if (obj.type === "group" && obj.deviceType && obj.deviceType !== "title-block") return false;
    if (obj.type === "text" && obj.isDeviceLabel) return false;
    if (obj.type === "polygon" && obj.fill?.includes("165, 155, 155")) return false;
    if (obj.isResizeIcon === true) return false;
    if (obj.type === "circle" && obj.fill === "#f8794b" && obj.radius < 30) return false;

    // FIXED: Include titleblocks as drawing objects
    if (obj.type === "group" && obj.deviceType === "title-block") return true;
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
    return (obj.type === "line" && !obj.deviceType && !obj.isResizeIcon) || (obj.type === "circle" && obj.isWallCircle === true);
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
    const titleblocks = this.serializeTitleBlocks(); // NEW: Serialize titleblocks

    return {
      drawingObjects,
      zones,
      walls,
      titleblocks, // NEW: Include titleblocks in serialized data
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

  // NEW: Serialize titleblocks specifically
  serializeTitleBlocks() {
    const titleblocks = this.fabricCanvas.getObjects().filter((obj) => this.isTitleBlockObject(obj));

    return titleblocks
      .map((titleblock, index) => {
        try {
          const objects = titleblock.getObjects();

          // Serialize each object in the titleblock group
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
                // Preserve titleblock-specific flags
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

  // Serialize individual drawing object - ENHANCED FOR MEASUREMENTS AND TITLEBLOCKS
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
          borderColor: obj.borderColor || "#f8794b",
          cornerColor: obj.cornerColor || "#f8794b",
        },
        customProperties: this.extractCustomProperties(obj),
      };

      switch (obj.type) {
        case "circle":
          return { ...baseData, drawingType: "circle", properties: { radius: obj.radius, fill: obj.fill, stroke: obj.stroke, strokeWidth: obj.strokeWidth, strokeDashArray: obj.strokeDashArray } };
        case "rect":
          return { ...baseData, drawingType: "rectangle", properties: { width: obj.width, height: obj.height, fill: obj.fill, stroke: obj.stroke, strokeWidth: obj.strokeWidth, strokeDashArray: obj.strokeDashArray } };
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
            },
          };
        case "line":
          return { ...baseData, drawingType: "line", properties: { x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2, stroke: obj.stroke, strokeWidth: obj.strokeWidth, strokeDashArray: obj.strokeDashArray } };
        case "triangle":
          return { ...baseData, drawingType: "triangle", properties: { width: obj.width, height: obj.height, fill: obj.fill, stroke: obj.stroke, strokeWidth: obj.strokeWidth } };
        case "group":
          const groupType = this.determineGroupType(obj);
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
          return { ...baseData, drawingType: "group", groupType, properties: { width: obj.width, height: obj.height }, objects: obj.getObjects().map((subObj) => this.serializeDrawingObject(subObj)) };
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

  // Serialize image - kept separate for exact functionality
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

  // Serialize zones with their complex relationships - EXACT ORIGINAL
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

  // Serialize walls with their circle relationships - EXACT ORIGINAL
  serializeWalls() {
    const walls = [];
    const circles = this.fabricCanvas.getObjects().filter((obj) => obj.type === "circle" && obj.isWallCircle === true);
    const lines = this.fabricCanvas.getObjects().filter((obj) => obj.type === "line" && !obj.deviceType && !obj.isResizeIcon);

    console.log(`Serializing ${circles.length} wall circles and ${lines.length} wall lines`);

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
      console.log(`Serialized wall circle ${index + 1}:`, data);
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

      console.log(`Serialized wall line ${index + 1} with connections: start=${startCircleIndex}, end=${endCircleIndex}`);
      return data;
    });

    return {
      circles: circleData,
      lines: lineData,
    };
  }

  // Extract custom properties from an object
  extractCustomProperties(obj) {
    const customProps = {};
    if (obj.isUploadedImage) customProps.isUploadedImage = true;
    if (obj.northArrowImage) customProps.northArrowImage = true;
    if (obj.lockUniScaling) customProps.lockUniScaling = true;
    if (obj.strokeUniform) customProps.strokeUniform = true;
    if (obj.cursorColor) customProps.cursorColor = obj.cursorColor;
    return customProps;
  }

  // Determine group type for special handling
  determineGroupType(group) {
    const objects = group.getObjects();

    if (objects.length === 2 && objects.some((obj) => obj.type === "line") && objects.some((obj) => obj.type === "triangle")) {
      return "arrow";
    }

    if (objects.length === 2 && objects.some((obj) => obj.type === "line") && objects.some((obj) => obj.type === "i-text" || obj.type === "text")) {
      return "measurement";
    }

    return "generic";
  }

  // Load drawing objects - ENHANCED WITH TITLEBLOCK SUPPORT
  async loadDrawingObjects(serializedData) {
    try {
      console.log("Starting to load drawing objects...");

      if (serializedData.canvasSettings) {
        const { pixelsPerMeter, zoom, viewportTransform } = serializedData.canvasSettings;
        this.fabricCanvas.pixelsPerMeter = pixelsPerMeter || 17.5;
        if (zoom) this.fabricCanvas.setZoom(zoom);
        if (viewportTransform) this.fabricCanvas.setViewportTransform(viewportTransform);
      }

      if (serializedData.globalState) {
        window.zones = serializedData.globalState.zonesArray || [];
        console.log("Restored zones array:", window.zones.length);
      }

      const existingObjects = this.fabricCanvas.getObjects();
      const potentialConflicts = existingObjects.filter((obj) => (obj.type === "polygon" && obj.fill && obj.fill.includes("165, 155, 155")) || (obj.type === "circle" && obj.fill === "#f8794b" && !obj.isWallCircle && obj.radius < 30));

      if (potentialConflicts.length > 0) {
        console.log("Removing potential conflict objects:", potentialConflicts.length);
        potentialConflicts.forEach((obj) => this.fabricCanvas.remove(obj));
      }

      if (serializedData.drawingObjects?.length) {
        console.log(`Loading ${serializedData.drawingObjects.length} regular drawing objects...`);
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
        console.log("Regular drawing objects loaded");
      }

      if (serializedData.zones?.length) {
        console.log(`Loading ${serializedData.zones.length} zones...`);
        await this.loadZones(serializedData.zones);
        console.log("Zones loaded");
      }

      if (serializedData.walls && (serializedData.walls.circles?.length || serializedData.walls.lines?.length)) {
        console.log("Loading walls with delay to avoid conflicts...");
        await new Promise((resolve) => setTimeout(resolve, 200));
        await this.loadWalls(serializedData.walls);
        console.log("Walls loaded");
      }

      // NEW: Load titleblocks
      if (serializedData.titleblocks?.length) {
        console.log(`Loading ${serializedData.titleblocks.length} titleblocks...`);
        await this.loadTitleBlocks(serializedData.titleblocks);
        console.log("Titleblocks loaded");
      }

      this.fabricCanvas.requestRenderAll();

      setTimeout(() => {
        console.log("Reinitializing drawing tools...");
        this.reinitializeDrawingTools();
        console.log("Drawing tools reinitialized");
      }, 300);

      return true;
    } catch (error) {
      console.error("Error loading drawing objects:", error);
      return false;
    }
  }

  // NEW: Load titleblocks
  async loadTitleBlocks(titleblocksData) {
    for (const titleblockData of titleblocksData) {
      try {
        const objects = [];

        // Recreate each object in the titleblock
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
              // Restore titleblock-specific flags
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
            // Load client logo image
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

        // Create the titleblock group
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

        // Add to active titleblocks list if the global function exists
        if (window.activeTitleBlocks && Array.isArray(window.activeTitleBlocks)) {
          window.activeTitleBlocks.push(titleblockGroup);
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        console.error("Failed to load titleblock:", error, titleblockData);
      }
    }
  }

  // Rest of the methods remain the same...
  // (loadZones, loadWalls, addZoneEventHandlers, etc. - keeping the original implementations)

  // Fixed loadZones method for drawing-save.js
  async loadZones(zonesData) {
    window.zones = window.zones || [];

    // First, remove any existing zones to prevent duplicates
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
        // Create polygon
        const polygon = new fabric.Polygon(zoneData.polygon.points, {
          ...zoneData.polygon,
          zoneName: zoneData.zoneName,
          zoneNotes: zoneData.zoneNotes,
          area: zoneData.area,
          height: zoneData.height,
          volume: zoneData.volume,
        });

        // Create text
        const text = new fabric.IText(zoneData.text.text, {
          ...zoneData.text,
        });

        // Establish associations BEFORE adding to canvas
        polygon.associatedText = text;
        text.associatedPolygon = polygon;

        // Add to canvas
        this.fabricCanvas.add(polygon);
        this.fabricCanvas.add(text);

        // Add to zones array
        window.zones.push({ polygon, text });

        // Add event handlers AFTER everything is set up
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

  handleWallLineDeletion(deletedLine) {
    console.log("Handling wall line deletion...");

    // Get all remaining wall lines
    const remainingLines = this.fabricCanvas.getObjects().filter((obj) => obj.type === "line" && !obj.deviceType && !obj.isResizeIcon && obj !== deletedLine);

    // Check which circles are no longer connected to any lines
    const circlesToCheck = [];
    if (deletedLine.startCircle) circlesToCheck.push(deletedLine.startCircle);
    if (deletedLine.endCircle) circlesToCheck.push(deletedLine.endCircle);

    circlesToCheck.forEach((circle) => {
      if (!circle || !this.fabricCanvas.getObjects().includes(circle)) return;

      // Check if this circle is still connected to any remaining lines
      const isStillConnected = remainingLines.some((line) => line.startCircle === circle || line.endCircle === circle);

      if (!isStillConnected) {
        console.log("Removing orphaned wall circle");
        this.fabricCanvas.remove(circle);
      }
    });

    // Update camera coverage areas
    this.fabricCanvas.getObjects("group").forEach((obj) => {
      if (obj.coverageConfig && obj.createOrUpdateCoverageArea) {
        obj.createOrUpdateCoverageArea();
      }
    });

    this.fabricCanvas.renderAll();
  }

  // Fixed addZoneEventHandlers method for drawing-save.js
  addZoneEventHandlers(polygon, text) {
    // Remove any existing event handlers to prevent duplicates
    polygon.off();
    text.off();

    // Set original center for reference
    setTimeout(() => {
      if (polygon && this.fabricCanvas.getObjects().includes(polygon)) {
        polygon.originalCenter = polygon.getCenterPoint();
      }
    }, 100);

    // Polygon moving handler
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

    // Text moving handler
    const textMovingHandler = () => {
      if (!text || !polygon || !this.fabricCanvas.getObjects().includes(text) || !this.fabricCanvas.getObjects().includes(polygon)) return;
      const polygonCenter = polygon.getCenterPoint();
      text.offsetX = text.left - polygonCenter.x;
      text.offsetY = text.top - polygonCenter.y;
      text.setCoords();
      this.fabricCanvas.requestRenderAll();
    };

    // Selection handlers
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

    // Polygon mousedown handler
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

    // Attach event handlers
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

  // Load walls with interactive circles - EXACT ORIGINAL
  // Fixed loadWalls method for drawing-save.js
  async loadWalls(wallsData) {
    if (!wallsData || !wallsData.circles || !wallsData.lines) {
      console.log("No wall data to load");
      return;
    }

    const { circles: circleData, lines: lineData } = wallsData;
    const loadedCircles = [];

    console.log(`Loading ${circleData.length} wall circles and ${lineData.length} wall lines`);

    // Remove existing wall objects to prevent conflicts
    const existingWallObjects = this.fabricCanvas.getObjects().filter((obj) => (obj.type === "circle" && obj.isWallCircle) || (obj.type === "line" && !obj.deviceType && !obj.isResizeIcon));

    if (existingWallObjects.length > 0) {
      console.log(`Removing ${existingWallObjects.length} existing wall objects to prevent conflicts`);
      existingWallObjects.forEach((obj) => {
        if (obj._wallUpdateHandler) {
          obj.off("moving", obj._wallUpdateHandler);
        }
        this.fabricCanvas.remove(obj);
      });
    }

    // Load circles first
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

        // Add the wall update handler
        circle._wallUpdateHandler = () => this.updateConnectedWallLines(circle);
        circle.on("moving", circle._wallUpdateHandler);

        this.fabricCanvas.add(circle);
        loadedCircles.push(circle);

        console.log(`Loaded wall circle ${i + 1}/${circleData.length} at (${circle.left}, ${circle.top})`);
      } catch (error) {
        console.error("Failed to load wall circle:", error, circleData[i]);
        loadedCircles.push(null);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Load lines and establish connections
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

        // Establish circle connections
        if (lineInfo.startCircleIndex !== null && lineInfo.startCircleIndex >= 0 && loadedCircles[lineInfo.startCircleIndex]) {
          line.startCircle = loadedCircles[lineInfo.startCircleIndex];
          console.log(`Connected line ${j + 1} start to circle ${lineInfo.startCircleIndex}`);
        }
        if (lineInfo.endCircleIndex !== null && lineInfo.endCircleIndex >= 0 && loadedCircles[lineInfo.endCircleIndex]) {
          line.endCircle = loadedCircles[lineInfo.endCircleIndex];
          console.log(`Connected line ${j + 1} end to circle ${lineInfo.endCircleIndex}`);
        }

        // **CRITICAL**: Add deletion handler to each line
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

    // **CRITICAL FIX**: Organize layers properly after loading
    this.organizeWallLayers();

    // **NEW**: Ensure camera resize icons are on top after wall loading
    setTimeout(() => {
      this.ensureCameraResizeIconsOnTop();
      this.fabricCanvas.requestRenderAll();
    }, 200);

    console.log(`Successfully loaded ${loadedCircles.filter((c) => c).length} wall circles and ${loadedLines.length} wall lines`);
  }

  // Enhanced updateConnectedWallLines method
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

      // If line was updated, ensure it maintains proper layer position
      if (updated) {
        const backgroundObjects = this.fabricCanvas.getObjects().filter((obj) => obj.isBackground);
        if (backgroundObjects.length > 0) {
          line.moveTo(backgroundObjects.length);
        }
      }
    });

    // Ensure the moved circle stays on top
    movedCircle.bringToFront();
    this.fabricCanvas.requestRenderAll();
  }

  // Load individual drawing object - ENHANCED FOR MEASUREMENTS
  async loadDrawingObject(objectData) {
    return new Promise((resolve, reject) => {
      try {
        const duplicate = this.fabricCanvas.getObjects().find((obj) => obj.id === objectData.id || (obj.type === objectData.type && Math.abs(obj.left - objectData.position.left) < 1 && Math.abs(obj.top - objectData.position.top) < 1));

        if (duplicate) return resolve(duplicate);

        switch (objectData.drawingType) {
          case "circle":
            const circle = new fabric.Circle({ ...objectData.position, ...objectData.transform, ...objectData.visual, ...objectData.properties, ...objectData.customProperties });
            circle.id = objectData.id;
            this.fabricCanvas.add(circle);
            resolve(circle);
            break;
          case "rectangle":
            const rect = new fabric.Rect({ ...objectData.position, ...objectData.transform, ...objectData.visual, ...objectData.properties, ...objectData.customProperties });
            rect.id = objectData.id;
            this.fabricCanvas.add(rect);
            resolve(rect);
            break;
          case "text":
            const TextClass = objectData.properties.width ? fabric.Textbox : fabric.IText;
            const text = new TextClass(objectData.properties.text, { ...objectData.position, ...objectData.transform, ...objectData.visual, ...objectData.properties, ...objectData.customProperties });
            text.id = objectData.id;
            this.fabricCanvas.add(text);
            resolve(text);
            break;
          case "line":
            const line = new fabric.Line([objectData.properties.x1, objectData.properties.y1, objectData.properties.x2, objectData.properties.y2], { ...objectData.position, ...objectData.transform, ...objectData.visual, stroke: objectData.properties.stroke, strokeWidth: objectData.properties.strokeWidth, strokeDashArray: objectData.properties.strokeDashArray, ...objectData.customProperties });
            line.id = objectData.id;
            this.fabricCanvas.add(line);
            resolve(line);
            break;
          case "triangle":
            const triangle = new fabric.Triangle({ ...objectData.position, ...objectData.transform, ...objectData.visual, ...objectData.properties, ...objectData.customProperties });
            triangle.id = objectData.id;
            this.fabricCanvas.add(triangle);
            resolve(triangle);
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
                hasControls: objectData.visual.hasControls,
                borderColor: objectData.visual.borderColor || "#f8794b",
              });
              group.id = objectData.id;
              group.groupType = "measurement";
              this.fabricCanvas.add(group);
              this.fabricCanvas.fire("object:added", { target: group });
              resolve(group);
            } else {
              Promise.all(objectData.objects.map((subData) => this.loadDrawingObject(subData)))
                .then((subObjects) => {
                  const group = new fabric.Group(subObjects, { ...objectData.position, ...objectData.transform, ...objectData.visual, ...objectData.customProperties });
                  group.id = objectData.id;
                  group.type = objectData.groupType || "group";
                  subObjects.forEach((obj) => this.fabricCanvas.remove(obj));
                  this.fabricCanvas.add(group);
                  this.fabricCanvas.fire("object:added", { target: group });
                  resolve(group);
                })
                .catch(reject);
            }
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
                img.set({ ...objectData.position, ...objectData.transform, ...objectData.visual, width: objectData.properties.width, height: objectData.properties.height, ...objectData.customProperties });
                img.id = objectData.id;
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

  // **ENHANCED**: Reinitialize drawing tools functionality
  reinitializeDrawingTools() {
    // Import and setup all the drawing tools from your existing modules
    if (typeof setupShapeTools === "function") setupShapeTools(this.fabricCanvas);
    if (typeof setupTextTools === "function") setupTextTools(this.fabricCanvas);
    if (typeof setupLineTools === "function") setupLineTools(this.fabricCanvas);
    if (typeof setupMeasurementTools === "function") setupMeasurementTools(this.fabricCanvas);
    if (typeof setupImageUploadTool === "function") setupImageUploadTool(this.fabricCanvas);
    if (typeof setupNorthArrowTool === "function") setupNorthArrowTool(this.fabricCanvas);
    if (typeof setupColorPicker === "function") setupColorPicker(this.fabricCanvas);

    // IMPORTANT: Setup titleblock tool
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

    // **NEW**: Ensure wall circles are properly interactive after tool setup
    setTimeout(() => {
      const wallCircles = this.fabricCanvas.getObjects().filter((obj) => obj.type === "circle" && obj.isWallCircle);

      wallCircles.forEach((circle) => {
        // Re-ensure interactivity and layering
        circle.set({
          selectable: true,
          evented: true,
          hoverCursor: "pointer",
          moveCursor: "move",
        });
        circle.bringToFront();

        // Re-attach event handler if missing
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
