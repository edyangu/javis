Javis Ticketing

A multi organiser concert ticketing platform for Uganda. Organisers register
their own accounts, set up their own events with their own prices, and
receive payments directly to their MTN or Airtel mobile money numbers.
Buyers browse all events on the homepage and purchase tickets from the
event they choose. Payment is initiated from the checkout page and, in
production, will send a prompt directly to the buyer's phone. Every ticket
generates a unique confirmation code with a QR code that can be scanned
at the door, and can be downloaded as a printable receipt.

Live demo: https://javis-nine.vercel.app

Built with plain HTML, CSS, and JavaScript. Data is stored in Firebase
Authentication and Firestore. Payment requests go through a Vercel
serverless function. Hosted on Vercel.

This README is written so that if the project is picked up by someone
else, or resumed in a new conversation, they can understand what exists,
what works, and what still needs building.

How the whole project works

There are three types of people who use the site. Visitors who become
buyers. Organisers who run events. And one or more super admins who watch
everything at the platform level.

When a visitor arrives for the first time, a consent dialog covers the
page. They must confirm they are 18 or older and that they understand
their name and phone number will be shared with the event organiser.
Their agreement is stored in browser local storage so the dialog does not
appear again on that device.

The homepage is built like a modern dashboard. At the top, a visual hero
banner welcomes the visitor. Below that, four stat cards show live
platform numbers: how many active events exist, how many tickets have
been sold platform-wide, how many organisers are registered, and the
location. Below the stats, all active events are displayed in a
responsive grid. Each event card shows a cover image, the event name,
entry time, location, a progress bar showing how many tickets have been
sold, and the two buy buttons. Clicking Buy takes the visitor to a
checkout page that is tied to that specific event through an identifier
in the URL.

On checkout, the visitor types their name and phone number, picks MTN or
Airtel, and clicks Pay Now. The browser sends a request to a serverless
function on the same domain at /api/pay. That function is the only part
of the system that talks to the outside payment world. In the current
demo it waits four seconds and returns success. In production it will
call the MTN MoMo or Airtel Money API to send a payment prompt to the
buyer's phone, and will only return success when the provider confirms
the payment through a webhook. The rest of the flow does not change when
that swap happens.

While waiting, the checkout page shows a waiting card with a progress bar
and status messages, so the buyer knows what is happening. When payment
is confirmed, the browser generates a ticket code, saves a new ticket
document to Firestore, and shows the code plus a QR code. The buyer can
download a self contained HTML receipt with the QR embedded. That receipt
is their ticket. It can be emailed, printed, or saved as PDF, and it works
offline.

Organisers register and log in using Firebase Authentication with email
and password. Each organiser gets their own event document in Firestore,
keyed by their Firebase user ID. Because of the Firestore security rules,
an organiser can only read and write their own event. They cannot see any
other organiser's event, prices, tickets, or settings, even if they
inspect the site in a browser.

The admin dashboard is also styled like a modern dashboard. At the top,
four stat cards show the organiser's own metrics: total tickets sold,
total revenue (calculated from ticket amounts), VIP tickets sold, and the
current event status (Visible or Hidden). Below the stats, the dashboard
is split into two columns on desktop. The left column holds the event
settings form, where the organiser can edit prices, location, entry time,
MoMo numbers, and a cover image URL. The right column holds the ticket
verification box and the public event link. Below that is a clean table
listing all sold tickets for that specific event, along with a button to
hide or show the event from the public homepage.

Super admins are users whose Firebase user ID exists as a document in the
admins collection. The dashboard checks this on login and shows a gold
SUPER badge if the logged in user is a super admin. Extra panels appear
at the bottom listing every organiser on the platform and every ticket
sold across all events, so the super admin can oversee the whole platform
without interfering with individual organisers.

All of this is served as static files from Vercel. There is no build step.
Firebase is contacted directly from the browser. The only server side code
is the small payment endpoint at api/pay.js.

What works today

For all visitors

On first visit to any page, a consent dialog appears before the site can
be used. It summarises what information is collected, how it is used, and
the buyer's and organiser's rights, and links to the full privacy policy.
The visitor must check two boxes confirming they are 18 or older and that
they understand their name and phone number are shared with the event
organiser. Only then does the Agree button enable. The choice is stored in
browser local storage so the dialog does not appear again until the
visitor clears their storage.

For organisers

Organisers register and log in with email and password. Each organiser
gets their own event document in Firestore. They can only see and edit
their own event.

From the admin dashboard an organiser can edit their event name,
organisation name, cover image URL, location, entry time, ordinary price,
VIP price, MTN mobile money number, and Airtel money number. Changes take
effect on the public homepage after a refresh. Organisers can also see
live stats for their event (tickets sold, revenue, VIP count), see all
tickets sold for their own event only, verify any ticket code, hide their
event from the homepage once it is done, and clear all their own tickets
for demo purposes.

