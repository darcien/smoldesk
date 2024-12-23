# smoldesk

Unofficial Discord bridge for [kodesk](https://github.com/kodefox/kodesk/).

## What is this?

This is a script that fetch employees availability from kodesk and notify
the other team members via Discord webhook if there are any unavailability
at the day.

## Why?

I thought it would be nice to be notified about teammates unavailabilities
via the usual chat.

## How to run?

You need deno installed globally and you must have login access to Kodesk.

- `cp .env.example .env`
- Replace the example value in `.env` with actual value
- (Optional) `deno task schema` to generate JSON schema for the webhook config
- `cp webhooks.example.json webhooks.json`
- Replace example value in `webhooks.json` with your webhook details
- `deno task blast` to run the script
  (or `deno task blast:dry` for dry run without sending actual webhook)

## How does it work?

TBA.

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
