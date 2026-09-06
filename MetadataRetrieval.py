import requests
import psycopg2
from psycopg2.extras import execute_values

# -----------------------------------------
# 1. REST API call (Luanti ContentDB)
# -----------------------------------------

author = "Wuzzy"
package = "mobs_redo"   # You can replace this with any package name

url = f"https://content.minetest.net/api/packages/{author}/{package}/"
response = requests.get(url)
data = response.json()

# -----------------------------------------
# 2. Extract metadata
# -----------------------------------------

package_name = data.get("name")
latest_version = data.get("versions")[0]["version"] if data.get("versions") else None
screenshots = len(data.get("media", {}).get("screenshots", []))
dependencies = len(data.get("depends", []))

print("Fetched metadata:")
print(f"Package: {package_name}")
print(f"Latest version: {latest_version}")
print(f"Screenshots: {screenshots}")
print(f"Dependencies: {dependencies}")

# -----------------------------------------
# 3. Insert into PostgreSQL
# -----------------------------------------

conn = psycopg2.connect(
    host="localhost",      # or "postgres" if using Docker Compose
    port=5432,
    database="luanti_demo",
    user="postgres",
    password="yourpassword"
)

cursor = conn.cursor()

insert_query = """
    INSERT INTO package_metadata (package_name, latest_version, screenshots, dependencies)
    VALUES (%s, %s, %s, %s)
"""

cursor.execute(insert_query, (package_name, latest_version, screenshots, dependencies))
conn.commit()

cursor.close()
conn.close()

print("Row inserted into PostgreSQL.")
