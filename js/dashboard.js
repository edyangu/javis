import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { verifyTicketCode } from "./codegen.js";
import { DEFAULTS } from "./config.js";

let currentUser = null;
let isSuperAdmin = false;
let myEventId = null;
let myEventActive = true;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    document.getElementById("access-denied").style.display = "block";
    document.getElementById("dashboard-body").style.display = "none";
    return;
  }
  currentUser = user;
  myEventId = user.uid;

  try {
    const adminSnap = await getDoc(doc(db, "admins", user.uid));
    isSuperAdmin = adminSnap.exists();
  } catch (e) { isSuperAdmin = false; }

  document.getElementById("access-denied").style.display = "none";
  document.getElementById("dashboard-body").style.display = "block";
  document.getElementById("public-link").textContent = window.location.origin + "/index.html";

  if (isSuperAdmin) {
    document.getElementById("super-admin-panel").style.display = "block";
    document.getElementById("super-admin-badge").style.display = "inline-block";
    await loadOrganisers();
    await loadAllTickets();
  } else {
    document.getElementById("super-admin-panel").style.display = "none";
    document.getElementById("super-admin-badge").style.display = "none";
  }

  await loadConfigIntoForm();
  await renderTickets();
});

async function loadConfigIntoForm() {
  try {
    const snap = await getDoc(doc(db, "events", myEventId));
    const c = snap.exists() ? snap.data() : DEFAULTS;
    myEventActive = c.active !== false;

    document.getElementById("cfg-org").value        = c.orgName || "";
    document.getElementById("cfg-event").value      = c.eventName || "";
    document.getElementById("cfg-location").value   = c.location || "";
    document.getElementById("cfg-time").value       = c.entryTime || "";
    document.getElementById("cfg-price-ordinary").value = c.prices?.ordinary ?? 50000;
    document.getElementById("cfg-price-vip").value      = c.prices?.vip ?? 150000;
    document.getElementById("cfg-mtn").value        = c.mtnNumber || "";
    document.getElementById("cfg-airtel").value     = c.airtelNumber || "";

    updateActiveUI();
  } catch (e) {
    console.error("loadConfig error:", e);
  }
}

function updateActiveUI() {
  const btn = document.getElementById("toggle-active-btn");
  const hint = document.getElementById("toggle-hint");
  const statusLine = document.getElementById("event-status-line");

  if (!btn) return;
  btn.style.display = "inline-flex";
  if (hint) hint.style.display = "block";

  if (myEventActive) {
    btn.textContent = "Hide Event";
    btn.classList.remove("danger");
    btn.classList.add("secondary");
    if (statusLine) {
      statusLine.style.display = "block";
      statusLine.innerHTML = "Status: <strong style='color:#15803d;'>Visible</strong> — your event is on the public homepage.";
    }
  } else {
    btn.textContent = "Show Event";
    btn.classList.remove("secondary");
    btn.classList.add("danger");
    if (statusLine) {
      statusLine.style.display = "block";
      statusLine.innerHTML = "Status: <strong style='color:#b91c1c;'>Hidden</strong> — your event is not on the public homepage.";
    }
  }
}

window.toggleActive = async function () {
  const newValue = !myEventActive;
  const action = newValue ? "Show" : "Hide";
  if (!confirm(action + " this event on the homepage?")) return;

  try {
    await setDoc(doc(db, "events", myEventId), { active: newValue }, { merge: true });
    myEventActive = newValue;
    updateActiveUI();
    document.getElementById("save-status").textContent =
      "Event " + (newValue ? "shown" : "hidden") + " at " + new Date().toLocaleTimeString();
  } catch (e) {
    document.getElementById("save-status").textContent = "Failed to update: " + e.message;
  }
};

window.saveSettings = async function () {
  const newCfg = {
    organiserUid: myEventId,
    orgName:    document.getElementById("cfg-org").value.trim() || "Javis Events",
    eventName:  document.getElementById("cfg-event").value.trim() || "Concert",
    location:   document.getElementById("cfg-location").value.trim() || "Kampala",
    entryTime:  document.getElementById("cfg-time").value.trim() || "7:00 PM",
    currency:   "UGX",
    prices: {
      ordinary: Number(document.getElementById("cfg-price-ordinary").value) || 0,
      vip:      Number(document.getElementById("cfg-price-vip").value) || 0
    },
    mtnNumber:    document.getElementById("cfg-mtn").value.trim(),
    airtelNumber: document.getElementById("cfg-airtel").value.trim(),
    active: myEventActive
  };

  try {
    await setDoc(doc(db, "events", myEventId), newCfg, { merge: true });
    document.getElementById("save-status").textContent =
      "Settings saved at " + new Date().toLocaleTimeString();
  } catch (e) {
    document.getElementById("save-status").textContent = "Save failed: " + e.message;
  }
};