For buyers

Buyers open the homepage and see a hero banner, live platform stats, and
a grid of all active events. Each event card shows a cover image, the
name, location, time, and a progress bar of tickets sold. Clicking Buy
Ordinary or Buy VIP opens the checkout. The buyer enters their name and
phone number, chooses MTN or Airtel, and clicks Pay Now. A simulated
payment prompt appears, and once confirmed, a confirmation code and QR
code are generated. The buyer can download the ticket as an HTML receipt
with the QR embedded, which opens in any browser, can be emailed,
printed, or saved as PDF.

For super admin

A user whose Firebase Auth UID exists as a document in the Firestore
admins collection sees a gold SUPER badge. Two extra panels appear
listing every organiser on the platform and every ticket sold across the
entire platform. The super admin can also manage their own event like a
normal organiser.

What is simulated and not real yet

Payment initiation. The checkout calls /api/pay which waits four seconds
and returns success. It does not call MTN or Airtel or send a prompt to
the buyer's phone. Real integration requires an MTN MoMo or Airtel Money
merchant account and replacing the body of api/pay.js. The rest of the
flow does not need to change.

Payment verification. Because no real payment is initiated, a buyer
could complete the demo flow without paying. In production the backend
must only return success after the provider confirms payment via webhook.

Ticket delivery. The code appears on screen and can be downloaded. No
SMS or email is sent. Real delivery requires an SMS gateway.

Super admin assignment. Super admins are added manually in the Firebase
Console by creating a document in the admins collection.

Ticket consumption. There is no mark as used flow yet. Once a ticket is
verified at the door, nothing stops it from being verified again.

Ticket count accuracy. The homepage counts tickets by querying the tickets
collection for each event on every page load. This is fine for a demo,
but in production with many events this becomes expensive.

Event cover images. The dashboard now has an input for an event cover
image URL. If the organiser provides one, it displays on the homepage.
If left blank, a default placeholder is used.

Project structure

Root level pages:
index.html is the public homepage with the hero banner, stat cards, and
event grid.
checkout.html handles the payment form, waiting view, and success view.
login.html handles organiser login and registration.
dashboard.html is the admin panel with the new dashboard layout, stats,
and event settings.
privacy.html is the static privacy policy and terms.

Serverless code:
api/pay.js is a Vercel serverless function for payment requests. It
simulates success for the demo.

Styles:
css/style.css contains all styling, including the hero banner, stat
cards, event grid, dashboard layout, and consent modal.

JavaScript modules:
js/firebase.js initialises Firebase and exports app, auth, and db.
js/config.js holds default event values.
js/codegen.js generates and verifies ticket codes.
js/tickets.js powers the homepage, loading stats and rendering the event
cards.
js/checkout.js handles the payment form, calls the payment API, saves the
ticket, and builds the downloadable receipt.
js/auth.js handles login, registration, and creating the organiser profile
and event documents.
js/dashboard.js powers the admin panel, calculates revenue and ticket
stats, and handles event settings and ticket verification.
js/consent.js shows the privacy and terms consent gate on first visit.

Firestore structure

organisers holds one document per registered organiser. Fields are email,
name, and createdAt.

events holds one document per organiser's event. Fields are organiserUid,
orgName, eventName, imageUrl, location, entryTime, currency, mtnNumber,
airtelNumber, active, createdAt, and a prices map.

tickets holds one document per ticket sold. Fields are code, name, phone,
type, amount, method, eventId, event, location, entryTime, status,
paymentReference, paymentSimulated, and issuedAt.

admins holds one document per super admin. Fields are email.

Firestore rules

Firebase setup checklist

Create a Firebase project. Enable Email/Password Authentication. Create
a Firestore database. Add your Vercel domain to Authentication Settings.
Copy the Firebase config into js/firebase.js. Publish the Firestore rules.

How to set a super admin

Sign up normally on the site. Go to Firebase Console, Authentication,
Users, and copy the UID. Go to Firestore, Data, and open the admins
collection. Create a document whose ID is that UID. Add a field called
email. Log out and log back in.

Running locally

Any static file server works, but to test the payment API locally use the
Vercel CLI: install it with npm install -g vercel, then run vercel dev.

Deploying

Any commit to the main branch triggers an automatic redeploy on Vercel.
After deploying to a new domain, add it to Firebase Authentication.

Ticket code format

Codes are generated in the browser. The format is JVS XXXX XXXX NNN where
the final three digits are a checksum. Verification recomputes the
checksum to reject forged codes.

Roadmap

Real MTN and Airtel payment integration. Replace api/pay.js.
Payment webhook to confirm real payments.
SMS or email delivery of ticket codes.
A mark as used flow for the door.
In app super admin management.
Search and filter on ticket lists.
