#!/bin/bash

# ==============================================================================
# MySQL Database Backup Script (Overwrite Strategy)
# ==============================================================================
# This script creates a single backup file named 'latest_backup.sql'. 
# Every time it runs, it overwrites the previous backup to save disk space.
# ==============================================================================

# 1. SETTINGS
# Change this to your project's absolute path for automation (e.g. /home/user/app)
PROJECT_DIR="." 
BACKUP_DIR="$PROJECT_DIR/backups"
DATABASE_NAME="restaurant_db"
CONTAINER_NAME="anawuma_db"
MYSQL_ROOT_PASSWORD="root_password" # Ensure this matches your .env or docker-compose.yml

# 2. ENSURE BACKUP DIRECTORY EXISTS
mkdir -p "$BACKUP_DIR"

# 3. PERFORM BACKUP (OVERWRITE)
echo "Starting database backup at $(date)..."
docker exec "$CONTAINER_NAME" mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$DATABASE_NAME" > "$BACKUP_DIR/latest_backup.sql"

if [ $? -eq 0 ]; then
  echo "Success! Database backed up to $BACKUP_DIR/latest_backup.sql"
else
  echo "Error! Database backup failed."
  exit 1
fi
