// Dynamic Sub Sidebar Title Management
document.addEventListener("DOMContentLoaded", function () {
  // Get references to key elements
  const subSidebar = document.getElementById("sub-sidebar");
  const subSidebarTitle = document.getElementById("sub-sidebar-title");
  const closeSidebarBtn = document.getElementById("close-sub-sidebar");
  const mainSidebarBtns = document.querySelectorAll(".sidebar-btn[data-menu]");
  const allSubmenus = document.querySelectorAll(".submenu");

  // Title mapping for each submenu
  const titleMap = {
    "project-options-submenu": "Project Options",
    "add-devices-submenu": "Add Devices",
    "drawing-tools-submenu": "Drawing Tools",
    "client-details-submenu": "Client Details",
    "print-report-submenu": "Print Report",
  };

  // Function to show specific submenu and update title
  function showSubmenu(menuId) {
    // Hide all submenus first
    allSubmenus.forEach((menu) => {
      menu.style.display = "none";
    });

    // Show the target submenu
    const targetSubmenu = document.getElementById(menuId);
    if (targetSubmenu) {
      targetSubmenu.style.display = "block";

      // Update the title
      const newTitle = titleMap[menuId] || "Menu";
      subSidebarTitle.textContent = newTitle;

      // Show the sidebar
      subSidebar.classList.remove("hidden");
    }
  }

  // Function to hide sidebar
  function hideSidebar() {
    subSidebar.classList.add("hidden");

    // Reset title to default
    subSidebarTitle.textContent = "Menu";

    // Hide all submenus
    allSubmenus.forEach((menu) => {
      menu.style.display = "none";
    });
  }

  // Add click event listeners to main sidebar buttons
  mainSidebarBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const menuId = this.getAttribute("data-menu");
      if (menuId) {
        showSubmenu(menuId);
      }
    });
  });

  // Add click event listener to close button
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", function () {
      hideSidebar();
    });
  }

  // Optional: Close sidebar when clicking outside of it
  document.addEventListener("click", function (event) {
    // Check if the click was outside the sidebar and main sidebar
    const isClickInsideSidebar = subSidebar.contains(event.target);
    const isClickInsideMainSidebar = document.getElementById("sidebar").contains(event.target);

    // If sidebar is visible and click is outside both sidebars
    if (!subSidebar.classList.contains("hidden") && !isClickInsideSidebar && !isClickInsideMainSidebar) {
      hideSidebar();
    }
  });

  // Function to programmatically open a specific menu (for external use)
  window.openSubmenu = function (menuId) {
    showSubmenu(menuId);
  };

  // Function to programmatically close sidebar (for external use)
  window.closeSidebar = function () {
    hideSidebar();
  };

  // Function to get current active menu (for external use)
  window.getCurrentMenu = function () {
    const visibleMenu = Array.from(allSubmenus).find((menu) => menu.style.display === "block");
    return visibleMenu ? visibleMenu.id : null;
  };

  // Function to update title manually (for external use)
  window.updateSidebarTitle = function (title) {
    subSidebarTitle.textContent = title;
  };
});
