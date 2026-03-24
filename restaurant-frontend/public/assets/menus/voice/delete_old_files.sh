#!/bin/bash 
# delete_old_files.sh 

# Absolute directory path where audio files are stored
audio_directory="/var/www/restaurant-app-main/menus/assets/voice"

# Log file where deletions will be recorded
log_file="/var/log/apache2/deletion_log.txt"

# Get current timestamp
timestamp=$(date +"%Y-%m-%d %H:%M:%S")

# Check if the directory exists
if [ ! -d "$audio_directory" ]; then
    echo "$timestamp - ERROR: Directory $audio_directory does not exist!" >> $log_file
    exit 1
fi

# Find and delete files older than 1 day
find "$audio_directory" -type f -mtime +1 -print -exec rm -f {} \; >> $log_file 2>&1

# Write a log entry
if [ $? -eq 0 ]; then
    echo "$timestamp - Successfully deleted files older than 1 day from $audio_directory" >> $log_file
else
    echo "$timestamp - ERROR: Failed to delete files from $audio_directory" >> $log_file
fi
