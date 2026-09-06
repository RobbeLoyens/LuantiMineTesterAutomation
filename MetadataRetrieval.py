import json
import os
from urllib.request import urlopen
import dotenv
import psycopg2  # type: ignore[reportMissingModuleSource]

dotenv.load_dotenv()

# -----------------------------------------
# 1. REST API call (Luanti ContentDB)
# -----------------------------------------

author = "Wuzzy"
package = "mineclone2"   # You can replace this with any package name

api_url = f"https://content.luanti.org/api/packages/{author}/{package}"


def fetch_json(path):
    with urlopen(f"{api_url}/{path}" if path else f"{api_url}/") as response:
        return json.load(response)


data = fetch_json("")
releases = fetch_json("releases")
screenshots = fetch_json("screenshots")
dependencies = fetch_json("dependencies")

# -----------------------------------------
# 2. Extract metadata
# -----------------------------------------

package_name = data.get("name")
latest_version = releases[0].get("name") if releases else None
screenshots_count = len(screenshots)
dependencies_count = len(dependencies.get("depends", []))

print("Fetched metadata:")
print(f"Package: {package_name}")
print(f"Latest version: {latest_version}")
print(f"Screenshots: {screenshots_count}")
print(f"Dependencies: {dependencies_count}")

# -----------------------------------------
# 3. Insert into PostgreSQL
# -----------------------------------------

database_password = os.getenv("PGPASSWORD")
if not database_password:
    raise RuntimeError(
        "Set the PGPASSWORD environment variable before running this script."
    )

try:
    conn = psycopg2.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        database=os.getenv("PGDATABASE", "luanti_demo"),
        user=os.getenv("PGUSER", "postgres"),
        password=database_password
    )
except psycopg2.OperationalError as error:
    raise RuntimeError(
        "Could not connect to PostgreSQL. Check that it is running and that "
        "PGHOST, PGPORT, PGDATABASE, PGUSER, and PGPASSWORD are correct. "
        f"PostgreSQL reported: {error}"
    ) from error

cursor = conn.cursor()

insert_query = """
    INSERT INTO package_metadata (package_name, latest_version, screenshots, dependencies)
    VALUES (%s, %s, %s, %s)
    ON CONFLICT (package_name) DO UPDATE SET
        latest_version = EXCLUDED.latest_version,
        screenshots = EXCLUDED.screenshots,
        dependencies = EXCLUDED.dependencies
"""

cursor.execute(insert_query, (package_name, latest_version, screenshots_count, dependencies_count))
conn.commit()

cursor.close()
conn.close()

print("Row inserted into PostgreSQL.")
