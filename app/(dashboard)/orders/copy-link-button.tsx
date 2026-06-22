'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CopyLinkButton({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flowrit-button-secondary hidden md:inline-flex"
    >
      {copied ? (
        <><Check className="h-4 w-4 text-emerald-500" />복사됨</>
      ) : (
        <><Copy className="h-4 w-4" />{label} 복사</>
      )}
    </button>
  )
}
