export const BOOKS_BASE_PATH = "/books";

export function booksPath(path = "") {
  const suffix = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `${BOOKS_BASE_PATH}${suffix}`;
}

export function booksApiPath(path = "") {
  const suffix = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `${BOOKS_BASE_PATH}/api${suffix}`;
}
