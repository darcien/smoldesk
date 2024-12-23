# Inbox

- `deno.lock` is inconsistent when run in NixOS vs MacOS.
  - see https://github.com/denoland/deno/issues/19512
  - using `"vendor": true` gives `Importing from the vendor directory is not permitted. Use a remote specifier instead or disable vendoring`
    error in editor from LSP.
- PTO specific functionality are missing.
- make heartbeat optional
