const UPSTREAM_ROOT_DOMAIN = ['umami', 'is'].join('.');

export function isUpstreamServiceUrl(value?: string) {
  if (!value) {
    return false;
  }

  try {
    const hostname = new URL(value).hostname.toLowerCase();

    return hostname === UPSTREAM_ROOT_DOMAIN || hostname.endsWith(`.${UPSTREAM_ROOT_DOMAIN}`);
  } catch {
    return false;
  }
}

export function assertIndependentServiceUrl(name: string, value?: string) {
  if (isUpstreamServiceUrl(value)) {
    throw new Error(`${name} must not reference the original project infrastructure`);
  }
}
