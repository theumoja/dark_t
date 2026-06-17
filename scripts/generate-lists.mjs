// scripts/generate-lists.mjs
const HF_TOKEN = process.env.HF_TOKEN;
const VIDEO_REPO = 'Otika234/video';
const IMAGE_REPO = 'Otika234/images';

const DEFAULT_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const DEFAULT_GENRE = 'unknown';
const DEFAULT_YEAR = 2024;
const DEFAULT_RATING = 7.0;
const DEFAULT_QUALITY = '1080p';

async function listRepoFiles(repoId) {
  const url = `https://huggingface.co/api/datasets/${repoId}?full=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${HF_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${repoId}: ${res.status}`);
  const data = await res.json();
  return (data.siblings || [])
    .map(s => s.rfilename)
    .filter(f => f && !f.startsWith('.'));
}

function rawUrl(repoId, filePath) {
  return `https://huggingface.co/datasets/${repoId}/resolve/main/${filePath}`;
}

async function main() {
  const videoFiles = await listRepoFiles(VIDEO_REPO);
  console.log(`Found ${videoFiles.length} video files.`);

  const imageFiles = await listRepoFiles(IMAGE_REPO);
  console.log(`Found ${imageFiles.length} image files.`);

  const movieImageMap = new Map();
  const seriesImageMap = new Map();

  for (const imgPath of imageFiles) {
    const parts = imgPath.split('/');
    if (parts.length === 1) {
      const base = imgPath.replace(/\.[^/.]+$/, '');
      movieImageMap.set(base, imgPath);
    } else if (parts[0] === 'series' && parts.length === 2) {
      const seriesName = parts[1].replace(/\.[^/.]+$/, '');
      seriesImageMap.set(seriesName, imgPath);
    }
  }

  const movies = [];
  const seriesMap = new Map();

  for (const vidPath of videoFiles) {
    const parts = vidPath.split('/');
    if (parts[0] === 'series') {
      if (parts.length < 4) {
        console.warn(`Skipping invalid series path: ${vidPath}`);
        continue;
      }
      const seriesName = parts[1];
      const seasonFolder = parts[2];
      const episodeFile = parts.slice(3).join('/');
      const episodeTitle = episodeFile.replace(/\.mp4\.enc$/, '').replace(/[_\-]/g, ' ');

      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, {});
      }
      const seasons = seriesMap.get(seriesName);
      if (!seasons[seasonFolder]) {
        seasons[seasonFolder] = [];
      }
      seasons[seasonFolder].push({
        title: episodeTitle,
        encFile: vidPath,
        keyHex: DEFAULT_KEY
      });
    } else {
      const base = vidPath.replace(/\.mp4\.enc$/, '');
      const posterPath = movieImageMap.get(base);
      if (posterPath) {
        movies.push({
          name: base,
          image: rawUrl(IMAGE_REPO, posterPath),
          video: rawUrl(VIDEO_REPO, vidPath),
          key: DEFAULT_KEY,
          genre: DEFAULT_GENRE,
          year: DEFAULT_YEAR,
          rating: DEFAULT_RATING,
          quality: DEFAULT_QUALITY
        });
      } else {
        console.warn(`No image for movie: ${vidPath}`);
      }
    }
  }

  const seriesList = [];
  for (const [seriesName, seasonsObj] of seriesMap) {
    const posterPath = seriesImageMap.get(seriesName);
    const posterUrl = posterPath
      ? rawUrl(IMAGE_REPO, posterPath)
      : 'https://picsum.photos/seed/default/300/400';
    seriesList.push({
      id: seriesList.length + 1,
      title: seriesName,
      year: DEFAULT_YEAR,
      rating: DEFAULT_RATING,
      desc: '',
      poster: posterUrl,
      seasons: seasonsObj
    });
  }

  const fs = await import('fs');
  fs.writeFileSync('movie_list.json', JSON.stringify(movies, null, 2));
  console.log(`movie_list.json written with ${movies.length} movies.`);
  fs.writeFileSync('series_list.json', JSON.stringify(seriesList, null, 2));
  console.log(`series_list.json written with ${seriesList.length} series.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
