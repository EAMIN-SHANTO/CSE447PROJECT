import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import KeyMetadata from "../../models/key-metadata.model.js";
import { generateRSAKeyPair, rsaEncryptText, rsaDecryptText, serializeRSAKey, deserializeRSAKey } from "./rsa.js";
import {
  generateECCKeyPair,
  serializeECCPrivateKey,
  serializeECCPublicKey,
  deserializeECCPrivateKey,
  deserializeECCPublicKey,
} from "./ecc.js";
import { randomMacKey } from "./mac.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_KEY_TTL_DAYS = 30;

// Simple in-memory cache to prevent expensive DB lookups and RSA decryptions
const keyCache = new Map();

let backupMaster = null;
const LOCAL_BACKUP_MASTER_FILE = path.resolve(process.cwd(), ".backup-master.keys.json");

const generateKeyId = (ownerId, domain, algorithm, version) => {
  const seed = `${ownerId}:${domain}:${algorithm}:${version}:${Date.now()}:${crypto.randomBytes(8).toString("hex")}`;
  return crypto.createHash("sha256").update(seed).digest("hex").slice(0, 32);
};

const getNextVersion = async (ownerId, domain, algorithm) => {
  const latest = await KeyMetadata.findOne({ ownerId, domain, algorithm }).sort({ version: -1 });
  return latest ? latest.version + 1 : 1;
};

const getBackupMasterKeys = async () => {
  if (backupMaster) {
    return backupMaster;
  }

  const envPublic = process.env.BACKUP_MASTER_PUBLIC_KEY;
  const envPrivate = process.env.BACKUP_MASTER_PRIVATE_KEY;

  if (envPublic && envPrivate) {
    backupMaster = {
      keyId: process.env.BACKUP_MASTER_KEY_ID || "env-backup-master",
      publicKey: deserializeRSAKey(envPublic),
      privateKey: deserializeRSAKey(envPrivate),
    };

    return backupMaster;
  }

  try {
    const fileData = await fs.readFile(LOCAL_BACKUP_MASTER_FILE, "utf8");
    const parsed = JSON.parse(fileData);

    backupMaster = {
      keyId: parsed.keyId,
      publicKey: deserializeRSAKey(parsed.publicKey),
      privateKey: deserializeRSAKey(parsed.privateKey),
    };

    return backupMaster;
  } catch (error) {
    // File missing or invalid; fallback to creation below.
  }

  const generated = await generateRSAKeyPair({ modulusBits: 1024 });

  backupMaster = {
    keyId: "local-backup-master-v1",
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
  };

  await fs.writeFile(
    LOCAL_BACKUP_MASTER_FILE,
    JSON.stringify(
      {
        keyId: backupMaster.keyId,
        publicKey: serializeRSAKey(backupMaster.publicKey),
        privateKey: serializeRSAKey(backupMaster.privateKey),
      },
      null,
      2
    )
  );

  console.warn(
    "BACKUP_MASTER_* env vars are not set; generated local backup master key file is used for development"
  );

  return backupMaster;
};

const backupEncrypt = async (plaintext) => {
  const master = await getBackupMasterKeys();
  return {
    wrapperKeyId: master.keyId,
    cipherPayload: rsaEncryptText(plaintext, master.publicKey),
    createdAt: new Date(),
  };
};

const backupDecrypt = async (encryptedBlob) => {
  const master = await getBackupMasterKeys();

  if (encryptedBlob.wrapperKeyId !== master.keyId) {
    throw new Error("Backup wrapper key mismatch");
  }

  return rsaDecryptText(encryptedBlob.cipherPayload, master.privateKey);
};

const buildAlgorithmMaterial = async (algorithm) => {
  if (algorithm === "RSA") {
    const rsaKeys = await generateRSAKeyPair({ modulusBits: 1024 });

    return {
      publicKey: {
        n: rsaKeys.publicKey.n.toString(),
        e: rsaKeys.publicKey.e.toString(),
      },
      serializedPrivateKey: serializeRSAKey(rsaKeys.privateKey),
      macKeyHex: randomMacKey(),
    };
  }

  if (algorithm === "ECC") {
    const eccKeys = generateECCKeyPair();

    return {
      publicKey: serializeECCPublicKey(eccKeys.publicKey),
      serializedPrivateKey: serializeECCPrivateKey(eccKeys.privateKey),
      macKeyHex: randomMacKey(),
    };
  }

  throw new Error(`Unsupported algorithm ${algorithm}`);
};

