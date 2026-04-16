import crypto from "crypto";

const BLOCK_SIZE = 64;

const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest();

const normalizeKey = (keyBuffer) => {
  if (keyBuffer.length > BLOCK_SIZE) {
    return sha256(keyBuffer);
  }

  if (keyBuffer.length < BLOCK_SIZE) {
    return Buffer.concat([keyBuffer, Buffer.alloc(BLOCK_SIZE - keyBuffer.length, 0)]);
  }

  return keyBuffer;
};

export const hmacSha256 = (keyInput, messageInput) => {
  const keyBuffer = Buffer.isBuffer(keyInput) ? keyInput : Buffer.from(keyInput, "utf8");
  const messageBuffer = Buffer.isBuffer(messageInput)
    ? messageInput
    : Buffer.from(String(messageInput), "utf8");

  const key = normalizeKey(keyBuffer);

  const oKeyPad = Buffer.alloc(BLOCK_SIZE);
  const iKeyPad = Buffer.alloc(BLOCK_SIZE);

  for (let i = 0; i < BLOCK_SIZE; i += 1) {
    oKeyPad[i] = key[i] ^ 0x5c;
    iKeyPad[i] = key[i] ^ 0x36;
  }

  const innerHash = sha256(Buffer.concat([iKeyPad, messageBuffer]));
  return sha256(Buffer.concat([oKeyPad, innerHash]));
};

export const hmacSha256Hex = (keyInput, messageInput) => hmacSha256(keyInput, messageInput).toString("hex");

export const verifyHmacSha256Hex = (keyInput, messageInput, expectedHex) => {
  const expectedBuffer = Buffer.from(expectedHex, "hex");
  const computed = hmacSha256(keyInput, messageInput);

  if (expectedBuffer.length !== computed.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, computed);
};

export const randomMacKey = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
