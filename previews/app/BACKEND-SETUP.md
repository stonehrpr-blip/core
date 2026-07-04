# CORE — Backend Setup

The CORE preview ships with **two backends** behind one API. By default it
uses a **localStorage simulator** that's good enough for design previews but
isn't a real server. When you're ready, follow this guide to switch on a
**real Supabase backend** so sign-ins persist across devices and email-OTP
actually emails people.

Once you're done, every sign-in surface — Apple, Google, and email-OTP —
will round-trip a real auth flow and store profiles in a real Postgres
table. No other code changes needed.

---

## What you'll need

- 5 minutes for the email-OTP setup (everything below the "MINIMUM" line)
- An **Apple Developer Program** account (US$99/year) to enable Sign In with
  Apple. Optional — skip if you don't have one yet, the Apple button will
  show an error until configured.
- A **Google Cloud Console** project for Sign In with Google. Optional —
  same deal as Apple.

---

# MINIMUM — turn on real email-OTP (~5 min)

## 1. Create a Supabase project

1. Go to <https://supabase.com> and sign up (free).
2. New project → name it `core` → pick a region close to you → wait ~2 min
   for it to provision.
3. Once it's ready, open **Project Settings → API**. Note these two values:
   - **Project URL** (looks like `https://abcdefghij.supabase.co`)
   - **anon public** key (a long JWT string)

The `anon` key is safe to ship in client code — Row Level Security policies
on the database protect the data. **NEVER paste the `service_role` key here.**

## 2. Paste the keys into the preview config

Open `previews/_lib/core-config.js` and fill in:

```js
window.CORE_CONFIG = {
  SUPABASE_URL: "https://abcdefghij.supabase.co",  // your project URL
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiI…",         // your anon key
  OAUTH_REDIRECT_URL: (location.origin || "http://localhost:8000") + "/04-sign-in.html",
};
```

That's it for credentials. Save the file.

## 3. Apply the database schema

In the Supabase dashboard, open **SQL Editor → New query**, paste this in,
and click **Run**.

```sql
-- profiles table — extends Supabase Auth's auth.users with our app data
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  onboarded boolean not null default false,
  trial_state jsonb,
  completed_trial_at timestamptz,
  signed_in_with text,
  signed_in_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Row Level Security — users can only read/write their own row
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth.users row is inserted
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, ''), '@', 1),
      'New user'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## 4. Enable Email auth

In the Supabase dashboard:

1. **Authentication → Providers → Email**.
2. Toggle **Enable Email provider** on.
3. Under **Email OTP** (sometimes called "Magic Link"), set **"Confirm email" off** if you want sign-in to work without an inbox click (OTP-only).
4. Optional: under **Authentication → Email Templates → Magic Link**, customize the email body. The default works for testing.

Supabase's free tier sends emails via its built-in SMTP (rate-limited but
fine for early use). For production you'll want to plug in your own SMTP
provider (Resend, Postmark, SendGrid) at **Authentication → SMTP Settings**.

## 5. Add your localhost URL to the redirect allowlist

In the Supabase dashboard:

1. **Authentication → URL Configuration**.
2. **Site URL** — `http://localhost:8000` (or your prod URL).
3. **Redirect URLs** — add `http://localhost:8000/04-sign-in.html` (and your prod equivalent).

Without this, Supabase rejects the OAuth round-trip with a redirect error.

## 6. Test it

1. Restart your local web server (so it serves the updated `core-config.js`).
2. Open `http://localhost:8000/04-sign-in.html` in a fresh Incognito window.
3. Tap **Use email instead** → enter a real email → tap Send code.
4. Check your inbox (incl. spam) for the OTP.
5. Enter the 6-digit code → you'll land on `07-trial.html` (because no
   profile is marked onboarded yet).
6. Finish the trial → land on `20-dashboard.html`.
7. Sign out (or clear `core.accounts.v1` from localStorage), sign back in
   with the same email → this time you should land straight on dashboard.

If steps 3-5 work, the real backend is live. ✓

---

# OPTIONAL — turn on Sign In with Apple

