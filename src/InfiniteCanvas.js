import { Camera } from "./camera";

export class InfiniteCanvas {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d");
    this.camera = new Camera();

    this.objects = new Map();

    this._addRectangle({
      id: "rect-1",
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      color: "#e74c3c",
    });
    this._addRectangle({
      id: "rect-2",
      x: 200,
      y: 150,
      w: 150,
      h: 80,
      color: "#3498db",
    });
    this._addRectangle({
      id: "rect-3",
      x: -300,
      y: -100,
      w: 120,
      h: 120,
      color: "#2ecc71",
    });
    this.draggingShape = null;
    this.isPanning = false;
    this.lastMouse = { x: 0, y: 0 };

    this._resize();
    window.addEventListener("resize", () => this._resize());

    this._bindInput();
    this._loop();
  }

  _addRectangle({ id, x, y, w, h, color, rotation = 0, selected = false }) {
    this.objects.set(id, {
      id,
      type: "rectangle",
      x,
      y,
      w,
      h,
      color,
      rotation,
      selected,
    });
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
      const hit = this._hitTest(worldPos.x, worldPos.y);

      this._clearSelection();

      if (hit) {
        hit.selected = true;
        this.draggingShape = hit;
        this.lastMouse = {
          x: e.clientX,
          y: e.clientY,
        };
        return;
      }

      this.isPanning = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mousemove", (e) => {
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;

      this.lastMouse = { x: e.clientX, y: e.clientY };

      if (this.draggingShape) {
        const worldDx = dx / this.camera.zoom;
        const worldDy = dy / this.camera.zoom;

        this.draggingShape.x += worldDx;
        this.draggingShape.y += worldDy;
        return;
      }

      if (this.isPanning) {
        this.camera.panByScreenDelta(dx, dy);
      }
    });

    window.addEventListener("mouseup", () => {
      this.isPanning = false;
      this.draggingShape = null;
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
  }

  _render() {
    const { ctx, canvas, camera } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const obj of this.objects.values()) {
      this._renderShape(obj);
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

  _loop() {
    this._render();
    requestAnimationFrame(() => this._loop());
  }
}
