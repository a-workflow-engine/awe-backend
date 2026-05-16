export type PaginationResponse = {
  total: number;
  limit: number;
  page: number;
  totalPages: number;
};

export type ParsedPagination = {
  page: number;
  limit: number;
  offset: number;
};
