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

The homepage then lists all events that organisers have marked as active.
Each event shows the organiser name, location, entry time, both ticket
prices, and how many tickets have already been sold. When a visitor clicks
Buy on an event, they go to a checkout page that is tied to that specific
event through an identifier in the URL.

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
inspect the site in a browser. The dashboard shows the organiser their own
event settings, a live count of tickets sold for their event, a table of
those tickets, a verify box for scanning or typing a code at the door,
and a Hide or Show button so they can remove the event from the homepage
once it is done without deleting any data.

Super admins are users whose Firebase user ID exists as a document in the
admins collection. The dashboard checks this on login and shows a gold
SUPER badge if the logged in user is a super admin. Extra panels appear
listing every organiser on the platform and every ticket sold across all
events, so the super admin can oversee the whole platform without
interfering with individual organisers.

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
visitor clears their storage. Declining shows a page explaining that
Javis cannot be used without consent, with a button to review the terms
again.

For organisers

Organisers register and log in with email and password. Each organiser
gets their own event document in Firestore, keyed by their user ID. They
can only see and edit their own event. They cannot see any other
organiser's event, prices, tickets, or settings.

From the admin dashboard an organiser can edit their event name,
organisation name, location, entry time, ordinary price, VIP price, MTN
mobile money number, and Airtel money number. Changes take effect on the
public homepage after a refresh.

Organisers can also see all tickets sold for their own event only, verify
any ticket code by typing it into the verify box, hide their event from
the homepage once it is done, and clear all their own tickets for demo
purposes.

For buyers

Buyers open the homepage and see a list of all active events from all
organisers. Each event card shows the event name, organiser name,
location, entry time, both ticket prices, and a live badge showing how
many tickets have been sold for that event. Events with no sales show
"New event" in a gray pill. Events with sales show the count in a green
pill.

The buyer clicks Buy Ordinary or Buy VIP on the event they want. On
checkout, the buyer enters their name and phone number, chooses MTN or
Airtel, and clicks Pay Now. A payment request is sent to the backend
through /api/pay. The page switches to a waiting view that shows the
buyer that a prompt has been sent to their phone, with a progress bar and
status messages. In production the backend calls the MTN MoMo or Airtel
Money API to send a real prompt to the buyer's phone. In the current demo
the backend simulates a 4 second wait and returns success.

Once payment is confirmed, a confirmation code is generated in the
browser and saved to Firestore. The code appears as text and as a QR
code. The buyer can download the ticket as a self contained HTML receipt
with the QR code embedded, which opens in any browser, can be emailed,
printed, or saved as PDF.

For super admin

A user whose Firebase Auth UID exists as a document in the Firestore
admins collection sees a gold SUPER badge on the dashboard. Two extra
panels appear listing every organiser registered on the platform and
every ticket sold across the entire platform. The super admin can also
use the normal organiser dashboard and manage their own event.

What is simulated and not real yet

These are placeholders in the demo and must be replaced before going live.

Payment initiation. The checkout calls /api/pay which, for now, waits four
seconds and returns success. It does not call MTN or Airtel. It does not
send a prompt to the buyer's phone. The waiting view is a visual
simulation only. Real integration requires an MTN MoMo or Airtel Money
merchant account, API credentials from the provider, and replacing the
body of api/pay.js with a real API call and webhook handler. The rest of
the flow does not need to change when that swap happens, because the
structure is already in place.

Payment verification. Because no real payment is initiated, no money is
charged and no payment is verified. A buyer could complete the demo flow
without paying. In production the backend must only return success after
the mobile money provider confirms the payment through a webhook.

Ticket delivery. The code appears on screen and can be downloaded. No
SMS or email is sent. Real delivery requires an SMS gateway such as
Africa's Talking or Twilio, or an email service, plus a backend function
to trigger the send.

Super admin assignment. Super admins are added by creating a document in
the admins collection manually in the Firebase Console. There is no in
app interface for promoting or demoting super admins.

Ticket consumption. There is no mark as used flow yet. Once a ticket is
verified at the door, nothing stops it from being verified again. A
proper system would mark each ticket as used after first verification
and reject subsequent attempts.

Ticket count accuracy. The count shown on the homepage is computed by
querying the tickets collection for each event on every page load. This
is fine for a demo. In production with many events this becomes expensive
and should be replaced by a ticketCount field on each event document,
updated whenever a ticket is sold.

