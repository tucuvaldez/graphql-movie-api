export interface PageInfoResult {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount: number;
}

export function buildPageInfo(limit: number, offset: number, totalCount: number): PageInfoResult {
  return {
    hasNextPage: offset + limit < totalCount,
    hasPreviousPage: offset > 0,
    totalCount,
  };
}

/**
 * Clamps limit/offset to reasonable ranges to prevent abusive queries
 * (e.g. limit: 999999 from a malicious client).
 */
export function clampPagination(limit: number, offset: number, maxLimit = 100) {
  return {
    limit: Math.min(Math.max(limit, 1), maxLimit),
    offset: Math.max(offset, 0),
  };
}
