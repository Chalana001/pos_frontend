export const isSingleCategoryMode = (configuration) => configuration?.categoryMode === 'SINGLE_CATEGORY';

export const getDisplayCategoryName = (item, singleCategoryMode) => {
  if (singleCategoryMode) return item?.subCategoryName || item?.categoryName || 'Uncategorized';
  return item?.categoryName || item?.subCategoryName || 'Uncategorized';
};

export const getCategoryFilterParams = (selectedId, singleCategoryMode) => {
  if (!selectedId) return { categoryId: undefined, subCategoryId: undefined };
  return singleCategoryMode
    ? { categoryId: undefined, subCategoryId: Number(selectedId) }
    : { categoryId: Number(selectedId), subCategoryId: undefined };
};
