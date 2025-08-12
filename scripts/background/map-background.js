export function initMapBackground(fabricCanvas, mainModal, updateStepIndicators, handleCrop, setBackgroundSource) {
  // DOM Elements - Bootstrap modal
  const mapModal = document.getElementById("mapModal");
  const mapBackBtn = document.getElementById("map-back-btn");
  const mapNextBtn = document.getElementById("map-next-btn");
  const addressInput = document.getElementById("maps-address-input");
  const mapTypeSelect = document.getElementById("map-type-select");
  const subSidebar = document.getElementById("sub-sidebar");

  let map;
  let geocoder;

  // Opens the map background selection modal (from main modal button click)
  function handleMapBackgroundSelection() {
    if (subSidebar) subSidebar.classList.add("hidden");

    document.querySelectorAll(".submenu").forEach((submenu) => {
      submenu.classList.add("hidden");
      submenu.classList.remove("show");
    });

    // Hide main modal
    const mainModalInstance = bootstrap.Modal.getInstance(mainModal);
    if (mainModalInstance) mainModalInstance.hide();

    // Show map modal
    setTimeout(() => {
      const mapModalInstance = bootstrap.Modal.getInstance(mapModal) || new bootstrap.Modal(mapModal);
      mapModalInstance.show();
      updateStepIndicators(1);

      // Initialize map after modal is shown
      setTimeout(() => {
        if (!map) {
          initMap();
        }
      }, 300);
    }, 200);
  }

  // Goes back to main background selection modal
  function handleMapBack() {
    const mapModalInstance = bootstrap.Modal.getInstance(mapModal);
    if (mapModalInstance) mapModalInstance.hide();

    // Show main modal immediately
    const mainModalInstance = bootstrap.Modal.getInstance(mainModal) || new bootstrap.Modal(mainModal);
    mainModalInstance.show();
    updateStepIndicators(1);
  }

  // Initializes the Google Maps interface with autocomplete
  async function initMap() {
    try {
      const mapContainer = document.getElementById("map");
      if (!mapContainer) {
        console.error("Map container not found");
        return;
      }

      const { Map } = await google.maps.importLibrary("maps");
      const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");

      // Create geocoder for address lookup
      geocoder = new google.maps.Geocoder();

      // Create and configure map instance
      map = new Map(mapContainer, {
        center: { lat: 51.501414692425151, lng: -0.14187515932683303 }, // Default: London
        zoom: 18,
        mapTypeId: "satellite",
        tilt: 0,
        gestureHandling: "greedy",
        scaleControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
      });

      // Set up map type control if it exists
      if (mapTypeSelect) {
        mapTypeSelect.addEventListener("change", () => {
          map.setMapTypeId(mapTypeSelect.value);
        });
      }

      // Replace plain input with Google's Place Autocomplete
      if (addressInput) {
        const addressForm = document.getElementById("address-form");

        const placeAutocomplete = new PlaceAutocompleteElement({
          locationRestriction: {
            north: 85,
            south: -85,
            east: 180,
            west: -180,
          },
        });

        placeAutocomplete.id = "maps-address-input";
        placeAutocomplete.placeholder = "Enter address, building name or postcode...";

        // Style to match the form container
        placeAutocomplete.style.width = "100%";
        placeAutocomplete.style.height = "50px";
        placeAutocomplete.style.padding = "0 1rem";
        placeAutocomplete.style.border = "none";
        placeAutocomplete.style.outline = "none";
        placeAutocomplete.style.borderRadius = "0.5rem";
        placeAutocomplete.style.fontSize = "1rem";
        placeAutocomplete.style.boxSizing = "border-box";

        // Replace existing input field
        addressInput.parentNode.replaceChild(placeAutocomplete, addressInput);

        // Add styling to ensure consistent appearance
        const style = document.createElement("style");
        style.textContent = `
          gmp-place-autocomplete {
            width: 100% !important;
            height: 50px !important;
            display: block !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        `;
        document.head.appendChild(style);

        // Handle place selection from autocomplete
        placeAutocomplete.addEventListener("gmp-select", async (event) => {
          try {
            const place = event.placePrediction.toPlace();
            await place.fetchFields({ fields: ["formattedAddress", "location"] });

            if (!place.location) {
              alert("No details available for the selected place. Please try another.");
              return;
            }

            // Center map to selected place
            map.setCenter(place.location);
            map.setZoom(19);
            placeAutocomplete.value = place.formattedAddress;
          } catch (error) {
            console.error("Error selecting place:", error);
            alert("Error selecting location. Please try again.");
          }
        });
      }
    } catch (error) {
      console.error("Error initializing map:", error);
      alert("Error loading Google Maps. Please check your internet connection and try again.");
    }
  }

  // Preload image with timeout and fallback
  function preloadMapImage(url, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      const timeoutId = setTimeout(() => {
        reject(new Error("Image loading timeout"));
      }, timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error("Image loading failed"));
      };

      img.crossOrigin = "anonymous";
      img.src = url;
    });
  }

  // Proceeds to the next step with the current map view as a background image
  function handleMapNext() {
    if (!map) {
      alert("Map not initialized. Please try again.");
      return;
    }

    // Show loading state
    if (mapNextBtn) {
      mapNextBtn.disabled = true;
      mapNextBtn.innerHTML = `
        <div class="icon-label">
          <span>Loading...</span>
          <div class="spinner-border spinner-border-sm" role="status"></div>
        </div>
      `;
    }

    const center = map.getCenter();
    const zoom = map.getZoom();
    const mapType = mapTypeSelect ? mapTypeSelect.value : "satellite";

    // Generate Google Static Map URL with current settings
    const apiKey = "AIzaSyA07kRUWXpno9PBLSDZ97ypqCTL93xRF_U";
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat()},${center.lng()}&zoom=${zoom}&size=1024x1024&scale=2&maptype=${mapType}&key=${apiKey}&format=jpg&quality=90`;

    // Preload the image before proceeding
    preloadMapImage(staticMapUrl)
      .then(() => {
        // Hide map modal
        const mapModalInstance = bootstrap.Modal.getInstance(mapModal);
        if (mapModalInstance) mapModalInstance.hide();

        setBackgroundSource("map");

        // Go to crop immediately
        handleCrop(staticMapUrl);
        updateStepIndicators(2);
      })
      .catch((error) => {
        console.error("Error loading map image:", error);

        // Show user-friendly error message
        alert("Failed to load satellite image. Please try again or check your internet connection.");

        // Try fallback with smaller size
        const fallbackUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat()},${center.lng()}&zoom=${zoom}&size=800x800&scale=1&maptype=${mapType}&key=${apiKey}&format=jpg&quality=70`;

        preloadMapImage(fallbackUrl, 10000)
          .then(() => {
            const mapModalInstance = bootstrap.Modal.getInstance(mapModal);
            if (mapModalInstance) mapModalInstance.hide();

            setBackgroundSource("map");

            // Go to crop immediately
            handleCrop(fallbackUrl);
            updateStepIndicators(2);
          })
          .catch((fallbackError) => {
            console.error("Fallback image also failed:", fallbackError);
            alert("Unable to load satellite image. Please try again later.");
          });
      })
      .finally(() => {
        // Reset button state
        if (mapNextBtn) {
          mapNextBtn.disabled = false;
          mapNextBtn.innerHTML = `
            <div class="icon-label">
              <span>Next</span>
              <img src="images/icons/next-arrow.svg" alt="Next Arrow Icon" />
            </div>
          `;
        }
      });
  }

  // Event listeners
  if (mapBackBtn) {
    mapBackBtn.addEventListener("click", handleMapBack);
  }

  if (mapNextBtn) {
    mapNextBtn.addEventListener("click", handleMapNext);
  }

  // Modal event listeners
  if (mapModal) {
    mapModal.addEventListener("shown.bs.modal", () => {
      setTimeout(() => {
        if (!map) {
          initMap();
        }
      }, 300);
    });
  }

  return { handleMapBackgroundSelection };
}
