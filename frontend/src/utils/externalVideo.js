const emptyMeta = {
  provider: null,
  providerLabel: "Vídeo externo",
  embedUrl: null,
  thumbnailUrl: null,
  playable: false,
};

function isDomainOrSubdomain(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

function youtubeIdFromUrl(url) {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || null;
  if (!isDomainOrSubdomain(host, "youtube.com")) return null;

  if (url.pathname === "/watch") return url.searchParams.get("v");
  const [segment, id] = url.pathname.split("/").filter(Boolean);
  return ["embed", "shorts", "live"].includes(segment) ? id || null : null;
}

function vimeoIdFromUrl(url) {
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (!isDomainOrSubdomain(host, "vimeo.com")) return null;
  return url.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part)) || null;
}

export function getExternalVideoMeta(rawUrl) {
  if (!rawUrl) return emptyMeta;

  try {
    const url = new URL(rawUrl);
    const youtubeId = youtubeIdFromUrl(url);
    if (youtubeId && /^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
      return {
        provider: "youtube",
        providerLabel: "YouTube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`,
        thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
        playable: true,
      };
    }

    const vimeoId = vimeoIdFromUrl(url);
    if (vimeoId) {
      return {
        provider: "vimeo",
        providerLabel: "Vimeo",
        embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
        thumbnailUrl: null,
        playable: true,
      };
    }

    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (isDomainOrSubdomain(host, "instagram.com")) return { ...emptyMeta, provider: "instagram", providerLabel: "Instagram" };
    if (isDomainOrSubdomain(host, "tiktok.com")) return { ...emptyMeta, provider: "tiktok", providerLabel: "TikTok" };
  } catch {
    return emptyMeta;
  }

  return emptyMeta;
}

export function resolveExternalVideoThumbnail(item) {
  return item?.thumbnailUrl || getExternalVideoMeta(item?.url).thumbnailUrl || null;
}
