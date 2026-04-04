import { z } from "zod";

export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export type PathParameters = Record<
  string,
  string | number | boolean | (string | number | boolean)[]
>;

export interface RequestOptions<TBody = unknown> {
  headers?: Record<string, string>;
  body?: TBody;
  params?: PathParameters;
  signal?: AbortSignal;
}

export interface HttpResponse<TData> {
  data: TData;
  status: number;
  headers: Headers;
}
