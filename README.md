# AI Personal Stylist

## Run locally on Windows

Start the backend in one PowerShell terminal:

```powershell
cd C:\Users\<you>\path\to\GRWS\backend
Copy-Item .env.example .env
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If the virtual environment does not exist, create it first with Python 3.14:

```powershell
py -3.14 -m venv .venv
```

Start the Angular UI in a second terminal:

```powershell
cd C:\Users\<you>\path\to\GRWS\frontend
npm install
npm start
```

Open `http://localhost:4200`. The backend health endpoint is
`http://127.0.0.1:8000/healthz`; interactive API documentation is at
`http://127.0.0.1:8000/docs`.

Wardrobe items, style profiles, accounts, and planned outfits are stored in
`backend/data/stylist.sqlite3`; uploaded images are stored in `backend/uploads`.
Without an OpenWeatherMap key, weather and recommendations use a clearly
demonstration-oriented forecast. Add a key to `backend/.env` to enable provider
weather data. In development, the UI works as a local single-user app without
sign-in. The Account page can also create/login to an account; those requests
then use its bearer token. Set a strong `SECRET_KEY`, configure allowed CORS
origins, and set `APP_ENV=production` before exposing the API outside localhost.
For production, also set `DEBUG=false` and replace the example secret with a
random value of at least 32 characters. Generate one in PowerShell with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

The backend rejects production settings that retain debug mode or use a short
or obvious placeholder signing key.
