import { db } from "./firebase.js";
import {
  doc, getDoc, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { generateTicketCode } from "./codegen.js";
import { DEFAULTS } from "./config.js";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("event");
const type = params.get("type") === "vip" ? "vip" : "ordinary";

let cfg = null;
let amount = 0;
let currentTicket = null;

function fmt(n) { return Number(n).toLocaleString("en-UG"); }

function showErr(msg) {
  const el = document.getElementById("checkout-error");
  if (el) el.textContent = msg;
}

function view(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? "block" : "none";
}

if (!eventId) {
  const cv = document.getElementById("checkout-view");
  if (cv) cv.innerHTML =
    "<div class='card'><h2>Invalid link</h2>" +
    "<p>No event selected. Go back to the home page and pick an event.</p>" +
    "<a class='btn' href='index.html'>Back to Home</a></div>";
}

function updateInstruction() {
  if (!cfg) return;
  const m = document.getElementById("payment-method").value;
  const label = m === "mtn" ? "MTN Mobile Money" : "Airtel Money";
  const el = document.getElementById("payment-instruction");
  if (el) el.textContent =
    "When you click Pay Now, you will receive a " + label +
    " prompt on your phone to approve " + cfg.currency + " " + fmt(amount) +
    ". Enter your PIN to complete the payment.";
}

async function loadConfig() {
  if (!eventId) return;
  let loaded = DEFAULTS;
  try {
    const snap = await getDoc(doc(db, "events", eventId));
    if (snap.exists()) {
      const data = snap.data();
      loaded = { ...DEFAULTS, ...data, prices: { ...DEFAULTS.prices, ...(data.prices || {}) } };
    } else {
      showErr("This event could not be found. It may have been removed.");
    }
  } catch (e) {
    console.error("loadConfig failed:", e);
    showErr("Could not load event. " + (e.message || ""));
  }

  cfg = loaded;
  amount = type === "vip" ? cfg.prices.vip : cfg.prices.ordinary;

  const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setText("sum-event",  cfg.eventName);
  setText("sum-type",   type === "vip" ? "VIP" : "Ordinary");
  setText("sum-amount", cfg.currency + " " + fmt(amount));

  updateInstruction();
}

async function callPaymentApi(phone, method) {
  const resp = await fetch("/api/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, amount, method, eventId, type })
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "Payment request failed");
  }
  return resp.json();
}

function progressBarTo(percent) {
  const bar = document.getElementById("waiting-bar");
  if (bar) bar.style.width = percent + "%";
}

