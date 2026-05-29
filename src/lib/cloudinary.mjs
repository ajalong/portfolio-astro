// Build Cloudinary URLs from frontmatter shorthand.
//
// Project markdown declares `mediaBase` (folder), optional `mediaVersion`
// (cache pin), and per-asset references as bare filenames in body
// markdown or as a `thumbnail` public-id in frontmatter. This helper
// constructs the full Cloudinary URL — endpoint, transform pipeline,
// version, public-id — so authoring stays at filename level.
//
// Two distinct transform pipelines:
//   - body media: high-fidelity, srcset-driven, q_auto:best
//   - thumbnail: card-context, eco quality, fade loop, smaller width
//
// All URLs go through the optimisation defaults (`f_auto`, `q_auto`,
// `vc_auto`, `fps_auto`, `ac_none` for video).

const CLOUD_NAME = 'ajalong';
const VIDEO_EXT_RE = /\.(mp4|webm|mov)(\?.*)?$/i;
const GIF_EXT_RE = /\.gif$/i;
const ABS_URL_RE = /^https?:\/\//i;

// fps_auto intentionally omitted — it requires a Cloudinary FFmpeg
// add-on that isn't enabled on this account; including it returns 400.
// Reinstate once the add-on is provisioned.
const VIDEO_BODY_TRANSFORMS = [
  'f_auto',
  'q_auto:best',
  'vc_auto',
  'ac_none',
  'c_limit',
  'w_1600',
];

const VIDEO_THUMB_TRANSFORMS = [
  'f_auto',
  'q_auto:eco',
  'vc_auto',
  'ac_none',
  'c_limit',
  'w_800',
  'e_fade:1200',
  'e_fade:-1200',
];

const IMAGE_THUMB_POSTER_TRANSFORMS = [
  'f_auto',
  'q_auto:best',
  'c_limit',
  'w_800',
  'so_0', // first-frame extraction from the source video
];

// Homepage showcase images (top-right + bottom-right slots). Larger than
// thumbnails (these are hero-ish), kept under a reasonable cap so phones
// don't fetch a 4K asset for a 600px slot.
const IMAGE_SHOWCASE_TRANSFORMS = [
  'f_auto',
  'q_auto:best',
  'c_limit',
  'w_1400',
];

function isVideoExt(filename) {
  return VIDEO_EXT_RE.test(filename);
}

function isGifExt(filename) {
  return GIF_EXT_RE.test(filename);
}

// Build a Cloudinary URL from parts. Endpoint is `image/upload` or
// `video/upload`; transforms is a comma-separated list (no leading
// slash); version is optional `vNNN`; publicId includes the extension.
function buildCloudinaryUrl({ endpoint, transforms, version, publicId }) {
  const segs = [`https://res.cloudinary.com/${CLOUD_NAME}/${endpoint}`];
  if (transforms && transforms.length) segs.push(transforms.join(','));
  if (version) segs.push(version);
  segs.push(publicId);
  return segs.join('/');
}

// Resolve a body-markdown asset reference. `src` may be:
//   - a relative filename (e.g. `welcome.mp4`) — joined to mediaBase
//   - a relative path with subfolders (e.g. `wolffolins/foo.png`)
//   - a full URL — passed through unchanged
//   - a site-rooted path (e.g. `/placeholder-16x9.svg`) — passed through
// Returns the resolved URL or the original if it can't be normalised.
export function resolveBodyMediaUrl(src, frontmatter = {}) {
  if (!src) return src;
  if (ABS_URL_RE.test(src)) return src;
  if (src.startsWith('/')) return src;

  const mediaBase = frontmatter.mediaBase;
  if (!mediaBase) return src; // no resolution context — leave untouched

  const isVideo = isVideoExt(src);
  const endpoint = isVideo ? 'video/upload' : 'image/upload';
  const publicId = `${mediaBase.replace(/\/$/, '')}/${src.replace(/^\//, '')}`;

  // Bare resolution — transforms applied by the rehype plugin per call
  // (it adds srcset widths, sharpening, etc.). We only inject a version
  // pin here so the URL is canonically structured.
  return buildCloudinaryUrl({
    endpoint,
    transforms: [],
    version: frontmatter.mediaVersion,
    publicId,
  });
}

