# n8n Blog Content Automation Pipeline

This folder contains the deployment configuration and workflow documentation for the AI-powered blog content automation pipeline.

## Overview

The pipeline automates blog content generation using:
- **Hacker News API** — Free source of tech stories (no API key needed)
- **Gemini 2.0 Flash** — Two AI calls per article (merged Research+Outline, then Writer+FactCheck+SEO)
- **n8n** — Workflow automation orchestrator
- **FutureStack Backend** — Secure internal endpoint for saving blog posts

## Deployment on Render

### Build Command
```bash
npm install -g n8n
```

### Start Command
```bash
n8n start
```

The `n8n start` command will automatically start the n8n server and make the UI available at `http://localhost:5678` (or your configured host).

## Required Environment Variables

Copy `.env.example` and fill in the real values:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values:

| Variable | Description | Example |
|---|---|---|
| `N8N_HOST` | The hostname for n8n server | `0.0.0.0` or your Render URL |
| `WEBHOOK_URL` | Base URL for webhooks | `https://your-service.render.com/` |
| `N8N_BASIC_AUTH_ACTIVE` | Enable basic auth | `true` |
| `N8N_BASIC_AUTH_USER` | Username for basic auth | `admin` |
| `N8N_BASIC_AUTH_PASSWORD` | Password for basic auth | `StrongPassword123` |
| `GEMINI_API_KEY` | Google AI Studio API key | `AIza...` |
| `FUTURESTACK_BLOG_API_KEY` | API key for `/internal/articles` endpoint | `sk-live-...` |
| `FUTURESTACK_BACKEND_URL` | Backend service URL | `https://backend.onrender.com` |

## Workflow Description

Build the following workflow visually in the n8n editor (UI):

### 1. Cron Trigger Node
- **Type**: Cron
- **Schedule**: Daily, once (e.g., 8:00 AM)
- **Configuration**: `0 8 * * *` (daily at 8 AM)

### 2. HTTP Request node — Hacker News
- **Method**: GET
- **URL**: `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=15`
- **Authentication**: None (public API)
- **Purpose**: Fetch recent Hacker News stories

### 3. Code/Function node — Filter & Select Best Story
- **Purpose**: Filter results to tech-relevant stories, pick the single highest-`points` story
- **Output**: `{ topic: item.title, url: item.url }`

### 4. HTTP Request node (Gemini Call #1 — Research + Outline)
- **Method**: POST
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={{GEMINI_API_KEY}}`
- **Body**: A single prompt instructing Gemini to research the given topic and return ONLY valid JSON:
  ```json
  {
    "research": ["fact1","fact2",...],
    "outline": ["H2 heading 1","H2 heading 2",...]
  }
  ```
- **Settings**: `generationConfig.maxOutputTokens` ~600, `temperature` ~0.4

### 5. Code node — Parse Gemini Response #1
- **Purpose**: Parse JSON out of Gemini's response (`candidates[0].content.parts[0].text`)
- **Action**: Strip markdown code fences if present

### 6. HTTP Request node (Gemini Call #2 — Writer + FactCheck + SEO)
- **Method**: POST
- **URL**: Same as Call #1
- **Model**: `gemini-2.0-flash`
- **Prompt**: Given the research + outline JSON from the previous step, "Write a complete blog article (800–1200 words) in Markdown following this outline. Self-verify every factual claim against the provided research before including it. Then produce SEO metadata." Return ONLY valid JSON:
  ```json
  {
    "title": "...",
    "content": "...(markdown)...",
    "metaDescription": "...(under 160 chars)...",
    "tags": ["tag1","tag2","tag3"]
  }
  ```
- **Settings**: `maxOutputTokens` ~2000, `temperature` ~0.6

### 7. Code node — Parse Gemini Response #2
- **Purpose**: Parse JSON out of the second Gemini response

### 8. HTTP Request node (Publish to FutureStack)
- **Method**: POST
- **URL**: `{{FUTURESTACK_BACKEND_URL}}/internal/articles`
- **Headers**: 
  - `x-api-key: {{FUTURESTACK_BLOG_API_KEY}}`
  - `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "title": "...",
    "content": "...",
    "metaDescription": "...",
    "tags": ["tag1","tag2","tag3"],
    "sourceTopic": "<the HN story title>"
  }
  ```

### 9. (Optional) Error Handling
- Add an n8n "Error Trigger" workflow that sends a Telegram/email notification if any node in the main workflow fails

## Post-Workflow

After building the workflow in the n8n UI:
1. Click **Execute Workflow** to test
2. Click **Export** → **Download JSON**
3. Save the JSON to `n8n-pipeline/workflows/blog-pipeline.json` for version control

## Security Notes

- The `/internal/articles` endpoint is protected by an API key (`x-api-key` header)
- The key is configured in `FUTURESTACK_BLOG_API_KEY` env var
- Never expose the Gemini API key in client-side code
- The n8n service should not be publicly accessible; use Render's private networks or firewall rules

## License

MIT