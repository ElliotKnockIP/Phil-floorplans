import { closeSubSidebar, registerDrawingMode, stopCurrentDrawingMode, setupColorPicker, toggleDrawingModePopup } from "./drawing-utils.js";

export function initTitleBlock(fabricCanvas) {
  const addTitleBlockBtn = document.getElementById("titleblock-btn");
  const subSidebar = document.getElementById("sub-sidebar");
  if (!addTitleBlockBtn) {
    console.error("Add Horizontal Title Block button not found");
    return;
  }

  const config = {
    width: 950,
    height: 300,
    borderColor: "#000000",
    fontSize: 14,
    fontFamily: "Arial",
    cellPadding: 10,
    maxChars: 38,
  };

  let activeTitleBlocks = [];

  const wrapText = (text) => {
    if (!text) return "";
    return text
      .split("\n")
      .map((paragraph) => {
        const words = paragraph.split(" ");
        const lines = [];
        let currentLine = "";

        words.forEach((word) => {
          // Handle words longer than the limit by breaking them
          while (word.length > config.maxChars) {
            if (currentLine) {
              lines.push(currentLine);
              currentLine = "";
            }
            lines.push(word.slice(0, config.maxChars));
            word = word.slice(config.maxChars);
          }

          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (testLine.length <= config.maxChars) {
            currentLine = testLine;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        });

        if (currentLine) lines.push(currentLine);
        return lines.join("\n");
      })
      .join("\n");
  };

  const getClientDetails = () => {
    const getValue = (id) => document.getElementById(id)?.value || "";
    const logoImg = document.querySelector("#client-logo-preview img");

    return {
      date: getValue("client-date-input"),
      name: wrapText(getValue("client-name-test-input")),
      address: wrapText(getValue("address-input")),
      title: wrapText(getValue("report-title-input")),
      logoSrc: logoImg?.src || null,
      revs: ["rev-one-input", "rev-two-input", "rev-three-input"].map((id) => wrapText(getValue(id))),
    };
  };

  const createLogo = (group, logoSrc, containerLeft, containerTop, containerWidth, containerHeight) => {
    fabric.Image.fromURL(
      logoSrc,
      (logoImg) => {
        // Calculate available space within the container (accounting for padding)
        const availableWidth = containerWidth - 2 * config.cellPadding;
        const availableHeight = containerHeight - 2 * config.cellPadding;

        // Calculate scale to fit within available space while maintaining aspect ratio
        const scaleX = availableWidth / logoImg.width;
        const scaleY = availableHeight / logoImg.height;
        const scale = Math.min(scaleX, scaleY); // Use the smaller scale to ensure it fits in both dimensions

        // Calculate final dimensions after scaling
        const scaledWidth = logoImg.width * scale;
        const scaledHeight = logoImg.height * scale;

        // Center the logo within the available space
        const logoLeft = containerLeft + config.cellPadding + (availableWidth - scaledWidth) / 2;
        const logoTop = containerTop + config.cellPadding + (availableHeight - scaledHeight) / 2;

        logoImg.set({
          left: logoLeft,
          top: logoTop,
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          isClientLogo: true,
          // Add constraints to prevent the logo from being moved outside its container
          lockMovementX: false,
          lockMovementY: false,
        });

        // Store container boundaries for movement constraints
        logoImg.containerBounds = {
          left: containerLeft + config.cellPadding,
          top: containerTop + config.cellPadding,
          right: containerLeft + containerWidth - config.cellPadding,
          bottom: containerTop + containerHeight - config.cellPadding,
        };

        group.add(logoImg);
        fabricCanvas.requestRenderAll();
      },
      { crossOrigin: "anonymous" }
    );
  };

  const updateTitleBlock = (group, details) => {
    const objects = group.getObjects();
    const colWidth = config.width / 3;
    const logoHeight = config.height * (2 / 3) - 20; // Header height is 20
    const containerWidth = colWidth;
    const containerHeight = logoHeight;

    // Update text fields
    objects.forEach((obj) => {
      if (obj.type === "textbox" && !obj.isHeader) {
        if (obj.isDateField) obj.set({ text: details.date });
        else if (obj.isClientName) obj.set({ text: details.name });
        else if (obj.isClientAddress) obj.set({ text: details.address });
        else if (obj.isReportTitle) obj.set({ text: details.title });
        else if (obj.isRev1) obj.set({ text: details.revs[0] });
        else if (obj.isRev2) obj.set({ text: details.revs[1] });
        else if (obj.isRev3) obj.set({ text: details.revs[2] });
      }
    });

    // Handle logo updates
    const placeholder = objects.find((obj) => obj.isClientLogo && obj.type === "textbox");
    const existingLogo = objects.find((obj) => obj.isClientLogo && obj.type === "image");

    if (details.logoSrc) {
      if (placeholder) {
        const containerLeft = placeholder.left - config.cellPadding;
        const containerTop = placeholder.top - config.cellPadding;
        group.remove(placeholder);
        createLogo(group, details.logoSrc, containerLeft, containerTop, containerWidth, containerHeight);
      } else if (existingLogo && existingLogo._originalElement?.src !== details.logoSrc) {
        const containerLeft = existingLogo.containerBounds ? existingLogo.containerBounds.left - config.cellPadding : existingLogo.left - config.cellPadding;
        const containerTop = existingLogo.containerBounds ? existingLogo.containerBounds.top - config.cellPadding : existingLogo.top - config.cellPadding;
        group.remove(existingLogo);
        createLogo(group, details.logoSrc, containerLeft, containerTop, containerWidth, containerHeight);
      }
    } else if (existingLogo) {
      const containerLeft = existingLogo.containerBounds ? existingLogo.containerBounds.left - config.cellPadding : existingLogo.left - config.cellPadding;
      const containerTop = existingLogo.containerBounds ? existingLogo.containerBounds.top - config.cellPadding : existingLogo.top - config.cellPadding;

      const newPlaceholder = new fabric.Textbox("", {
        left: containerLeft + config.cellPadding,
        top: containerTop + config.cellPadding,
        width: containerWidth - 2 * config.cellPadding,
        height: containerHeight - 2 * config.cellPadding,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        isClientLogo: true,
      });
      group.remove(existingLogo);
      group.add(newPlaceholder);
    }

    fabricCanvas.requestRenderAll();
  };

  const updateAllTitleBlocks = () => {
    const details = getClientDetails();
    activeTitleBlocks = activeTitleBlocks.filter((block) => {
      if (fabricCanvas.getObjects().includes(block)) {
        updateTitleBlock(block, details);
        return true;
      }
      return false;
    });
  };

  const createRect = (left, top, width, height, fill = "white") => new fabric.Rect({ left, top, width, height, fill, stroke: config.borderColor, strokeWidth: 1 });

  const createText = (text, left, top, width, options = {}) => new fabric.Textbox(text, { left, top, width, fontSize: config.fontSize, fontFamily: config.fontFamily, ...options });

  const createTitleBlock = (left, top) => {
    const details = getClientDetails();
    const items = [];
    const colWidth = config.width / 3;
    const colHeight = config.height;

    // Column configurations
    const columns = [
      {
        // Left column - Logo & Date
        x: 0,
        sections: [
          { header: "Client Logo", height: (colHeight * 2) / 3, content: "", isLogo: true },
          { header: "Completed Date", height: (colHeight * 1) / 3, content: details.date, field: "isDateField" },
        ],
      },
      {
        // Middle column - Client details
        x: colWidth,
        sections: [
          { header: "Client Name", height: colHeight / 3, content: details.name, field: "isClientName" },
          { header: "Client Address", height: colHeight / 3, content: details.address, field: "isClientAddress" },
          { header: "Report Title", height: colHeight / 3, content: details.title, field: "isReportTitle" },
        ],
      },
      {
        // Right column - Revisions
        x: colWidth * 2,
        sections: [
          { header: "Rev 1", height: colHeight / 3, content: details.revs[0], field: "isRev1", editable: true },
          { header: "Rev 2", height: colHeight / 3, content: details.revs[1], field: "isRev2", editable: true },
          { header: "Rev 3", height: colHeight / 3, content: details.revs[2], field: "isRev3", editable: true },
        ],
      },
    ];

    // Build title block
    columns.forEach((col) => {
      let yOffset = 0;
      col.sections.forEach((section) => {
        const headerHeight = 20;
        const contentHeight = section.height - headerHeight;

        // Header
        items.push(createRect(col.x, yOffset, colWidth, headerHeight, "#f0f0f0"));
        items.push(createText(section.header, col.x + config.cellPadding, yOffset + 3, colWidth - 2 * config.cellPadding, { textAlign: "center", isHeader: true }));

        // Content
        items.push(createRect(col.x, yOffset + headerHeight, colWidth, contentHeight));

        if (section.isLogo) {
          const placeholder = createText("", col.x + config.cellPadding, yOffset + headerHeight + config.cellPadding, colWidth - 2 * config.cellPadding, { isClientLogo: true });
          items.push(placeholder);
        } else {
          const textObj = createText(section.content, col.x + config.cellPadding, yOffset + headerHeight + config.cellPadding, colWidth - 2 * config.cellPadding, { editable: !!section.editable, [section.field]: true });
          items.push(textObj);
        }

        yOffset += section.height;
      });
    });

    const group = new fabric.Group(items, {
      left,
      top,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      deviceType: "title-block",
      cursorColor: "#FE8800",
      borderColor: "#FE8800",
      borderScaleFactor: 2,
      cornerSize: 8,
      cornerColor: "#FE8800",
      cornerStrokeColor: "#000000",
      cornerStyle: "circle",
      transparentCorners: false,
    });

    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    activeTitleBlocks.push(group);
    fabricCanvas.requestRenderAll();
    stopCurrentDrawingMode(fabricCanvas);

    // Add logo if available
    if (details.logoSrc) {
      setTimeout(() => {
        const placeholder = group.getObjects().find((obj) => obj.isClientLogo);
        if (placeholder) {
          const containerLeft = placeholder.left - config.cellPadding;
          const containerTop = placeholder.top - config.cellPadding;
          const containerWidth = colWidth;
          const containerHeight = (colHeight * 2) / 3 - 20; // Logo section height minus header

          group.remove(placeholder);
          createLogo(group, details.logoSrc, containerLeft, containerTop, containerWidth, containerHeight);
        }
      }, 100);
    }
  };

  // Add event handler to constrain logo movement within its container
  fabricCanvas.on("object:moving", function (e) {
    const obj = e.target;

    // Only apply constraints to logo images within groups
    if (obj.type === "image" && obj.isClientLogo && obj.containerBounds) {
      const bounds = obj.containerBounds;
      const objBounds = obj.getBoundingRect();

      // Constrain horizontal movement
      if (objBounds.left < bounds.left) {
        obj.set("left", obj.left + (bounds.left - objBounds.left));
      }
      if (objBounds.left + objBounds.width > bounds.right) {
        obj.set("left", obj.left - (objBounds.left + objBounds.width - bounds.right));
      }

      // Constrain vertical movement
      if (objBounds.top < bounds.top) {
        obj.set("top", obj.top + (bounds.top - objBounds.top));
      }
      if (objBounds.top + objBounds.height > bounds.bottom) {
        obj.set("top", obj.top - (objBounds.top + objBounds.height - bounds.bottom));
      }
    }
  });

  // Event listeners
  const setupListeners = () => {
    ["client-date-input", "client-name-test-input", "address-input", "report-title-input", "rev-one-input", "rev-two-input", "rev-three-input"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener("input", updateAllTitleBlocks);
        input.addEventListener("change", updateAllTitleBlocks);
      }
    });

    const logoUpload = document.getElementById("client-logo-upload");
    if (logoUpload) {
      logoUpload.addEventListener("change", (e) => {
        if (e.target.files?.[0]) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const preview = document.getElementById("client-logo-preview");
            if (preview) {
              preview.innerHTML = `<img src="${event.target.result}" alt="Client Logo" style="max-width: 100%; max-height: 100px;">`;
              setTimeout(updateAllTitleBlocks, 100);
            }
          };
          reader.readAsDataURL(e.target.files[0]);
        }
      });
    }

    const logoPreview = document.getElementById("client-logo-preview");
    if (logoPreview) {
      new MutationObserver(() => setTimeout(updateAllTitleBlocks, 100)).observe(logoPreview, { childList: true, subtree: true });
    }
  };

  const startTitleBlockMode = () => {
    closeSubSidebar(subSidebar);
    registerDrawingMode(fabricCanvas, "title-block", () => {});
    toggleDrawingModePopup(true);
    fabricCanvas.defaultCursor = "crosshair";
    fabricCanvas.selection = false;
    fabricCanvas.forEachObject((obj) => obj.set({ selectable: false, evented: false }));

    const onMouseDown = (event) => {
      const pointer = fabricCanvas.getPointer(event.e);
      createTitleBlock(pointer.x - config.width / 2, pointer.y - config.height / 2);
      fabricCanvas.off("mouse:down", onMouseDown);
    };

    fabricCanvas.on("mouse:down", onMouseDown);
  };

  addTitleBlockBtn.addEventListener("click", (e) => {
    e.preventDefault();
    startTitleBlockMode();
  });

  fabricCanvas.on("object:removed", (e) => {
    if (e.target.deviceType === "title-block") {
      activeTitleBlocks = activeTitleBlocks.filter((block) => block !== e.target);
    }
  });

  setupColorPicker(fabricCanvas);
  setupListeners();
}
