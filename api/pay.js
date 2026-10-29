// api/pay.js
// Simulated payment endpoint. In production this calls the MTN MoMo
// or Airtel Money API, waits for the webhook, and returns success.
// For now, it always succeeds after a short delay.

export default async function handler(req, res) {
  // CORS so the site can call this from any domain
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, amount, method, eventId, type } = req.body || {};

  // Basic validation
  if (!phone || !/^0[0-9]{9}$/.test(phone)) {
    return res.status(400).json({ error: "Invalid phone number" });
  }
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  if (!eventId) {
    return res.status(400).json({ error: "Missing event" });
  }

  // === SIMULATED PAYMENT ===
  // In production this block is replaced by:
  //   1. Calling MTN MoMo Collections API or Airtel Money API
  //   2. Returning a pending status
  //   3. Waiting for the webhook to confirm
  //   4. Returning success or failure
  //
  // For now, we wait 4 seconds to simulate the phone prompt and
  // buyer approval, then return success.

  await new Promise(r => setTimeout(r, 4000));

  return res.status(200).json({
    success: true,
    simulated: true,
    reference: "SIM-" + Date.now(),
    method: method,
    amount: amount
  });
}
