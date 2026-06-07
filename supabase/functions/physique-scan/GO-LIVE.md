# Physique Scanner — go-live (the commands I can't run for you)

Everything is coded, type-checked, and the app bundles. These steps flip it from
"compiles" to "actually works." Run from the repo root unless noted.

## 0. (Optional) Prove the AI works first — no deploy needed
Needs your Anthropic key + any full-body photo (and optionally a non-body image):
```bash
ANTHROPIC_API_KEY=sk-ant-... \
  deno run --allow-env --allow-read --allow-net \
  supabase/functions/physique-scan/integration_test.ts ~/Desktop/body.jpg ~/Desktop/mug.jpg
```
Expect the body photo to return `isBody:true` + a rank/muscles/weakPoints JSON, and
the non-body to return `isBody:false`. This is the single biggest unknown — it
confirms the prompt actually rates a body correctly. (Or paste me a key and I'll run it.)

## 1. Deploy the function
```bash
# install the Supabase CLI if you don't have it
brew install supabase/tap/supabase            # macOS

supabase login                                # opens browser
supabase link --project-ref tqjpgknkbfaayrjuwoet   # CORE project (from memory)

supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# optional model override (defaults to claude-sonnet-4-6):
# supabase secrets set PHYSIQUE_MODEL=claude-sonnet-4-6

supabase functions deploy physique-scan
```
Verify: `supabase functions list` shows `physique-scan`.

## 2. Install the app deps (already added to package.json)
```bash
cd apps/mobile && corepack pnpm install
```
(I already added `expo-file-system` + the TensorFlow deps and verified the app
still bundles with `expo export`.)

## 3. Run it on a device — needs a DEV CLIENT (not Expo Go)
expo-camera capture + TensorFlow native modules don't run in Expo Go.
```bash
cd apps/mobile
npx expo prebuild                # generates native projects
# then either:
npx expo run:ios                 # needs Xcode + a Mac
# or build a dev client with EAS:
npx eas build --profile development --platform ios
```
Open the app → Coach tab → "Physique Scan" (or Scan tab → Body) → consent →
camera → capture. It will: gate non-bodies on-device (MoveNet, falls back to the
server check if the GL backend can't init), call `physique-scan`, then show
rank · muscle map · weak points · routine, save the photo locally, and update
the Scan tab's "Your Physique" map + "Your Plan".

## Known runtime caveat
`tfjs-react-native` lists `expo-gl@^13` as a peer but SDK 52 ships `expo-gl@15`.
If the WebGL backend fails to init on-device, `detectFullBody` returns
`available:false` and the **server `isBody` check** does the gating — the feature
still works, you just lose the local pre-filter. If you want, pin `expo-gl@~13`
(may conflict with SDK 52) or leave 15 and rely on the server gate.