Ticket recovery. If a buyer loses the downloaded receipt, there is no
self service way to retrieve the code. In production this should be
solved either by re-sending the receipt by SMS or email after verifying
the buyer's phone with a one time code, or by having the buyer contact
the organiser directly who can look up the ticket by phone in their
dashboard.

Project structure

The repository is organised so that each page has one job, and each
JavaScript module handles one area of logic. Static files are served
directly by Vercel. The only server side code is the payment endpoint.

Root level pages

index.html is the public homepage. It lists all active events and shows
the Buy buttons. It has no business logic of its own. It loads
js/tickets.js which does the work.

checkout.html is the page a buyer lands on after clicking Buy. It has
three views inside it: the payment form, the waiting view with the
progress bar, and the success view with the ticket code and QR. Only one
view is visible at a time and the JavaScript switches between them. It
loads js/checkout.js.

login.html is the organiser login and registration page. It has two
buttons, Login and Create Account, and displays validation errors inline.
It loads js/auth.js.

dashboard.html is the admin panel. It is used by both organisers and
super admins. For a normal organiser, only the organiser panels are
visible. For a super admin, two extra gold bordered panels appear at the
bottom. It loads js/dashboard.js.

privacy.html is the static privacy policy, terms of service, and cookie
notice. It has no JavaScript of its own except the consent gate script
shared with every other page.

Serverless code

api/pay.js is a Vercel serverless function that listens at /api/pay. It
receives the buyer's phone number, amount, payment method, event ID, and
ticket type, validates them, and returns a success response. In the
current demo it just waits four seconds and returns success. In
production this is the only file that needs to be rewritten to call the
MTN MoMo or Airtel Money API and wait for a webhook confirmation. The
rest of the frontend stays the same.

Styles

css/style.css contains all the styling for the whole site. It uses a
small colour system: white surfaces, near black text, a single gold
accent for the brand and the QR code text, green for positive states, and
red for destructive actions and errors. There are no external fonts and
no UI frameworks. Everything is plain CSS.

JavaScript modules

js/firebase.js initialises the Firebase app and exports three things: the
Firebase app, the auth instance, and the Firestore instance. Every other
module that needs Firebase imports from here, so the configuration lives
in exactly one place.

js/config.js holds default values for a new event, such as the event
name, default prices, default mobile money numbers, and the currency. It
is used both when a new organiser signs up (so their first event has
something sensible filled in) and as a fallback on the public site when
an event document is missing data.

js/codegen.js generates ticket codes and verifies them. Codes have the
format JVS XXXX XXXX NNN where the first eight characters are randomly
chosen from an alphabet that avoids confusing characters, and the final
three digits are a checksum derived from the first eight. Verification
recomputes the checksum, so a mistyped or forged code is rejected without
needing a database lookup.

js/tickets.js powers the homepage. It reads all active events from
Firestore, counts how many tickets have been sold for each one, and
renders the event cards with the Buy buttons. Each Buy button links to
checkout.html with the event ID and ticket type in the URL.

js/checkout.js is the biggest module. It reads the event ID and ticket
type from the URL, loads the event details from Firestore, shows the
price summary, and handles the Pay Now button. When the buyer clicks Pay
Now, it calls /api/pay, shows the waiting view with the progress bar,
and on success generates the ticket code, saves the ticket to Firestore,
and shows the success view with the QR code. It also builds the
downloadable receipt as a self contained HTML document with the QR image
embedded as a data URL, so the receipt works offline.

js/auth.js handles login and registration. On register it creates the
Firebase Authentication user, then writes an organiser profile document
and an event document to Firestore. On login it does the same, but only
if those documents don't already exist. This means the first login after
registration is idempotent, and an organiser who signed up before the
event schema existed will get their event document created on their next
login.

js/dashboard.js powers both the organiser dashboard and the super admin
panel. It waits for Firebase Auth to confirm a user is logged in, then
checks whether that user is a super admin by looking for their UID in the
admins collection. If they are, the super admin panels are shown.
Otherwise the dashboard displays only the organiser's own event settings,
their own sold tickets, and their own verify box. The Hide and Show
button flips the active flag on the event document, which makes it
disappear from or reappear on the homepage.

js/consent.js shows the privacy and terms consent dialog on first visit
and stores the visitor's choice in local storage. Every page loads it,
so the dialog appears wherever the visitor first arrives.

