# IBKR integration

## IBRIT return codes seen outside IBKR's documented list

Keith's list (IBKR Reporting Integration) covers 1010 and 1050, 1052-1056. The live service also
sends others, handled in `ibrit-client.ts`: 1018, 1019, 1059, 1410, 1600.

### rc 1051: "Token is expired."

Undocumented, seen once, and **not handled**: it ends as a plain `ERROR`, which fails the cron,
not as `TOKEN_INVALID`.

What happened: a production token connected on 2026-10-19 at 09:12 UTC synced fine at 18:55 UTC,
then got 1051 at 23:20 UTC, about 14 hours in, although IBKR says tokens last a year. The IBKR
Portal showed the token as expired, with a renew button. The user renewed it and pasted the new
one into the broker tab on 2026-10-20; syncing resumed and the failure had not recurred by
2026-10-31.

The cause is unknown. Treating 1051 like 1052 was deliberately held back: the wording suggests a
different meaning (recognized but expired, versus wrong values), but nothing confirms it.

If it comes back: check the Portal and renew the token. Then ask
reportingintegration@interactivebrokers.com what 1051 means, for the full code list, and why a
one-year token expired within a day, before mapping it in the code.
