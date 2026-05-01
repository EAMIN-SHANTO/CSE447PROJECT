async function run() {
  const loginRes = await fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "md.eamin0519@gmail.com", password: "md.eamin0519", otpMethod: "email" })
  });
  const loginData = await loginRes.json();
  console.log("login:", loginData);

  if (loginData.challengeId) {
    const verifyRes = await fetch("http://localhost:3000/auth/verify-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "md.eamin0519@gmail.com", challengeId: loginData.challengeId, otp: "123456" })
    });
    const verifyText = await verifyRes.text();
    console.log("verify status:", verifyRes.status);
    console.log("verify body:", verifyText);
  }
}
run();
