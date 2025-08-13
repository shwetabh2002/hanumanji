export interface PaginatedResponseDTO<T> {
  data: T[];
  nextPageAvailable: boolean;
  page: number;
  perPage: number;
}
