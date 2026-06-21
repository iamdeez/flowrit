type TemplateVars = {
  customerName: string
  stageName: string
  dueDate: string
  shareLink: string
}

export function applyTemplateVars(content: string, vars: TemplateVars): string {
  return content
    .replace(/\{고객명\}/g, vars.customerName)
    .replace(/\{단계\}/g, vars.stageName)
    .replace(/\{마감일\}/g, vars.dueDate)
    .replace(/\{공유링크\}/g, vars.shareLink)
}
