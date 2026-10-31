# Public backend deployment

Runtime: Docker; Free plan; health check /healthz.
PUBLIC_ORIGIN must match the assigned HTTPS service URL without trailing slash. MAX_SESSIONS=1 on the current free instance.

No TEST_USERNAME or TEST_PASSWORD is used. Anonymous visitors receive a cryptographically random HttpOnly, Secure, SameSite=Strict session cookie and a separate browser context. No official cookies are copied to visitors.

Limits: one active session on current hosting, six new sessions per minute globally, 120 requests per session per minute, 10 minute absolute lifetime and 2 minute inactivity timeout. Polling does not extend lifetime. Reload reuses the visitor's own session. A full server returns 429; it never hands out another visitor's context.

Official CAPTCHA and human verification remain user actions. This free single-instance service has limited concurrency and no distributed rate limiter; it is a bounded public pilot, not a high-traffic service. Health check success alone does not prove official result retrieval.
