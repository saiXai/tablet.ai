# Strategic Evaluation: BYOK vs. Standalone Product for tablet.ai

**Decision Context:** Deciding whether `tablet.ai` should require users to supply their own LLM API keys (BYOK \- Bring Your Own Key) or operate as a fully managed, standalone subscription/freemium product.

---

## 1\. Executive Summary & Verdict

> **Direct Recommendation: Build as a Managed Standalone Product (with optional BYOK developer toggle if desired, but not as the primary model).**

A consumer-facing health adherence product lives and dies by **friction**. The primary value proposition of `tablet.ai` is removing the cognitive overhead of manual scheduling. Requiring non-technical patients, sick individuals, or caregivers to create an OpenAI/Anthropic developer account, attach a credit card, generate an API secret, and paste it into an app will destroy your activation funnel ($>95\%$ drop-off).

Furthermore, the unit economics of vision extraction are cheap enough that a standard freemium or low-cost subscription model easily covers inference costs.

---

## 2\. Comparative Matrix

| Dimension | Bring Your Own Key (BYOK) | Managed Standalone Product | Winner |
| :---- | :---- | :---- | :---- |
| **Target Audience & Reach** | Developers, tech enthusiasts, tinkerers ($\approx 2-5\%$ of target market) | General consumers, patients, elderly caregivers, families ($100\%$ of market) | **Standalone** |
| **Onboarding Friction** | Extreme (OpenAI/Anthropic account setup, billing tier setup, copy-pasting API keys) | Zero (Snap a photo, verify, start receiving reminders) | **Standalone** |
| **Cost to Operator** | $\$0$ LLM inference cost; minimal database/hosting cost | Operator absorbs LLM API bills (\~$\$0.005$ to $\$0.015$ per bill scanned) | **BYOK** |
| **Notification Reliability** | Dependent on user’s credit balance (if user's key runs out of funds, reminders fail) | $99.9\%$ SLA; predictable server-side execution | **Standalone** |
| **Monetization Potential** | Hard to monetize (one-off app sale or donation); high churn | Recurring revenue ($MRR$ via Subscriptions, Family Plans, B2B Clinics) | **Standalone** |
| **Support Overhead** | High ("Why does my key say rate-limited / quota exceeded?") | Standard product bug triage | **Standalone** |
| **Regulatory & Trust** | Lower liability (user interacts directly with AI vendor) | Requires clear HIPAA/GDPR disclaimers & zero-retention policies | **BYOK** |

&nbsp;

---

## 3\. Financial Reality Check: Unit Economics

Let’s look at the actual cost of multimodal extraction per user:

* **Model Used:** OpenAI `gpt-4o-mini` or Anthropic `claude-3-5-haiku` with vision.  
* **Token footprint per scan:**  
  * Image resolution: $1024\times 1024\approx 1,500$ input tokens.  
  * System prompt & JSON schema: $\approx 800$ tokens.  
  * Structured output payload: $\approx 400$ tokens.  
* **Blended Cost per Scan:** $$\text{Cost per Scan} \approx \$0.003 - \$0.008\text{ USD}$$

### Scenario A: Acute Illness User (e.g., Post-Surgery / Antibiotics)

* Scans: 1 to 2 bills per month.  
* Total LLM cost: $\approx \$0.01$ to $\$0.02$ per month.

### Scenario B: Chronic Regimen User

* Scans: 1 bill every 30 or 90 days.  
* Total LLM cost: $\approx \$0.008$ per month.

**Takeaway:** The cost to process a receipt is a fraction of a cent. Absorbing this cost is trivially sustainable, especially compared to the customer acquisition friction of BYOK.

---

## 4\. Deep Dive: Why BYOK Breaks the Core Persona

Reviewing the personas established in the PRD:

1. **Acute Recovery Patient:** Sick in bed with a fever or recovering from surgery. Asking them to look up an API key while holding a prescription slip is unusable.  
2. **Elderly Caregiver:** Often less technical. They need a simple tool that just works so they can set up mom or dad's pills in 60 seconds.  
3. **Telegram Users:** Telegram notifications are valued for seamless conversational simplicity. If an alert fails because the user's Anthropic credit card expired, the core product promise (health compliance) breaks down completely.

---

## 5\. Recommended Strategic Compromise (Phased Approach)

If you are bootstrapping with zero capital or testing prototypes, you don't have to choose 100% black-or-white immediately:

```
┌────────────────────────────────────────────────────────┐
│                   Phase 1: MVP / Beta                  │
│  Offer 5 Free Bill Scans per user (Sponsored by you).  │
│  Total cost for 1,000 beta users: ~$25 - $40 total.    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                Phase 2: Freemium Launch                │
│  • Free Tier: 2 scans / month + Telegram Reminders.    │
│  • Pro Tier ($2.99/mo or $19.99/yr): Unlimited scans,  │
│    Caregiver shared access, refilling alerts.          │
│  • Developer Settings: "Use Custom API Key" option     │
│    tucked away in Advanced Settings for tech nerds.    │
└────────────────────────────────────────────────────────┘
```

&nbsp;

### Why this hybrid works:

1. **Unblocked Onboarding:** $99\%$ of ordinary users experience magic on day one without knowing what an API key is.  
2. **Developer Goodwill:** Power users who want to use their own open-source models or enterprise Anthropic keys can paste their key under `Settings > Advanced > Custom Engine`.  
3. **Predictable Monetization:** A single $\$2.99$ monthly subscription provides $>95\%$ gross margins over LLM compute costs.

---

## 6\. Decision Matrix Checklist

Before making your final call, run through these 4 gut-check questions:

- [ ] **Is the primary user persona technical?** (For `tablet.ai`: **No**, general consumer/healthcare).  
- [ ] **Is the marginal cost per interaction high?** (For video/audio generation: Yes. For receipt OCR: **No, \< 1 cent**).  
- [ ] **Does user retention require persistent automated tasks?** (**Yes**, Telegram/Push nudges must fire reliably without key expiration).  
- [ ] **Do you plan to build a B2C or B2B brand?** (**Yes**, health apps require cohesive trust and end-to-end polish).

**Conclusion:** Go **Standalone**. Build the managed experience, budget a tiny credit reserve for free beta scans, and keep the user experience as frictionless as snapping a receipt photo.