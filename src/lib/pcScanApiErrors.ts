const USER_MESSAGES: Partial<Record<number, string>> = {
  404: 'Pairing is temporarily unavailable. Please try again in a few minutes.',
  503: 'PC scan pairing is not available right now. Try again later, or enter your specs manually.',
};

export function pcScanHttpError(status: number, serverMessage?: string): Error {
  const msg = serverMessage?.trim();
  if (msg && !looksLikeDevMessage(msg)) {
    return new Error(msg);
  }
  return new Error(USER_MESSAGES[status] ?? 'Something went wrong. Please try again.');
}

function looksLikeDevMessage(msg: string): boolean {
  return (
    /UPSTASH|KV_REST|BLOB_|vercel\.json|npm run|docs\//i.test(msg) ||
    /\/api\/pc-scan\/health/i.test(msg) ||
    /Environment Variables/i.test(msg)
  );
}