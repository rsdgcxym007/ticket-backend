import { Request } from 'express';

export type PaginateOptions = {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
};

export const extractPagination = (req: Request & { query: any }) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const rest = { ...req.query };
  delete rest.page;
  delete rest.limit;

  return { page, limit, ...rest };
};
