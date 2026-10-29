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
  const number = m === "mtn" ? cfg.mtnNumber : cfg.airtelNumber;
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
    body: JSON.stringify({
      phone, amount, method, eventId, type
    })
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

  // Switch to waiting view
  view("checkout-view", false);
  view("waiting-view", true);

  const networkLabel = method === "mtn" ? "MTN" : "Airtel";
  document.getElementById("waiting-network").textContent = networkLabel;
  document.getElementById("waiting-amount").textContent = cfg.currency + " " + fmt(amount);
  document.getElementById("waiting-phone").textContent = "Sending to phone: " + phone;

  const status = document.getElementById("waiting-status");

  // Progress bar animation while waiting
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

    // Now generate the ticket code and save to Firestore
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

    // Switch to success view
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
  const lines = [
    "JAVIS EVENT TICKET",
    "==================",
    "Code: " + t.code,
    "Name: " + t.name,
    "Phone: " + t.phone,
    "Type: " + t.type.toUpperCase(),
    "Amount: " + t.amount + " UGX",
    "Event: " + t.event,
    "Location: " + t.location,
    "Entry Time: " + t.entryTime,
    "",
    "Do not share this code. One entry per code."
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "javis-ticket-" + t.code + ".txt";
  a.click();
  URL.revokeObjectURL(url);
}

const payBtn = document.getElementById("pay-now-btn");
if (payBtn) payBtn.addEventListener("click", handlePay);

const dlBtn = document.getElementById("download-btn");
if (dlBtn) dlBtn.addEventListener("click", handleDownload);

const methodSel = document.getElementById("payment-method");
if (methodSel) methodSel.addEventListener("change", updateInstruction);

loadConfig();
