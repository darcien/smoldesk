# smoldesk

Unofficial Discord bridge for [kodesk](https://github.com/kodefox/kodesk/).

## What is this?

This is a script that fetch employees PTO and sick leaves from kodesk,
and if new ones are found, send messages to Discord text channel.

## Why?

I thought it would be nice to be notified about teammates unavailabilities
via the usual chat.

## Caveats

- ~~Hardcoded project id makes it impossible to configure
  different webhook URL for different project.~~
  Config file is now implemented to support this.
- No retry mechanism when sending webhook failed.
- No updates to sent notification if data is updated (e.g. canceled after approved).
- Rely on long lived refresh token to keep running.
  - Unpublished script available for retrieving token using browser automation,
    but it's slow.
  - Maybe decode configured token first, and check expiry to automate token retrieval.
