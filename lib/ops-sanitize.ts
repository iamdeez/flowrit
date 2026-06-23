const SENSITIVE_KEY_PATTERN = /(secret|token|password|authorization|cookie|key|dsn|database_url|direct_url|webhook)/i

const MASK = '[REDACTED]'

export function sanitizeOpsContext(value: unknown): unknown {
  if (value === null || value === undefined) return value

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeOpsContext(item))
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    }
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? MASK : sanitizeOpsContext(item),
      ]),
    )
  }

  return value
}
