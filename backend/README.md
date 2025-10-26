# Proposal Builder API

## Local development

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The server listens on `http://127.0.0.1:8000` by default. The Next.js frontend is configured to call the API at `http://127.0.0.1:8000/api`.
