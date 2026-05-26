# Content-creation Project Context

## Overview
This repository contains a small content repurposing MVP with a Django backend and a React frontend.

## Current architecture
- Backend: Django 6 with Django REST Framework, CORS headers, and token-based auth
- Frontend: React app created with `react-scripts`
- Database: SQLite during local development

## Key folders
- `content-agent/backend/`
  - Django settings and URL configuration
- `content-agent/api/`
  - Django models, views, URLs, and AI generation fallback logic
- `content-agent/frontend/`
  - React app, UI, and API integration

## Current feature status
- Authentication and user management are implemented
  - register/login/logout
  - token-based authenticated requests
  - customer/user linkage
- Content generation is implemented with a fallback text-generation path
- UI includes account panel, history, auth toggle, and generate flow

## Known limitation
- The project is currently paused because there is no API key available to validate live generation behavior end-to-end.
- The local app can still be started for code reference, but production-ready runtime validation is limited without credentials.

## Run commands
Backend:
- `cd content-agent`
- `source venv/bin/activate`
- `python manage.py runserver 0.0.0.0:8000`

Frontend:
- `cd content-agent/frontend`
- `npm start`

## Important implementation notes
- The frontend uses a local proxy to the backend (`package.json` proxy points to `http://localhost:8000`)
- Auth is handled through Django REST Framework tokens
- The current codebase is in a paused state for runtime validation until API credentials are available

## Suggested next steps
1. Add real API credentials for generation testing
2. Add backend and frontend automated tests
3. Re-enable end-to-end validation and deployment preparation
