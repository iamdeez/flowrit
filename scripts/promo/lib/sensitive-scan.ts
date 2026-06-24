export type SensitiveFinding = {
  label: string
  match: string
}

const TOKEN_PATTERN = /\b(?:eyJ[a-zA-Z0-9_-]{12,}|[a-zA-Z0-9_-]{32,}\.[a-zA-Z0-9_-]{12,})\b/g
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const SECRET_KEY_PATTERN =
  /\b(?:secret|password|authorization|cookie|database_url|direct_url|webhook|access_token|refresh_token|api_key)\b/gi

export function scanSensitiveText(text: string, blacklist: string[] = []): SensitiveFinding[] {
  const findings: SensitiveFinding[] = []
  collectMatches(findings, 'email', text, EMAIL_PATTERN)
  collectMatches(findings, 'token-like', text, TOKEN_PATTERN)
  collectMatches(findings, 'secret-keyword', text, SECRET_KEY_PATTERN)

  for (const value of blacklist) {
    if (!value.trim()) continue
    if (text.toLowerCase().includes(value.toLowerCase())) {
      findings.push({ label: 'blacklist', match: value })
    }
  }

  return findings
}

export function assertNoSensitiveText(text: string, blacklist: string[] = []): void {
  const findings = scanSensitiveText(text, blacklist)
  if (findings.length === 0) return

  const summary = findings.map((finding) => `${finding.label}:${finding.match}`).join(', ')
  throw new Error(`Promo bundle contains sensitive text: ${summary}`)
}

function collectMatches(
  findings: SensitiveFinding[],
  label: string,
  text: string,
  pattern: RegExp,
) {
  for (const match of text.matchAll(pattern)) {
    findings.push({ label, match: match[0] })
  }
}
