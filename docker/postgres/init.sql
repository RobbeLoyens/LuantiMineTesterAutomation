CREATE TABLE IF NOT EXISTS package_metadata (
    package_name TEXT PRIMARY KEY,
    latest_version TEXT NOT NULL,
    screenshots INTEGER NOT NULL,
    dependencies INTEGER NOT NULL
);