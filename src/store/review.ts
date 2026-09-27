import { create } from 'zustand'
import type { Comment, EditConflict, MergedCommentSource, Paragraph, Reply, Role, Version } from '../types'

const DRAFT_KEY = 'sologsb-1002-draft-v1'
const SCHEMA_VERSION = 2
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const roleName = (role: Role) => role === 'author' ? '作者' : role === 'reviewer' ? '审稿人 A' : '编辑'

const baseParagraphs: Paragraph[] = [
  { id: 'p-01', section: '摘要', number: '1.', text: '开源软件供应链的稳定性不仅取决于代码质量，也取决于维护者能否持续识别并回应社区需求。', original: '开源软件供应链的稳定性不仅取决于代码质量，也取决于维护者能否持续识别并回应社区需求。', status: 'accepted', highlighted: false, revision: 1, revisionPending: false },
  { id: 'p-02', section: '1 引言', number: '2.', text: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但其在真实维护工作流中的影响仍缺少系统证据。', original: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但其在真实维护工作流中的影响仍缺少系统证据。', status: 'open', highlighted: true, revision: 1, revisionPending: false },
  { id: 'p-03', section: '1 引言', number: '3.', text: '本文收集 12 个活跃开源项目连续 18 个月的议题与拉取请求记录，并访谈 26 位核心维护者。', original: '本文收集 12 个活跃开源项目连续 18 个月的议题记录，并访谈 26 位核心维护者。', status: 'open', highlighted: true, revision: 2, revisionPending: true },
  { id: 'p-04', section: '2 方法', number: '4.', text: '我们采用混合研究方法，将议题生命周期划分为响应、评审与合并三个阶段。编码过程由两名研究者独立完成。本研究补充报告编码者间一致性，并在附录列明分歧处理规则。', original: '我们采用混合研究方法，将议题生命周期划分为响应、评审与合并三个阶段。编码过程由两名研究者独立完成。', status: 'open', highlighted: false, revision: 3, revisionPending: false },
  { id: 'p-05', section: '2 方法', number: '5.', text: '当编码结果不一致时，研究者通过讨论达成一致；若仍有分歧，则邀请第三位研究者裁决。', original: '当编码结果不一致时，研究者通过讨论达成一致；若仍有分歧，则邀请第三位研究者裁决。', status: 'accepted', highlighted: true, revision: 1, revisionPending: false },
  { id: 'p-06', section: '3 结果', number: '6.', text: '初步结果显示，辅助工具缩短了首次响应时间，但没有显著降低维护者处理复杂议题的认知负担。', original: '初步结果显示，辅助工具缩短了首次响应时间，但没有显著降低维护者处理复杂议题的认知负担。', status: 'open', highlighted: true, revision: 1, revisionPending: false },
  { id: 'p-07', section: '3 结果', number: '7.', text: '在高活跃度项目中，维护者更关注建议是否可验证，而非建议生成速度。', original: '在高活跃度项目中，维护者更关注建议是否可验证，而非建议生成速度。', status: 'open', highlighted: false, revision: 1, revisionPending: false },
]

const v1Paragraphs: Paragraph[] = [
  { ...baseParagraphs[0], revision: 1, revisionPending: false },
  { ...baseParagraphs[1], revision: 1, revisionPending: false },
  { ...baseParagraphs[2], text: baseParagraphs[2].original, revision: 1, revisionPending: false },
  { ...baseParagraphs[3], text: '我们采用混合研究方法，将议题生命周期划分为响应、评审与合并三个阶段。编码过程由两名研究者独立完成。', original: baseParagraphs[3].original, revision: 1, revisionPending: false },
  { ...baseParagraphs[4], revision: 1, revisionPending: false },
  { ...baseParagraphs[5], revision: 1, revisionPending: false },
  { ...baseParagraphs[6], revision: 1, revisionPending: false },
]
const v2Paragraphs: Paragraph[] = v1Paragraphs.map((paragraph) => {
  if (paragraph.id === 'p-04') {
    return { ...paragraph, text: `${paragraph.text} 编码规则在预注册方案中说明。`, revision: 2, revisionPending: false }
  }
  return { ...paragraph }
})
// 二稿已经补充了 p-03，对应旧意见因此进入待复核状态。
v2Paragraphs[2] = { ...v2Paragraphs[2], text: baseParagraphs[2].original }

