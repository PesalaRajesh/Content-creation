# Content Repurposer

A fast MVP for turning video transcripts into polished LinkedIn posts.

## What this project includes

- Django backend with a `POST /api/generate/` endpoint
- React frontend with transcript input, template/tone selection, and copy-to-clipboard
- OpenAI integration via `OPENAI_API_KEY`

## Setup

1. Create and activate the Python venv:

```bash
cd content-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Install frontend dependencies:

```bash
cd frontend
npm install
```

3. Configure OpenAI locally:

```bash
cp ../.env.example .env
# edit .env and add your real key
```

4. Optionally set the trial limit in `.env`:

```bash
TRIAL_LIMIT=5
```

5. Run database migrations:

```bash
cd content-agent
source venv/bin/activate
python manage.py makemigrations
python manage.py migrate
```

5. Run the backend:

```bash
source venv/bin/activate
python manage.py runserver
```

5. Run the frontend:

```bash
cd frontend
npm start
```

## How it works

- The React app sends transcript text, a template type, a tone, and optional account email to the backend.
- Users can start a free trial with an email address to save generated posts and track trials.
- The backend builds a custom OpenAI prompt using the selected template and tone.
- OpenAI returns a polished LinkedIn post, which the frontend displays and saves.

## Prompt options

Frontend offers:
- `Standard LinkedIn Post`
- `Founder Story`
- `Product Launch`
- `Learning Summary`

Tone options:
- `Professional`
- `Friendly`
- `Bold`

## Local environment

The backend loads `.env` if present, so you can keep your OpenAI key out of source control.

## Next product steps

- Add a simple landing page with pricing and a one-click trial
- Add a “Saved history” or “Download post” feature
- Add a LinkedIn-ready preview with hashtags and CTA suggestions
- Add a free tier or trial to reduce adoption friction
- Collect customer feedback on which post templates work best
