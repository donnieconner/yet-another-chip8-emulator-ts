import Renderer from "./renderer";
import Keyboard from "./keyboard";
import Speaker from "./speaker";

class CPU {
  private renderer: Renderer;
  private keyboard: Keyboard;
  private speaker: Speaker;

  private memory: Uint8Array;
  private v: Uint8Array; // 16 8-bit registers
  private i = 0; // Stores memory addresses
  private programCounter: number;
  private stack: any[] = [];
  private delayTimer: number = 0;
  private soundTimer: number = 0;
  private paused: boolean = false; // some instructions require pausing
  private speed: number = 10;

  constructor(renderer: Renderer, keyboard: Keyboard, speaker: Speaker) {
    this.renderer = renderer;
    this.keyboard = keyboard;
    this.speaker = speaker;

    this.v = new Uint8Array(16);

    // 4KB of memory
    this.memory = new Uint8Array(4096);

    this.programCounter = 0x200;
  }

  loadSpritesIntoMemory() {
    const sprites = [
      0xf0,
      0x90,
      0x90,
      0x90,
      0xf0, // 0
      0x20,
      0x60,
      0x20,
      0x20,
      0x70, // 1
      0xf0,
      0x10,
      0xf0,
      0x80,
      0xf0, // 2
      0xf0,
      0x10,
      0xf0,
      0x10,
      0xf0, // 3
      0x90,
      0x90,
      0xf0,
      0x10,
      0x10, // 4
      0xf0,
      0x80,
      0xf0,
      0x10,
      0xf0, // 5
      0xf0,
      0x80,
      0xf0,
      0x90,
      0xf0, // 6
      0xf0,
      0x10,
      0x20,
      0x40,
      0x40, // 7
      0xf0,
      0x90,
      0xf0,
      0x90,
      0xf0, // 8
      0xf0,
      0x90,
      0xf0,
      0x10,
      0xf0, // 9
      0xf0,
      0x90,
      0xf0,
      0x90,
      0x90, // A
      0xe0,
      0x90,
      0xe0,
      0x90,
      0xe0, // B
      0xf0,
      0x80,
      0x80,
      0x80,
      0xf0, // C
      0xe0,
      0x90,
      0x90,
      0x90,
      0xe0, // D
      0xf0,
      0x80,
      0xf0,
      0x80,
      0xf0, // E
      0xf0,
      0x80,
      0xf0,
      0x80,
      0x80, // F
    ];

    // Sprites are stored in the interpereter section of the memory. Starts at in the beginning (hex 0x000)
    for (let i = 0; i < sprites.length; i++) {
      this.memory[i] = sprites[i];
    }
  }

  loadRomIntoMemory(rom: any) {
    console.log(`Loading ROM into memory`);
    // Starts at location 0x200
    // http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#2.1
    for (let i = 0; i < rom.length; i++) {
      this.memory[0x200 + i] = rom[i];
    }
  }

