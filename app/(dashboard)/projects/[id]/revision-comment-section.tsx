import { getRevisionComments } from '@/lib/actions/revisionComment'
import { RevisionCommentThread } from './revision-comment-thread'

type RevisionCommentSectionProps = {
  revisionId: string
}

export async function RevisionCommentSection({ revisionId }: RevisionCommentSectionProps) {
  const comments = await getRevisionComments(revisionId)

  return <RevisionCommentThread revisionId={revisionId} initialComments={comments} />
}
