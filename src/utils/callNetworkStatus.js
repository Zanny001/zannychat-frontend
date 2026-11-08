export function getIceNetworkNotice(config) {
  if (config?.turnConfigured === true) return '';
  if (config?.turnConfigured === false) {
    return 'Limited network compatibility: a TURN relay is not configured. Some networks may not connect.';
  }
  return 'Network relay status could not be checked. Some networks may not connect.';
}
