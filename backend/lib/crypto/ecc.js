import crypto from "crypto";
import { mod, modInverse } from "./math.js";

const CURVE = {
  name: "secp256k1",
  p: BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F"),
  a: 0n,
  b: 7n,
  gx: BigInt("0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798"),
  gy: BigInt("0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8"),
  n: BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141"),
};

const INF = null;

const normalizePoint = (point) => {
  if (!point) {
    return INF;
  }

  return {
    x: mod(point.x, CURVE.p),
    y: mod(point.y, CURVE.p),
  };
};

export const isPointOnCurve = (point) => {
  if (!point) {
    return true;
  }

  const { x, y } = normalizePoint(point);
  const left = mod(y * y, CURVE.p);
  const right = mod(x * x * x + CURVE.a * x + CURVE.b, CURVE.p);

  return left === right;
};

export const pointAdd = (p, q) => {
  if (!p) {
    return q;
  }

  if (!q) {
    return p;
  }

  const pN = normalizePoint(p);
  const qN = normalizePoint(q);

  if (pN.x === qN.x && mod(pN.y + qN.y, CURVE.p) === 0n) {
    return INF;
  }

  let lambda;

  if (pN.x === qN.x && pN.y === qN.y) {
    const numerator = mod(3n * pN.x * pN.x + CURVE.a, CURVE.p);
    const denominator = modInverse(2n * pN.y, CURVE.p);
    lambda = mod(numerator * denominator, CURVE.p);
  } else {
    const numerator = mod(qN.y - pN.y, CURVE.p);
    const denominator = modInverse(qN.x - pN.x, CURVE.p);
    lambda = mod(numerator * denominator, CURVE.p);
  }

  const rx = mod(lambda * lambda - pN.x - qN.x, CURVE.p);
  const ry = mod(lambda * (pN.x - rx) - pN.y, CURVE.p);

  return { x: rx, y: ry };
};

export const scalarMultiply = (k, point) => {
  if (k % CURVE.n === 0n || !point) {
    return INF;
  }

  let scalar = mod(k, CURVE.n);
  let result = INF;
  let addend = normalizePoint(point);

  while (scalar > 0n) {
    if (scalar & 1n) {
      result = pointAdd(result, addend);
    }

    addend = pointAdd(addend, addend);
    scalar >>= 1n;
  }

  return result;
};

const randomScalar = () => {
  while (true) {
    const candidate = BigInt(`0x${crypto.randomBytes(32).toString("hex")}`);
    const reduced = candidate % CURVE.n;

    if (reduced > 0n) {
      return reduced;
    }
  }
};

const bigintToBuffer = (value) => {
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) {
    hex = `0${hex}`;
  }
  return Buffer.from(hex, "hex");
};

const deriveKeystream = (sharedX, nonceHex, length) => {
  const nonce = Buffer.from(nonceHex, "hex");
  const shared = bigintToBuffer(sharedX);
  let counter = 0;
  let stream = Buffer.alloc(0);

  while (stream.length < length) {
    const counterBytes = Buffer.alloc(4);
    counterBytes.writeUInt32BE(counter, 0);
    const digest = crypto
      .createHash("sha256")
      .update(Buffer.concat([shared, nonce, counterBytes]))
      .digest();

    stream = Buffer.concat([stream, digest]);
    counter += 1;
  }

  return stream.subarray(0, length);
};

const xorBuffers = (a, b) => {
  const output = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i += 1) {
    output[i] = a[i] ^ b[i];
  }
  return output;
};

export const generateECCKeyPair = () => {
  const privateKey = randomScalar();
  const publicPoint = scalarMultiply(privateKey, { x: CURVE.gx, y: CURVE.gy });

  return {
    privateKey,
    publicKey: publicPoint,
    curve: CURVE.name,
  };
};

export const eccEncrypt = (plaintext, recipientPublicKey) => {
  const recipient = {
    x: BigInt(recipientPublicKey.x),
    y: BigInt(recipientPublicKey.y),
  };

  if (!isPointOnCurve(recipient)) {
    throw new Error("Recipient ECC public key is invalid");
  }

  const ephemeralPrivate = randomScalar();
  const ephemeralPublic = scalarMultiply(ephemeralPrivate, { x: CURVE.gx, y: CURVE.gy });
  const sharedPoint = scalarMultiply(ephemeralPrivate, recipient);

  if (!sharedPoint) {
    throw new Error("ECC shared point generation failed");
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const plainBuffer = Buffer.from(plaintext, "utf8");
  const keystream = deriveKeystream(sharedPoint.x, nonce, plainBuffer.length);
  const cipherBuffer = xorBuffers(plainBuffer, keystream);

  return {
    curve: CURVE.name,
    nonce,
    ephemeralPublicKey: {
      x: ephemeralPublic.x.toString(),
      y: ephemeralPublic.y.toString(),
    },
    ciphertext: cipherBuffer.toString("hex"),
  };
};

export const eccDecrypt = (cipherPayload, recipientPrivateKey) => {
  const ephemeralPublic = {
    x: BigInt(cipherPayload.ephemeralPublicKey.x),
    y: BigInt(cipherPayload.ephemeralPublicKey.y),
  };

  if (!isPointOnCurve(ephemeralPublic)) {
    throw new Error("Ephemeral ECC public key is invalid");
  }

  const sharedPoint = scalarMultiply(BigInt(recipientPrivateKey), ephemeralPublic);

  if (!sharedPoint) {
    throw new Error("ECC shared point generation failed");
  }

  const cipherBuffer = Buffer.from(cipherPayload.ciphertext, "hex");
  const keystream = deriveKeystream(sharedPoint.x, cipherPayload.nonce, cipherBuffer.length);
  const plainBuffer = xorBuffers(cipherBuffer, keystream);

  return plainBuffer.toString("utf8");
};

export const serializeECCPrivateKey = (value) => value.toString();

export const serializeECCPublicKey = (value) => ({
  x: value.x.toString(),
  y: value.y.toString(),
});

export const deserializeECCPrivateKey = (value) => BigInt(value);

export const deserializeECCPublicKey = (value) => ({
  x: BigInt(value.x),
  y: BigInt(value.y),
});

export const curveParams = CURVE;
