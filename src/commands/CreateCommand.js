export class CreateCommand {
  constructor(objects, shape) {
    this.objects = objects;
    this.shape = shape;
    this.index = objects.size;
  }

  do() {
    const entries = Array.from(this.objects.entries());

    entries.splice(this.index, 0, [this.shape.id, this.shape]);

    this.objects.clear();
    
    for (const [id, shape] of entries) {
      this.objects.set(id, shape);
    }
  }

  undo() {
    this.objects.delete(this.shape.id);
  }
}
