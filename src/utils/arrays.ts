import clamp from "./clamp";
import { AtomicType, BaseType } from "./types";

/**
 * Array manipulation and utility function
 */
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

/**
 * Construct the space-separated css class name out of 0 or more object
 */
Arr.className = function <T = BaseType | AtomicType>(
  val: T | T[],
  ...rest: T[]
): string | undefined {
  const classes = [...(Array.isArray(val) ? val : [val]), ...rest]
    .map((s) => (s ? String(s) : undefined))
    .filter((s) => !!s)
    .join(" ");
  return !!classes ? classes : undefined;
};

/**
 * Picks out random samples from the input array, with the probability of
 * picking a sample being weighted linearly according to a weight skew between
 * 0 and 1, where skew determines how likely the pick is towards the beginning
 * or end of the array.
 * Skew 0 basically means chance of picking first element is 0 and it increases
 *  towards the end, so the pick is more skewed to be near the end of the array
 * Skew 1 is the opposite where the pick is favored towards the beginning
 * Skew 0.5 is middle ground where everything is equially likely and it's a
 *  uniform distribution (standard random pick)
 * @param {T[]} array - The array to pick from
 * @param {number} [numSamples] - The number of samples to pick.
 * @param {number} [weightSkew] - The skew of the probability distribution at
 *  the beginning of the array. 0 means highly unlikely to be from beginning,
 *  and it increases monotonically until 0.5 where the distibution is uniform,
 *  and at skew = 1 means we're highly likely to be picking from beginning
 *  instead of the end
 * @param {((a: T, b: T) => number) | boolean} [rankingFn] - The sorting method
 *  to determine beginning and end of array. false means don't sort, and true
 *  uses the standard js string sort, any function passed works just like sort()
 * @param {(val: T, idx?: number) => boolean}[filteringFn] - The filtering
 *  method to be applied after the sort. Can be used to trim/prune the samples
 *  if needed
 * @returns An array of `numSamples` many samples from input `array`. The actual
 *  size of the returned array could be less than numSamples if there aren't
 *  enough options left in the input after filtering
 */
Arr.pickWeightedSamples = function <T>(
  array: T[],
  numSamples: number = 1,
  weightSkew: number = 0,
  rankingFn?: ((a: T, b: T) => number) | boolean,
  filteringFn?: (val: T, idx?: number) => boolean,
): T[] {
  const pickedSamples: T[] = [];

  // Input cleanup
  numSamples = Math.floor(clamp(numSamples, 0, array.length));
  weightSkew = clamp(weightSkew, 0, 1);
  if (numSamples === 0) {
    return pickedSamples;
  }

  // Rank and filter all elements if needed
  let rankedArray = [...array];
  if (rankingFn) {
    rankedArray.sort(rankingFn === true ? undefined : rankingFn);
  }
  if (filteringFn) {
    rankedArray = rankedArray.filter(filteringFn);
  }

  // Pick out samples according to the weight
  for (let i = 0; i < numSamples; i++) {
    if (rankedArray.length === 0) {
      // Exhausted all the elements, there's no point continuing
      break;
    }

    // With probability p = weightSkew and 0 <= p <= 1, we can draw a line
    // from p at x=0 to (1-p) at x=1 (later to scale x * |numSamples|)
    // f(x) = p + (1 - 2p) * x
    // The area under this line is always 0.5 independent from p
    // So if we have a random number r: 0 <= r <= 1, then r/2 can be where our
    // random sample would lie in the area curve of this function. So
    // r/2 = ∫f(x).dx = px + (1-2p)/2 x² ==>
    // x = (-p ± √(p² + r - 2pr)) / (1-2p)
    // This only works when p ≠ 0.5, otherwise we have linear equation:
    // r/2 = px  ==> x = r / 2p = r
    // which is a very easy formula

    let x = 0;
    const p = weightSkew;
    const r = Math.random();

    if (p === 0.5) {
      x = r;
    } else {
      const q = Math.sqrt(p * p + r - 2 * p * r);
      x = (q - p) / (1 - 2 * p);
    }

    x = Math.floor(x * rankedArray.length);
    rankedArray.splice(x, 1).forEach((pick) => pickedSamples.push(pick));
  }

  return pickedSamples;
};
