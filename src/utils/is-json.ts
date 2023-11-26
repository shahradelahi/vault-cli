export function isJson(data: any): boolean {
  if (typeof data !== 'string') return false;
  try {
    JSON.parse(data);
    return true;
  } catch (e) {
    return false;
  }
}