  loadRom(romName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();

      request.onload = () => {
        console.log(`Rom loaded`);
        console.log(`Response`, request.response);
        if (request.response) {
          const rom = new Uint8Array(request.response);

          this.loadRomIntoMemory(rom);
          resolve();
        }
      };

      request.onerror = () => {
        console.error('Unable to load rom');
        reject();
      }

      request.open("GET", `roms/${romName}`);
      request.responseType = "arraybuffer";

      request.send();
    })
  }

  cycle() {
    // Execute all instructions
    for (let i = 0; i < this.speed; i++) {
      if (!this.paused) {
        // Each opcode is 16bits. Since we have 8 bit memory pieces, we need to combine two pieces
        // of memory to get the full opcode.
        const opcode =
          // Shift the first bit 8bits left to make it 2 bytes long (+ 0x00)
          (this.memory[this.programCounter] << 8) |
          this.memory[this.programCounter + 1];
        this.executeInstruction(opcode);
      }
    }

    if (!this.paused) {
      this.updateTimers();
    }

    this.playSound();
    this.renderer.render();
  }

  updateTimers() {
    // Timers decrement by 1 at 60hz
    // http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#2.5
    if (this.delayTimer > 0) {
      this.delayTimer -= 1;
    }

    if (this.soundTimer > 0) {
      this.soundTimer -= 1;
    }
  }

  playSound() {
    if (this.soundTimer > 0) {
      this.speaker.play(440);
    } else {
      this.speaker.stop();
    }
  }

  executeInstruction(opcode: number) {
    // http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#3.0
    // Increment the program counter to prepare it for the next instruction.
    // Each one is 2 bytes long
    this.programCounter += 2;

    // Get the 2nd nibble and shift right 8 bits to get rid of everything but
    // the 2nd nibble
    let x = (opcode & 0x0F00) >> 8;

    // Get the 3rd nibble
    let y = (opcode & 0x00F0) >> 4;

    // Time for the instructions
    // http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#3.1

    // The upper 4 bits can be used to narrow down other opcodes
    switch (opcode & 0xF000) {
      case 0x0000:
        // 0x0000 is ignored
        switch (opcode) {
          case 0x00E0: // CLS
            this.renderer.clear();
            break;
          case 0x00EE: // RET
            this.programCounter = this.stack.pop();
            break;
        }

        break;
      case 0x1000: // JP addr
        this.programCounter = opcode & 0xFFF;
        break;
      case 0x2000: // CALL addr
        this.stack.push(this.programCounter);
        this.programCounter = opcode & 0xFFF;
        break;
      case 0x3000: // SE Vx, byte
        if (this.v[x] === (opcode & 0xFF)) {
          this.programCounter += 2;
        }
        break;
      case 0x4000: // SNE Vx, byte
        if (this.v[x] !== (opcode & 0xFF)) {
          this.programCounter += 2;
        }
        break;
      case 0x5000: // SE Vx, Vy
        if (this.v[x] === this.v[y]) {
          this.programCounter += 2;
        }
        break;
      case 0x6000: // LD Vx, byte
        this.v[x] = opcode & 0xFF;
        break;
      case 0x7000: // ADD Vx, byte
        this.v[x] += opcode & 0xFF;
        break;
      case 0x8000:
        switch (opcode & 0xF) {
          case 0x0: // LD Vx, Vy
            this.v[x] = this.v[y];
            break;
          case 0x1: // OR Vx, Vy
            this.v[x] |= this.v[y];
            break;
          case 0x2: // AND Vx, Vy
            this.v[x] &= this.v[y];
            break;
          case 0x3: // XOR Vx, Vy
            this.v[x] ^= this.v[y];
            break;
          case 0x4: // ADD Vx, Vy
            let sum = (this.v[x] += this.v[y]);

            this.v[0xF] = 0;

            if (sum > 0xFF) {
              this.v[0xF] = 1;
            }

            this.v[x] = sum;
            break;
          case 0x5: // SUB Vx, Vy
            this.v[0xF] = 0;

            if (this.v[x] > this.v[y]) {
              this.v[0xF] = 1;
            }

            this.v[x] -= this.v[y];
            break;
          case 0x6: // SHR Vx {, VY}
            this.v[0xF] = this.v[x] & 0x1;
            this.v[x] >>= 1;
            break;
          case 0x7: // SUBN Vx, Vy
            this.v[0xF] = 0;

            if (this.v[y] > this.v[x]) {
              this.v[0xF] = 1;
            }

            this.v[x] = this.v[y] - this.v[x];
            break;
          case 0xE: // SHL Vx {, Vy}
            this.v[0xF] = this.v[x] & 0x80;
            this.v[x] <<= 1;
            break;
        }

        break;
      case 0x9000: // SNE Vx, Vy
        if (this.v[x] !== this.v[y]) {
          this.programCounter += 2;
        }
        break;
      case 0xA000: // LD I, addr
        this.i = opcode & 0xFFF;
        break;
      case 0xB000: // JP V0, addr
        this.programCounter = (opcode & 0xFFF) + this.v[0];
        break;
      case 0xC000: // RND Vx, byte
        let rand = Math.floor(Math.random() * 0xFF);

        this.v[x] = rand & (opcode & 0xFF);
        break;
      case 0xD000: // DRW Vx, Vy, nibble
        let width = 8;
        let height = opcode & 0xF;

        this.v[0xF] = 0;

        for (let row = 0; row < height; row++) {
          let sprite = this.memory[this.i + row];

          for (let col = 0; col < width; col++) {
            // If the bit (sprite) is not 0, erase the pixel
            if ((sprite & 0x80) > 0) {
              // If setPixel returns true, which means a pixel was erased, set VF to 1
              if (this.renderer.setPixel(this.v[x] + col, this.v[y] + row)) {
                this.v[0xF] = 1;
              }
            }

            // Shift the sprite left 1
            sprite <<= 1;
          }
        }

        break;
      case 0xE000:
        switch (opcode & 0xFF) {
          case 0x9E: // SKP Vx
            if (this.keyboard.isKeyPressed(this.v[x])) {
              this.programCounter += 2;
            }
            break;
          case 0xA1: // SKNP Vx
            if (!this.keyboard.isKeyPressed(this.v[x])) {
              this.programCounter += 2;
            }
            break;
        }

        break;
      case 0xF000:
        switch (opcode & 0xFF) {
          case 0x07: // LD Vx, DT
            this.v[x] = this.delayTimer;
            break;
          case 0x0A: // LD Vx, K
            this.paused = true;

            this.keyboard.onNextKeyPress = (key: number) => {
              this.v[x] = key;
              this.paused = false;
            };
            break;
          case 0x15: // LD DT, Vx
            this.delayTimer = this.v[x];
            break;
          case 0x18: // LD ST, Vx
            this.soundTimer = this.v[x];
            break;
          case 0x1E: // ADD I, Vx
            this.i += this.v[x];
            break;
          case 0x29: // LD F, Vx - ADD I, Vx
            this.i = this.v[x] * 5;
            break;
          case 0x33: // LD B, Vx
            // Get the hundreds didget and place it in i
            this.memory[this.i] = this.v[x] / 100;

            // Get the tens didget and place it in i+1. Gets a value between
            // 0 and 99, then divides by 10 to get us something between 0 and 9
            this.memory[this.i + 1] = (this.v[x] % 100) / 10;

            // Get the value of the last digit and place it in i+2
            this.memory[this.i + 2] = this.v[x] % 10;
            break;
          case 0x55: // LD [I], Vx
            for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
              this.memory[this.i + registerIndex] = this.v[registerIndex];
            }
            break;
          case 0x65: // LD Vx, [I]
            for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
              this.v[registerIndex] = this.memory[this.i + registerIndex];
            }
            break;
        }
        break;

      default:
        throw new Error("Unknown opcode " + opcode);
    }
  }
}

export default CPU;
