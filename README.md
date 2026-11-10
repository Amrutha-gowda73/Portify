# Portify

Portify is a full-stack portfolio builder that helps developers create polished portfolio sites with templates, AI-assisted content generation, and a publishable public portfolio flow.

## Features

- User registration and authentication
- Portfolio dashboard with draft and published states
- Six portfolio templates with a live editor preview
- Publishable public portfolio websites at `/public/:slug`
- Standalone HTML export using the current saved portfolio content
- AI Portfolio Assistant that interviews users, tracks profile completeness, and creates editable content in four writing styles
- AI chatbot for portfolio, career, education, and programming guidance with contextual conversation history
- AI-assisted project descriptions
- GitHub profile lookup and public repository import
- Resume PDF selection and Google Drive shared-link import
- Profile and project photo uploads
- In-app publishing flowchart, GitHub Pages deployment guide, and help chatbot
- MongoDB persistence for user accounts and portfolios
- Responsive and accessible design

## Tech stack

- Frontend: React + Vite + React Router + CSS
- Backend: Node.js + Express + JWT + rate limiting
- Database: MongoDB via Mongoose
- Authentication: bcryptjs + JSON Web Tokens
- Other: axios, helmet, cors, express-validator, multer

## Project structure

```text
portify/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── backend/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── .env.example
├── README.md
└── .gitignore
```

## Local setup

### Prerequisites

- Node.js 18+
- npm 9+

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

### Backend

```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```

### Environment variables

Create a `.env` file in the backend folder using the example values:

```env
PORT=5000
JWT_SECRET=replace_with_secure_random_string
MONGO_URI=mongodb://localhost:27017/portify
FRONTEND_URL=http://localhost:5173
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GITHUB_TOKEN=
NODE_ENV=development
```

The backend requires MongoDB and stores users and portfolios in the `users` and `portfolios` collections. Start MongoDB locally or set `MONGO_URI` to a reachable MongoDB instance such as MongoDB Atlas. Backend startup fails if MongoDB is unavailable; it never falls back to JSON storage. Existing `backend/data/store.json` records are imported once after connecting and retained as `store.json.migrated`.

The AI Portfolio Assistant and chatbot use Gemini by default when `GEMINI_API_KEY` is set; set `AI_PROVIDER=gemini` explicitly if both provider keys are present. Add a Gemini key from [Google AI Studio](https://aistudio.google.com/apikey) to `backend/.env` and restart the backend. Gemini's free tier has model-specific rate limits and data-use terms; see the [current pricing and free-tier details](https://aistudio.google.com/docs/pricing). To use OpenAI instead, set `AI_PROVIDER=openai` and configure `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, which defaults to `gpt-4o-mini`). AI routes report provider configuration, quota, and rate-limit errors; they do not generate local fallback answers. The Portfolio Assistant collects profile details before generation, supports edits and content improvements, and can save the generated sections to a portfolio. GitHub repository lookup works with public repositories; setting `GITHUB_TOKEN` raises GitHub API rate limits. Resumes can be selected as PDFs up to 5 MB or linked from Google Drive; Drive files must be shared with anyone who has the link.

Publishing makes a portfolio available from the frontend at `/public/<slug>`. In production, configure the frontend host to serve the SPA entry point for these route URLs and point `VITE_API_URL` at the deployed backend API.

### Run checks

```powershell
cd backend
npm test
cd ..\frontend
npm run build
```

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/templates`
- `POST /api/portfolios`
- `GET /api/portfolios`
- `PUT /api/portfolios/:id`
- `DELETE /api/portfolios/:id`
- `POST /api/portfolios/:id/publish`
- `GET /api/public/:slug`
- `POST /api/ai/chat`
- `POST /api/ai/portfolio-assistant/turn`
- `POST /api/ai/portfolio-assistant/generate`
- `POST /api/ai/portfolio-assistant/transform`
- `POST /api/ai/improve-project`
- `POST /api/ai/generate-summary`
- `GET /api/github/:username`
- `GET /api/github/:username/repos`

## Portfolio export

The editor's **Export HTML** action saves the current portfolio and downloads a self-contained `*.html` page using its saved text and selected design settings. Uploaded profile/project photos and a resume PDF are embedded in the exported page.

## Publish on GitHub Pages

1. In the portfolio editor, select **Export HTML**.
2. Rename the downloaded file to `index.html`.
3. Create a public GitHub repository for the portfolio and upload `index.html` to its root.
4. Commit the file, then open the repository's **Settings > Pages**.
5. Choose **Deploy from a branch**, select `main` and `/(root)`, and save.
6. Open the published URL shown in the Pages settings after deployment finishes.

GitHub Pages hosts the static export. It does not host the Portify editor, API, or live preview.

## Deployment notes

- Frontend: deploy the Vite app to Vercel.
- Backend: deploy the Express server to Render, Railway, or another Node-compatible platform.
- Database: use a managed MongoDB Atlas instance.
- Set environment variables in the hosting platform and keep secrets out of frontend code.
