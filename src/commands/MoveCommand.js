export class MoveCommand {
    constructor(shape, from, to) {
        this.shape = shape;
        this.from = from;
        this.to = to;
    }

    do() {
        this.shape.x = this.to.x;
        this.shape.y = this.to.y;
    }

    undo() {
        this.shape.x = this.from.x;
        this.shape.y = this.from.y;
    }
}