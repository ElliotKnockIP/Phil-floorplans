import { initCanvasCrop } from "./canvas-crop.js";

export function initCanvasPrint(fabricCanvas) {
  const printButton = document.getElementById("print-btn");
  const captureScreenshotButton = document.getElementById("capture-screenshot-btn");
  const subSidebar = document.getElementById("sub-sidebar");
  const canvasContainer = document.querySelector(".canvas-container");
  const noScreenshotTaken = document.getElementById("no-screenshot-taken");

  const canvasCrop = initCanvasCrop(fabricCanvas, subSidebar, canvasContainer);

  // Function to update screenshot status display
  const updateScreenshotStatus = () => {
    const screenshots = canvasCrop.getScreenshots();
    if (screenshots && screenshots.length > 0) {
      noScreenshotTaken.style.display = "none";
    } else {
      noScreenshotTaken.style.display = "block";
    }
  };

  printButton.addEventListener("click", () => {
    fabricCanvas.renderAll();
    const printInputs = getPrintInputs();
    const screenshots = canvasCrop.getScreenshots();
    proceedWithPrint(canvasContainer, subSidebar, fabricCanvas, printInputs, screenshots);
  });

  captureScreenshotButton.addEventListener("click", () => {
    canvasCrop.startCropForScreenshot();
    // Update status after a brief delay to allow screenshot to be processed
    setTimeout(updateScreenshotStatus, 100);
  });

  const clientLogoButton = document.getElementById("client-logo-test-input");
  const clientLogoInput = document.getElementById("client-logo-upload");
  const logoPreview = document.getElementById("client-logo-preview");

  clientLogoButton.addEventListener("click", () => {
    clientLogoInput.click();
  });

  clientLogoInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        logoPreview.innerHTML = "";
        const img = document.createElement("img");
        img.src = e.target.result;
        img.alt = "Uploaded Client Logo";
        logoPreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please select a valid image file (JPG, PNG, etc.).");
    }
  });

  // Add clear screenshots functionality
  const clearScreenshotsBtn = document.getElementById("clear-screenshots-btn");
  if (clearScreenshotsBtn) {
    clearScreenshotsBtn.addEventListener("click", () => {
      canvasCrop.clearScreenshots();
      updateScreenshotStatus(); // Update status when screenshots are cleared
    });
  }

  // Set up observer for screenshot previews container to detect changes
  const screenshotPreviews = document.getElementById("screenshot-previews");
  if (screenshotPreviews) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          updateScreenshotStatus();
        }
      });
    });

    observer.observe(screenshotPreviews, {
      childList: true,
      subtree: true,
    });
  }

  // Initial status update
  updateScreenshotStatus();

  // Return an object with the update function so it can be called from canvas-crop.js
  return {
    updateScreenshotStatus,
  };
}

export function getPrintInputs() {
  const clientLogoInput = document.getElementById("client-logo-upload");
  const clientNameInput = document.getElementById("client-name-test-input");
  const addressInput = document.getElementById("address-input");
  const dateInput = document.getElementById("client-date-input");
  const reportTitleInput = document.getElementById("report-title-input");

  return {
    clientLogoInput,
    clientName: clientNameInput.value.trim() || "Client Name",
    address: addressInput.value.trim() || "Address",
    date: dateInput.value || new Date().toLocaleDateString(),
    reportTitle: reportTitleInput.value.trim() || "Report",
  };
}

