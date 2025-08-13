export const generateWebURLSlug = ({
  contentId,
  contentName,
}: {
  contentName: string;
  contentId: number;
}) => {
  const displaySlug = contentName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return displaySlug !== '' ? `${displaySlug}-${contentId}` : `${contentId}`;
};
