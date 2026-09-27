import { create } from 'zustand'
import type { Comment, EditConflict, Paragraph, Reply, Role, Version } from '../types'

const DRAFT_KEY = 'sologsb-1002-draft-v1'
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const baseParagraphs: Paragraph[] = [
  { id: 'p-01', section: '摘要', number: '1.', text: '开源软件供应链的稳定性不仅取决于代码质量，也取决于维护者能否持续识别并回应社区需求。', original: '开源软件供应链的稳定性不仅取决于代码质量，也取决于维护者能否持续识别并回应社区需求。', status: 'accepted', highlighted: false, revision: 1 },
  { id: 'p-02', section: '1 引言', number: '2.', text: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但其在真实维护工作流中的影响仍缺少系统证据。', original: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但其在真实维护工作流中的影响仍缺少系统证据。', status: 'open', highlighted: true, revision: 1 },
  { id: 'p-03', section: '1 引言', number: '3.', text: '本文收集 12 个活跃开源项目连续 18 个月的议题记录，并访谈 26 位核心维护者。', original: '本文收集 12 个活跃开源项目连续 18 个月的议题记录，并访谈 26 位核心维护者。', status: 'open', highlighted: true, revision: 1 },
  { id: 'p-04', section: '2 方法', number: '4.', text: '我们采用混合研究方法，将议题生命周期划分为响应、评审与合并三个阶段。编码过程由两名研究者独立完成。', original: '我们采用混合研究方法，将议题生命周期划分为响应、评审与合并三个阶段。编码过程由两名研究者独立完成。', status: 'open', highlighted: false, revision: 1 },
  { id: 'p-05', section: '2 方法', number: '5.', text: '当编码结果不一致时，研究者通过讨论达成一致；若仍有分歧，则邀请第三位研究者裁决。', original: '当编码结果不一致时，研究者通过讨论达成一致；若仍有分歧，则邀请第三位研究者裁决。', status: 'accepted', highlighted: true, revision: 1 },
  { id: 'p-06', section: '3 结果', number: '6.', text: '初步结果显示，辅助工具缩短了首次响应时间，但没有显著降低维护者处理复杂议题的认知负担。', original: '初步结果显示，辅助工具缩短了首次响应时间，但没有显著降低维护者处理复杂议题的认知负担。', status: 'open', highlighted: true, revision: 1 },
  { id: 'p-07', section: '3 结果', number: '7.', text: '在高活跃度项目中，维护者更关注建议是否可验证，而非建议生成速度。', original: '在高活跃度项目中，维护者更关注建议是否可验证，而非建议生成速度。', status: 'open', highlighted: false, revision: 1 },
]

const seedComment = (input: Omit<Comment, 'paragraphRevision' | 'paragraphSnapshot'>): Comment => ({
  ...input,
  paragraphRevision: 1,
  paragraphSnapshot: baseParagraphs.find((paragraph) => paragraph.id === input.paragraphId)?.text ?? '',
})

