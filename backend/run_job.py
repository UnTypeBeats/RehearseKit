#!/usr/bin/env python3
"""
Entrypoint for Cloud Run Jobs to process a single audio job.
Usage: python run_job.py <job_id>
"""
import sys
import os

if len(sys.argv) < 2:
    print("Usage: python run_job.py <job_id>")
    sys.exit(1)

job_id = sys.argv[1]
print(f"Processing job: {job_id}")

# Import and run the Celery task directly (without Celery)
from app.tasks.audio_processing import process_audio_job

# Execute the task synchronously
process_audio_job(job_id)

print(f"Job {job_id} processing complete")

