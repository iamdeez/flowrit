export type CliArgs = Record<string, string | boolean>

export function parseCliArgs(argv = process.argv.slice(2)): CliArgs {
  const args: CliArgs = {}
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (!item.startsWith('--')) continue
    const [rawKey, inlineValue] = item.slice(2).split('=', 2)
    if (!rawKey) continue
    if (inlineValue !== undefined) {
      args[rawKey] = inlineValue
      continue
    }
    const next = argv[index + 1]
    if (next && !next.startsWith('--')) {
      args[rawKey] = next
      index += 1
    } else {
      args[rawKey] = true
    }
  }
  return args
}
