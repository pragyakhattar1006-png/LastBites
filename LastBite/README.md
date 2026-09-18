# LastBite MVP

Responsive Ahmedabad surplus-food prototype based on the supplied LastBite_MVP.pdf. Sample partners and bag promises are illustrative; there are no real food orders, payments, refunds or donation execution.

Features: portions and dietary/allergen clues before reservation; collection-day selection; confirmed daily quotas; directions to configured pickup addresses (neighbourhood-only links while unverified); shared reservations and inventory in D1; private device-session access to customer reservations; operator-key-protected partner desk; customer and vendor cancellation; pickup statuses; calendar event with a reminder 30 minutes before pickup; shared feedback and evidence export.

Run `npm run build`, `npm test`, then `npm run dev`. Local development uses Node's built-in SQLite and lastbite-preview.sqlite in your operating system's temporary folder. Set LASTBITE_DB_PATH to keep it elsewhere. The local operator key defaults to preview-only-key; it is never used in the hosted environment. Hosted VENDOR_ACCESS_KEY is a managed secret. The shared database binding is DB. No dependencies are required.

Daily quotas start unconfirmed. In Partner desk, select a partner/date, set a guaranteed minimum, optionally enter a verified address, and confirm. Only confirmed quotas are available. Quotas cannot be reduced below allocated bags. Customer cancellations release stock before pickup starts. Vendor cancellations also release allocation; missed pickup cannot be marked before 10 pm IST. Pickup is a simulation because all partners are sample partners.

The reservation deadline uses Ahmedabad time (Asia/Kolkata) on the server. Reservations cover the next two weeks. The atomic INSERT checks quota and confirmation in the same statement, avoiding competing requests overselling a slot. Customer tokens are private bearer capabilities stored on a device; clearing browser storage loses access to existing reservations. This is not a full customer-account or individual-vendor account system. The operator key controls all sample vendors; individual scoped vendor identities are needed before a public real-world pilot.

Existing v1 browser data is preserved under its original localStorage key but is not uploaded automatically. New bookings use shared storage. Photos, sample portions, prices and distances are illustrative. The report marks its test numbers as draft figures; do not submit them as verified evidence. Demo interactions do not validate real willingness to pay.

Meaningful checks cover IST cutoff, operator authentication, confirmed quotas, competing reservations, session isolation, quota protection, cancellation release, paused sales, pickup transitions and feedback. Phone browser checks cover responsive widths, reservation, cancellation and the operator form.

## Run after unzipping

Install Node.js 24 or newer. Open a terminal in the extracted LastBite folder and run:

```sh
npm run build
npm test
npm run dev
```

Open http://127.0.0.1:5173/ . No npm install is required because the project has no external Node dependencies. Partner desk uses preview-only-key locally unless you set VENDOR_ACCESS_KEY in your shell. Daily inventory starts empty: confirm a date-specific quota in Partner desk before trying reservations. The sample environment file is documentation; this app does not automatically load .env.

## Upload to GitHub

Create an empty GitHub repository. Upload the contents of this LastBite folder, or run these commands from inside it after replacing YOUR_USERNAME and YOUR_REPOSITORY:

```sh
git init
git add .
git commit -m "Initial LastBite MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

This export excludes the original Git history, operator secrets and live database records. The .openai/hosting.json identifies your existing private Sites deployment; it is not a credential. GitHub stores the source. GitHub Pages alone cannot run the shared reservation API: live hosting requires a Cloudflare-compatible Worker, a D1 binding named DB, and the private VENDOR_ACCESS_KEY runtime secret. Your existing live site remains separate from this ZIP.
