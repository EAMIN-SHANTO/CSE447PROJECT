export const bigIntToHex = (value) => {
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) {
    hex = `0${hex}`;
  }
  return hex;
};

export const hexToBigInt = (hex) => BigInt(`0x${hex}`);

export const utf8ToHex = (value) => Buffer.from(value, "utf8").toString("hex");

export const hexToUtf8 = (value) => Buffer.from(value, "hex").toString("utf8");

export const jsonStringifyBigInt = (value) =>
  JSON.stringify(value, (_, current) => (typeof current === "bigint" ? current.toString() : current));

export const parseBigIntFields = (value) => {
  if (Array.isArray(value)) {
    return value.map(parseBigIntFields);
  }

  if (value && typeof value === "object") {
    const output = {};

    Object.entries(value).forEach(([key, current]) => {
      if (typeof current === "string" && /^-?\d+$/.test(current)) {
        output[key] = BigInt(current);
        return;
      }

      output[key] = parseBigIntFields(current);
    });

    return output;
  }

  return value;
};
