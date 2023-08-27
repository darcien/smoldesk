# smoldesk

Unofficial Discord bridge for [kodesk](https://github.com/kodefox/kodesk/).

## What does this do?

1. Fetch user PTO and availability availability data from kodesk, authenticated as the configured token.
2. If new PTO or unavailability is found, send notification messages Discord channels via webhook.
3. Save found data in local db.json to avoid sending same notification more than once.

## Caveats

- Hardcoded project id makes it impossible to configure different webhook URL for different project.
  - This can be solved by implementing a config file.
- No retry mechanism when sending webhook failed.
- No updates to sent notification if data is updated (e.g. canceled after approved).
- Rely on long lived refresh token to keep running.
  - Unpublished script available for retrieving token using browser automation,
    but it's slow.
  - Maybe decode configured token first, and check expiry to automate token retrieval.