export const createKeyVersion = async ({ ownerId, domain, algorithm, rotationReason = "initial" }) => {
  const version = await getNextVersion(ownerId, domain, algorithm);
  const keyId = generateKeyId(ownerId, domain, algorithm, version);
  const material = await buildAlgorithmMaterial(algorithm);

  const privateKeyBackup = await backupEncrypt(material.serializedPrivateKey);
  const macKeyBackup = await backupEncrypt(material.macKeyHex);

  const record = await KeyMetadata.create({
    ownerId,
    domain,
    algorithm,
    keyId,
    version,
    status: "active",
    publicKey: material.publicKey,
    privateKeyBackup,
    macKeyBackup,
    rotationReason,
    expiresAt: new Date(Date.now() + DEFAULT_KEY_TTL_DAYS * DAY_IN_MS),
    distribution: {
      scope: "server-internal",
      channels: ["api", "database"],
      note: `Domain ${domain} active key`,
    },
  });

  return record;
};

const deserializePrivate = (algorithm, value) => {
  if (algorithm === "RSA") {
    return deserializeRSAKey(value);
  }

  if (algorithm === "ECC") {
    return deserializeECCPrivateKey(value);
  }

  throw new Error(`Unsupported algorithm ${algorithm}`);
};

const deserializePublic = (algorithm, value) => {
  if (algorithm === "RSA") {
    return {
      n: BigInt(value.n),
      e: BigInt(value.e),
    };
  }

  if (algorithm === "ECC") {
    return deserializeECCPublicKey(value);
  }

  throw new Error(`Unsupported algorithm ${algorithm}`);
};

const attachRuntimeMaterial = async (record) => {
  if (!record) {
    return null;
  }

  const privateSerialized = await backupDecrypt(record.privateKeyBackup);
  const macKeyHex = await backupDecrypt(record.macKeyBackup);

  const runtime = {
    publicKey: deserializePublic(record.algorithm, record.publicKey),
    privateKey: deserializePrivate(record.algorithm, privateSerialized),
    macKeyHex,
  };

  return {
    ...record.toObject(),
    runtime,
  };
};

export const getActiveKey = async ({ ownerId, domain, algorithm }) => {
  const record = await KeyMetadata.findOne({ ownerId, domain, algorithm, status: "active" }).sort({ version: -1 });
  return attachRuntimeMaterial(record);
};

export const getKeyById = async (keyId) => {
  if (keyCache.has(keyId)) {
    return keyCache.get(keyId);
  }

  const record = await KeyMetadata.findOne({ keyId });
  const material = await attachRuntimeMaterial(record);
  
  if (material) {
    keyCache.set(keyId, material);
  }
  
  return material;
};

export const ensureActiveKey = async ({ ownerId, domain, algorithm }) => {
  const existing = await getActiveKey({ ownerId, domain, algorithm });

  if (existing) {
    keyCache.set(existing.keyId, existing);
    return existing;
  }

  const created = await createKeyVersion({ ownerId, domain, algorithm, rotationReason: "initial" });
  const material = await attachRuntimeMaterial(created);
  
  if (material) {
    keyCache.set(material.keyId, material);
  }
  
  return material;
};

export const ensureKeySet = async ({ ownerId, domain }) => {
  const rsa = await ensureActiveKey({ ownerId, domain, algorithm: "RSA" });
  const ecc = await ensureActiveKey({ ownerId, domain, algorithm: "ECC" });

  return { rsa, ecc };
};

export const rotateKey = async ({ ownerId, domain, algorithm, reason = "manual" }) => {
  const active = await KeyMetadata.findOne({ ownerId, domain, algorithm, status: "active" }).sort({ version: -1 });

  if (active) {
    active.status = "rotated";
    active.rotationReason = reason;
    active.rotatedAt = new Date();
    await active.save();
  }

  const created = await createKeyVersion({ ownerId, domain, algorithm, rotationReason: reason });
  return attachRuntimeMaterial(created);
};

export const rotateKeySet = async ({ ownerId, domain, reason = "manual" }) => {
  const rsa = await rotateKey({ ownerId, domain, algorithm: "RSA", reason });
  const ecc = await rotateKey({ ownerId, domain, algorithm: "ECC", reason });

  return { rsa, ecc };
};

export const listKeyMetadata = async ({ ownerId, domain }) => {
  const query = { ownerId };

  if (domain) {
    query.domain = domain;
  }

  return KeyMetadata.find(query).sort({ algorithm: 1, version: -1 });
};

export const exportBackupMasterPublic = async () => {
  const master = await getBackupMasterKeys();
  return {
    keyId: master.keyId,
    publicKey: serializeRSAKey(master.publicKey),
  };
};