You need an **Apple Developer Program** membership for this
(<https://developer.apple.com/programs/>, US$99/year).

## 1. Apple Developer side

1. <https://developer.apple.com/account/resources/identifiers/list> →
   create an **App ID** (e.g. `com.harperlinks.core`). Enable
   **Sign In with Apple** capability.
2. Create a **Services ID** (e.g. `com.harperlinks.core.web`). Enable
   **Sign In with Apple** on it. Configure:
   - **Primary App ID** — point at the App ID from step 1.
   - **Domains and Subdomains** — your Supabase project domain
     (`abcdefghij.supabase.co`).
   - **Return URLs** —
     `https://abcdefghij.supabase.co/auth/v1/callback`
3. Create a **Key** for Sign In with Apple. Download the `.p8` file (you
   only get to download it ONCE — save it carefully). Note the Key ID and
   your Team ID.

## 2. Supabase side

In the Supabase dashboard:

1. **Authentication → Providers → Apple** → toggle on.
2. Fill in:
   - **Services ID** — the Services ID you created (NOT the App ID).
   - **Team ID** — from your Apple Developer account header.
   - **Key ID** — from the key you created.
   - **Secret Key (.p8 contents)** — paste the entire contents of the `.p8`
     file (including `-----BEGIN PRIVATE KEY-----` and END lines).
3. Save.

After this, tapping **Continue with Apple** on `04-sign-in.html` will
redirect to Apple's real sign-in, then back to your preview with a session.

---

# OPTIONAL — turn on Sign In with Google

## 1. Google Cloud side

1. <https://console.cloud.google.com> → create a project (e.g. "Core auth").
2. **APIs & Services → OAuth consent screen**:
   - Type **External**.
   - Fill in app name `Core`, support email = `corestudiosupport@gmail.com`,
     developer contact = same.
   - Add scopes: `userinfo.email`, `userinfo.profile`, `openid`.
   - Save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins** — `https://abcdefghij.supabase.co`
   - **Authorized redirect URIs** —
     `https://abcdefghij.supabase.co/auth/v1/callback`
   - Save → note the **Client ID** and **Client secret**.

## 2. Supabase side

1. **Authentication → Providers → Google** → toggle on.
2. Paste **Client ID** and **Client Secret**. Save.

Now **Continue with Google** on the sign-in page works.

---

# How the code decides which backend to use

`_lib/core-config.js` exposes `window.CORE_BACKEND_READY` — true when both
`SUPABASE_URL` and `SUPABASE_ANON_KEY` are non-empty. The accounts module
checks this flag on every call:

| Call                              | LOCAL (no Supabase)           | SUPABASE (configured)                         |
|-----------------------------------|--------------------------------|------------------------------------------------|
| `signInWithEmailOtp(email)`       | throws — email-OTP needs server | sends a real OTP email via Supabase Auth      |
| `verifyEmailOtp(email, token)`    | throws                          | verifies the code, returns the session         |
| `signInWithOAuth('apple')`        | throws                          | redirects to Apple, comes back with a session  |
| `signInWithOAuth('google')`       | throws                          | redirects to Google, comes back with a session |
| `current()`                       | reads localStorage              | reads Supabase profiles table                  |
| `updateCurrent(fn)`               | writes localStorage             | writes Supabase profiles table                 |

In LOCAL mode the sign-in page falls back to the Face ID / Google-picker
demo sheets (so you can still walk the visual flow without a backend).

---

# Cost summary

- **Supabase free tier** — 50K monthly active users, 500 MB DB, 1 GB file
  storage, 50K Auth users. More than enough for early use.
- **Apple Developer Program** — US$99/year. Required for Sign In with
  Apple, App Store distribution, and a few other things you'll eventually
  need anyway.
- **Google Cloud OAuth** — free for normal volumes (rate limits apply at
  scale).
- **SMTP for email** — Supabase's built-in works for testing. For
  production, Resend's free tier (100 emails/day) or Postmark trial works
  out of the box.
- **Hosting** — separate from backend. If you serve the previews from
  Vercel / Netlify / Cloudflare Pages, they're free for this kind of
  traffic.

Total to start: **$0** (email-OTP only).
Total for full real auth: **$99/year** for Apple Developer.

---

# What's still TODO before launch

1. Replace the `auto-create profile trigger` with a one-time migration if
   you ever change the profile schema (otherwise existing users won't get
   the new fields).
2. Configure a real **SMTP provider** so emails don't hit Supabase's rate
   limit.
3. Add your **prod redirect URL** to the Supabase URL Configuration once
   you have a live domain.
4. Tighten the OAuth scopes — Google's defaults are usually enough.
5. Add a privacy review for the Apple Sign In "hide my email" relay
   address — Apple may give you a `…@privaterelay.appleid.com` instead of
   the user's real email.
6. Subscription / payment integration (RevenueCat, App Store / Play
   billing). Not covered by this setup.
