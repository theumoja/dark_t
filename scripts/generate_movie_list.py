import os
import json
import re
from pathlib import Path
from huggingface_hub import HfApi, list_repo_files

# ---------- CONFIGURATION ----------
HF_TOKEN = os.environ["HF_TOKEN"]
VIDEO_REPO = "Otika234/video"
IMAGE_REPO = "Otika234/images"
OUTPUT_FILE = "movie_list.json"

# Optional: default values for missing fields
DEFAULT_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
DEFAULT_GENRE = "unknown"
DEFAULT_YEAR = 2024
DEFAULT_RATING = 7.0
DEFAULT_QUALITY = "1080p"

# ---------- SCRIPT ----------
api = HfApi(token=HF_TOKEN)

def list_files(repo_id, repo_type="dataset"):
    """Return a list of file paths in the dataset repo (recursive)."""
    try:
        files = list_repo_files(repo_id, repo_type=repo_type, token=HF_TOKEN)
        return files
    except Exception as e:
        print(f"Error listing files in {repo_id}: {e}")
        return []

def get_raw_url(repo_id, file_path, repo_type="dataset"):
    """Convert a dataset repo file path to a raw download URL."""
    # For datasets, raw URL format: https://huggingface.co/datasets/{repo_id}/resolve/main/{file_path}
    return f"https://huggingface.co/datasets/{repo_id}/resolve/main/{file_path}"

def main():
    # Get all video files
    video_files = [f for f in list_files(VIDEO_REPO) if not f.startswith(".")]   # ignore hidden files
    image_files = [f for f in list_files(IMAGE_REPO) if not f.startswith(".")]

    # Build a dict from image stem -> full path
    image_map = {}
    for img_path in image_files:
        stem = Path(img_path).stem
        image_map[stem] = img_path

    movies = []
    for vid_path in video_files:
        stem = Path(vid_path).stem
        if stem in image_map:
            # Match found
            movie_entry = {
                "name": stem,
                "image": get_raw_url(IMAGE_REPO, image_map[stem]),
                "video": get_raw_url(VIDEO_REPO, vid_path),
                # Optional fields – you can adjust these
                "key": DEFAULT_KEY,
                "genre": DEFAULT_GENRE,
                "year": DEFAULT_YEAR,
                "rating": DEFAULT_RATING,
                "quality": DEFAULT_QUALITY
            }
            movies.append(movie_entry)
        else:
            print(f"No matching image for video: {vid_path} (stem: {stem})")

    # Write JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(movies, f, indent=2, ensure_ascii=False)

    print(f"Generated {OUTPUT_FILE} with {len(movies)} entries.")

if __name__ == "__main__":
    main()