const baseComments: Comment[] = [
  seedComment({ id: 'c-01', paragraphId: 'p-02', author: '审稿人 A', role: 'reviewer', type: 'suggestion', quote: '其真实维护工作流中的影响', body: '建议把“影响”具体化为可观察指标。', suggestion: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但在真实维护工作流中究竟改变了哪些协作行为，仍缺少系统证据。', status: 'open', replies: [{ id: 'r-01', author: '作者', role: 'author', body: '可以，修改后会补充指标定义。', createdAt: Date.now() - 7200000 }], createdAt: Date.now() - 86400000 }),
  seedComment({ id: 'c-02', paragraphId: 'p-02', author: '审稿人 B', role: 'reviewer', type: 'comment', quote: '缺少系统证据', body: '这里的“系统证据”范围过大，建议限定为本研究覆盖的议题语料。', status: 'open', replies: [], createdAt: Date.now() - 64000000 }),
  seedComment({ id: 'c-03', paragraphId: 'p-03', author: '审稿人 A', role: 'reviewer', type: 'comment', quote: '26 位核心维护者', body: '请说明抽样方式和地域分布，避免样本选择偏差。', status: 'open', replies: [], createdAt: Date.now() - 54000000 }),
  seedComment({ id: 'c-04', paragraphId: 'p-04', author: '审稿人 C', role: 'reviewer', type: 'comment', quote: '两名研究者独立完成', body: '建议报告编码者间一致性系数，并明确不一致处理规则。', status: 'open', replies: [], createdAt: Date.now() - 48000000 }),
  seedComment({ id: 'c-05', paragraphId: 'p-05', author: '审稿人 D', role: 'reviewer', type: 'comment', quote: '邀请第三位研究者裁决', body: '与上一段重复：都在说明编码分歧如何解决，建议合并意见。', status: 'open', replies: [], createdAt: Date.now() - 43000000 }),
  seedComment({ id: 'c-06', paragraphId: 'p-06', author: '审稿人 B', role: 'reviewer', type: 'suggestion', quote: '但没有显著降低维护者处理复杂议题的认知负担', body: '“显著”需要给出统计检验与效应量。', suggestion: '初步结果显示，辅助工具缩短了首次响应时间，但对复杂议题处理时长与自我报告认知负担均未产生统计显著影响。', status: 'open', replies: [], createdAt: Date.now() - 36000000 }),
]

const buildDefaultVersions = (): Version[] => [
  { id: 'v-01', label: '投稿初稿 v1', createdAt: Date.now() - 1209600000, paragraphs: clone(baseParagraphs) },
  { id: 'v-02', label: '审阅基线 v2', createdAt: Date.now() - 172800000, paragraphs: clone(baseParagraphs.map((paragraph) => paragraph.id === 'p-04' ? { ...paragraph, text: `${paragraph.text} 编码规则在预注册方案中说明。` } : paragraph)) },
]

interface DraftPayload {
  paragraphs: Paragraph[]
  comments: Comment[]
  versions: Version[]
}

const persistDraft = (paragraphs: Paragraph[], comments: Comment[], versions: Version[]) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ paragraphs, comments, versions }))
}

const migrateParagraph = (paragraph: Paragraph): Paragraph => ({ ...paragraph, revision: paragraph.revision ?? 1 })

const migrateComment = (comment: Comment, paragraphs: Paragraph[]): Comment => {
  const paragraph = paragraphs.find((item) => item.id === comment.paragraphId)
  return {
    ...comment,
    paragraphRevision: comment.paragraphRevision ?? paragraph?.revision ?? 1,
    paragraphSnapshot: comment.paragraphSnapshot ?? paragraph?.text ?? comment.quote,
  }
}

const matchesDraft = (version: Version, paragraphs: Paragraph[]) =>
  version.paragraphs.length === paragraphs.length
  && paragraphs.every((paragraph, index) => version.paragraphs[index]?.id === paragraph.id && version.paragraphs[index]?.text === paragraph.text)

// 旧草稿重新打开时补齐版本字段；若已有版本都不对应当前正文，自动留存一个版本作为基线
const loadInitialDraft = (): DraftPayload => {
  const fallback: DraftPayload = { paragraphs: clone(baseParagraphs), comments: clone(baseComments), versions: buildDefaultVersions() }
  if (typeof localStorage === 'undefined') return fallback
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as Partial<DraftPayload>
    if (!parsed.paragraphs?.length) return fallback
    const paragraphs = parsed.paragraphs.map(migrateParagraph)
    const comments = (parsed.comments ?? []).map((comment) => migrateComment(comment, paragraphs))
    let versions = (parsed.versions ?? []).map((version) => ({ ...version, paragraphs: version.paragraphs.map(migrateParagraph) }))
    if (!versions.some((version) => matchesDraft(version, paragraphs))) {
      versions = [{ id: id('version'), label: '自动留存 · 打开旧草稿', createdAt: Date.now(), paragraphs: clone(paragraphs) }, ...versions]
    }
    persistDraft(paragraphs, comments, versions)
    return { paragraphs, comments, versions }
  } catch {
    return fallback
  }
}

const initialDraft = loadInitialDraft()

// 正文改动后，相关段落仍处于“待处理”的意见自动转为“待复核”
const staleForParagraphs = (comments: Comment[], paragraphIds: ReadonlySet<string>): Comment[] =>
  comments.map((comment) => paragraphIds.has(comment.paragraphId) && comment.status === 'open' ? { ...comment, status: 'stale' as const } : comment)