const seedVersions: Version[] = [
  { id: 'v-02', label: '审阅基线 v2', createdAt: Date.now() - 172800000, paragraphs: v2Paragraphs, source: 'seed' },
  { id: 'v-01', label: '投稿初稿 v1', createdAt: Date.now() - 1209600000, paragraphs: clone(v1Paragraphs), source: 'seed' },
]

const baseComments: Comment[] = [
  { id: 'c-01', paragraphId: 'p-02', author: '审稿人 A', role: 'reviewer', type: 'suggestion', quote: '其真实维护工作流中的影响', body: '建议把“影响”具体化为可观察指标。', suggestion: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但在真实维护工作流中究竟改变了哪些协作行为，仍缺少系统证据。', status: 'open', replies: [{ id: 'r-01', author: '作者', role: 'author', body: '可以，修改后会补充指标定义。', createdAt: Date.now() - 7200000 }], createdAt: Date.now() - 86400000, revision: 1 },
  { id: 'c-02', paragraphId: 'p-02', author: '审稿人 B', role: 'reviewer', type: 'comment', quote: '缺少系统证据', body: '这里的“系统证据”范围过大，建议限定为本研究覆盖的议题语料。', status: 'open', replies: [], createdAt: Date.now() - 64000000, revision: 1 },
  { id: 'c-03', paragraphId: 'p-03', author: '审稿人 A', role: 'reviewer', type: 'comment', quote: '26 位核心维护者', body: '请说明抽样方式和地域分布，避免样本选择偏差。', status: 'open', replies: [], createdAt: Date.now() - 54000000, revision: 1 },
  { id: 'c-04', paragraphId: 'p-04', author: '审稿人 C', role: 'reviewer', type: 'comment', quote: '编码过程由两名研究者独立完成', body: '建议报告编码者间一致性系数，并明确不一致处理规则。', status: 'open', replies: [], createdAt: Date.now() - 48000000, revision: 3 },
  { id: 'c-05', paragraphId: 'p-05', author: '审稿人 D', role: 'reviewer', type: 'comment', quote: '邀请第三位研究者裁决', body: '与上一段重复：都在说明编码分歧如何解决，建议合并意见。', status: 'open', replies: [], createdAt: Date.now() - 43000000, revision: 1 },
  { id: 'c-06', paragraphId: 'p-06', author: '审稿人 B', role: 'reviewer', type: 'suggestion', quote: '但没有显著降低维护者处理复杂议题的认知负担', body: '“显著”需要给出统计检验与效应量。', suggestion: '初步结果显示，辅助工具缩短了首次响应时间，但对复杂议题处理时长与自我报告认知负担均未产生统计显著影响。', status: 'open', replies: [], createdAt: Date.now() - 36000000, revision: 1 },
]

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizeParagraph(value: Partial<Paragraph>): Paragraph {
  return {
    id: value.id ?? '',
    section: value.section ?? '',
    number: value.number ?? '',
    text: value.text ?? '',
    original: value.original ?? value.text ?? '',
    status: value.status ?? 'open',
    highlighted: Boolean(value.highlighted),
    revision: typeof value.revision === 'number' && value.revision > 0 ? value.revision : 1,
    revisionPending: Boolean(value.revisionPending),
  }
}

function normalizeMergedSource(value: Partial<MergedCommentSource>): MergedCommentSource {
  return {
    id: value.id ?? '',
    author: value.author ?? '审稿人',
    role: value.role ?? 'reviewer',
    type: value.type === 'suggestion' ? 'suggestion' : 'comment',
    quote: value.quote ?? '',
    body: value.body ?? '',
    ...(value.suggestion ? { suggestion: value.suggestion } : {}),
    replies: Array.isArray(value.replies) ? clone(value.replies) : [],
    createdAt: value.createdAt ?? Date.now(),
    revision: typeof value.revision === 'number' && value.revision > 0 ? value.revision : 1,
  }
}

function normalizeComment(value: Partial<Comment>): Comment {
  return {
    id: value.id ?? id('comment'),
    paragraphId: value.paragraphId ?? '',
    author: value.author ?? '审稿人',
    role: value.role ?? 'reviewer',
    type: value.type === 'suggestion' ? 'suggestion' : 'comment',
    quote: value.quote ?? '',
    body: value.body ?? '',
    ...(value.suggestion ? { suggestion: value.suggestion } : {}),
    status: value.status ?? 'open',
    replies: Array.isArray(value.replies) ? clone(value.replies) : [],
    createdAt: value.createdAt ?? Date.now(),
    ...(value.mergedInto ? { mergedInto: value.mergedInto } : {}),
    ...(Array.isArray(value.mergedFrom) && value.mergedFrom.length ? { mergedFrom: value.mergedFrom.map(normalizeMergedSource) } : {}),
    revision: typeof value.revision === 'number' && value.revision > 0 ? value.revision : 1,
    ...(value.refreshedAt ? { refreshedAt: value.refreshedAt } : {}),
  }
}

function normalizeVersion(value: Partial<Version>): Version {
  const version: Version = {
    id: value.id ?? id('version'),
    label: value.label ?? '未命名版本',
    createdAt: value.createdAt ?? Date.now(),
    paragraphs: Array.isArray(value.paragraphs) ? value.paragraphs.map((paragraph) => normalizeParagraph(paragraph)) : [],
    source: value.source === 'seed' || value.source === 'manual' || value.source === 'legacy' ? value.source : 'manual',
  }
  return version
}

interface DraftData {
  schemaVersion?: number
  paragraphs?: Paragraph[]
  comments?: Comment[]
  versions?: Version[]
}

function persistDraft(paragraphs: Paragraph[], comments: Comment[], versions: Version[]) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, paragraphs, comments, versions }))
}

