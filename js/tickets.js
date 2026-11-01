import { db } from "./firebase.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const listEl = document.getElementById("events-list");

async function loadDashboardData() {
  try {
    // 1. Fetch active events
    const qEvents = query(collection(db, "events"), where("active", "==", true));
    const snapEvents = await getDocs(qEvents);
    
    // 2. Fetch all tickets (for stats and counts)
    const snapTickets = await getDocs(collection(db, "tickets"));
    
    // 3. Fetch all organisers
    const snapOrgs = await getDocs(collection(db, "organisers"));

    // Update top stats
    document.getElementById("stat-events").textContent = snapEvents.size;
    document.getElementById("stat-tickets").textContent = snapTickets.size;
    document.getElementById("stat-organisers").textContent = snapOrgs.size;

    // Count tickets per event
    const ticketCounts = {};
    snapTickets.forEach(doc => {
      const t = doc.data();
      if (t.eventId) {
        ticketCounts[t.eventId] = (ticketCounts[t.eventId] || 0) + 1;
      }
    });

    if (snapEvents.empty) {
      listEl.innerHTML = '<p class="muted">No events available right now. Check back soon.</p>';
      return;
    }

    listEl.innerHTML = "";
    const fmt = n => Number(n).toLocaleString("en-UG");

    snapEvents.forEach(d => {
      const e = d.data();
      const sold = ticketCounts[d.id] || 0;
      
      // Calculate a fake capacity to show the progress bar (e.g. assume 100 capacity for demo)
      const capacity = 100;
      let percent = Math.min(Math.round((sold / capacity) * 100), 100);
      if (sold === 0) percent = 0;

      const priceOrd = (e.currency || "UGX") + " " + fmt(e.prices?.ordinary ?? 0);
      const priceVip = (e.currency || "UGX") + " " + fmt(e.prices?.vip ?? 0);

      const card = document.createElement("div");
      card.className = "event-card";

      // We use a generic placeholder image since we don't have event images yet
      const imageUrl = e.imageUrl || `https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=600&h=300`;

      card.innerHTML =
        '<div class="event-img-wrap">' +
          '<img src="' + imageUrl + '" alt="Event Cover">' +
          '<span class="event-badge">Live</span>' +
        '</div>' +
        '<div class="event-card-body">' +
          '<h3>' + (e.eventName || 'Event') + '</h3>' +
          '<p class="event-meta"> ' + (e.entryTime || 'TBA') + '</p>' +
          '<p class="event-meta"> ' + (e.location || 'TBA') + '</p>' +
          
          '<div class="progress-wrap">' +
            '<div class="progress-text"><span>' + sold + ' registered</span><span>' + percent + '%</span></div>' +
            '<div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ' + percent + '%"></div></div>' +
          '</div>' +

          '<div class="event-prices">' +
            '<div><span class="muted">Ordinary</span><br><strong>' + priceOrd + '</strong></div>' +
            '<div style="text-align:right;"><span class="muted">VIP</span><br><strong>' + priceVip + '</strong></div>' +
          '</div>' +

          '<div class="event-actions">' +
            '<button data-event="' + d.id + '" data-type="ordinary" class="btn secondary">Ordinary</button>' +
            '<button data-event="' + d.id + '" data-type="vip" class="btn">VIP</button>' +
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
    console.error("Dashboard load error:", e);
    listEl.innerHTML = '<p class="error">Could not load events. ' + e.message + '</p>';
  }
}

loadDashboardData();
