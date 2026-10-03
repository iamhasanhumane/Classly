export function googleDrivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function googleDriveOpenUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
