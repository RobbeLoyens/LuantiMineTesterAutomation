# LuantiMineTesterAutomation

## Metadata retrieval

Install the Python dependency:

```powershell
py -m pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your PostgreSQL password. The `.env`
file is ignored by Git and is loaded automatically by the Python script.

```powershell
Copy-Item .env.example .env
# Edit .env and enter your actual PostgreSQL password
py .\MetadataRetrieval.py
```

The `package_metadata` table must already exist with `package_name`,
`latest_version`, `screenshots`, and `dependencies` columns.

## Docker

Build the image from the project directory:

```powershell
docker build -t luanti-metadata .
```

Edit the non-secret PostgreSQL settings in `docker-compose.yml`. Keep only the
password in the ignored `.env` file, then build and run the service:

```powershell
docker compose up --build
```

Stop and remove the container with `Ctrl+C`, or run:

```powershell
docker compose down
```

The container does not expose port 8000 because this is a batch script, not a
network service.
