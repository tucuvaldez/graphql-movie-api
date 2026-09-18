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
 * Clampa limit/offset a rangos razonables para evitar queries abusivas
 * (ej: limit: 999999 desde un cliente malicioso).
 */
export function clampPagination(limit: number, offset: number, maxLimit = 100) {
  return {
    limit: Math.min(Math.max(limit, 1), maxLimit),
    offset: Math.max(offset, 0),
  };
}
