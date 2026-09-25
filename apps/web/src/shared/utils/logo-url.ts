export function resolveLogoUrl(logoUrl: string): string {
  const driveFileId = logoUrl.match(/^https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/)?.[1];

  if (!driveFileId) return logoUrl;

  return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveFileId)}`;
}
