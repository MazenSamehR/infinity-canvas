export class HistoryManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
  }

  execute(command) {
    command.do();
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.onChange?.();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const command = this.undoStack.pop();
    command.undo();
    this.redoStack.push(command);
    this.onChange?.();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const command = this.redoStack.pop();
    command.do();
    this.undoStack.push(command);
    this.onChange?.();
  }
}
