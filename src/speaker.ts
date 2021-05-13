class Speaker {
  private audioContext: AudioContext;
  private gain: GainNode;
  private finish: AudioDestinationNode;
  private oscillator?: OscillatorNode | null;

  constructor() {
    const AudioContext = window.AudioContext;

    this.audioContext = new AudioContext();

    this.gain = this.audioContext.createGain();
    this.finish = this.audioContext.destination;

    // Connect the gain node so we can control the volume
    this.gain.connect(this.finish);
  }

  play(frequency: number) {
    if (this.audioContext && !this.oscillator) {
      this.oscillator = this.audioContext.createOscillator();
      this.oscillator
        .frequency
        .setValueAtTime(frequency || 440, this.audioContext.currentTime);
      
      // Square wave
      this.oscillator.type = 'square';

      // Start the sound
      this.oscillator.connect(this.gain);
      this.oscillator.start();
    }
  }

  stop() {
    this.oscillator?.stop();
    this.oscillator?.disconnect();
    this.oscillator = null;
  }
}

export default Speaker;