
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
A field in the dashboard for organisers to upload custom event cover
images instead of using the default placeholder.
