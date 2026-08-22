# Privacy Policy

**Last updated:** July 4, 2026

Luniq ("the app", "we") is a free, open-source desktop music player built on top of Spotify's internal APIs and YouTube Music. This document explains what data the app accesses, what it stores, and what it never does.

---

## What Data Luniq Accesses

### Spotify Account Data
Luniq uses your Spotify session cookies (`sp_dc`, `sp_t`) and access token to:
- Fetch your playlists, liked songs, and library
- Stream 30-second audio previews via Spotify's internal preview API
- Retrieve track metadata, lyrics, artist info, and canvas videos
- Follow/unfollow artists and save/unsave tracks on your behalf (only when you click the relevant button)
- Fetch your recently played history for the Queue History tab

This data is sent **directly to Spotify's servers** — Luniq does not proxy, intercept, or store it.

### YouTube / YouTube Music Data
Luniq resolves full-length audio streams by querying YouTube Music on your behalf. Your IP address and a standard browser User-Agent are used to make these requests. No YouTube account login is required or used.

---

## What Data Luniq Stores Locally

All data is stored **only on your device** using `electron-store` (a local JSON file). This includes:

- **Settings** — audio quality, playback device, theme, language, equalizer settings
- **Spotify session tokens** — stored locally so you stay logged in between sessions
- **Stream URL cache** — temporary, expires automatically
- **Download history** — tracks you have downloaded, stored as local audio files in a folder you choose
- **Queue & autoplay state** — restored on app restart
- **Recently played history** — synced from Spotify and cached locally

None of this data is ever uploaded to any server controlled by the Luniq developers.

---

## What Luniq Does NOT Do

- ❌ Does not collect analytics or telemetry
- ❌ Does not send your data to any Luniq-operated server
- ❌ Does not store your Spotify password (authentication is handled entirely by Spotify's own login page)
- ❌ Does not sell, share, or monetize any user data
- ❌ Does not track usage, crashes, or behavior

---

## Third-Party Services

| Service | Purpose | Their Privacy Policy |
|---|---|---|
| Spotify | Music metadata, library, previews, authentication | [spotify.com/privacy](https://www.spotify.com/privacy) |
| YouTube / YouTube Music | Full-length audio streaming | [policies.google.com/privacy](https://policies.google.com/privacy) |
| Discord | Rich Presence (optional, only if Discord is running) | [discord.com/privacy](https://discord.com/privacy) |
| GitHub | App updates, yt-dlp binary downloads | [docs.github.com/en/site-policy/privacy-policies](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) |

---

## Children's Privacy

Luniq is not directed at children under the age of 13. We do not knowingly collect any data from children.

---

## Changes to This Policy

If this policy changes materially, the "Last updated" date at the top will be revised and a note will be added to the [CHANGELOG](./CHANGELOG.md).

---

## Contact

For privacy concerns, open an issue at:
**[github.com/saraansx/Luniq-Music/issues](https://github.com/saraansx/Luniq-Music/issues)**
