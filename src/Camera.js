export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
  }
  /**
   * Converts screen/viewport coordinates to world/canvas coordinates
   * @param {*} screenX
   * @param {*} screenY
   * @returns {*} worldX, worldY
   */
  screenToWorld(screenX, screenY) {
    //Note: ScreenPoint = (WorldPoint - offset "Camera position") * zoom
    //So WorldPoint = ScreenPoint / zoom + offset
    const worldX = screenX / this.zoom + this.x;
    const worldY = screenY / this.zoom + this.y;
    return { x: worldX, y: worldY };
  }

  /**
   * Converts world/canvas coordinates to screen/viewport coordinates
   * @param {*} worldx
   * @param {*} worldY
   * @returns {*} screenX, screenY
   */
  worldToScreen(worldx, worldY) {
    const screenX = (worldx - this.x) * this.zoom;
    const screenY = (worldY - this.y) * this.zoom;
    return { x: screenX, y: screenY };
  }

  /**
   * Pans the camera by the specified screen delta.
   * @param {*} deltaY
   * @param {*} deltaX
   * @description deltaX, deltaY are the distance moved on screen, in pixels. For example, if the user drags the mouse 10 pixels to the right and 5 pixels down, deltaX would be 10 and deltaY would be 5.
   */
  panByScreenDelta(deltaX, deltaY) {
    // when the user drags right by dx pixels, the same world point should appear
    // dx pixels further right on screen
    // before: screenX      = (worldX - camera.x_old) * zoom
    // after:  screenX + dx = (worldX - camera.x_new) * zoom
    // Subtract the first equation from the second:
    // dx = (camera.x_old - camera.x_new) * zoom
    // Divide by zoom:
    // dx / zoom = camera.x_old - camera.x_new
    // Rearrange for camera.x_new:
    // camera.x_new = camera.x_old - dx / zoom

    this.x = this.x - deltaX / this.zoom;
    this.y = this.y - deltaY / this.zoom;
  }
  /**
   * Zooms in/out while keeping a specific screen point fixed
   * @param {*} screenX
   * @param {*} screenY
   * @param {*} zoomFactor
   */
  zoomAt(screenX, screenY, zoomFactor) {
    // The world point that corresponds to the screen point before zooming
    const worldPoint = this.screenToWorld(screenX, screenY);
    this.zoom = Math.min(Math.max(this.zoom * zoomFactor, 0.1), 10);
    this.x = worldPoint.x - screenX / this.zoom;
    this.y = worldPoint.y - screenY / this.zoom;
    
  }
}
