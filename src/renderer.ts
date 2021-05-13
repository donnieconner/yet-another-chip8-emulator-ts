export class Renderer {
  private cols: number;
  private rows: number;
  private scale: number;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private display: number[]; // representing pixels on the screen in binary

  constructor(scale: number) {
    // Chip-8 Display is 64x32 pixels
    this.cols = 64;
    this.rows = 32;

    this.scale = scale;
    this.canvas = document.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d')!;

    // Scale up the display
    this.canvas.width = this.cols * this.scale;
    this.canvas.height = this.rows * this.scale;

    this.display = new Array(this.cols * this.rows);
  }

  setPixel(x: number, y: number): boolean {
    // If a pixel is beyond the bounds of the display, it should wrap
    // http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#2.4
    if (x > this.cols) {
      x -= this.cols;
    } else if (x < 0) {
      x += this.cols;
    }

    if (y > this.rows) {
      y -= this.rows;
    } else if (y < 0) {
      y += this.rows;
    }

    let pixelLocation = x + (y * this.cols);
    // Sprites are XORed into the display, aka the pixel value is toggled from 0 to 1 or 1 to 0
    this.display[pixelLocation] ^= 1;

    // Return if the pixel is off
    return !this.display[pixelLocation];
  }

  clear() {
    this.display = new Array(this.cols * this.rows);
  }

  render() {
    // Clear the display every render cycle (60fps)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background default color to black
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Loop through the display array
    for (let i = 0; i < this.cols * this.rows; i++) {
      let x = (i % this.cols) * this.scale;
      let y = Math.floor(i / this.cols) * this.scale;

      // If the pixel is on, then display it
      if (this.display[i]) {
        // Set the pixel color to Green
        this.ctx.fillStyle = '#32ff66'

        // Add the pixel
        this.ctx.fillRect(x, y, this.scale, this.scale);
      }
    }
  }

  // TODO: REMOVE
  testRender() {
    this.setPixel(2, 2);
    this.setPixel(4, 4);
  }
}

export default Renderer;