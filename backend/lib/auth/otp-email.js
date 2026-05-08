import nodemailer from "nodemailer";
import dns from "dns";

// Fix for Render blocking/failing IPv6 connections to Google SMTP
dns.setDefaultResultOrder("ipv4first");

let transporter = null;
let transporterKey = "";

const getSmtpConfig = () => ({
  host: process.env.SMTP_HOST || "",
  port: Number(process.env.SMTP_PORT || 587),
  user: process.env.SMTP_USER || "",
  pass: process.env.SMTP_PASS || "",
  from: process.env.SMTP_FROM || "",
});

const isSmtpConfigured = () => {
  const config = getSmtpConfig();
  return Boolean(config.host && config.port && config.user && config.pass && config.from);
};

const getTransporter = () => {
  const config = getSmtpConfig();
  const key = `${config.host}:${config.port}:${config.user}`;

  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false
      },
      family: 4 // Force IPv4 explicitly for the socket connection
    });
    transporterKey = key;
  }

  return transporter;
};

export const shouldExposeDevOtp = () => {
  const flag = process.env.OTP_EXPOSE_DEV_OTP;

  if (flag === undefined) {
    return process.env.NODE_ENV !== "production";
  }

  return flag === "true";
};

export const sendEmailOtp = async ({ to, otp, pseudonym, ttlSeconds, purpose = "login" }) => {
  const config = getSmtpConfig();

  if (!isSmtpConfigured()) {
    return {
      delivered: false,
      reason: "smtp-not-configured",
    };
  }

  try {
    const purposeLabel = purpose === "signup" ? "Signup" : "Login";

    await getTransporter().sendMail({
      from: config.from,
      to,
      subject: `BRACU Marketplace ${purposeLabel} OTP Verification`,
      text: [
        `Hello ${pseudonym},`,
        "",
        `Your ${purposeLabel.toLowerCase()} one-time OTP is: ${otp}`,
        `This code expires in ${Math.max(1, Math.floor(Number(ttlSeconds || 0) / 60))} minute(s).`,
        "",
        "If you did not request this, please ignore this message.",
      ].join("\n"),
      html: `
        <p>Hello <strong>${pseudonym}</strong>,</p>
        <p>Your ${purposeLabel.toLowerCase()} one-time OTP is:</p>
        <p style="font-size: 20px; font-weight: bold; letter-spacing: 0.2em;">${otp}</p>
        <p>This code expires in ${Math.max(1, Math.floor(Number(ttlSeconds || 0) / 60))} minute(s).</p>
        <p>If you did not request this, please ignore this message.</p>
      `,
    });

    return {
      delivered: true,
      reason: "smtp",
    };
  } catch (error) {
    console.error("OTP email send failed:", error?.message || "unknown-error");
    return {
      delivered: false,
      reason: "smtp-send-failed",
    };
  }
};
