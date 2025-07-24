export function initMapBackground(fabricCanvas, selectBackgroundPopup, updateStepIndicators, handleCrop, setBackgroundSource) {
  // DOM Elements
  const mapPopup = document.getElementById("map-popup");
  const closeMapBtn = document.getElementById("closeMapBtn");
  const addressInput = document.getElementById("addressInput");
  const openMapBtn = document.getElementById("google-maps-satellite-btn");
  const mapBackBtn = document.getElementById("mapBackBtn");
  const mapNextBtn = document.getElementById("mapNextBtn");
  const subSidebar = document.getElementById("sub-sidebar");

  let map;
  let geocoder;

  // Opens the map background selection popup
  openMapBtn.addEventListener("click", () => {
    subSidebar.classList.add("hidden");

    // Hide any other visible submenus
    document.querySelectorAll(".submenu").forEach((submenu) => {
      submenu.classList.add("hidden");
      submenu.classList.remove("show");
    });

    mapPopup.style.display = "block";

    // Initialize map
    if (!map) {
      initMap();
    }

    selectBackgroundPopup.style.display = "none";
    updateStepIndicators(1);
  });

  // Closes the map popup and returns to the background selection screen
  closeMapBtn.addEventListener("click", () => {
    mapPopup.style.display = "none";
    updateStepIndicators(1);
  });

  // Goes back to the appropriate background selection popup
  mapBackBtn.addEventListener("click", () => {
    mapPopup.style.display = "none";
    selectBackgroundPopup.style.display = "block";
    updateStepIndicators(1);
  });

  // Initializes the Google Maps interface with autocomplete
  async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");

    // Create geocoder for address lookup
    geocoder = new google.maps.Geocoder();

    // Create and configure map instance
    map = new Map(document.getElementById("map"), {
      center: { lat: 51.501414692425151, lng: -0.14187515932683303 }, // Default: Buckingham Palace
      zoom: 18,
      mapTypeId: "satellite",
      tilt: 0,
      gestureHandling: "greedy",
      scaleControl: true,
    });

    // Replace plain input with Google's Place Autocomplete
    const placeAutocomplete = new PlaceAutocompleteElement({
      locationRestriction: {
        north: 85,
        south: -85,
        east: 180,
        west: -180,
      },
    });

    placeAutocomplete.id = "addressInput";

    // Replace existing input field
    addressInput.parentNode.replaceChild(placeAutocomplete, addressInput);

    // Handle place selection from autocomplete
    placeAutocomplete.addEventListener("gmp-select", async (event) => {
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
    });
  }

  // Preload image with timeout and fallback
  function preloadMapImage(url, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      // Set up timeout
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

      // Enable CORS for cross-origin images
      img.crossOrigin = "anonymous";
      img.src = url;
    });
  }

  // Proceeds to the next step with the current map view as a background image
  mapNextBtn.addEventListener("click", async () => {
    try {
      const center = map.getCenter();
      const zoom = map.getZoom();

      // Generate Google Static Map URL with optimized parameters
      const apiKey = "AIzaSyA07kRUWXpno9PBLSDZ97ypqCTL93xRF_U";

      // Reduced size for faster loading - you can adjust these values
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat()},${center.lng()}&zoom=${zoom - 1}&size=800x800&scale=2&maptype=satellite&key=${apiKey}&format=jpg&quality=85`;

      // Preload the image before proceeding
      await preloadMapImage(staticMapUrl);

      mapPopup.style.display = "none";

      setBackgroundSource("map");
      handleCrop(staticMapUrl);
      updateStepIndicators(2);
    } catch (error) {
      console.error("Error loading map image:", error);

      // Show user-friendly error message
      alert("Failed to load satellite image. Please try again or check your internet connection.");

      // Fallback with smaller size
      const center = map.getCenter();
      const zoom = map.getZoom();
      const apiKey = "AIzaSyA07kRUWXpno9PBLSDZ97ypqCTL93xRF_U";
      const fallbackUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat()},${center.lng()}&zoom=${zoom - 1}&size=600x600&scale=1&maptype=satellite&key=${apiKey}&format=jpg&quality=70`;

      try {
        await preloadMapImage(fallbackUrl, 10000);
        mapPopup.style.display = "none";
        setBackgroundSource("map");
        handleCrop(fallbackUrl);
        updateStepIndicators(2);
      } catch (fallbackError) {
        console.error("Fallback image also failed:", fallbackError);
        alert("Unable to load satellite image. Please try again later.");
      }
    }
  });
}
