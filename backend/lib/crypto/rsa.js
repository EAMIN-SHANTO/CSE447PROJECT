import { generatePrime, gcd, modInverse, modPow, bitLength } from "./math.js";
import { bigIntToHex, hexToBigInt } from "./encoding.js";

const ONE = 1n;

const ensureMessageBounds = (m, n) => {
  if (m < 0n || m >= n) {
    throw new Error("RSA message representative out of range");
  }
};

const splitHexByBytes = (hex, byteSize) => {
  const chunks = [];
  const chunkHexSize = byteSize * 2;

  for (let i = 0; i < hex.length; i += chunkHexSize) {
    chunks.push(hex.slice(i, i + chunkHexSize));
  }

  return chunks.filter(Boolean);
};

export const generateRSAKeyPair = async ({ modulusBits = 1024, publicExponent = 65537n } = {}) => {
  if (modulusBits < 512) {
    throw new Error("RSA modulusBits must be >= 512");
  }

  const primeBits = Math.floor(modulusBits / 2);
  let p = await generatePrime(primeBits);
  let q = await generatePrime(primeBits);

  while (q === p) {
    q = await generatePrime(primeBits);
  }

  const n = p * q;
  const phi = (p - ONE) * (q - ONE);

  if (gcd(publicExponent, phi) !== ONE) {
    return generateRSAKeyPair({ modulusBits, publicExponent });
  }

  const d = modInverse(publicExponent, phi);

  return {
    publicKey: {
      n,
      e: publicExponent,
    },
    privateKey: {
      n,
      d,
      p,
      q,
    },
  };
};

export const rsaEncryptBigInt = (messageInt, publicKey) => {
  ensureMessageBounds(messageInt, publicKey.n);
  return modPow(messageInt, publicKey.e, publicKey.n);
};

export const rsaDecryptBigInt = (cipherInt, privateKey) => {
  ensureMessageBounds(cipherInt, privateKey.n);
  return modPow(cipherInt, privateKey.d, privateKey.n);
};

export const rsaSignBigInt = (messageInt, privateKey) => {
  ensureMessageBounds(messageInt, privateKey.n);
  return modPow(messageInt, privateKey.d, privateKey.n);
};

export const rsaVerifyBigInt = (signatureInt, messageInt, publicKey) => {
  ensureMessageBounds(signatureInt, publicKey.n);
  const recovered = modPow(signatureInt, publicKey.e, publicKey.n);
  return recovered === messageInt;
};

export const rsaEncryptText = (text, publicKey) => {
  const plainHex = Buffer.from(text, "utf8").toString("hex");
  const maxChunkBytes = Math.floor((bitLength(publicKey.n) - 1) / 8);

  if (maxChunkBytes <= 0) {
    throw new Error("RSA modulus too small");
  }

  const chunks = splitHexByBytes(plainHex, maxChunkBytes);
  const cipherChunks = chunks.map((chunk) => {
    const messageInt = hexToBigInt(chunk || "00");
    const encrypted = rsaEncryptBigInt(messageInt, publicKey);
    return bigIntToHex(encrypted);
  });

  return {
    encoding: "hex-chunks",
    chunks: cipherChunks,
  };
};

export const rsaDecryptText = (cipherPayload, privateKey) => {
  if (!cipherPayload || !Array.isArray(cipherPayload.chunks)) {
    throw new Error("Invalid RSA text payload");
  }

  const plainHex = cipherPayload.chunks
    .map((chunkHex) => {
      const cipherInt = hexToBigInt(chunkHex);
      const decrypted = rsaDecryptBigInt(cipherInt, privateKey);
      let recoveredHex = bigIntToHex(decrypted);

      if (recoveredHex.length % 2 !== 0) {
        recoveredHex = `0${recoveredHex}`;
      }

      return recoveredHex;
    })
    .join("");

  return Buffer.from(plainHex, "hex").toString("utf8");
};

export const serializeRSAKey = (key) =>
  JSON.stringify(
    Object.fromEntries(Object.entries(key).map(([name, value]) => [name, value.toString()]))
  );

export const deserializeRSAKey = (serialized) => {
  const parsed = JSON.parse(serialized);
  return Object.fromEntries(Object.entries(parsed).map(([name, value]) => [name, BigInt(value)]));
};
