// consent.js
// Blocks the page until the user agrees to privacy terms.
// Stores the decision in localStorage so it shows only once.

const KEY = "javis_consent_v1";

function alreadyAgreed() {
  try { return localStorage.getItem(KEY) === "agreed"; } catch (e) { return false; }
}

function buildModal() {
  const overlay = document.createElement("div");
  overlay.id = "consent-overlay";

  overlay.innerHTML =
    '<div class="consent-modal">' +
      '<div class="consent-head">' +
        '<div class="brand">JAVIS</div>' +
        '<div class="label">Before you continue</div>' +
      '</div>' +
      '<div class="consent-body">' +
        '<h2>Privacy and terms</h2>' +
        '<p>To use Javis you need to agree to how we handle your information.</p>' +
        '<div class="consent-scroll">' +
          '<h3>What we collect</h3>' +
          '<p>For organisers: your email, a hashed password, and the event details you enter (name, location, entry time, prices, mobile money numbers).</p>' +
          '<p>For buyers: your name, phone number, chosen ticket type, and payment method. These are stored with each ticket so the organiser can verify entry at the door.</p>' +

          '<h3>How we use it</h3>' +
          '<p>Your information is used only to run ticketing: showing events, generating ticket codes, letting the organiser see who bought which ticket, and verifying tickets at the entrance.</p>' +
          '<p>We do not sell your data. We do not show advertising. We do not share your information with anyone except the organiser of the event you bought a ticket for.</p>' +

          '<h3>Payment</h3>' +
          '<p>Mobile money payments are handled by MTN or Airtel. We never store your PIN or your mobile money password. Only the transaction reference is kept with your ticket.</p>' +

          '<h3>Cookies and local storage</h3>' +
          '<p>We use your browser local storage only to remember your consent choice and minor interface preferences. No tracking cookies, no analytics scripts, no third-party trackers.</p>' +

          '<h3>Your rights</h3>' +
          '<p>You can ask the organiser of any event to delete your ticket record. You can clear your browser local storage at any time to reset this consent choice.</p>' +

          '<h3>Full documents</h3>' +
          '<p>For the full privacy policy and terms of service, see <a href="privacy.html" target="_blank">privacy.html</a>.</p>' +
        '</div>' +

        '<label class="consent-check">' +
          '<input type="checkbox" id="consent-age">' +
          '<span>I am 18 or older and I agree to the privacy policy and terms of service.</span>' +
        '</label>' +

        '<label class="consent-check">' +
          '<input type="checkbox" id="consent-data">' +
          '<span>I understand my name and phone number will be shared with the event organiser.</span>' +
        '</label>' +
      '</div>' +
      '<div class="consent-actions">' +
        '<button id="consent-decline" type="button" class="secondary">Decline</button>' +
        '<button id="consent-agree" type="button" disabled>Agree and Continue</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const age = document.getElementById("consent-age");
  const data = document.getElementById("consent-data");
  const agreeBtn = document.getElementById("consent-agree");
  const declineBtn = document.getElementById("consent-decline");

  function refresh() {
    agreeBtn.disabled = !(age.checked && data.checked);
  }
  age.addEventListener("change", refresh);
  data.addEventListener("change", refresh);

  agreeBtn.addEventListener("click", () => {
    try { localStorage.setItem(KEY, "agreed"); } catch (e) {}
    overlay.remove();
    document.body.style.overflow = "";
  });

  declineBtn.addEventListener("click", () => {
    overlay.innerHTML =
      '<div class="consent-modal">' +
        '<div class="consent-head">' +
          '<div class="brand">JAVIS</div>' +
        '</div>' +
        '<div class="consent-body">' +
          '<h2>Consent not given</h2>' +
          '<p>Without agreeing to the privacy policy and terms you cannot use Javis.</p>' +
          '<p>If you change your mind, refresh the page or click the button below.</p>' +
        '</div>' +
        '<div class="consent-actions">' +
          '<button id="consent-retry" type="button">Review again</button>' +
        '</div>' +
      '</div>';
    document.getElementById("consent-retry").addEventListener("click", () => {
      overlay.remove();
      document.body.style.overflow = "";
      buildModal();
    });
  });
}

(function init() {
  if (alreadyAgreed()) return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildModal);
  } else {
    buildModal();
  }
})();
