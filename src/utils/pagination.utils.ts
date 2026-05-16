import type { Request } from "express";
import { PaginationParamsSchema } from "../schemas/pagination.schema.js";
import type {
  PaginationResponse,
  ParsedPagination,
} from "../types/pagination.js";

export const parsePaginationFromRequest = (req: Request): ParsedPagination => {
  const { page, limit } = PaginationParamsSchema.parse(req.query);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

export const buildPaginatedResponse = <T>(
  dataKey: string,
  items: T[],
  total: number,
  page: number,
  limit: number,
) => {
  const normalizedTotal = Number(total);
  const safeTotal = Number.isFinite(normalizedTotal) ? normalizedTotal : 0;

  return {
    [dataKey]: items,
    pagination: {
      total: safeTotal,
      page,
      limit,
      totalPages: Math.ceil(safeTotal / limit),
    },
  };
};

export const paginationUtils = {
  getOffset: (page: number, limit: number): number => {
    return (page - 1) * limit;
  },

  getPaginationResponse: (
    total: number,
    page: number,
    limit: number,
  ): PaginationResponse => {
    return {
      total: total,
      limit,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },
};
