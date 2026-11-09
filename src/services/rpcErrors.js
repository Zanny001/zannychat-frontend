// Narrow compatibility detection for an RPC absent from the PostgREST schema cache.
// Do not treat permission, validation, network, or unrelated database errors as a missing RPC.
export function isMissingRpcFunction(error, functionName) {
  if (error?.code !== 'PGRST202' || typeof functionName !== 'string' || !functionName) return false;
  const diagnostic = [error.message, error.details, error.hint]
    .filter((value) => typeof value === 'string')
    .join(' ');
  return diagnostic.includes(functionName);
}
