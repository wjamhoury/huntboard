#!/usr/bin/env python3
"""
Migration script to add resume_id column to jobs table.
Run this once to update your existing database.

Usage (inside Docker container):
    docker compose exec backend python migrate_add_resume_id.py

Or manually:
    docker compose exec backend bash
    python migrate_add_resume_id.py
"""

import sqlite3
import os

# Find the database file - prioritize Docker container path
DB_PATHS = [
    "/app/data/huntboard.db",  # Docker container path (primary)
    "data/huntboard.db",       # Relative path in container
    "app/data/huntboard.db",   # Alternative relative path
    "app/huntboard.db",
    "huntboard.db",
]

def find_database():
    """Find the SQLite database file."""
    for path in DB_PATHS:
        if os.path.exists(path):
            return path
    return None

def migrate():
    db_path = find_database()

    if not db_path:
        print("❌ Could not find database file. Checked:")
        for path in DB_PATHS:
            print(f"   - {path}")
        print("\nPlease provide the path to your database:")
        db_path = input("> ").strip()
        if not os.path.exists(db_path):
            print(f"❌ File not found: {db_path}")
            return False

    print(f"📁 Found database: {db_path}")

    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(jobs)")
        columns = [col[1] for col in cursor.fetchall()]

        if "resume_id" in columns:
            print("✅ Column 'resume_id' already exists. No migration needed.")
            return True

        # Add the column
        print("🔄 Adding 'resume_id' column to jobs table...")
        cursor.execute("""
            ALTER TABLE jobs
            ADD COLUMN resume_id INTEGER
            REFERENCES resumes(id) ON DELETE SET NULL
        """)

        conn.commit()
        print("✅ Migration complete! Column 'resume_id' added successfully.")

        # Show current job count
        cursor.execute("SELECT COUNT(*) FROM jobs")
        job_count = cursor.fetchone()[0]
        print(f"📊 Your database has {job_count} jobs (all preserved).")

        return True

    except sqlite3.Error as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        return False

    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 50)
    print("HuntBoard Database Migration")
    print("Adding resume_id column to jobs table")
    print("=" * 50)
    print()
    print("Note: Run this inside the Docker container:")
    print("  docker compose exec backend python migrate_add_resume_id.py")
    print()

    success = migrate()

    print()
    if success:
        print("You can now restart your backend!")
        print("  docker compose restart backend")
    else:
        print("Please fix the issue and try again.")
