export function readBoardState(searchParams) {
  const page = Number(searchParams.get('page'));
  return {
    search: searchParams.get('q') || '',
    prefix: searchParams.get('prefix') || '',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function boardHref({ search = '', prefix = '', page = 1 }, postId) {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (prefix) params.set('prefix', prefix);
  if (Number.isSafeInteger(page) && page > 1) params.set('page', String(page));
  const path = postId === undefined ? '/board' : `/board/${encodeURIComponent(postId)}`;
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
