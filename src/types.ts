export type Role = 'author' | 'reviewer' | 'editor'
export type ParagraphStatus = 'open' | 'accepted' | 'locked'
export type CommentStatus = 'open' | 'accepted' | 'rejected' | 'merged' | 'withdrawn'
export type CommentType = 'comment' | 'suggestion'
export type VersionSource = 'seed' | 'manual' | 'legacy'

export interface Reply {
  id: string
  author: string
  role: Role
  body: string
  createdAt: number
}

export interface MergedCommentSource {
  id: string
  author: string
  role: Role
  type: CommentType
  quote: string
  body: string
  suggestion?: string
  revision: number
  replies: Reply[]
  createdAt: number
}

export interface Comment {
  id: string
  paragraphId: string
  author: string
  role: Role
  type: CommentType
  quote: string
  body: string
  suggestion?: string
  status: CommentStatus
  replies: Reply[]
  createdAt: number
  mergedInto?: string
  mergedFrom?: MergedCommentSource[]
  /** 意见提交或经审稿人刷新确认时对应的段落修订号 */
  revision: number
  refreshedAt?: number
}

export interface Paragraph {
  id: string
  section: string
  number: string
  text: string
  original: string
  status: ParagraphStatus
  highlighted: boolean
  /** 单调递增的段落内容修订号 */
  revision: number
  /** 是否存在正文改动后等待审稿人复核的开放意见 */
  revisionPending: boolean
}

export interface Version {
  id: string
  label: string
  createdAt: number
  paragraphs: Paragraph[]
  source?: VersionSource
}

export interface EditConflict {
  id: string
  paragraphId: string
  localText: string
  remoteText: string
  localAuthor: string
  remoteAuthor: string
  detectedAt: number
}

export interface HistorySnapshot {
  paragraphs: Paragraph[]
  comments: Comment[]
  versions: Version[]
}