const actionable = (comment: Comment) => comment.status === 'open' || comment.status === 'stale'

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
  past: { paragraphs: Paragraph[]; comments: Comment[]; versions: Version[] }[]
  future: { paragraphs: Paragraph[]; comments: Comment[]; versions: Version[] }[]
  setRole: (role: Role) => void
  selectParagraph: (id: string) => void
  setCommentFilter: (filter: ReviewState['commentFilter']) => void
  setRevisionMode: (value: boolean) => void
  updateParagraph: (id: string, text: string) => void
  addComment: (input: Pick<Comment, 'paragraphId' | 'type' | 'quote' | 'body' | 'suggestion'>) => void
  replyComment: (commentId: string, body: string) => void
  refreshComment: (commentId: string) => void
  withdrawComment: (commentId: string) => void
  resolveSuggestion: (commentId: string, accepted: boolean) => void
  mergeComment: (commentId: string, targetId: string) => void
  mergeParagraphDuplicates: (paragraphId: string) => void
  toggleLock: (paragraphId: string) => void
  createVersion: (label: string) => void
  addConflict: (conflict: EditConflict) => void
  resolveConflict: (conflictId: string, strategy: 'local' | 'remote') => void
  dismissConflict: (conflictId: string) => void
  undo: () => void
  redo: () => void
  save: () => void
  resetDemo: () => void
}