async function renderTickets() {
  const tbody = document.getElementById("sold-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  try {
    const q = query(
      collection(db, "tickets"),
      where("eventId", "==", myEventId)
    );
    const snap = await getDocs(q);
    document.getElementById("sold-count").textContent = snap.size + " ticket(s) sold";
    const rows = [];
    snap.forEach(d => rows.push(d.data()));
    rows.sort((a, b) => {
      const ta = a.issuedAt?.toMillis?.() || 0;
      const tb = b.issuedAt?.toMillis?.() || 0;
      return tb - ta;
    });
    rows.forEach(t => {
      const tr = document.createElement("tr");
      const issued = t.issuedAt && t.issuedAt.toMillis
        ? new Date(t.issuedAt.toMillis()).toLocaleString() : "-";
      [t.code, t.name, t.phone, (t.type || "").toUpperCase(),
       t.amount, (t.method || "").toUpperCase(), issued]
        .forEach(val => {
          const td = document.createElement("td");
          td.textContent = val ?? "";
          tr.appendChild(td);
        });
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error("renderTickets error:", e);
  }
}

window.clearTickets = async function () {
  if (!confirm("Delete all tickets for your event?")) return;
  try {
    const q = query(collection(db, "tickets"), where("eventId", "==", myEventId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    await renderTickets();
  } catch (e) { alert("Clear failed: " + e.message); }
};

window.verifyCode = async function () {
  const code = document.getElementById("verify-input").value.trim().toUpperCase();
  const result = document.getElementById("verify-result");
  result.textContent = "";
  if (!verifyTicketCode(code)) { result.textContent = "INVALID format or checksum."; return; }
  try {
    const q = query(collection(db, "tickets"), where("code", "==", code));
    const snap = await getDocs(q);
    if (snap.empty) { result.textContent = "Well-formed but not found."; return; }
    const t = snap.docs[0].data();
    if (t.eventId !== myEventId && !isSuperAdmin) {
      result.textContent = "This ticket belongs to another organiser's event.";
      return;
    }
    result.textContent = "VALID - " + t.type.toUpperCase() + " for " + t.name + " (" + t.phone + ")";
  } catch (e) { result.textContent = "Verify failed: " + e.message; }
};

async function loadOrganisers() {
  const tbody = document.getElementById("organisers-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  try {
    const snap = await getDocs(collection(db, "organisers"));
    document.getElementById("organisers-count").textContent = snap.size + " organiser(s)";
    if (snap.size === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="muted">No organisers yet.</td></tr>';
      return;
    }
    snap.forEach(d => {
      const o = d.data();
      const tr = document.createElement("tr");
      const joined = o.createdAt && o.createdAt.toMillis
        ? new Date(o.createdAt.toMillis()).toLocaleString() : "-";
      [d.id, o.email || "-", o.name || "-", joined].forEach(val => {
        const td = document.createElement("td");
        td.textContent = val;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error("loadOrganisers error:", e);
  }
}

async function loadAllTickets() {
  const tbody = document.getElementById("all-tickets-table-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  try {
    const q = query(collection(db, "tickets"), orderBy("issuedAt", "desc"));
    const snap = await getDocs(q);
    document.getElementById("all-tickets-count").textContent = snap.size + " ticket(s) total";
    if (snap.size === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted">No tickets yet.</td></tr>';
      return;
    }
    snap.forEach(d => {
      const t = d.data();
      const tr = document.createElement("tr");
      const issued = t.issuedAt && t.issuedAt.toMillis
        ? new Date(t.issuedAt.toMillis()).toLocaleString() : "-";
      [t.code, t.name, (t.type || "").toUpperCase(), t.amount + " UGX", issued]
        .forEach(val => {
          const td = document.createElement("td");
          td.textContent = val;
          tr.appendChild(td);
        });
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error("loadAllTickets error:", e);
  }
}

window.logout = async function () {
  try { await signOut(auth); } catch (e) {}
  window.location.href = "login.html";
};