// Build the thumbnail poster (.jpg) URL from a frontmatter `thumbnail`
// public-id. Used by ProjectCard for the `<img>` poster + the video's
// `poster` attribute fallback.
export function buildThumbnailPosterUrl(frontmatter = {}) {
  const { mediaBase, mediaVersion, thumbnail } = frontmatter;
  if (!thumbnail || !mediaBase) return null;
  return buildCloudinaryUrl({
    endpoint: 'video/upload', // image-from-video frame extraction
    transforms: IMAGE_THUMB_POSTER_TRANSFORMS,
    version: mediaVersion,
    publicId: `${mediaBase.replace(/\/$/, '')}/${thumbnail}.jpg`,
  });
}

// Build the thumbnail loop (.mp4) URL — autoplaying card video.
export function buildThumbnailVideoUrl(frontmatter = {}) {
  const { mediaBase, mediaVersion, thumbnail } = frontmatter;
  if (!thumbnail || !mediaBase) return null;
  return buildCloudinaryUrl({
    endpoint: 'video/upload',
    transforms: VIDEO_THUMB_TRANSFORMS,
    version: mediaVersion,
    publicId: `${mediaBase.replace(/\/$/, '')}/${thumbnail}.mp4`,
  });
}

// Resolve thumbnails — prefer the new `thumbnail` field, fall back to
// legacy `thumbnailImage` / `thumbnailVideo` so the migration can land
// per-file without a flag day.
export function resolveThumbnails(frontmatter = {}) {
  if (frontmatter.thumbnail && frontmatter.mediaBase) {
    return {
      poster: buildThumbnailPosterUrl(frontmatter),
      video: buildThumbnailVideoUrl(frontmatter),
    };
  }
  return {
    poster: frontmatter.thumbnailImage ?? null,
    video: frontmatter.thumbnailVideo ?? null,
  };
}

// Build a showcase image URL from a public-id (relative to the project's
// `mediaBase`, extension included). Returns null when either the public-id
// or mediaBase is missing — callers should treat the slot as empty.
export function buildShowcaseImageUrl(publicId, frontmatter = {}) {
  const { mediaBase, mediaVersion } = frontmatter;
  if (!publicId || !mediaBase) return null;
  return buildCloudinaryUrl({
    endpoint: 'image/upload',
    transforms: IMAGE_SHOWCASE_TRANSFORMS,
    version: mediaVersion,
    publicId: `${mediaBase.replace(/\/$/, '')}/${publicId.replace(/^\//, '')}`,
  });
}

// Build a showcase video URL from a video public-id (e.g. `Lobby.mp4`).
// Uses the body-video transform pipeline (q_auto:best, ac_none, c_limit/w_1600)
// because the showcase slot is hero-sized — eco quality reads as fuzzy here.
export function buildShowcaseVideoUrl(publicId, frontmatter = {}) {
  const { mediaBase, mediaVersion } = frontmatter;
  if (!publicId || !mediaBase) return null;
  return buildCloudinaryUrl({
    endpoint: 'video/upload',
    transforms: VIDEO_BODY_TRANSFORMS,
    version: mediaVersion,
    publicId: `${mediaBase.replace(/\/$/, '')}/${publicId.replace(/^\//, '')}`,
  });
}

// Build the matching poster URL for a showcase video — first-frame
// extraction at the showcase image transform pipeline so the poster
// matches the video's eventual rendered size and quality. publicId is
// the video filename (e.g. `Lobby.mp4`); we swap the extension to .jpg
// and route through video/upload + so_0 the same way the thumbnail
// poster pipeline does.
export function buildShowcaseVideoPosterUrl(publicId, frontmatter = {}) {
  const { mediaBase, mediaVersion } = frontmatter;
  if (!publicId || !mediaBase) return null;
  const basename = publicId.replace(/^\//, '').replace(/\.(mp4|webm|mov)(\?.*)?$/i, '');
  return buildCloudinaryUrl({
    endpoint: 'video/upload',
    transforms: [...IMAGE_SHOWCASE_TRANSFORMS, 'so_0'],
    version: mediaVersion,
    publicId: `${mediaBase.replace(/\/$/, '')}/${basename}.jpg`,
  });
}
