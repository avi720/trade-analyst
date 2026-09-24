---
paths:
  - "lib/trade/ai-import/**"
  - "app/api/trades/ai-import/**"
  - "app/api/cron/ai-import-*/**"
---

# AI custom-Excel import (Pro)

Pro users upload an arbitrary-layout xlsx; Gemini maps or extracts it into `ManualLeg[]`, the
user reviews an editable preview, and confirm flows through `persistManualLegs`. Two
non-obvious constraints:

- **Timezone is never AI-inferred.** It's a required field at upload
  (`ExcelImportJob.sourceTimezone`), passed as a hard param to `finalizeLegs`. Excel carries no
  tz; a guess would break FIFO chronology.
- The job runs **off-Vercel** on a GitHub-Actions worker — see the `cron-and-workers` skill.
