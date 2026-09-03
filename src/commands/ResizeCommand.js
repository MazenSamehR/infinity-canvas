export class ResizeCommand {
  constructor(shape, from, to, oldWidth, oldHeight, newWidth, newHeight) {
    this.shape = shape;
    this.from = from;
    this.to = to;
    this.oldWidth = oldWidth;
    this.oldHeight = oldHeight;
    this.newWidth = newWidth;
    this.newHeight = newHeight;
  }

  do() {
    this.shape.w = this.newWidth;
    this.shape.h = this.newHeight;
    this.shape.x = this.to.x;
    this.shape.y = this.to.y;
  }

  undo() {
    this.shape.w = this.oldWidth;
    this.shape.h = this.oldHeight;
    this.shape.x = this.from.x;
    this.shape.y = this.from.y;
  }
}