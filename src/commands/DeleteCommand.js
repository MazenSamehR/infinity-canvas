export class DeleteCommand {
  constructor(objects, shape) {
    this.objects = objects;
    this.shape = shape;

    const entries = Array.from(this.objects.entries());

    this.index = entries.findIndex(([id]) => id === shape.id);
  }

  do() {
    this.objects.delete(this.shape.id);
  }

  undo() {
    const entries = Array.from(this.objects.entries());
    entries.splice(this.index, 0, [this.shape.id, this.shape]);
    this.objects.clear();
    for (const [id, shape] of entries) {
      this.objects.set(id, shape);
    }
  }
}
