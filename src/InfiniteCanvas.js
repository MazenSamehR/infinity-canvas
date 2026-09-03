import { Camera } from "./camera";
import { DeleteCommand } from "./commands/DeleteCommand";
import { HistoryManager } from "./commands/HistoryManager";
import { CreateCommand } from "./commands/CreateCommand";
import { ResizeCommand } from "./commands/ResizeCommand";
import { MoveCommand } from "./commands/MoveCommand";

export class InfiniteCanvas {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.camera = new Camera();
    this.history = new HistoryManager();

    this.objects = new Map();

    // this._generateRandomShapes(5000);

    this.draggingShape = null;
    this.draggingStartPos = null;

    this.resizingShape = null;
    this.resizeHandle = null;
    this.resizeAnchor = null;
    this.resizeStartBounds = null;

    this.currentTool = null;
    this.onToolChange = null;

    this.isPanning = false;
    this.lastMouse = { x: 0, y: 0 };

    this._resize();
    window.addEventListener("resize", () => this._resize());

    this._bindInput();
    this._loop();
  }

  setTool(tool) {
    this._setCurrentTool(this.currentTool === tool ? null : tool);
  }

  _setCurrentTool(tool) {
    this.currentTool = tool;
    this.onToolChange?.(tool);
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _clearSelection() {
    for (const obj of this.objects.values()) {
      obj.selected = false;
    }
  }

  _bindInput() {
    this.canvas.addEventListener("mousedown", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldPos = this.camera.screenToWorld(mouseX, mouseY);

      if (this.currentTool) {
        const w = 100;
        const h = 100;
        switch (this.currentTool) {
          case "rectangle": {
            const shape = {
              id: `shape-${crypto.randomUUID()}`,
              type: "rectangle",
              x: worldPos.x - w / 2,
              y: worldPos.y - h / 2,
              w,
              h,
              color: `hsl(${Math.random() * 360}, 70%, 50%)`,
              rotation: 0,
              selected: false,
            };
            this.history.execute(new CreateCommand(this.objects, shape));
            break;
          }

          case "circle":
            // Implement circle creation logic here
            break;
        }

        return;
      }

      const resizeHit = this._hitResizeHandle(worldPos.x, worldPos.y);
      if (resizeHit) {
        const { shape, handle } = resizeHit;
        this.resizingShape = shape;
        this.resizeHandle = handle;
        switch (handle) {
          case "bottom-right":
            this.resizeAnchor = { x: shape.x, y: shape.y };
            break;
          case "bottom-left":
            this.resizeAnchor = { x: shape.x + shape.w, y: shape.y };
            break;
          case "top-right":
            this.resizeAnchor = { x: shape.x, y: shape.y + shape.h };
            break;
          case "top-left":
            this.resizeAnchor = { x: shape.x + shape.w, y: shape.y + shape.h };
            break;
        }
        this.resizeStartBounds = {
          x: shape.x,
          y: shape.y,
          w: shape.w,
          h: shape.h,
        };
        this.lastMouse = { x: e.clientX, y: e.clientY };
        return;
      }

      const hit = this._hitTest(worldPos.x, worldPos.y);

      this._clearSelection();

      if (hit) {
        hit.selected = true;
        this.draggingShape = hit;

        this.draggingStartPos = { x: hit.x, y: hit.y };

        this.lastMouse = {
          x: e.clientX,
          y: e.clientY,
        };
        return;
      }

      if (e.shiftKey) {
        this.marqueeStart = worldPos;
        this.marqueeEnd = worldPos;
        return;
      }

      this.isPanning = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mousemove", (e) => {
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;

      this.lastMouse = { x: e.clientX, y: e.clientY };

      if (this.resizingShape) {
        const rect = this.canvas.getBoundingClientRect();

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldPos = this.camera.screenToWorld(mouseX, mouseY);

        const shape = this.resizingShape;
        const anchor = this.resizeAnchor;

        shape.x = Math.min(worldPos.x, anchor.x);
        shape.y = Math.min(worldPos.y, anchor.y);
        shape.w = Math.abs(worldPos.x - anchor.x);
        shape.h = Math.abs(worldPos.y - anchor.y);

        return;
      }

      if (this.draggingShape) {
        const worldDx = dx / this.camera.zoom;
        const worldDy = dy / this.camera.zoom;

        this.draggingShape.x += worldDx;
        this.draggingShape.y += worldDy;
        return;
      }

      if (this.marqueeStart) {
        const rect = this.canvas.getBoundingClientRect();

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldPos = this.camera.screenToWorld(mouseX, mouseY);
        this.marqueeEnd = worldPos;
        return;
      }

      if (this.isPanning) {
        this.camera.panByScreenDelta(dx, dy);
        this.canvas.style.cursor = "grabbing";
        return;
      }

      const rect = this.canvas.getBoundingClientRect();

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldPos = this.camera.screenToWorld(mouseX, mouseY);

      const handle = this._hitResizeHandle(worldPos.x, worldPos.y)?.handle;

      if (handle === "top-left" || handle === "bottom-right") {
        this.canvas.style.cursor = "nwse-resize";
      } else if (handle === "top-right" || handle === "bottom-left") {
        this.canvas.style.cursor = "nesw-resize";
      } else {
        const hit = this._hitTest(worldPos.x, worldPos.y);
        if (hit) {
          this.canvas.style.cursor = "move";
        } else {
          this.canvas.style.cursor = "grab";
        }
      }
    });

    window.addEventListener("mouseup", () => {
      this._setCurrentTool(null);

      this.isPanning = false;
      this.canvas.style.cursor = "grab";

      if (this.draggingShape) {
        const command = new MoveCommand(
          this.draggingShape,
          this.draggingStartPos,
          { x: this.draggingShape.x, y: this.draggingShape.y },
        );
        this.history.execute(command);
      }

      if (this.resizingShape) {
        const command = new ResizeCommand(
          this.resizingShape,
          { x: this.resizeStartBounds.x, y: this.resizeStartBounds.y },
          { x: this.resizingShape.x, y: this.resizingShape.y },
          this.resizeStartBounds.w,
          this.resizeStartBounds.h,
          this.resizingShape.w,
          this.resizingShape.h,
        );
        this.history.execute(command);
      }

      this.draggingShape = null;
      this.draggingStartPos = null;
      this.resizingShape = null;
      this.resizeHandle = null;
      this.resizeAnchor = null;
      this.resizeStartBounds = null;

      if (this.marqueeStart && this.marqueeEnd) {
        const minX = Math.min(this.marqueeStart.x, this.marqueeEnd.x);
        const maxX = Math.max(this.marqueeStart.x, this.marqueeEnd.x);
        const minY = Math.min(this.marqueeStart.y, this.marqueeEnd.y);
        const maxY = Math.max(this.marqueeStart.y, this.marqueeEnd.y);

        for (const obj of this.objects.values()) {
          const overlaps = this._inView(obj, { minX, maxX, minY, maxY });

          obj.selected = overlaps;
        }
      }

      this.marqueeStart = null;
      this.marqueeEnd = null;
    });

    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        this.camera.zoomAt(mouseX, mouseY, zoomFactor);
      },
      { passive: false },
    );

    window.addEventListener("keydown", (e) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;

      e.preventDefault();

      for (const [id, obj] of this.objects) {
        if (obj.selected) {
          this.history.execute(new DeleteCommand(this.objects, obj));
        }
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        this.history.undo();
      }

      if (e.ctrlKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        this.history.redo();
      }
    });
  }

  _render() {
    const { ctx, canvas, camera } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this._renderGrid();

    const topLeft = camera.screenToWorld(0, 0);
    const bottomRight = camera.screenToWorld(canvas.width, canvas.height);

    const viewBounds = {
      minX: Math.min(topLeft.x, bottomRight.x),
      maxX: Math.max(topLeft.x, bottomRight.x),
      minY: Math.min(topLeft.y, bottomRight.y),
      maxY: Math.max(topLeft.y, bottomRight.y),
    };

    for (const obj of this.objects.values()) {
      const overlaps = this._inView(obj, viewBounds);
      if (!overlaps) continue;

      this._renderShape(obj);
    }

    this._renderMarquee();
  }

  _renderGrid() {
    const baseSpacing = 50;
    const spacing = baseSpacing / this.camera.zoom;

    const topLeft = this.camera.screenToWorld(0, 0);
    const bottomRight = this.camera.screenToWorld(
      this.canvas.width,
      this.canvas.height,
    );

    const viewBounds = {
      minX: Math.min(topLeft.x, bottomRight.x),
      maxX: Math.max(topLeft.x, bottomRight.x),
      minY: Math.min(topLeft.y, bottomRight.y),
      maxY: Math.max(topLeft.y, bottomRight.y),
    };

    const { ctx, camera } = this;
    ctx.save();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;

    // Vertical lines
    const startX = Math.floor(viewBounds.minX / spacing) * spacing;
    for (let x = startX; x <= viewBounds.maxX; x += spacing) {
      const screenStart = camera.worldToScreen(x, viewBounds.minY);
      const screenEnd = camera.worldToScreen(x, viewBounds.maxY);
      ctx.beginPath();
      ctx.moveTo(screenStart.x, screenStart.y);
      ctx.lineTo(screenEnd.x, screenEnd.y);
      ctx.stroke();
    }

    // Horizontal lines
    const startY = Math.floor(viewBounds.minY / spacing) * spacing;

    for (let y = startY; y <= viewBounds.maxY; y += spacing) {
      const screenStart = camera.worldToScreen(viewBounds.minX, y);

      const screenEnd = camera.worldToScreen(viewBounds.maxX, y);

      ctx.beginPath();
      ctx.moveTo(screenStart.x, screenStart.y);
      ctx.lineTo(screenEnd.x, screenEnd.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  _renderMarquee() {
    if (!this.marqueeStart || !this.marqueeEnd) return;

    const { ctx, camera } = this;
    const startScreen = camera.worldToScreen(
      this.marqueeStart.x,
      this.marqueeStart.y,
    );
    const endScreen = camera.worldToScreen(
      this.marqueeEnd.x,
      this.marqueeEnd.y,
    );

    const x = Math.min(startScreen.x, endScreen.x);
    const y = Math.min(startScreen.y, endScreen.y);
    const w = Math.abs(startScreen.x - endScreen.x);
    const h = Math.abs(startScreen.y - endScreen.y);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(x, y, w, h);
  }

  _renderResizeHandles(obj) {
    if (!obj.selected) return;

    const { ctx, camera } = this;

    const screenPos = camera.worldToScreen(obj.x, obj.y);

    const screenW = obj.w * camera.zoom;
    const screenH = obj.h * camera.zoom;

    const handleSize = 8;

    const handles = [
      {
        x: screenPos.x,
        y: screenPos.y,
      },
      {
        x: screenPos.x + screenW,
        y: screenPos.y,
      },
      {
        x: screenPos.x,
        y: screenPos.y + screenH,
      },
      {
        x: screenPos.x + screenW,
        y: screenPos.y + screenH,
      },
    ];

    ctx.fillStyle = "#ffffff";

    for (const handle of handles) {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize,
      );
    }
  }

  _renderShape(obj) {
    const { ctx, camera } = this;
    const screenPos = camera.worldToScreen(obj.x, obj.y);
    const screenW = obj.w * camera.zoom;
    const screenH = obj.h * camera.zoom;

    ctx.save();

    if (obj.rotation !== 0) {
      const centerX = screenPos.x + screenW / 2;
      const centerY = screenPos.y + screenH / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(obj.rotation);
      ctx.translate(-centerX, -centerY);
    }

    switch (obj.type) {
      case "rectangle":
        ctx.fillStyle = obj.color;
        ctx.fillRect(screenPos.x, screenPos.y, screenW, screenH);
        break;
    }

    if (obj.selected) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;

      ctx.strokeRect(
        screenPos.x - 2,
        screenPos.y - 2,
        screenW + 4,
        screenH + 4,
      );
      this._renderResizeHandles(obj);
    }

    ctx.restore();
  }

  _hitTest(worldX, worldY) {
    const objects = Array.from(this.objects.values());
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];

      if (
        worldX >= obj.x &&
        worldX <= obj.x + obj.w &&
        worldY >= obj.y &&
        worldY <= obj.y + obj.h
      ) {
        return obj;
      }
    }
    return null;
  }

  _hitResizeHandle(worldX, worldY) {
    const handleSize = 8 / this.camera.zoom;

    for (const obj of this.objects.values()) {
      if (!obj.selected) continue;

      const handles = {
        "top-left": {
          x: obj.x,
          y: obj.y,
        },
        "top-right": {
          x: obj.x + obj.w,
          y: obj.y,
        },
        "bottom-left": {
          x: obj.x,
          y: obj.y + obj.h,
        },
        "bottom-right": {
          x: obj.x + obj.w,
          y: obj.y + obj.h,
        },
      };

      for (const [handle, point] of Object.entries(handles)) {
        if (
          worldX >= point.x - handleSize &&
          worldX <= point.x + handleSize &&
          worldY >= point.y - handleSize &&
          worldY <= point.y + handleSize
        ) {
          return { shape: obj, handle };
        }
      }
    }
    return null;
  }

  _inView(obj, viewBounds) {
    const objMinX = obj.x;
    const objMaxX = obj.x + obj.w;
    const objMinY = obj.y;
    const objMaxY = obj.y + obj.h;

    return (
      objMaxX >= viewBounds.minX &&
      objMinX <= viewBounds.maxX &&
      objMaxY >= viewBounds.minY &&
      objMinY <= viewBounds.maxY
    );
  }

  // _generateRandomShapes(count) {
  //   for (let i = 0; i < count; i++) {
  //     const shape = {
  //       id: `shape-${crypto.randomUUID()}`,
  //       type: "rectangle",
  //       x: Math.random() * 2000 - 1000,
  //       y: Math.random() * 2000 - 1000,
  //       w: Math.random() * 100 + 20,
  //       h: Math.random() * 100 + 20,
  //       color: `hsl(${Math.random() * 360}, 70%, 50%)`,
  //       rotation: 0,
  //       selected: false,
  //     };
  //     this.objects.set(shape.id, shape);
  //   }
  // }

  _loop() {
    this._render();
    requestAnimationFrame(() => this._loop());
  }
}