export const useReviewStore = create<ReviewState>((set, get) => {
  const record = (producer: (state: ReviewState) => Partial<ReviewState> | null) => set((state) => {
    const next = producer(state)
    if (!next) return state
    const history = { paragraphs: clone(state.paragraphs), comments: clone(state.comments), versions: clone(state.versions) }
    const paragraphs = next.paragraphs ?? state.paragraphs
    const comments = next.comments ?? state.comments
    const versions = next.versions ?? state.versions
    persistDraft(paragraphs, comments, versions)
    return { ...next, past: [...state.past.slice(-49), history], future: [], dirty: true }
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
    past: [],
    future: [],
    setRole: (role) => set({ role, selectedParagraphId: get().paragraphs[0]?.id ?? '' }),
    selectParagraph: (selectedParagraphId) => set({ selectedParagraphId }),
    setCommentFilter: (commentFilter) => set({ commentFilter }),
    setRevisionMode: (revisionMode) => set({ revisionMode }),
    updateParagraph: (paragraphId, text) => record((state) => {
      const target = state.paragraphs.find((paragraph) => paragraph.id === paragraphId)
      if (!target || target.status === 'locked' || target.text === text) return null
      return {
        paragraphs: state.paragraphs.map((paragraph) => paragraph.id === paragraphId
          ? { ...paragraph, text, revision: paragraph.revision + 1, status: 'open' as const, highlighted: true }
          : paragraph),
        comments: staleForParagraphs(state.comments, new Set([paragraphId])),
      }
    }),
    addComment: (input) => record((state) => {
      const paragraph = state.paragraphs.find((item) => item.id === input.paragraphId)
      return {
        comments: [{
          ...input,
          id: id('comment'),
          author: state.role === 'reviewer' ? '审稿人 A' : state.role === 'author' ? '作者' : '编辑',
          role: state.role,
          status: 'open' as const,
          paragraphRevision: paragraph?.revision ?? 1,
          paragraphSnapshot: paragraph?.text ?? '',
          replies: [],
          createdAt: Date.now(),
        }, ...state.comments],
      }
    }),
    replyComment: (commentId, body) => record((state) => ({
      comments: state.comments.map((comment) => comment.id === commentId ? {
        ...comment,
        replies: [...comment.replies, { id: id('reply'), author: state.role === 'author' ? '作者' : state.role === 'reviewer' ? '审稿人 A' : '编辑', role: state.role, body, createdAt: Date.now() } as Reply],
      } : comment),
    })),
    // 审稿人复核：引用刷新到当前正文并重新生效；原引用仍在新正文中则保留
    refreshComment: (commentId) => record((state) => {
      const comment = state.comments.find((item) => item.id === commentId)
      if (!comment || comment.status !== 'stale') return null
      const paragraph = state.paragraphs.find((item) => item.id === comment.paragraphId)
      if (!paragraph) return null
      const quoteStillValid = comment.quote.length > 0 && paragraph.text.includes(comment.quote)
      return {
        comments: state.comments.map((item) => item.id === commentId ? {
          ...item,
          status: 'open' as const,
          paragraphRevision: paragraph.revision,
          paragraphSnapshot: paragraph.text,
          quote: quoteStillValid ? item.quote : paragraph.text.slice(0, 64),
          refreshedAt: Date.now(),
        } : item),
      }
    }),
    withdrawComment: (commentId) => record((state) => {
      const comment = state.comments.find((item) => item.id === commentId)
      if (!comment || !actionable(comment)) return null
      return {
        comments: state.comments.map((item) => item.id === commentId ? { ...item, status: 'withdrawn' as const } : item),
      }
    }),
    // 只有对应当前段落版本的意见才能被作者接受或拒绝
    resolveSuggestion: (commentId, accepted) => record((state) => {
      const comment = state.comments.find((item) => item.id === commentId)
      if (!comment || comment.status !== 'open') return null
      const paragraph = state.paragraphs.find((item) => item.id === comment.paragraphId)
      if (!paragraph || comment.paragraphRevision !== paragraph.revision) return null
      const applies = Boolean(accepted && comment.suggestion && comment.suggestion !== paragraph.text)
      const decided: Comment['status'] = accepted ? 'accepted' : 'rejected'
      return {
        comments: staleForParagraphs(
          state.comments.map((item) => item.id === commentId ? { ...item, status: decided } : item),
          applies ? new Set([comment.paragraphId]) : new Set<string>(),
        ),
        paragraphs: applies
          ? state.paragraphs.map((item) => item.id === comment.paragraphId ? { ...item, text: comment.suggestion as string, revision: item.revision + 1, status: 'accepted' as const } : item)
          : state.paragraphs,
      }
    }),
    mergeComment: (commentId, targetId) => record((state) => {
      const source = state.comments.find((item) => item.id === commentId)
      const target = state.comments.find((item) => item.id === targetId)
      if (!source || !target || source.id === target.id || !actionable(source)) return null
      // 目标本身已合并时归入最终主意见，保证同组只剩一条待处理项
      let root = target
      const visited = new Set<string>()
      while (root.mergedInto && !visited.has(root.id)) {
        visited.add(root.id)
        root = state.comments.find((item) => item.id === root.mergedInto) ?? root
      }
      return {
        comments: state.comments.map((item) => item.id === commentId ? { ...item, status: 'merged' as const, mergedInto: root.id } : item),
      }
    }),
    // 一键合并本段全部重复意见：保留最早一条为待处理项，其余并入该组
    mergeParagraphDuplicates: (paragraphId) => record((state) => {
      const candidates = state.comments.filter((item) => item.paragraphId === paragraphId && actionable(item))
      if (candidates.length < 2) return null
      const target = candidates.reduce((earliest, item) => (item.createdAt < earliest.createdAt ? item : earliest))
      return {
        comments: state.comments.map((item) => item.id !== target.id && item.paragraphId === paragraphId && actionable(item)
          ? { ...item, status: 'merged' as const, mergedInto: target.id }
          : item),
      }
    }),
    toggleLock: (paragraphId) => record((state) => ({
      paragraphs: state.paragraphs.map((paragraph) => paragraph.id === paragraphId ? {
        ...paragraph,
        status: paragraph.status === 'locked' ? 'accepted' : 'locked',
      } : paragraph),
    })),
    createVersion: (label) => record((state) => ({
      versions: [{ id: id('version'), label: label.trim() || `版本 ${state.versions.length + 1}`, createdAt: Date.now(), paragraphs: clone(state.paragraphs) }, ...state.versions],
    })),
    addConflict: (conflict) => set((state) => ({ conflicts: [conflict, ...state.conflicts] })),
    resolveConflict: (conflictId, strategy) => record((state) => {
      const conflict = state.conflicts.find((item) => item.id === conflictId)
      if (!conflict) return null
      const applyRemote = strategy === 'remote'
      return {
        paragraphs: applyRemote
          ? state.paragraphs.map((paragraph) => paragraph.id === conflict.paragraphId ? { ...paragraph, text: conflict.remoteText, revision: paragraph.revision + 1, highlighted: true } : paragraph)
          : state.paragraphs,
        comments: applyRemote ? staleForParagraphs(state.comments, new Set([conflict.paragraphId])) : state.comments,
        conflicts: state.conflicts.filter((item) => item.id !== conflictId),
      }
    }),
    dismissConflict: (conflictId) => set((state) => ({ conflicts: state.conflicts.filter((item) => item.id !== conflictId) })),
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
      localStorage.removeItem(DRAFT_KEY)
      const versions = buildDefaultVersions()
      set({ paragraphs: clone(baseParagraphs), comments: clone(baseComments), versions: clone(versions), conflicts: [], past: [], future: [], dirty: false })
      persistDraft(baseParagraphs, baseComments, versions)
    },
  }
})
