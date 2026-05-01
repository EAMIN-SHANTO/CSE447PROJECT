import { eccEncrypt, eccDecrypt, generateECCKeyPair } from "../lib/crypto/ecc.js";
const keys = generateECCKeyPair();
const text = "A".repeat(100);
const start1 = Date.now();
const encrypted = eccEncrypt(text, keys.publicKey);
console.log("encrypt time:", Date.now() - start1, "ms");

const start2 = Date.now();
for (let i = 0; i < 20; i++) {
  eccDecrypt(encrypted, keys.privateKey);
}
console.log("decrypt time (20 times):", Date.now() - start2, "ms");
