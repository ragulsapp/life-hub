# Release signing (Play Store)

**Status (2026-11-27):** upload key created on the owner's laptop; CI is wired
to use it; the GitHub secrets are **not set yet**, so CI still builds only the
debug APK.

## Where the key is

`~/.life-mentor-signing/` (the owner's home folder) — deliberately **outside** the repo
and outside OneDrive.

| File | What |
| --- | --- |
| `upload.p12` | The upload key (PKCS12, alias `upload`, RSA 2048, valid to 2056). |
| `passwords.txt` | Its password. |
| `cert.pem` | Public certificate only (safe to share). |
| `upload-to-github.sh` | Puts the key into the repo's encrypted Actions secrets. |

**Back it up** (e.g. a pen drive or a password manager). With Play App Signing,
a lost *upload* key can be reset by Google support, but that takes days.

## Turning on signed builds

1. Run `bash ~/.life-mentor-signing/upload-to-github.sh` (needs `gh` signed in).
   It sets `RELEASE_KEYSTORE_BASE64`, `RELEASE_STORE_PASSWORD`,
   `RELEASE_KEY_PASSWORD`, `RELEASE_KEY_ALIAS`.
2. The next push to `main` also builds `life-mentor-release-aab` — download it
   from that run's **Artifacts** and upload it in Play Console.
3. In Play Console, accept **Play App Signing** (Google keeps the real app
   signing key; this file is only the upload key).

## Version numbers

`versionCode` = the CI run number, so each build is higher than the last
(Play requires it). Local builds fall back to 2. `versionName` stays "1.0"
until there is a reason to change it.

## Note for the sideloaded APK

Play-installed and sideloaded copies are signed with different keys. Moving
from the debug APK to the Play version means **backup → uninstall → install
from Play → restore**. Do the backup first.
