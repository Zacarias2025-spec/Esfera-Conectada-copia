// Simple emoji sound library using Web Audio API
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

const playTone = (frequency: number, duration: number = 0.2) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

// Map emojis to frequencies
const emojiSoundMap: { [key: string]: number[] } = {
  '😀': [523, 659], // Happy - C, E
  '😂': [440, 554, 659], // Laugh - A, C#, E
  '😍': [659, 784, 880], // Love - E, G, A
  '😢': [330, 294], // Sad - E, D (descending)
  '😡': [196, 208, 220], // Angry - G, Ab, A (dissonant)
  '👍': [523, 659, 784], // Thumbs up - C, E, G (major chord)
  '❤️': [659, 784, 1047], // Heart - E, G, C (high)
  '🎉': [523, 659, 784, 1047], // Party - C, E, G, C (celebration)
  '🔥': [440, 554, 698], // Fire - A, C#, F (intense)
  '⭐': [1047, 1318], // Star - high C, E (sparkle)
};

export const playEmojiSound = (emoji: string) => {
  const frequencies = emojiSoundMap[emoji];
  
  if (frequencies) {
    frequencies.forEach((freq, index) => {
      setTimeout(() => playTone(freq, 0.15), index * 100);
    });
  } else {
    // Default sound for unmapped emojis
    playTone(440, 0.15);
  }
};

export const hasEmojiSound = (emoji: string): boolean => {
  return emoji in emojiSoundMap;
};
