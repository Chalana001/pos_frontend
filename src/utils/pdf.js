export const openPdfBlob = (blob, filename = 'document.pdf') => {
  const blobUrl = window.URL.createObjectURL(blob);
  const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');

  if (!newWindow) {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  window.setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 60_000);
};
