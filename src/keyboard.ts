class Keyboard {
  onNextKeyPress: Function | null;

  private KEYMAP = new Map([
    ['1', 0x1],
    ['2', 0x2],
    ['3', 0x3],
    ['4', 0x4],
    ['q', 0x5],
    ['w', 0x6],
    ['r', 0xD],
    ['a', 0x7],
    ['s', 0x8],
    ['d', 0x9],
    ['f', 0xE],
    ['z', 0xA],
    ['x', 0x0],
    ['c', 0xB],
    ['v', 0xF],
  ]);

  private keysPressed: boolean[] = new Array(15);

  constructor() {
    // Some Chip-8 instructions require waiting for the next keypress
    this.onNextKeyPress = null;

    // Bind listeners
    window.addEventListener('keydown', this.onKeyDown.bind(this), false);
    window.addEventListener('keyup', this.onKeyUp.bind(this), false);
  }

  isKeyPressed(keyCode: number): boolean {
    return this.keysPressed[keyCode];
  }

  onKeyDown(event: KeyboardEvent) {
    let key = this.KEYMAP.get(event.key);
    if (key) {
      this.keysPressed[key] = true;

      // If onNextKeyPress is initalized run it with the found key
      if (this.onNextKeyPress !== null && key) {
        this.onNextKeyPress(key);
        this.onNextKeyPress = null;
      }
    } else {
      console.log(`Keyboard: Unhandled key ${event.key}`);
    }
  }

  onKeyUp(event: KeyboardEvent) {
    let key = this.KEYMAP.get(event.key);
    if (key) {
      this.keysPressed[key] = false;
    } else {
      console.log(`Keyboard: Unhandled key ${event.key}`);
    }
  }
}

export default Keyboard;