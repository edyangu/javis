
These rules enforce the separation between organisers. Each organiser can
only write to their own event document, verified by checking that the
organiserUid field matches their authenticated user ID. Anyone can read
events so the homepage can list them. Anyone can create a ticket because
buyers are not logged in at checkout. Only logged in users can read
tickets, and the dashboard filters further to show only own tickets.

## Firebase setup checklist

Create a Firebase project at console.firebase.google.com. Enable
Authentication and turn on the Email/Password provider. Create a
Firestore database in production mode. Add your Vercel domain to
Authentication, Settings, Authorized domains. Copy the Firebase config
into js/firebase.js. Publish the Firestore rules described above.

## How to set a super admin

Sign up normally on the site. Go to Firebase Console, Authentication,
Users, and copy the UID of the account. Go to Firestore, Data, and open
the admins collection. Create a document whose ID is that UID. Add a
field called email of type string with the account email. Log out and
log back in. The SUPER badge appears on the dashboard.

## Running locally

Any static file server works. For example run python -m http.server 8000
in the project folder and open http://localhost:8000. Firebase requires
localhost to be listed under Authorized domains, and it is by default, so
this works out of the box.

The /api/pay serverless function is a Vercel feature. To test it locally
you need the Vercel CLI: install it with npm install -g vercel, then run
vercel dev instead of python -m http.server. Without vercel dev, the
payment call will fail locally and the checkout will show a "Payment
failed" error. The rest of the site works fine with any static server.

## Deploying

The site is deployed to Vercel. Any commit to the main branch of the
GitHub repo triggers an automatic redeploy. Vercel detects api/pay.js as
a serverless function and exposes it at /api/pay. No build step is used
for the static files. After deploying to a new domain, remember to add
that domain to Firebase Authentication, Settings, Authorized domains.

## Ticket code format

Codes are generated in the browser by js/codegen.js. The format is JVS
followed by two groups of four characters and a three digit checksum,
written as JVS XXXX XXXX NNN where each X is a letter or digit and NNN is
the three digit checksum. The four character blocks use the alphabet
ABCDEFGHJKLMNPQRSTUVWXYZ23456789, excluding I, O, 0, and 1 so codes are
easy to read aloud without confusion. The three digit checksum is derived
from the first eight characters, and verifyTicketCode recomputes it to
reject forged or mistyped codes without a database lookup.

## Roadmap

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

A mark as used flow so each ticket can only be verified once at the door.
Add a Mark Used button on each ticket row in the dashboard, and update the
verify logic to reject used tickets.

In app super admin management to promote or demote users without touching
the Firebase Console.

Search and filter on the ticket lists, particularly by phone number.

A delete event button so organisers can remove an event they no longer
want listed on the homepage.

A proper landing page hero for the homepage with a larger call to action.
