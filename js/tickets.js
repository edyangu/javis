import { db } from "./firebase.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const listEl = document.getElementById("events-list");

async function countTicketsForEvent(eventId) {
  try {
    const q = query(collection(db, "tickets"), where("eventId", "==", eventId));
    const snap = await getDocs(q);
    return snap.size;
  } catch (e) {
    console.warn("countTickets failed for", eventId, e);
    return 0;
  }
}

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

    // Preload counts in parallel
    const events = [];
    snap.forEach(d => events.push({ id: d.id, data: d.data() }));
    const counts = await Promise.all(events.map(e => countTicketsForEvent(e.id)));

    events.forEach((e, i) => {
      const data = e.data;
      const sold = counts[i];
      const card = document.createElement("div");
      card.className = "card";

      const priceOrd = (data.currency || "UGX") + " " + fmt(data.prices?.ordinary ?? 0);
      const priceVip = (data.currency || "UGX") + " " + fmt(data.prices?.vip ?? 0);

      const soldLabel = sold === 0
        ? "New event"
        : sold + " ticket" + (sold === 1 ? "" : "s") + " sold";

      card.innerHTML =
        '<div class="event-header">' +
          '<div>' +
            '<h2>' + (data.eventName || 'Event') + '</h2>' +
            '<p class="muted">' + (data.orgName || '') + '</p>' +
          '</div>' +
          '<span class="sold-badge">' + soldLabel + '</span>' +
        '</div>' +
        '<p><strong>Location:</strong> ' + (data.location || '-') + '</p>' +
        '<p><strong>Entry Time:</strong> ' + (data.entryTime || '-') + '</p>' +
        '<div class="row" style="margin-top:16px;">' +
          '<div class="ticket-box">' +
            '<h3>Ordinary</h3>' +
            '<div class="price">' + priceOrd + '</div>' +
            '<button data-event="' + e.id + '" data-type="ordinary">Buy Ordinary</button>' +
          '</div>' +
          '<div class="ticket-box">' +
            '<h3>VIP</h3>' +
            '<div class="price">' + priceVip + '</div>' +
            '<button data-event="' + e.id + '" data-type="vip">Buy VIP</button>' +
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
