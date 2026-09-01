import { InfiniteCanvas } from "./InfiniteCanvas";

const canvasEl = document.getElementById("canvas");
const infiniteCanvas = new InfiniteCanvas(canvasEl);

const toolButtons = document.querySelectorAll(".toolbar button");

infiniteCanvas.onToolChange = (tool) => {
  toolButtons.forEach((b) => {
    b.classList.toggle("active", b.dataset.shape === tool);
  });
};

toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    infiniteCanvas.setTool(button.dataset.shape);
  });
});
