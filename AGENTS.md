# Architecture rules

- Keep shopper sale detection and WhatsApp order formatting in a shared pure module with focused tests, so alerts and order summaries remain independently verifiable.

- Load optional Google Analytics and Meta scripts through the consent-gated analytics module, never unconditional HTML snippets, so declining cookies prevents tracking requests.