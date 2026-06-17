// scripts/generate-movie-list.mjs
const HF_TOKEN = process.env.HF_TOKEN;
const VIDEO_REPO = 'Otika234/video';
const IMAGE_REPO = 'Otika234/images';

// Default values for missing fields
const DEFAULT_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const DEFAULT_GENRE = 'unknown';
const DEFAULT_YEAR = 2024;
const DEFAULT_RATING = 7.0;
const DEFAULT_QUALITY = '1080p';

/**
 * Fetch the list of all files in a dataset repository
 * @param {string} repoId - e.g. "Otika234/video"
 * @returns {Promise<string[]>} array of rfilename strings
 */
async function listRepoFiles(repoId) {
  const url = `https://huggingface.co/api/datasets/${repoId}?full=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${HF_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${repoId}: ${res.status}`);
  const data = await res.json();
  // The API returns a "siblings" array with objects containing "rfilename"
  return (data.siblings || [])
    .map(s => s.rfilename)
    .filter(f => f && !f.startsWith('.')); // ignore hidden files
}

/**
 * Convert a dataset file path to a raw download URL
 * @param {string} repoId
 * @param {string} filePath
 * @returns {string} raw URL
 */
function rawUrl(repoId, filePath) {
  return `https://huggingface.co/datasets/${repoId}/resolve/main/${filePath}`;
}

async function main() {
  console.log('Fetching video file list...');
  const videoFiles = await listRepoFiles(VIDEO_REPO);
  console.log(`Found ${videoFiles.length} video files.`);

  console.log('Fetching image file list...');
  const imageFiles = await listRepoFiles(IMAGE_REPO);
  console.log(`Found ${imageFiles.length} image files.`);

  // Build map: base name (without extension) -> full path
  const imageMap = new Map();
  for (const imgPath of imageFiles) {
    const base = imgPath.replace(/\.[^/.]+$/, ''); // remove extension
    imageMap.set(base, imgPath);
  }

  const movies = [];
  for (const vidPath of videoFiles) {
    // Remove the ".mp4.enc" extension to get the base name
    const base = vidPath.replace(/\.mp4\.enc$/, '');
    if (imageMap.has(base)) {
      movies.push({
        name: base,
        image: rawUrl(IMAGE_REPO, imageMap.get(base)),
        video: rawUrl(VIDEO_REPO, vidPath),
        key: DEFAULT_KEY,
        genre: DEFAULT_GENRE,
        year: DEFAULT_YEAR,
        rating: DEFAULT_RATING,
        quality: DEFAULT_QUALITY
      });
    } else {
      console.warn(`No image found for video: ${vidPath} (base: ${base})`);
    }
  }

  const fs = await import('fs');
  fs.writeFileSync('movie_list.json', JSON.stringify(movies, null, 2));
  console.log(`movie_list.json written with ${movies.length} entries.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
