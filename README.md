# ⚽ eFootball Arena: tournament manager

React + Vite frontend, **Firebase** (Firestore + Authentication) as the database. Hosted on Vercel, no server needed.

## Features
- Tournament styles: **League**, **League + Playoffs**, **Knockout**, **FIFA World Cup style** (groups + knockout), **Champions League style** (Swiss league phase + knockout)
- **Smart suggestion** of the best style for the number of players
- Add / edit / remove players before the start (bulk add supported)
- Auto fixtures, live table, knockout bracket, two-legged ties, aggregate, penalty shootouts
- **Realtime**: everyone watching sees scores update instantly
- Admin login. Only admins can change anything; everyone can watch
- Dark 3D UI, mobile-first with an app-style bottom navigation

## Run locally

```bash
npm install
```

```bash
npm run dev
```

Without Firebase keys in `.env`, the app runs in **Demo mode** (data saved in the browser only, login `admin` / `admin`).

---

## Firebase setup (about 5 minutes)

### 1. Create the project
1. Go to <https://console.firebase.google.com> and click **Create a project**.
2. Give it a name (e.g. `efootball-arena`). Google Analytics is not needed, so you can turn it off. Click **Create project**.

### 2. Add a web app and copy the config
1. On the project home page click the **`</>`** (Web) icon.
2. App nickname: anything (e.g. `web`). Firebase Hosting is **not** needed, so leave it unchecked. Click **Register app**.
3. You will see a `firebaseConfig` block. Copy the values into a file called `.env` in the project root:
   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=efootball-arena.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=efootball-arena
   VITE_FIREBASE_STORAGE_BUCKET=efootball-arena.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
   ```
   These values are not secret. They identify the project, and access is protected by the security rules below.

### 3. Turn on login
1. Left menu → **Build → Authentication** → **Get started**.
2. **Sign-in method** tab → **Email/Password** → Enable → Save.
3. **Users** tab → **Add user**:
   - Email: `yourname@efootball.local` (you can then log in with just `yourname`), or any real email
   - Password: at least 6 characters
4. Copy the **User UID** shown in the users list. You need it in step 5.

### 4. Create the database
1. Left menu → **Build → Firestore Database** → **Create database**.
2. Pick a location close to you (e.g. `asia-south1` Mumbai or `asia-southeast1` Singapore) → **Start in production mode** → Create.
3. Open the **Rules** tab, replace everything with the contents of [`firestore.rules`](firestore.rules), and click **Publish**.

### 5. Make yourself an admin
1. Firestore → **Data** tab → **+ Start collection**.
2. Collection ID: `admins` → Next.
3. Document ID: paste your **User UID** from step 3. You can leave the field empty or add `name` = your name. Click **Save**.

Repeat steps 3.3 and 5 for every extra admin.

> If you log in and the home page says *"Your account is not an admin yet"*, it shows your UID with a copy button. Add that UID to `admins`.

### 6. Restart the app
Stop `npm run dev` and start it again so it picks up the `.env` file.

---

## Deploy to Vercel
1. Push the project to GitHub (`.env` is git-ignored, so the keys are not uploaded).
2. <https://vercel.com> → **Add New → Project** → pick the repo. Vercel detects Vite automatically.
3. **Environment Variables**: add all six `VITE_FIREBASE_*` values from your `.env`.
4. **Deploy**. `vercel.json` already handles page routing.
5. Firebase console → Authentication → **Settings → Authorized domains** → add your Vercel domain (e.g. `efootball-arena.vercel.app`).

## Player photos and the Hall of Fame
- Admins add a photo by tapping a player's picture in the **Players** tab. The image is cropped to a square and shrunk to about 30 KB in the browser.
- When a tournament finishes, a photo card with the **champion** and **runner-up** appears automatically on the home page (Hall of Fame) and on the tournament overview.
- Photos are stored in the `photos` collection. Remember to re-publish [`firestore.rules`](firestore.rules) after updating it.

## How data is stored
- `tournaments/{id}`: one document per tournament, with summary fields (`name`, `status`, `format`, `players`, `champion`, `updatedAt`, `version`) and `data`, the full tournament as JSON.
- `admins/{uid}`: the list of admin accounts.
- If two admins edit the same tournament at once, the version check stops one from overwriting the other, and the app reloads the latest version.
- Free Spark plan limits are 50k reads and 20k writes per day, far more than tournaments need.

## Project structure
```
firestore.rules            Security rules (paste into Firebase console)
src/lib/firebase.js        Firebase init
src/lib/api.js             Firestore / Auth data layer + demo mode
src/lib/engine.js          Fixtures, standings, bracket and progression logic
src/lib/suggest.js         Style suggestion by number of players
src/pages/                 Home, Login, Tournament
src/components/            Overview, Players, FormatSetup, Standings, Fixtures, MatchCard, Bracket, UI helpers
```
