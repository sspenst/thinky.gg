import * as crypto from 'crypto';

export function generatePassword(numWords = 4, separator = '-'): string {
  const words: string[] = [
    'apple', 'banana', 'cat', 'dog', 'elephant', 'flower', 'giraffe', 'house',
    'ice', 'juice', 'kite', 'lion', 'monkey', 'nest', 'ocean', 'penguin',
    'queen', 'rain', 'sun', 'tree', 'umbrella', 'violin', 'whale', 'xylophone',
    'yarn', 'zebra', 'airplane', 'balloon', 'cow', 'deer', 'eagle', 'forest',
    'goat', 'hill', 'island', 'jelly', 'kangaroo', 'llama', 'mountain', 'night',
    'octopus', 'parrot', 'quill', 'river', 'snow', 'train', 'unicorn', 'valley',
    'wind', 'xray', 'yellow', 'zeppelin', 'alligator', 'bat', 'camel', 'dolphin',
    'earth', 'frog', 'grass', 'hedgehog', 'iguana', 'jaguar', 'koala', 'lemon',
    'mouse', 'nose', 'otter', 'peach', 'quiet', 'rose', 'star', 'turtle',
    'vase', 'wolf', 'xerus', 'yak', 'zipper', 'angel', 'beach', 'candle', 'donkey',
    'echo', 'flute', 'guitar', 'hamster', 'insect', 'jam', 'king', 'lighthouse',
    'moon', 'note', 'owl', 'piano', 'quartz', 'robot', 'spoon', 'teapot',
    'vampire', 'window', 'xylophonist', 'yacht', 'zoo'
  ];

  function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);

    return Math.floor(crypto.randomInt(min, max));
  }

  const passwordWords: string[] = [];

  for (let i = 0; i < numWords; i++) {
    const randomIndex = getRandomInt(0, words.length);

    passwordWords.push(words[randomIndex]);
  }

  return passwordWords.join(separator);
}
