import { saveZones, loadZones } from "./save-zones.js";

export function initSaveProject(fabricCanvas) {
  const saveButton = document.getElementById("save-project-btn");
  const loadButton = document.getElementById("load-project-btn");
  const loadInput = document.getElementById("load-project-input");

  // Save project handler
  saveButton.addEventListener("click", () => {
    try {
      console.log("Saving project...");

      // Save zones using saveZones function
      const zonesData = saveZones(fabricCanvas);

      // Save other canvas properties (excluding zones, which are handled separately)
      const projectData = {
        canvas: fabricCanvas.toJSON(["pixelsPerMeter"]),
        zones: zonesData, // Explicitly include zones data
      };

      // Filter out zone-related objects from canvas JSON to avoid duplication
      projectData.canvas.objects = projectData.canvas.objects.filter((obj) => obj.class !== "zone-polygon" && obj.class !== "zone-text");

      const projectJSON = JSON.stringify(projectData, null, 2);
      console.log("Project JSON:", projectJSON);

      // Create and download a JSON file
      const blob = new Blob([projectJSON], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `project-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("Project saved successfully!");
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project: " + error.message);
    }
  });

  // Load project handler
  loadButton.addEventListener("click", () => {
    loadInput.click();
  });

  loadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          console.log("Loading project...");
          const projectData = JSON.parse(event.target.result);
          console.log("Loaded project data:", projectData);

          // Clear canvas before loading
          fabricCanvas.clear();

          // Load canvas (non-zone objects)
          fabricCanvas.loadFromJSON(
            projectData.canvas,
            () => {
              console.log("Canvas loaded");
              // Load zones explicitly using loadZones
              if (projectData.zones) {
                loadZones(fabricCanvas, projectData.zones);
              }
              fabricCanvas.requestRenderAll();
              alert("Project loaded successfully!");
            },
            (o, object) => {
              // Reviver to restore custom properties for non-zone objects
              if (object.class && object.class !== "zone-polygon" && object.class !== "zone-text") {
                object.set({ class: object.class });
              }
            }
          );
        } catch (error) {
          console.error("Error loading project:", error);
          alert("Failed to load project: " + error.message);
        }
      };
      reader.readAsText(file);
    }
  });
}
