# GitHub PR Tracker — PHOENIX Team

A dashboard that displays open pull requests for the PHOENIX team, with filtering, sorting, age tracking, and code owner approval status.

---

## Prerequisites

- **Python 3.11+**
- **Node.js 20+** (with npm)
- **Docker & Docker Compose** (for containerized deployment)
- **GitHub Personal Access Token** with `repo` and `read:org` scopes

---

## Quick Start (Docker Compose)

This is the simplest way to run the full application.

### 1. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in your values:

```env
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_ORG=your-github-org
GITHUB_REPO=your-repo-name
GITHUB_TEAM_SLUG=your-team-slug
```

### 2. Build and start

```bash
docker compose up --build
```

### 3. Access the application

- **Frontend:** http://localhost
- **Backend API:** http://localhost:8000/api/v1/health
- **API Docs (Swagger):** http://localhost:8000/docs

To stop:

```bash
docker compose down
```

---

## Local Development (without Docker)

For active development with hot-reload on both backend and frontend.

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your GitHub token and org details

# Run the development server
uvicorn app.main:app --reload --port 8000
```

The backend will be available at http://localhost:8000

- Swagger docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/v1/health

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server (proxies /api to backend on port 8000)
npm run dev
```

The frontend will be available at http://localhost:5173

> **Note:** The Vite dev server is pre-configured to proxy `/api` requests to `http://localhost:8000`, so both backend and frontend can run simultaneously without CORS issues.

---

## Testing the Application

### 1. Verify backend health

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:

```json
{
  "status": "healthy",
  "rate_limit": {
    "limit": 5000,
    "remaining": 4990,
    "reset_at": "2026-06-02T12:00:00Z"
  }
}
```

### 2. Fetch team members

```bash
curl http://localhost:8000/api/v1/team/members
```

### 3. Fetch open PRs

```bash
# All open PRs
curl "http://localhost:8000/api/v1/pull-requests"

# Only PRs targeting main branch
curl "http://localhost:8000/api/v1/pull-requests?branch_type=main"

# Sorted by author ascending
curl "http://localhost:8000/api/v1/pull-requests?sort_by=author&sort_order=asc"
```

### 4. Fetch PR detail

```bash
curl http://localhost:8000/api/v1/pull-requests/123
```

### 5. Frontend interaction

1. Open http://localhost:5173 (dev) or http://localhost (Docker)
2. The dashboard auto-refreshes every 2 minutes
3. Use the **All / Main / Feature** tabs to filter by branch type
4. Click column headers (Author, Age, Reviewers) to sort
5. Click any row to open the side drawer with full PR details
6. Click "Open in GitHub" to navigate to the PR on GitHub

---

## Project Structure

```
pr-tracker/
├── backend/
│   ├── app/
│   │   ├── config.py              # Pydantic settings (env vars)
│   │   ├── main.py                # FastAPI app entry point
│   │   ├── models/
│   │   │   ├── pr.py              # Response models
│   │   │   └── team.py            # Team member model
│   │   ├── routes/
│   │   │   ├── pull_requests.py   # PR endpoints
│   │   │   ├── team.py            # Team endpoint
│   │   │   └── health.py         # Health check endpoint
│   │   ├── services/
│   │   │   ├── github_client.py   # GitHub API client (httpx)
│   │   │   ├── pr_service.py      # Business logic
│   │   │   ├── team_service.py    # Team member resolution
│   │   │   └── codeowners.py      # CODEOWNERS parser
│   │   └── utils/
│   │       ├── time_helpers.py    # Age & staleness calculations
│   │       └── glob_matcher.py    # CODEOWNERS glob matching
│   ├── .env.example
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── api/client.ts          # API fetch functions
│   │   ├── components/dashboard/  # All UI components
│   │   ├── hooks/                 # React Query hooks
│   │   ├── lib/                   # Utilities & constants
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx                # Root component
│   │   ├── main.tsx               # Entry point
│   │   └── index.css              # Tailwind CSS config
│   ├── nginx.conf
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | Yes | — | GitHub PAT with `repo` + `read:org` |
| `GITHUB_ORG` | Yes | — | GitHub organization name |
| `GITHUB_REPO` | Yes | — | Repository name to track |
| `GITHUB_TEAM_SLUG` | Yes | — | Team slug (e.g., `phoenix`) |
| `TEAM_MEMBERS_FALLBACK` | No | `""` | Comma-separated usernames as fallback |
| `MAIN_BRANCH_STALENESS_DAYS` | No | `3` | Days before a main-branch PR is stale |
| `FEATURE_BRANCH_STALENESS_DAYS` | No | `2` | Days before a feature-branch PR is stale |
| `MAIN_BRANCH_PATTERNS` | No | `main,master,develop,release` | Branch patterns considered "main" |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, httpx, Pydantic v2 |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4, TanStack Query v5 |
| Deployment | Docker, nginx, docker-compose |

---

## Deactivating the Virtual Environment

When you're done working on the backend:

```bash
deactivate
```
