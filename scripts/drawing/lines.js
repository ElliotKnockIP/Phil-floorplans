// Simplified lines.js (combines line.js, connection.js, and arrow.js)
import { closeSidebar, startTool, stopCurrentTool, setupDeletion } from "./drawing-utils.js";

export function setupLineTools(canvas) {
  const lineBtn = document.getElementById("add-line-btn");
  const connectionBtn = document.getElementById("add-connection-btn");
  const arrowBtn = document.getElementById("add-arrow-btn");

  let startPoint = null;
  let tempObject = null;

  setupDeletion(canvas, (obj) => obj.type === "line" || obj.type === "arrow");

  // Line tool
  lineBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "line", handleLineClick, handleLineMove);
  });

  // Connection tool
  connectionBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "connection", handleConnectionClick, handleConnectionMove);
  });

  // Arrow tool
  arrowBtn.addEventListener("click", () => {
    closeSidebar();
    startTool(canvas, "arrow", handleArrowClick, handleArrowMove);
  });

  function handleLineClick(e) {
    lineClick(e, "green", false);
  }

  function handleConnectionClick(e) {
    lineClick(e, "grey", true);
  }

  function handleArrowClick(e) {
    arrowClick(e);
  }

  function handleLineMove(e) {
    lineMove(e, "green", false);
  }

  function handleConnectionMove(e) {
    lineMove(e, "grey", true);
  }

  function handleArrowMove(e) {
    arrowMove(e);
  }

  function lineClick(e, color, dashed) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = canvas.getPointer(e.e);

    if (!startPoint) {
      startPoint = { x: pointer.x, y: pointer.y };
    } else {
      if (tempObject) canvas.remove(tempObject);

      const line = new fabric.Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
        stroke: color,
        strokeWidth: 2,
        strokeDashArray: dashed ? [5, 5] : null,
        selectable: true,
        hasControls: false,
        borderColor: "#FE8800",
        cornerColor: "#FE8800",
      });

      canvas.add(line);
      canvas.setActiveObject(line);

      startPoint = null;
      tempObject = null;
      stopCurrentTool();
    }
  }

  function lineMove(e, color, dashed) {
    if (!startPoint) return;

    const pointer = canvas.getPointer(e.e);

    if (tempObject) canvas.remove(tempObject);

    tempObject = new fabric.Line([startPoint.x, startPoint.y, pointer.x, pointer.y], {
      stroke: color,
      strokeWidth: 3,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
    });

    canvas.add(tempObject);
    canvas.requestRenderAll();
  }

  function arrowClick(e) {
    e.e.preventDefault();
    e.e.stopPropagation();

    const pointer = canvas.getPointer(e.e);

    if (!startPoint) {
      startPoint = { x: pointer.x, y: pointer.y };
    } else {
      if (tempObject) canvas.remove(tempObject);

      const arrow = createArrow(startPoint, pointer);
      canvas.add(arrow);
      canvas.setActiveObject(arrow);

      startPoint = null;
      tempObject = null;
      stopCurrentTool();
    }
  }

  function arrowMove(e) {
    if (!startPoint) return;

    const pointer = canvas.getPointer(e.e);

    if (tempObject) canvas.remove(tempObject);

    tempObject = createArrow(startPoint, pointer, true);
    canvas.add(tempObject);
    canvas.requestRenderAll();
  }

  function createArrow(start, end, isPreview = false) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);

    const line = new fabric.Line([start.x, start.y, end.x, end.y], {
      stroke: "blue",
      strokeWidth: isPreview ? 3 : 2,
      strokeDashArray: isPreview ? [5, 5] : null,
      selectable: !isPreview,
      evented: !isPreview,
    });

    const arrowHead = new fabric.Triangle({
      left: end.x,
      top: end.y,
      originX: "center",
      originY: "center",
      width: 10,
      height: 10,
      fill: "blue",
      angle: (angle * 180) / Math.PI + 90,
      selectable: false,
      evented: false,
    });

    return new fabric.Group([line, arrowHead], {
      selectable: !isPreview,
      hasControls: false,
      borderColor: "#FE8800",
      cornerColor: "#FE8800",
      type: "arrow",
    });
  }
}
