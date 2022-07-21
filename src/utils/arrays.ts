export default function Arr(...args: any[]) {
  return [...args];
}

Arr.dedupe = function <T>(array: T[]): T[] {
  return array.filter((value, index, self) => self.indexOf(value) === index);
};

/**
 * Randomize array in-place using Durstenfeld shuffle algorithm
 */
Arr.shuffle = function <T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};
