import crypto from "crypto";

const ZERO = 0n;
const ONE = 1n;
const TWO = 2n;

export const mod = (a, m) => {
  const result = a % m;
  return result >= ZERO ? result : result + m;
};

export const gcd = (a, b) => {
  let x = a < ZERO ? -a : a;
  let y = b < ZERO ? -b : b;

  while (y !== ZERO) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x;
};

export const extendedGcd = (a, b) => {
  let oldR = a;
  let r = b;
  let oldS = ONE;
  let s = ZERO;
  let oldT = ZERO;
  let t = ONE;

  while (r !== ZERO) {
    const q = oldR / r;

    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
    [oldT, t] = [t, oldT - q * t];
  }

  return { gcd: oldR, x: oldS, y: oldT };
};

export const modInverse = (a, m) => {
  const { gcd: g, x } = extendedGcd(mod(a, m), m);

  if (g !== ONE) {
    throw new Error("modInverse does not exist");
  }

  return mod(x, m);
};

export const modPow = (base, exponent, modulus) => {
  if (modulus === ONE) {
    return ZERO;
  }

  let result = ONE;
  let b = mod(base, modulus);
  let e = exponent;

  while (e > ZERO) {
    if (e & ONE) {
      result = mod(result * b, modulus);
    }

    e >>= ONE;
    b = mod(b * b, modulus);
  }

  return result;
};

export const bitLength = (n) => {
  if (n === ZERO) {
    return 0;
  }

  return n.toString(2).length;
};

export const randomBigInt = (bits) => {
  if (bits < 2) {
    throw new Error("bits must be >= 2");
  }

  const bytes = Math.ceil(bits / 8);
  const buffer = crypto.randomBytes(bytes);
  const topBit = 1 << ((bits - 1) % 8);

  buffer[0] |= topBit;
  buffer[buffer.length - 1] |= 1;

  return BigInt(`0x${buffer.toString("hex")}`);
};

export const randomBetween = (min, max) => {
  if (max <= min) {
    throw new Error("max must be greater than min");
  }

  const range = max - min;
  const bits = bitLength(range);

  let candidate;

  do {
    candidate = randomBigInt(bits);
  } while (candidate > range);

  return min + candidate;
};

const getSmallPrimes = () => [
  3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n,
];

export const isProbablePrime = (n, rounds = 16) => {
  if (n < TWO) {
    return false;
  }

  if (n === TWO || n === 3n) {
    return true;
  }

  if (n % TWO === ZERO) {
    return false;
  }

  for (const p of getSmallPrimes()) {
    if (n === p) {
      return true;
    }

    if (n % p === ZERO) {
      return false;
    }
  }

  let d = n - ONE;
  let s = 0;

  while ((d & ONE) === ZERO) {
    d >>= ONE;
    s += 1;
  }

  for (let i = 0; i < rounds; i += 1) {
    const a = randomBetween(TWO, n - TWO);
    let x = modPow(a, d, n);

    if (x === ONE || x === n - ONE) {
      continue;
    }

    let shouldContinueOuter = false;

    for (let r = 1; r < s; r += 1) {
      x = modPow(x, TWO, n);

      if (x === n - ONE) {
        shouldContinueOuter = true;
        break;
      }
    }

    if (shouldContinueOuter) {
      continue;
    }

    return false;
  }

  return true;
};

export const generatePrime = async (bits, rounds = 16) => {
  let candidate = randomBigInt(bits);

  while (!isProbablePrime(candidate, rounds)) {
    candidate = randomBigInt(bits);
  }

  return candidate;
};
