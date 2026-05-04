# Brain Fart Mobile Web v0.01

A mobile-first Paper & Ink web app version of Brain Fart.

## What this is

This is a PWA-style web app. It runs in Android Chrome and can be added to your home screen like an app.

No Python. No Buildozer. No APK build.

## Features

- Idea list
- Add/edit ideas
- Idea name
- Description
- Materials
- Stage
- Sketch image upload
- Main sketch thumbnail
- List-screen sketch browser
- Previous/Next sketch buttons
- Local browser storage
- Offline app shell via service worker

## How to run on your computer

Open `index.html` in a browser.

For best PWA/offline behavior, serve the folder locally:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## How to run on Android

The easiest way is to put this folder online somewhere, then open the link on your phone.

Options:
- GitHub Pages
- Netlify
- Vercel
- Your own web hosting
- Local network server from your PC

Then on Android Chrome:

1. Open the site.
2. Tap the three-dot menu.
3. Tap **Add to Home screen**.
4. Launch Brain Fart from your home screen.

## Important storage note

Ideas and sketches are stored locally in the phone browser using `localStorage`.

This is simple and fast, but:
- clearing browser data will delete app data
- large sketch collections may eventually hit browser storage limits

A future version can use IndexedDB for stronger image storage and export/import backups.
