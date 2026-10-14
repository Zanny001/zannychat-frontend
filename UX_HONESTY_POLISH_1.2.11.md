# UX honesty polish — release 1.2.11

- Help no longer opens a guaranteed-invalid `support@zannychat.example` address. A real support address can be set through `EXPO_PUBLIC_SUPPORT_EMAIL`; when it is not configured, the screen explains that support contact is unavailable in this build.
- The QR contact row no longer looks tappable or claims scanning will ship in the next build. It is a visibly disabled informational row; the existing contact list and group creation remain available.

This is deliberately honest placeholder handling, not a claim that QR scanning or a support operation has been implemented.