async function handlePay() {
  const btn = document.getElementById("pay-now-btn");
  const name = document.getElementById("buyer-name").value.trim();
  const phone = document.getElementById("buyer-phone").value.trim();
  const method = document.getElementById("payment-method").value;

  showErr("");

  if (!eventId) { showErr("No event selected."); return; }
  if (!cfg) { showErr("Event not loaded. Refresh the page."); return; }
  if (name.length < 3) { showErr("Enter your full name."); return; }
  if (!/^0[0-9]{9}$/.test(phone)) {
    showErr("Phone must be exactly 10 digits starting with 0.");
    return;
  }

  view("checkout-view", false);
  view("waiting-view", true);

  const networkLabel = method === "mtn" ? "MTN" : "Airtel";
  document.getElementById("waiting-network").textContent = networkLabel;
  document.getElementById("waiting-amount").textContent = cfg.currency + " " + fmt(amount);
  document.getElementById("waiting-phone").textContent = "Sending to phone: " + phone;

  const status = document.getElementById("waiting-status");

  progressBarTo(0);
  let progress = 0;
  const tick = setInterval(() => {
    progress = Math.min(progress + 2, 95);
    progressBarTo(progress);
  }, 100);

  setTimeout(() => {
    if (status) status.textContent = "Prompt sent. Check your phone...";
  }, 800);

  setTimeout(() => {
    if (status) status.textContent = "Waiting for you to enter your PIN...";
  }, 2200);

  try {
    const result = await callPaymentApi(phone, method);

    clearInterval(tick);
    progressBarTo(100);

    if (!result.success) {
      throw new Error("Payment was not approved.");
    }

    if (status) status.textContent = "Payment received. Generating your ticket...";

    const code = generateTicketCode();
    currentTicket = {
      code, type, amount, name, phone, method,
      eventId: eventId,
      event: cfg.eventName,
      location: cfg.location,
      entryTime: cfg.entryTime,
      status: "valid",
      paymentReference: result.reference || null,
      paymentSimulated: result.simulated === true
    };

    try {
      await addDoc(collection(db, "tickets"), {
        ...currentTicket,
        issuedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Save failed:", e);
    }

    view("waiting-view", false);
    view("success-view", true);

    document.getElementById("ticket-code").textContent = code;
    document.getElementById("ticket-meta").textContent =
      type.toUpperCase() + " | " + cfg.eventName + " | " +
      cfg.location + " | Entry " + cfg.entryTime;

    const qrContainer = document.getElementById("ticket-qr");
    if (qrContainer) {
      qrContainer.innerHTML = "";
      try {
        new QRCode(qrContainer, {
          text: code,
          width: 180,
          height: 180,
          colorDark: "#1a1a1a",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      } catch (e) {
        console.error("QR generation failed:", e);
      }
    }
  } catch (e) {
    clearInterval(tick);
    console.error("Payment failed:", e);
    view("waiting-view", false);
    view("checkout-view", true);
    if (btn) { btn.disabled = false; btn.textContent = "Pay Now"; }
    showErr("Payment failed: " + e.message);
  }
}

function handleDownload() {
  if (!currentTicket) return;
  const t = currentTicket;

  // Build QR as data URL using qrcodejs already on the page
  const qrWrapper = document.createElement("div");
  new QRCode(qrWrapper, {
    text: t.code,
    width: 220,
    height: 220,
    colorDark: "#111827",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  let qrDataUrl = "";
  const canvas = qrWrapper.querySelector("canvas");
  if (canvas) {
    qrDataUrl = canvas.toDataURL("image/png");
  } else {
    const img = qrWrapper.querySelector("img");
    if (img) qrDataUrl = img.src;
  }

  const issuedNow = new Date().toLocaleString("en-UG");
  const amountStr = Number(t.amount).toLocaleString("en-UG");

  const html =
    '<!DOCTYPE html>\n' +
    '<html lang="en"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>Javis Ticket ' + t.code + '</title>' +
    '<style>' +
      '* { box-sizing: border-box; }' +
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 24px; color: #111827; }' +
      '.receipt { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }' +
      '.head { background: #111827; color: #ffffff; padding: 24px 28px; display: flex; justify-content: space-between; align-items: center; }' +
      '.head .brand { font-size: 18px; font-weight: 800; letter-spacing: 0.15em; display: flex; align-items: center; gap: 8px; }' +
      '.head .brand::before { content: ""; width: 8px; height: 8px; background: #d4a017; border-radius: 50%; display: inline-block; }' +
      '.head .type { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; background: #d4a017; color: #111827; padding: 4px 10px; border-radius: 999px; }' +
      '.body { padding: 28px; }' +
      '.event { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 4px; line-height: 1.2; }' +
      '.organiser { font-size: 13px; color: #6b7280; margin-bottom: 24px; }' +
      '.code-block { background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px; }' +
      '.code-block .label { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }' +
      '.code-block .code { font-family: "SF Mono", Consolas, "Courier New", monospace; font-size: 20px; font-weight: 700; letter-spacing: 0.15em; color: #111827; word-break: break-all; }' +
      '.qr { text-align: center; margin-bottom: 24px; }' +
      '.qr img { width: 220px; height: 220px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; }' +
      '.qr .hint { font-size: 12px; color: #6b7280; margin-top: 8px; }' +
      'table.info { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px; }' +
      'table.info tr td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; }' +
      'table.info tr td:first-child { color: #6b7280; font-weight: 500; }' +
      'table.info tr td:last-child { color: #111827; font-weight: 600; text-align: right; }' +
      '.total { display: flex; justify-content: space-between; align-items: center; background: #111827; color: #ffffff; padding: 18px 20px; border-radius: 8px; margin-bottom: 24px; }' +
      '.total .label { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #d1d5db; }' +
      '.total .value { font-size: 24px; font-weight: 800; color: #d4a017; letter-spacing: -0.02em; }' +
      '.foot { padding: 16px 28px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; line-height: 1.5; }' +
      '.actions { max-width: 480px; margin: 16px auto 0; text-align: center; }' +
      '.actions button { background: #111827; color: #fff; border: none; border-radius: 8px; padding: 12px 28px; font-size: 14px; font-weight: 600; cursor: pointer; margin: 0 6px; }' +
      '.actions button:hover { background: #1f2937; }' +
      '@media print { body { background: #fff; padding: 0; } .receipt { box-shadow: none; max-width: 100%; } .actions { display: none; } }' +
    '</style>' +
    '</head><body>' +
    '<div class="receipt">' +
      '<div class="head">' +
        '<div class="brand">JAVIS</div>' +
        '<div class="type">' + t.type.toUpperCase() + '</div>' +
      '</div>' +
      '<div class="body">' +
        '<div class="event">' + t.event + '</div>' +
        '<div class="organiser">' + (t.location || "") + '</div>' +
        '<div class="code-block">' +
          '<div class="label">Ticket Code</div>' +
          '<div class="code">' + t.code + '</div>' +
        '</div>' +
        (qrDataUrl
          ? '<div class="qr"><img src="' + qrDataUrl + '" alt="Ticket QR code"><div class="hint">Scan at the entrance</div></div>'
          : '') +
        '<table class="info">' +
          '<tr><td>Name</td><td>' + t.name + '</td></tr>' +
          '<tr><td>Phone</td><td>' + t.phone + '</td></tr>' +
          '<tr><td>Entry Time</td><td>' + t.entryTime + '</td></tr>' +
          '<tr><td>Payment Method</td><td>' + t.method.toUpperCase() + '</td></tr>' +
          '<tr><td>Issued</td><td>' + issuedNow + '</td></tr>' +
        '</table>' +
        '<div class="total">' +
          '<div class="label">Total Paid</div>' +
          '<div class="value">UGX ' + amountStr + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="foot">' +
        'One entry per code. Do not share. ' +
        'If your QR does not scan, show the ticket code at the door.' +
      '</div>' +
    '</div>' +
    '<div class="actions">' +
      '<button onclick="window.print()">Print / Save as PDF</button>' +
    '</div>' +
    '</body></html>';

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.download = "javis-ticket-" + t.code + ".html";
    a.click();
  }
}

const payBtn = document.getElementById("pay-now-btn");
if (payBtn) payBtn.addEventListener("click", handlePay);

const dlBtn = document.getElementById("download-btn");
if (dlBtn) dlBtn.addEventListener("click", handleDownload);

const methodSel = document.getElementById("payment-method");
if (methodSel) methodSel.addEventListener("change", updateInstruction);

loadConfig();
