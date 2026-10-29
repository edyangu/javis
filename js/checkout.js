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
    "Send " + cfg.currency + " " + fmt(amount) + " to " + label +
    " number " + number + ". In this demo, no real money is charged.";
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

  if (btn) { btn.disabled = true; btn.textContent = "Generating code..."; }

  const code = generateTicketCode();
  currentTicket = {
    code, type, amount, name, phone, method,
    eventId: eventId,
    event: cfg.eventName,
    location: cfg.location,
    entryTime: cfg.entryTime,
    status: "valid"
  };

  try {
    await addDoc(collection(db, "tickets"), {
      ...currentTicket,
      issuedAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Save failed:", e);
    showErr("Ticket generated, but Firestore save failed: " + e.message);
  }

  const cv = document.getElementById("checkout-view");
  const sv = document.getElementById("success-view");
  if (cv) cv.style.display = "none";
  if (sv) sv.style.display = "block";

  const codeEl = document.getElementById("ticket-code");
  if (codeEl) codeEl.textContent = code;

  const metaEl = document.getElementById("ticket-meta");
  if (metaEl) metaEl.textContent =
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
