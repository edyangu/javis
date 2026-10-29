import { db } from "./firebase.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const listEl = document.getElementById("events-list");

async function loadAllEvents() {
  try {
    const q = query(collection(db, "events"), where("active", "==", true));
    const snap = await getDocs(q);

    if (snap.empty) {
      listEl.innerHTML = '<p class="muted">No events available right now. Check back soon.</p>';
      return;
    }

    const fmt = n => Number(n).toLocaleString("en-UG");
    listEl.innerHTML = "";

    snap.forEach(d => {
      const e = d.data();
      const card = document.createElement("div");
      card.className = "card";

      const priceOrd = (e.currency || "UGX") + " " + fmt(e.prices?.ordinary ?? 0);
      const priceVip = (e.currency || "UGX") + " " + fmt(e.prices?.vip ?? 0);

      card.innerHTML =
        '<h2>' + (e.eventName || 'Event') + '</h2>' +
        '<p class="muted">' + (e.orgName || '') + '</p>' +
        '<p><strong>Location:</strong> ' + (e.location || '-') + '</p>' +
        '<p><strong>Entry Time:</strong> ' + (e.entryTime || '-') + '</p>' +
        '<div class="row" style="margin-top:16px;">' +
          '<div class="ticket-box">' +
            '<h3>Ordinary</h3>' +
            '<div class="price">' + priceOrd + '</div>' +
            '<button data-event="' + d.id + '" data-type="ordinary">Buy Ordinary</button>' +
          '</div>' +
          '<div class="ticket-box">' +
            '<h3>VIP</h3>' +
            '<div class="price">' + priceVip + '</div>' +
            '<button data-event="' + d.id + '" data-type="vip">Buy VIP</button>' +
          '</div>' +
        '</div>';

      card.querySelectorAll('button[data-event]').forEach(btn => {
        btn.addEventListener('click', () => {
          const eventId = btn.getAttribute('data-event');
          const type = btn.getAttribute('data-type');
          window.location.href = 'checkout.html?event=' +
            encodeURIComponent(eventId) + '&type=' + encodeURIComponent(type);
        });
      });

      listEl.appendChild(card);
    });
  } catch (e) {
    console.error("loadAllEvents error:", e);
    listEl.innerHTML = '<p class="error">Could not load events. ' + e.message + '</p>';
  }
}

loadAllEvents();
