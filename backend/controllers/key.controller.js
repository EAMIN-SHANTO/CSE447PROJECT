import {
  ensureKeySet,
  exportBackupMasterPublic,
  listKeyMetadata,
  rotateKeySet,
} from "../lib/crypto/key-manager.js";

const sanitizeRecord = (record) => ({
  ownerId: record.ownerId,
  domain: record.domain,
  algorithm: record.algorithm,
  keyId: record.keyId,
  version: record.version,
  status: record.status,
  createdAt: record.createdAt,
  rotatedAt: record.rotatedAt,
  expiresAt: record.expiresAt,
  distribution: record.distribution,
});

export const ensureKeys = async (req, res) => {
  try {
    const { ownerId, domain = "post-data" } = req.body;

    if (!ownerId) {
      return res.status(400).json({ message: "ownerId is required" });
    }

    const keySet = await ensureKeySet({ ownerId, domain });

    return res.status(200).json({
      message: "Key set ensured",
      active: {
        rsa: sanitizeRecord(keySet.rsa),
        ecc: sanitizeRecord(keySet.ecc),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to ensure keys" });
  }
};

export const getKeyStatus = async (req, res) => {
  try {
    const { ownerId, domain } = req.query;

    if (!ownerId) {
      return res.status(400).json({ message: "ownerId query parameter is required" });
    }

    const records = await listKeyMetadata({ ownerId, domain });
    const backupMasterPublic = await exportBackupMasterPublic();

    return res.status(200).json({
      ownerId,
      domain: domain || "all",
      backupMasterPublic,
      keys: records.map((record) => sanitizeRecord(record)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch key status" });
  }
};

export const rotateKeys = async (req, res) => {
  try {
    const { ownerId, domain = "post-data", reason = "manual" } = req.body;

    if (!ownerId) {
      return res.status(400).json({ message: "ownerId is required" });
    }

    const rotated = await rotateKeySet({ ownerId, domain, reason });

    return res.status(200).json({
      message: "Keys rotated",
      active: {
        rsa: sanitizeRecord(rotated.rsa),
        ecc: sanitizeRecord(rotated.ecc),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to rotate keys" });
  }
};