function openInitialDraft() {
  const seed = typeof localStorage === 'undefined' ? null : localStorage.getItem(DRAFT_KEY)
  if (!seed) {
    return { paragraphs: clone(baseParagraphs), comments: clone(baseComments), versions: clone(seedVersions), legacyNotice: false }
  }

  try {
    const parsed = JSON.parse(seed) as DraftData
    if (parsed.schemaVersion === SCHEMA_VERSION) {
      return {
        paragraphs: (parsed.paragraphs ?? []).map((paragraph) => normalizeParagraph(paragraph)),
        comments: (parsed.comments ?? []).map((comment) => normalizeComment(comment)),
        versions: (parsed.versions ?? []).map((version) => normalizeVersion(version)),
        legacyNotice: false,
      }
    }

    const paragraphs = (parsed.paragraphs ?? []).map((paragraph) => normalizeParagraph(paragraph))
    const comments = (parsed.comments ?? []).map((comment) => normalizeComment(comment))
    const legacyVersion: Version = {
      id: id('version'),
      label: `旧草稿自动归档 · ${new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
      createdAt: Date.now(),
      paragraphs: clone(paragraphs),
      source: 'legacy',
    }
    const versions = [legacyVersion, ...(parsed.versions ?? []).map((version) => normalizeVersion(version))]
    persistDraft(paragraphs, comments, versions)
    return { paragraphs, comments, versions, legacyNotice: true }
  } catch {
    return { paragraphs: clone(baseParagraphs), comments: clone(baseComments), versions: clone(seedVersions), legacyNotice: false }
  }
}

const initialDraft = openInitialDraft()

const isOpen = (comment: Comment) => comment.status === 'open'
const hasOpenComment = (comments: Comment[], paragraphId: string) => comments.some((comment) => comment.paragraphId === paragraphId && isOpen(comment))

function syncPending(paragraphs: Paragraph[], comments: Comment[]): Paragraph[] {
  return paragraphs.map((paragraph) => ({
    ...paragraph,
    revisionPending: comments.some((comment) =>
      comment.paragraphId === paragraph.id
      && isOpen(comment)
      && (comment.revision < paragraph.revision || (comment.mergedFrom ?? []).some((source) => source.revision < paragraph.revision)),
    ),
  }))
}

function toMergedSource(comment: Comment): MergedCommentSource[] {
  const direct: MergedCommentSource = {
    id: comment.id,
    author: comment.author,
    role: comment.role,
    type: comment.type,
    quote: comment.quote,
    body: comment.body,
    ...(comment.suggestion ? { suggestion: comment.suggestion } : {}),
    replies: clone(comment.replies),
    createdAt: comment.createdAt,
    revision: comment.revision,
  }
  return [...(comment.mergedFrom ?? []), direct].sort((a, b) => a.createdAt - b.createdAt)
}

interface ReviewState {
  role: Role
  paragraphs: Paragraph[]
  comments: Comment[]
  versions: Version[]
  selectedParagraphId: string
  commentFilter: 'all' | 'open' | 'stale' | 'suggestion' | 'duplicate'
  revisionMode: boolean
  dirty: boolean
  conflicts: EditConflict[]
  legacyNotice: boolean
  past: { paragraphs: Paragraph[]; comments: Comment[]; versions: Version[] }[]
  future: { paragraphs: Paragraph[]; comments: Comment[]; versions: Version[] }[]
  setRole: (role: Role) => void
  selectParagraph: (id: string) => void
  setCommentFilter: (filter: ReviewState['commentFilter']) => void
  setRevisionMode: (value: boolean) => void
  updateParagraph: (id: string, text: string) => void
  addComment: (input: Pick<Comment, 'paragraphId' | 'type' | 'quote' | 'body' | 'suggestion'>) => void
  replyComment: (commentId: string, body: string) => void
  resolveSuggestion: (commentId: string, accepted: boolean) => void
  mergeDuplicates: (paragraphId: string) => void
  refreshComment: (commentId: string, quote: string) => void
  withdrawComment: (commentId: string) => void
  toggleLock: (paragraphId: string) => void
  createVersion: (label: string) => void
  addConflict: (conflict: EditConflict) => void
  resolveConflict: (conflictId: string, strategy: 'local' | 'remote') => void
  dismissConflict: (conflictId: string) => void
  dismissLegacyNotice: () => void
  undo: () => void
  redo: () => void
  save: () => void
  resetDemo: () => void
}

export const useReviewStore = create<ReviewState>((set, get) => {
  const record = (producer: (state: ReviewState) => Partial<ReviewState>) => set((state) => {
    const history = { paragraphs: clone(state.paragraphs), comments: clone(state.comments), versions: clone(state.versions) }
    const next = producer(state)
    const paragraphs = next.paragraphs ?? state.paragraphs
    const comments = next.comments ?? state.comments
    const versions = next.versions ?? state.versions
    persistDraft(paragraphs, comments, versions)
    return { ...next, paragraphs, comments, versions, past: [...state.past.slice(-49), history], future: [], dirty: true }
  })

  return {
    role: 'reviewer',
    paragraphs: initialDraft.paragraphs,
    comments: initialDraft.comments,
    versions: initialDraft.versions,
    selectedParagraphId: 'p-02',
    commentFilter: 'all',
    revisionMode: false,
    dirty: false,
    conflicts: [],
    legacyNotice: initialDraft.legacyNotice,
    past: [],
    future: [],
    setRole: (role) => set({ role, selectedParagraphId: get().paragraphs[0]?.id ?? '' }),
    selectParagraph: (selectedParagraphId) => set({ selectedParagraphId }),
    setCommentFilter: (commentFilter) => set({ commentFilter }),
    setRevisionMode: (revisionMode) => set({ revisionMode }),
    updateParagraph: (paragraphId, text) => record((state) => {
      const paragraph = state.paragraphs.find((item) => item.id === paragraphId)
      if (!paragraph || paragraph.status === 'locked' || paragraph.text === text) return {}
      const shouldStartRevision = !paragraph.revisionPending && hasOpenComment(state.comments, paragraphId)
      const revision = paragraph.revision + (shouldStartRevision ? 1 : 0)
      const paragraphs = state.paragraphs.map((item) => item.id === paragraphId
        ? { ...item, text, status: 'open' as const, highlighted: true, revision, revisionPending: shouldStartRevision }
        : item)
      return { paragraphs: syncPending(paragraphs, state.comments) }
    }),
    addComment: (input) => record((state) => {
      const paragraph = state.paragraphs.find((item) => item.id === input.paragraphId)
      if (!paragraph) return {}
      const comment: Comment = {
        ...input,
        id: id('comment'),
        author: roleName(state.role),
        role: state.role,
        status: 'open',
        replies: [],
        createdAt: Date.now(),
        revision: paragraph.revision,
      }
      const comments = [comment, ...state.comments]
      return { comments, paragraphs: syncPending(state.paragraphs, comments) }
    }),
    replyComment: (commentId, body) => record((state) => {
      let didChange = false
      const comments = state.comments.map((comment) => {
        if (comment.id !== commentId || comment.status === 'merged' || comment.status === 'withdrawn') return comment
        didChange = true
        const reply: Reply = { id: id('reply'), author: roleName(state.role), role: state.role, body, createdAt: Date.now() }
        return { ...comment, replies: [...comment.replies, reply] }
      })
      return didChange ? { comments } : {}
    }),
    resolveSuggestion: (commentId, accepted) => record((state) => {
      if (state.role !== 'author') return {}
      const comment = state.comments.find((item) => item.id === commentId)
      const paragraph = comment ? state.paragraphs.find((item) => item.id === comment.paragraphId) : undefined
      if (!comment || !paragraph || comment.status !== 'open' || comment.type !== 'suggestion' || comment.revision !== paragraph.revision) return {}

      const comments = state.comments.map((item) => item.id === commentId
        ? { ...item, status: accepted ? 'accepted' as const : 'rejected' as const }
        : item)
      const nextText = accepted && comment.suggestion ? comment.suggestion : paragraph.text
      const textChanged = nextText !== paragraph.text
      const hasOtherOpen = comments.some((item) => item.paragraphId === paragraph.id && item.id !== commentId && isOpen(item))
      const revision = paragraph.revision + (textChanged && !paragraph.revisionPending && hasOtherOpen ? 1 : 0)
      const paragraphs = state.paragraphs.map((item) => item.id === paragraph.id
        ? { ...item, text: nextText, status: accepted ? 'accepted' as const : item.status, highlighted: accepted, revision, revisionPending: false }
        : item)
      return { comments, paragraphs: syncPending(paragraphs, comments) }
    }),
    mergeDuplicates: (paragraphId) => record((state) => {
      if (state.role !== 'editor') return {}
      const group = state.comments.filter((comment) => comment.paragraphId === paragraphId && isOpen(comment))
      if (group.length < 2) return {}
      const target = [...group].sort((a, b) => a.createdAt - b.createdAt)[0]
      const sourceIds = new Set(group.filter((comment) => comment.id !== target.id).map((comment) => comment.id))
      const sourceMap = new Map<string, MergedCommentSource>()
      group.flatMap((comment) => toMergedSource(comment)).forEach((source) => {
        if (source.id !== target.id) sourceMap.set(source.id, source)
      })
      const mergedFrom = Array.from(sourceMap.values()).sort((a, b) => a.createdAt - b.createdAt)
      const comments = state.comments.map((comment) => {
        if (comment.id === target.id) return { ...comment, mergedFrom }
        if (sourceIds.has(comment.id)) return { ...comment, status: 'merged' as const, mergedInto: target.id }
        return comment
      })
      return { comments, paragraphs: syncPending(state.paragraphs, comments) }
    }),
    refreshComment: (commentId, quote) => record((state) => {
      if (state.role !== 'reviewer') return {}
      const comment = state.comments.find((item) => item.id === commentId)
      const paragraph = comment ? state.paragraphs.find((item) => item.id === comment.paragraphId) : undefined
      if (!comment || !paragraph || !isOpen(comment)) return {}
      const comments = state.comments.map((item) => {
        if (item.id !== commentId) return item
        return {
          ...item,
          quote,
          revision: paragraph.revision,
          refreshedAt: Date.now(),
          mergedFrom: item.mergedFrom?.map((source) => ({ ...source, revision: paragraph.revision })),
        }
      })
      return { comments, paragraphs: syncPending(state.paragraphs, comments) }
    }),
    withdrawComment: (commentId) => record((state) => {
      if (state.role !== 'reviewer') return {}
      const comment = state.comments.find((item) => item.id === commentId)
      if (!comment || !isOpen(comment)) return {}
      const comments = state.comments.map((item) => item.id === commentId ? { ...item, status: 'withdrawn' as const } : item)
      return { comments, paragraphs: syncPending(state.paragraphs, comments) }
    }),
    toggleLock: (paragraphId) => record((state) => ({
      paragraphs: state.paragraphs.map((paragraph) => paragraph.id === paragraphId ? {
        ...paragraph,
        status: paragraph.status === 'locked' ? 'accepted' : 'locked',
      } : paragraph),
    })),
    createVersion: (label) => record((state) => ({
      versions: [{ id: id('version'), label: label.trim() || `版本 ${state.versions.length + 1}`, createdAt: Date.now(), paragraphs: clone(state.paragraphs), source: 'manual' }, ...state.versions],
    })),
    addConflict: (conflict) => set((state) => ({ conflicts: [conflict, ...state.conflicts] })),
    resolveConflict: (conflictId, strategy) => record((state) => {
      const conflict = state.conflicts.find((item) => item.id === conflictId)
      if (!conflict) return {}
      const paragraph = state.paragraphs.find((item) => item.id === conflict.paragraphId)
      if (!paragraph) return { conflicts: state.conflicts.filter((item) => item.id !== conflictId) }
      const nextText = strategy === 'remote' ? conflict.remoteText : conflict.localText
      const changed = nextText !== paragraph.text
      const shouldStartRevision = changed && !paragraph.revisionPending && hasOpenComment(state.comments, paragraph.id)
      const revision = paragraph.revision + (shouldStartRevision ? 1 : 0)
      const paragraphs = state.paragraphs.map((item) => item.id === paragraph.id
        ? { ...item, text: nextText, highlighted: changed, status: 'open' as const, revision, revisionPending: shouldStartRevision }
        : item)
      return {
        paragraphs: syncPending(paragraphs, state.comments),
        conflicts: state.conflicts.filter((item) => item.id !== conflictId),
      }
    }),
    dismissConflict: (conflictId) => set((state) => ({ conflicts: state.conflicts.filter((item) => item.id !== conflictId) })),
    dismissLegacyNotice: () => set({ legacyNotice: false }),
    undo: () => set((state) => {
      const previous = state.past.at(-1)
      if (!previous) return state
      const current = { paragraphs: clone(state.paragraphs), comments: clone(state.comments), versions: clone(state.versions) }
      persistDraft(previous.paragraphs, previous.comments, previous.versions)
      return { ...previous, past: state.past.slice(0, -1), future: [current, ...state.future], dirty: true }
    }),
    redo: () => set((state) => {
      const next = state.future[0]
      if (!next) return state
      const current = { paragraphs: clone(state.paragraphs), comments: clone(state.comments), versions: clone(state.versions) }
      persistDraft(next.paragraphs, next.comments, next.versions)
      return { ...next, past: [...state.past, current], future: state.future.slice(1), dirty: true }
    }),
    save: () => {
      persistDraft(get().paragraphs, get().comments, get().versions)
      set({ dirty: false })
    },
    resetDemo: () => {
      persistDraft(baseParagraphs, baseComments, seedVersions)
      set({ paragraphs: clone(baseParagraphs), comments: clone(baseComments), versions: clone(seedVersions), conflicts: [], legacyNotice: false, past: [], future: [], dirty: false })
    },
  }
})