export function proceedWithPrint(canvasContainer, subSidebar, fabricCanvas, printInputs, screenshots) {
  const { clientName, address, date, reportTitle, clientLogoInput } = printInputs;

  const originalContainerStyle = canvasContainer.style.cssText;
  Object.assign(canvasContainer.style, {
    position: "relative",
    left: "0",
    width: "100%",
    height: "100%",
    margin: "0",
    padding: "0",
  });

  const printContainer = document.getElementById("print-container");
  if (!printContainer) {
    alert("Print container not found");
    return;
  }

  // Update print header information
  const printClientName = document.getElementById("print-client-name");
  const printAddress = document.getElementById("print-address");
  const printDate = document.getElementById("print-date");
  const printReportTitle = document.getElementById("print-report-title");

  if (printClientName) printClientName.textContent = clientName;
  if (printAddress) printAddress.textContent = address;
  if (printDate) printDate.textContent = date;
  if (printReportTitle) printReportTitle.textContent = reportTitle;

  // Handle canvas section
  const canvasSection = printContainer.querySelector(".canvas-section");
  if (canvasSection) {
    canvasSection.innerHTML = ""; // Clear previous content

    // Add selected screenshots only
    const selectedScreenshots = screenshots.filter((s) => s.includeInPrint);

    if (selectedScreenshots.length > 0) {
      // Get all screenshot preview items to retrieve titles
      const screenshotPreviews = document.querySelectorAll(".screenshot-preview-item");

      selectedScreenshots.forEach((screenshot, index) => {
        // Find the corresponding preview item by matching dataURL
        let screenshotTitleText = `Screenshot ${index + 1}`;
        screenshotPreviews.forEach((preview) => {
          const previewImg = preview.querySelector(".screenshot-image");
          const titleTextarea = preview.querySelector(".screenshot-title");
          if (previewImg.src === screenshot.dataURL && titleTextarea && titleTextarea.value.trim()) {
            screenshotTitleText = titleTextarea.value.trim();
          }
        });

        // Add screenshot title
        const screenshotTitle = document.createElement("h2");
        screenshotTitle.textContent = screenshotTitleText;
        screenshotTitle.style.marginTop = "30px";
        screenshotTitle.style.marginBottom = "15px";
        screenshotTitle.style.pageBreakAfter = "avoid";
        canvasSection.appendChild(screenshotTitle);

        // Add screenshot image
        const screenshotImg = document.createElement("img");
        screenshotImg.src = screenshot.dataURL;
        screenshotImg.className = "print-canvas-image";
        screenshotImg.alt = screenshotTitleText;
        screenshotImg.style.width = "100%";
        screenshotImg.style.height = "auto";
        screenshotImg.style.marginBottom = "20px";
        screenshotImg.style.pageBreakInside = "avoid";
        canvasSection.appendChild(screenshotImg);
      });
    } else {
      // Display a message if no screenshots are selected
      const noScreenshotsMessage = document.createElement("p");
      noScreenshotsMessage.textContent = "No screenshots selected for printing.";
      noScreenshotsMessage.style.marginTop = "20px";
      canvasSection.appendChild(noScreenshotsMessage);
    }
  }

  const printLogo = document.getElementById("print-logo");

  const proceedToPrint = () => {
    // Show print container
    printContainer.style.display = "block";

    waitForImagesAndPrint(printContainer, () => {
      cleanupAfterPrint(subSidebar, canvasContainer, originalContainerStyle, fabricCanvas);
    });
  };

  // Handle client logo
  if (clientLogoInput && clientLogoInput.files && clientLogoInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (printLogo) {
        printLogo.src = e.target.result;
        printLogo.style.maxWidth = "150px";
        printLogo.style.maxHeight = "100px";
      }
      proceedToPrint();
    };
    reader.onerror = () => {
      alert("Logo upload failed.");
      if (printLogo) printLogo.removeAttribute("src");
      proceedToPrint();
    };
    reader.readAsDataURL(clientLogoInput.files[0]);
  } else {
    if (printLogo) printLogo.removeAttribute("src");
    proceedToPrint();
  }
}

function waitForImagesAndPrint(printContainer, afterPrintCallback) {
  const images = printContainer.querySelectorAll("img[src]");
  const imageCount = images.length;

  if (imageCount === 0) {
    setTimeout(() => {
      window.print();
      afterPrintCallback();
    }, 100);
    return;
  }

  let loadedImages = 0;
  const tryPrint = () => {
    loadedImages++;
    if (loadedImages === imageCount) {
      setTimeout(() => {
        window.print();
        afterPrintCallback();
      }, 100);
    }
  };

  images.forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      tryPrint();
    } else {
      img.addEventListener("load", tryPrint, { once: true });
    }
  });
}

function cleanupAfterPrint(subSidebar, canvasContainer, originalContainerStyle, fabricCanvas) {
  if (subSidebar) {
    subSidebar.classList.remove("hidden");
  }

  if (canvasContainer) {
    canvasContainer.style.cssText = originalContainerStyle;
  }

  if (fabricCanvas) {
    fabricCanvas.requestRenderAll();
  }

  // Clean up print container
  const printContainer = document.getElementById("print-container");
  if (printContainer) {
    printContainer.style.display = "none";
  }

  // Clean up print images
  const printCanvasImage = document.getElementById("print-canvas-image");
  if (printCanvasImage) {
    printCanvasImage.removeAttribute("src");
  }

  const printLogo = document.getElementById("print-logo");
  if (printLogo) {
    printLogo.removeAttribute("src");
  }
}