Firestore structure

organisers holds one document per registered organiser. Fields are email,
name, and createdAt. The document ID is the user's UID.

events holds one document per organiser's event. The document ID is the
organiser's UID. Fields are organiserUid, orgName, eventName, location,
entryTime, currency, mtnNumber, airtelNumber, active, createdAt, and a
prices map containing ordinary and vip numbers.

tickets holds one document per ticket sold. Fields are code, name, phone,
type, amount, method, eventId, event, location, entryTime, status,
paymentReference, paymentSimulated, and issuedAt. The eventId field links
each ticket to its organiser's event, which is how the dashboard filters
tickets so each organiser sees only their own sales, and how the homepage
counts sales per event.

admins holds one document per super admin. Fields are email. The document
ID is the user's UID.

Firestore rules

These rules enforce the separation between organisers. Each organiser can
only write to their own event document, verified by checking that the
organiserUid field matches their authenticated user ID. Anyone can read
events so the homepage can list them. Anyone can create a ticket because
buyers are not logged in at checkout. Only logged in users can read
tickets, and the dashboard filters further to show only own tickets.

Firebase setup checklist

Create a Firebase project at console.firebase.google.com. Enable
Authentication and turn on the Email/Password provider. Create a
Firestore database in production mode. Add your Vercel domain to
Authentication, Settings, Authorized domains. Copy the Firebase config
into js/firebase.js. Publish the Firestore rules described above.

How to set a super admin

Sign up normally on the site. Go to Firebase Console, Authentication,
Users, and copy the UID of the account. Go to Firestore, Data, and open
the admins collection. Create a document whose ID is that UID. Add a
field called email of type string with the account email. Log out and
log back in. The SUPER badge appears on the dashboard.

Running locally

Any static file server works. For example run python -m http.server 8000
in the project folder and open http://localhost:8000. Firebase requires
localhost to be listed under Authorized domains, and it is by default, so
this works out of the box.

The /api/pay serverless function is a Vercel feature. To test it locally
you need the Vercel CLI: install it with npm install -g vercel, then run
vercel dev instead of python -m http.server. Without vercel dev, the
payment call will fail locally and the checkout will show a "Payment
failed" error. The rest of the site works fine with any static server.

Deploying

The site is deployed to Vercel. Any commit to the main branch of the
GitHub repo triggers an automatic redeploy. Vercel detects api/pay.js as
a serverless function and exposes it at /api/pay. No build step is used
for the static files. After deploying to a new domain, remember to add
that domain to Firebase Authentication, Settings, Authorized domains.

Ticket code format

Codes are generated in the browser by js/codegen.js. The format is JVS
followed by two groups of four characters and a three digit checksum,
written as JVS XXXX XXXX NNN where each X is a letter or digit and NNN is
the three digit checksum. The four character blocks use the alphabet
ABCDEFGHJKLMNPQRSTUVWXYZ23456789, excluding I, O, 0, and 1 so codes are
easy to read aloud without confusion. The three digit checksum is derived
from the first eight characters, and verifyTicketCode recomputes it to
reject forged or mistyped codes without a database lookup.

Roadmap

Not yet built, listed roughly in order of priority.

Real MTN and Airtel payment integration. Replace the body of api/pay.js
with a real call to the MTN MoMo Collections API or the Airtel Money API.
The checkout, waiting view, ticket generation, and dashboard stay
unchanged. Only the serverless function needs updating once merchant
credentials are available.

Payment webhook. Add a second endpoint, for example api/webhook.js, that
receives notifications from MTN or Airtel when a payment succeeds. Store
the confirmed payment reference against the ticket so organisers can
reconcile sales against their mobile money statement.

SMS or email delivery of ticket codes after purchase. Requires an SMS
gateway or email service, plus a backend function to trigger the send.
This also solves ticket recovery: if a buyer loses their receipt, they
can request a resend to their phone after verifying a one time code.

A mark as used flow so each ticket can only be verified once at the door.
Add a Mark Used button on each ticket row in the dashboard, and update the
verify logic to reject used tickets.

In app super admin management to promote or demote users without touching
the Firebase Console.

Search and filter on the ticket lists, particularly by phone number.

Ticket count stored on the event document instead of queried per page
load, to keep the homepage fast when there are many events.

A proper landing page hero for the homepage with a larger call to action.
