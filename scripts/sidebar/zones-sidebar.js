document.addEventListener("DOMContentLoaded", () => {
  const zoneNameInput = document.getElementById("zone-label-input");
  const zoneNotesInput = document.getElementById("zone-notes-input");
  const zoneHeightInput = document.getElementById("zone-height-input");
  const zoneHeightSlider = document.getElementById("zone-height-slider");
  const zoneTextSizeInput = document.getElementById("zone-text-size-input");
  const zoneTextSizeSlider = document.getElementById("zone-text-size-slider");
  const zoneColorPicker = document.getElementById("zone-color-picker");
  const zoneColorIcons = document.querySelectorAll(".change-zone-colour .colour-icon");
  const zoneTextColorPicker = document.getElementById("zone-text-color-picker");
  const zoneTextColorIcons = document.querySelectorAll(".zone-text-colour .colour-icon");
  const zoneNameToggle = document.getElementById("zone-name-toggle");
  const zoneAreaToggle = document.getElementById("zone-area-toggle");
  const zoneVolumeToggle = document.getElementById("zone-volume-toggle");
  const zoneNotesToggle = document.getElementById("zone-notes-toggle");
  const zoneWarning = document.getElementById("zone-warning");

  let currentPolygon = null;
  let currentTextObject = null;

  function updateSliderTrack(slider, value, min, max) {
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--orange-clr, #ffa500) ${percentage}%, var(--white-text-clr, #ffffff) ${percentage}%)`;
  }

  function updateWarningText(height) {
    if (zoneWarning) {
      if (height > 2 && height <= 4) {
        zoneWarning.textContent = "Scaffold or Step Ladders recommended.";
      } else if (height > 4 && height <= 7) {
        zoneWarning.textContent = "Cherry Picker or Scissor Lift recommended.";
      } else if (height > 7) {
        zoneWarning.textContent = "Fall Arrest System recommended.";
      } else {
        zoneWarning.textContent = "";
      }
    }
  }

  function updateZoneText() {
    if (currentPolygon && currentTextObject && currentPolygon.canvas) {
      const name = currentPolygon.zoneName;
      const notes = currentPolygon.zoneNotes || "";
      const area = currentPolygon.area;
      const height = currentTextObject.displayHeight || currentPolygon.height;
      const volume = area * height;
      const textLines = [];

      if (zoneNameToggle && zoneNameToggle.checked) {
        textLines.push(name);
      }
      if (zoneNotesToggle && zoneNotesToggle.checked && notes) {
        textLines.push(`Notes: ${notes}`);
      }
      if (zoneAreaToggle && zoneAreaToggle.checked) {
        textLines.push(`Area: ${area.toFixed(2)} m²`);
      }
      if (zoneVolumeToggle && zoneVolumeToggle.checked) {
        textLines.push(`Volume: ${volume.toFixed(2)} m³`);
      }

      const newText = textLines.length > 0 ? textLines.join("\n") : "";
      currentTextObject.set({ text: newText, visible: textLines.length > 0 });
      currentTextObject.setCoords();
      currentPolygon.canvas.renderAll();
    }
  }

  const originalShowDeviceProperties = window.showDeviceProperties;
  window.showDeviceProperties = function (deviceType, textObject, polygon, height) {
    if (deviceType === "zone-polygon") {
      currentPolygon = polygon;
      currentTextObject = textObject;

      if (zoneNameInput && textObject) {
        const zoneName = textObject.text.split("\n")[0] || polygon.zoneName;
        zoneNameInput.value = zoneName;
      }

      if (zoneNotesInput && textObject) {
        const notesLine = textObject.text.split("\n").find((line) => line.startsWith("Notes:"));
        const zoneNotes = notesLine ? notesLine.replace("Notes: ", "") : polygon.zoneNotes || "";
        zoneNotesInput.value = zoneNotes;
      }

      if (zoneHeightInput && zoneHeightSlider && polygon) {
        let heightValue = textObject.displayHeight !== undefined ? textObject.displayHeight : height !== undefined ? height : polygon.height;
        if (isNaN(heightValue) || heightValue <= 0 || heightValue > 10) {
          heightValue = 3;
        }
        zoneHeightInput.value = heightValue.toFixed(2);
        zoneHeightSlider.value = heightValue;
        textObject.displayHeight = heightValue;
        updateSliderTrack(zoneHeightSlider, heightValue, zoneHeightSlider.min || 1, zoneHeightSlider.max || 10);
        updateWarningText(heightValue);
      }

      if (zoneTextSizeInput && zoneTextSizeSlider && textObject) {
        let textSizeValue = textObject.fontSize || 15;
        if (isNaN(textSizeValue) || textSizeValue < 1 || textSizeValue > 100) {
          textSizeValue = 15;
        }
        zoneTextSizeInput.value = textSizeValue;
        zoneTextSizeSlider.value = textSizeValue;
        textObject.fontSize = textSizeValue;
        updateSliderTrack(zoneTextSizeSlider, textSizeValue, zoneTextSizeSlider.min || 1, zoneTextSizeSlider.max || 100);
      }

      if (zoneColorPicker && polygon.fill) {
        let hexColor = "#ffffff";
        if (polygon.fill.startsWith("hsla")) {
          const hslaMatch = polygon.fill.match(/hsla\((\d+),\s*(\d+)%,\s*(\d+)%,\s*([\d.]+)\)/);
          if (hslaMatch) {
            const h = parseInt(hslaMatch[1]);
            const s = parseInt(hslaMatch[2]);
            const l = parseInt(hslaMatch[3]);
            hexColor = hslToHex(h, s, l);
          }
        } else if (polygon.fill.startsWith("rgba")) {
          const rgbaMatch = polygon.fill.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
          if (rgbaMatch) {
            const r = parseInt(rgbaMatch[1]);
            const g = parseInt(rgbaMatch[2]);
            const b = parseInt(rgbaMatch[3]);
            hexColor = rgbToHex(r, g, b);
          }
        }
        zoneColorPicker.value = hexColor;
      }

      // Set the zone text color picker to current text color
      if (zoneTextColorPicker && textObject && textObject.fill) {
        zoneTextColorPicker.value = textObject.fill;
      }

      if (zoneNameToggle && zoneAreaToggle && zoneVolumeToggle && zoneNotesToggle && textObject) {
        const textLines = textObject.text.split("\n");
        zoneNameToggle.checked = textLines[0] && !textLines[0].startsWith("Area:") && !textLines[0].startsWith("Volume:") && !textLines[0].startsWith("Notes:");
        zoneAreaToggle.checked = textLines.some((line) => line.startsWith("Area:"));
        zoneVolumeToggle.checked = textLines.some((line) => line.startsWith("Volume:"));
        zoneNotesToggle.checked = textLines.some((line) => line.startsWith("Notes:"));
      }
    }
    originalShowDeviceProperties(deviceType, textObject, polygon);
  };

  const originalHideDeviceProperties = window.hideDeviceProperties;
  window.hideDeviceProperties = function () {
    currentPolygon = null;
    currentTextObject = null;
    if (zoneWarning) {
      zoneWarning.textContent = "";
    }
    originalHideDeviceProperties();
  };

  if (zoneNameInput) {
    zoneNameInput.addEventListener("input", (e) => {
      if (currentPolygon && currentTextObject && currentPolygon.canvas) {
        const newName = e.target.value;
        currentPolygon.zoneName = newName;
        updateZoneText();
      }
    });

    zoneNameInput.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    zoneNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.stopPropagation();
      }
    });
  }

  if (zoneNotesInput) {
    zoneNotesInput.addEventListener("input", (e) => {
      if (currentPolygon && currentTextObject && currentPolygon.canvas) {
        const newNotes = e.target.value;
        currentPolygon.zoneNotes = newNotes;
        updateZoneText();
      }
    });

    zoneNotesInput.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    zoneNotesInput.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.stopPropagation();
      }
    });
  }

  function updateZoneDisplayHeight(height) {
    if (currentPolygon && currentTextObject && currentPolygon.canvas) {
      if (isNaN(height) || height < 1) {
        height = 1;
        zoneHeightInput.value = "1.00";
        zoneHeightSlider.value = "1.00";
      }
      if (height > 10) {
        height = 10;
        zoneHeightInput.value = "10.00";
        zoneHeightSlider.value = "10.00";
      }
      currentTextObject.displayHeight = height;
      updateSliderTrack(zoneHeightSlider, height, zoneHeightSlider.min || 1, zoneHeightSlider.max || 10);
      updateWarningText(height);
      updateZoneText();
    }
  }

  function updateZoneTextSize(size) {
    if (currentPolygon && currentTextObject && currentPolygon.canvas) {
      if (isNaN(size) || size < 1) {
        size = 1;
        zoneTextSizeInput.value = "1";
        zoneTextSizeSlider.value = "1";
      }
      if (size > 100) {
        size = 100;
        zoneTextSizeInput.value = "100";
        zoneTextSizeSlider.value = "100";
      }
      currentTextObject.set({ fontSize: size });
      currentTextObject.setCoords();
      currentPolygon.canvas.renderAll();
      updateSliderTrack(zoneTextSizeSlider, size, zoneTextSizeSlider.min || 1, zoneTextSizeSlider.max || 100);
    }
  }

  function updateZoneTextColor(color) {
    if (currentPolygon && currentTextObject && currentPolygon.canvas) {
      currentTextObject.set({ fill: color });
      currentTextObject.setCoords();
      currentPolygon.canvas.renderAll();
    }
  }

  if (zoneHeightInput) {
    zoneHeightInput.addEventListener("input", (e) => {
      const height = parseFloat(e.target.value);
      zoneHeightSlider.value = height;
      updateZoneDisplayHeight(height);
    });

    zoneHeightInput.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  if (zoneHeightSlider) {
    zoneHeightSlider.addEventListener("input", (e) => {
      const height = parseFloat(e.target.value);
      zoneHeightInput.value = height.toFixed(2);
      updateZoneDisplayHeight(height);
    });

    zoneHeightSlider.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  if (zoneTextSizeInput) {
    zoneTextSizeInput.addEventListener("input", (e) => {
      const size = parseInt(e.target.value);
      zoneTextSizeSlider.value = size;
      updateZoneTextSize(size);
    });

    zoneTextSizeInput.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  if (zoneTextSizeSlider) {
    zoneTextSizeSlider.addEventListener("input", (e) => {
      const size = parseInt(e.target.value);
      zoneTextSizeInput.value = size;
      updateZoneTextSize(size);
    });

    zoneTextSizeSlider.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  if (zoneNameToggle) {
    zoneNameToggle.addEventListener("change", () => {
      updateZoneText();
    });
  }

  if (zoneAreaToggle) {
    zoneAreaToggle.addEventListener("change", () => {
      updateZoneText();
    });
  }

  if (zoneVolumeToggle) {
    zoneVolumeToggle.addEventListener("change", () => {
      updateZoneText();
    });
  }

  if (zoneNotesToggle) {
    zoneNotesToggle.addEventListener("change", () => {
      updateZoneText();
    });
  }

  // Helper function to get hex color from icon
  function getIconColor(icon) {
    const color = icon.getAttribute("data-color") || getComputedStyle(icon).backgroundColor;
    if (color.startsWith("rgb")) {
      const rgb = color.match(/\d+/g).map(Number);
      return rgbToHex(rgb[0], rgb[1], rgb[2]);
    }
    return color;
  }

  // Zone background color controls
  if (zoneColorPicker) {
    zoneColorPicker.addEventListener("input", (e) => {
      e.stopPropagation();
      if (currentPolygon && currentPolygon.canvas) {
        const color = e.target.value;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const fillColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
        const strokeColor = `rgba(${r}, ${g}, ${b}, 1)`;
        currentPolygon.set({ fill: fillColor, stroke: strokeColor });
        currentTextObject.set({ cursorColor: strokeColor });
        currentPolygon.canvas.renderAll();
      }
    });
    zoneColorPicker.addEventListener("click", (e) => e.stopPropagation());
  }

  zoneColorIcons.forEach((icon) => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      if (currentPolygon && currentPolygon.canvas) {
        const hexColor = getIconColor(icon);
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const fillColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
        const strokeColor = `rgba(${r}, ${g}, ${b}, 1)`;
        currentPolygon.set({ fill: fillColor, stroke: strokeColor });
        currentTextObject.set({ cursorColor: strokeColor });
        currentPolygon.canvas.renderAll();
        if (zoneColorPicker) zoneColorPicker.value = hexColor;
      }
    });
  });

  // Zone text color controls
  if (zoneTextColorPicker) {
    zoneTextColorPicker.addEventListener("input", (e) => {
      e.stopPropagation();
      updateZoneTextColor(e.target.value);
    });
    zoneTextColorPicker.addEventListener("click", (e) => e.stopPropagation());
  }

  zoneTextColorIcons.forEach((icon) => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      const hexColor = getIconColor(icon);
      updateZoneTextColor(hexColor);
      if (zoneTextColorPicker) zoneTextColorPicker.value = hexColor;
    });
  });

  function rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }

  function hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color)
        .toString(16)
        .padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }
});
