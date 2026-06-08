# Example: Agent using browser-base

## Scenario

**Task:** Research competitor pricing for a project management tool startup.

User tells pi agent:
> "I need to understand the pricing landscape for project management tools. Research Linear, Notion, and Asana. Find their pricing tiers, features, and any free trial details. Present as a comparison table."

---

## Step-by-step flow

### Phase 1: Setup (one-time)

Before the agent can use browser-base, contexts need to be created and pre-logged:

```bash
# Agent runs this once
browse-local context create linear
browse-local context create notion
browse-local context create asana

# User pre-login (done once manually)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/linear"
# → Opens Chrome, user logs into Linear, closes Chrome

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/notion"
# → Opens Chrome, user logs into Notion, closes Chrome

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/browser-context/asana"
# → Opens Chrome, user logs into Asana, closes Chrome
```

Now the agent can use these contexts. The logins persist forever.

---

### Phase 2: Agent execution

Agent starts working on the task:

```
Agent: I'll research each competitor systematically. Let me start with Linear.
```

**Research Linear:**

```javascript
// Agent calls browser tool
browser use-context linear
// → Switches to Linear context, starts Chrome if not running

browser navigate to https://linear.app/pricing
// → Opens Linear pricing page

browser observe "find pricing section"
// → Returns: [
//     { selector: "[data-testid='pricing-card-free']", description: "Free plan card" },
//     { selector: "[data-testid='pricing-card-pro']", description: "Pro plan card" },
//     { selector: "[data-testid='pricing-card-enterprise']", description: "Enterprise plan card" }
//   ]

browser act "click on the Pro plan card"
// → Stagehand interprets, clicks the element

browser extract "get all pricing tiers with name, price, currency, and included features"
// → Returns structured JSON:
// {
//   "plans": [
//     { "name": "Free", "price": 0, "currency": "USD", "period": "month", "features": [...] },
//     { "name": "Pro", "price": 8, "currency": "USD", "period": "user/month", "features": [...] },
//     { "name": "Enterprise", "price": null, "currency": null, "period": "custom", "features": [...] }
//   ]
// }
```

**Research Notion:**

```javascript
browser use-context notion
browser navigate to https://notion.so/pricing
browser act "click on the Plus plan"
// → Clicks the pricing tier

browser extract "get all pricing tiers with name, price, and features"
// → Returns: { "plans": [...] }
```

**Research Asana:**

```javascript
browser use-context asana
browser navigate to https://asana.com/pricing
browser act "scroll to pricing section"
browser extract "get all pricing tiers with name, price, and features"
// → Returns: { "plans": [...] }
```

---

### Phase 3: Synthesis

Agent combines all extracted data:

```javascript
// Agent combines results:
const competitors = {
  linear: { plans: [...] },
  notion: { plans: [...] },
  asana: { plans: [...] }
};

// Creates comparison table:
const table = `
| Feature | Linear | Notion | Asana |
|---------|--------|--------|-------|
| Free tier | ✓ (Up to 250 entities) | ✓ (Unlimited blocks) | ✓ (Up to 15 users) |
| Pro/Plus | $8/user/mo | $8/user/mo | $10.99/user/mo |
| Enterprise | Custom | $15/user/mo | Custom |
| Free trial | 30 days | 14 days | 30 days |
`
```

---

## Why browser-base is necessary here

### What traditional approaches miss:

| Approach | Limitation |
|----------|------------|
| Web search API | Can't access logged-in pages, no interactivity |
| Static scraping | Can't handle JS-rendered pages, forms, auth |
| Screenshot APIs | Can't extract structured data, only images |

### What browser-base enables:

| Capability | Example |
|------------|---------|
| Persistent logins | Agent researches multiple times, no re-login |
| Interactive pages | Click, scroll, fill forms |
| Structured extraction | Returns JSON, not HTML |
| Multiple contexts | Separate logins for different services |
| LLM interpretation | "Click the pricing button" works on any site |

---

## Another example: Form automation

**Task:** Apply to 10 jobs on a job board.

```javascript
// Agent logs into job board once (in a context)
browser use-context jobs
browser navigate to https://jobs.example.com
browser act "click sign in"
browser act "enter email and password"
browser act "click submit"

// Now agent can apply to multiple jobs
for (const job of jobs) {
  browser navigate to job.url
  browser act "click apply button"
  browser act "upload resume from /path/to/resume.pdf"
  browser act "fill in cover letter"
  browser act "click submit application"
}
```

The agent stays logged in throughout. Each context is isolated.

---

## Example: Data extraction from dynamic pages

**Task:** Track product prices from an e-commerce site.

```javascript
browser use-context price-tracker
browser navigate to https://shop.example.com/products/123

// Agent can extract structured data even from complex pages
browser extract "get product name, current price, original price, discount percentage, availability, and reviews count"
// → Returns:
// {
//   "name": "Widget Pro",
//   "currentPrice": 79.99,
//   "originalPrice": 99.99,
//   "discount": "20%",
//   "availability": "In Stock",
//   "reviews": { "count": 1247, "average": 4.5 }
// }

// Agent can repeat this daily to track price changes
```

---

## Error handling

When something goes wrong, the agent can debug:

```javascript
browser status
// → { active: true, currentContext: "linear", availableContexts: [...] }

browser observe "find the error message"
// → If there's an error on page, returns the element

browser act "click the retry button"
// → Attempts to recover from error
```

---

## Key principles

1. **Contexts persist** — Pre-login once, use forever
2. **Structured output** — Extract returns JSON, not raw HTML
3. **Natural language** — "Click the submit button" works on any site
4. **Isolated sessions** — Each context is a separate Chrome profile
5. **LLM-powered** — Stagehand interprets page and actions