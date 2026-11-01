# Portify

Portify is a full-stack portfolio builder that helps developers create polished portfolio sites with templates, AI-assisted content generation, and a publishable public portfolio flow.

## Features

- User registration and authentication
- Portfolio dashboard with draft and published states
- Six portfolio templates with a live editor preview
- Publishable public portfolio websites at `/public/:slug`
- Standalone HTML export using the current saved portfolio content
- AI-assisted short biography and project-description writing, with local drafts when no provider key is configured
- GitHub profile lookup and public repository import
- Resume PDF selection and Google Drive shared-link import
- Profile and project photo uploads
- In-app publishing flowchart, GitHub Pages deployment guide, and help chatbot
- MongoDB persistence for user accounts and portfolios
- Responsive and accessible design

## Tech stack

- Frontend: React + Vite + React Router + CSS
- Backend: Node.js + Express + JWT + rate limiting
- Database: MongoDB via Mongoose; optional JSON-file storage for tests/local fallback
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
cd c:\Users\amrutha v c\OneDrive\Documents\proto\frontend
npm install
npm run dev
```

### Backend

```powershell
cd c:\Users\amrutha v c\OneDrive\Documents\proto\backend
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
PORTIFY_DATA_FILE=
FRONTEND_URL=http://localhost:5173
OPENAI_API_KEY=
GITHUB_TOKEN=
NODE_ENV=development
```

The backend connects to the MongoDB database in `MONGO_URI` and stores users and portfolios in the `users` and `portfolios` collections. MongoDB must be running locally, or `MONGO_URI` must point to a reachable MongoDB instance. In development, an unavailable MongoDB connection falls back to persistent JSON-file storage so the API can still start; production startup remains strict.

For tests or JSON-file fallback, set `PORTIFY_DATA_FILE` to a file path. When that variable is set, the backend uses JSON storage instead of MongoDB. If `MONGO_URI` is empty, it also falls back to `backend/data/store.json`.

AI writing uses OpenAI when `OPENAI_API_KEY` is configured and provides factual local drafts when it is not. A short bio can be generated from a name or professional role; adding skills, experience, and projects improves the result. GitHub repository lookup works with public repositories; setting `GITHUB_TOKEN` raises GitHub API rate limits. Resumes can be selected as PDFs up to 5 MB or linked from Google Drive; Drive files must be shared with anyone who has the link.

Publishing makes a portfolio available from the frontend at `/public/<slug>`. In production, configure the frontend host to serve the SPA entry point for these route URLs and point `VITE_API_URL` at the deployed backend API.

### Run checks

```powershell
cd c:\Users\amrutha v c\OneDrive\Documents\proto\backend
npm test
cd c:\Users\amrutha v c\OneDrive\Documents\proto\frontend
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
- `POST /api/ai/generate-bio`
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
