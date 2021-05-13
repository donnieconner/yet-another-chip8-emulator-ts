import Renderer from './renderer';
import Keyboard from './keyboard';
import Speaker from './speaker';
import CPU from './cpu';

const renderer = new Renderer(10);
const keyboard = new Keyboard();
const speaker = new Speaker();
const cpu = new CPU(renderer, keyboard, speaker);

let loop: number;

const FPS = 60;
let fpsInterval: number = 0;
let startTime: number = 0;
let now: number = 0;
let then: number = 0;
let elapsed: number = 0;

export function init() {
  fpsInterval = 1000 / FPS;
  then = Date.now();
  startTime = then;

  cpu.loadSpritesIntoMemory();
  cpu.loadRom('invaders.ch8').then(() =>{
    loop = requestAnimationFrame(step);
  });
}

function step() {
  now = Date.now();
  elapsed = now - then;

  if (elapsed > fpsInterval) {
    cpu.cycle();
  }

  loop = requestAnimationFrame(step);
}