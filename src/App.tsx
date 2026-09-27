import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftOutlined, ArrowRightOutlined, BranchesOutlined, CheckOutlined, CloseOutlined,
  CommentOutlined, DiffOutlined, DeleteOutlined, FileDoneOutlined, FileTextOutlined,
  HistoryOutlined, LockOutlined, MenuFoldOutlined, MessageOutlined, PlusOutlined,
  RedoOutlined, SaveOutlined, SendOutlined, StopOutlined, SwapOutlined, SyncOutlined,
  UndoOutlined, UnlockOutlined,
} from '@ant-design/icons'
import { Alert, Badge, Button, Card, Checkbox, Collapse, Empty, Input, Modal, Popconfirm, Radio, Segmented, Select, Space, Tag, Tooltip, message } from 'antd'
import { submitRemotePatch } from './services/mockApi'
import { useReviewStore } from './store/review'
import type { Comment, CommentType, MergedCommentSource, Paragraph, Role } from './types'

const roleMeta: Record<Role, { label: string; description: string; color: string }> = {
  author: { label: '作者工作区', description: '正文改动会让旧意见进入待复核；仅当前版本建议可接受或拒绝', color: '#2f6f5e' },
  reviewer: { label: '审稿人工作区', description: '重看正文改动，刷新引用并确认，或撤回不再适用的意见', color: '#9a5b25' },
  editor: { label: '编辑工作区', description: '同组重复意见只保留一条待处理项，并可锁定段落、比较版本', color: '#5b4d8e' },
}
const roleIcon = (role: Role) => role === 'author' ? <FileDoneOutlined /> : role === 'reviewer' ? <CommentOutlined /> : <BranchesOutlined />
const formatDate = (value: number) => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function App() {
  const {
    role, paragraphs, comments, versions, selectedParagraphId, commentFilter, revisionMode, dirty, conflicts, legacyNotice, past, future,
    setRole, selectParagraph, setCommentFilter, setRevisionMode, updateParagraph, addComment, replyComment,
    resolveSuggestion, mergeDuplicates, refreshComment, withdrawComment, toggleLock, createVersion,
    addConflict, resolveConflict, dismissConflict, dismissLegacyNotice, undo, redo, save, resetDemo,
  } = useReviewStore()
  const [composerOpen, setComposerOpen] = useState(false)
  const [commentType, setCommentType] = useState<CommentType>('comment')
  const [commentBody, setCommentBody] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [quote, setQuote] = useState('')
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [versionOpen, setVersionOpen] = useState(false)
  const [versionA, setVersionA] = useState(versions[1]?.id ?? versions[0]?.id)
  const [versionB, setVersionB] = useState(versions[0]?.id)
  const [versionLabel, setVersionLabel] = useState('')

  const selected = paragraphs.find((paragraph) => paragraph.id === selectedParagraphId) ?? paragraphs[0]
  const sections = useMemo(() => Array.from(new Set(paragraphs.map((paragraph) => paragraph.section))), [paragraphs])
  const paragraphById = useMemo(() => new Map(paragraphs.map((paragraph) => [paragraph.id, paragraph])), [paragraphs])

  const isStaleComment = (comment: Comment, paragraph?: Paragraph) => {
    if (!paragraph || comment.status !== 'open') return false
    return comment.revision < paragraph.revision || (comment.mergedFrom ?? []).some((source) => source.revision < paragraph.revision)
  }
  const commentVersionState = (comment: Comment, paragraph?: Paragraph) => {
    if (!paragraph) return 'current' as const
    const behind = comment.revision < paragraph.revision || (comment.mergedFrom ?? []).some((source) => source.revision < paragraph.revision)
    if (!behind) return 'current' as const
    return comment.status === 'open' ? 'stale' as const : 'historical' as const
  }
  const revisionLabel = (paragraphId: string, revision: number) => {
    for (const version of versions) {
      const versionParagraph = version.paragraphs.find((paragraph) => paragraph.id === paragraphId)
      if (versionParagraph?.revision === revision) return version.label
    }
    return `当前草稿修订 #${revision}`
  }

  const primaryComments = useMemo(() => comments.filter((comment) => comment.status !== 'merged'), [comments])
  const staleCommentIds = useMemo(() => new Set(comments.filter((comment) => isStaleComment(comment, paragraphById.get(comment.paragraphId))).map((comment) => comment.id)), [comments, paragraphById])
  const paragraphCommentCounts = useMemo(() => primaryComments.reduce<Record<string, number>>((acc, comment) => {
    acc[comment.paragraphId] = (acc[comment.paragraphId] ?? 0) + 1
    return acc
  }, {}), [primaryComments])
  const paragraphStaleCounts = useMemo(() => primaryComments.reduce<Record<string, number>>((acc, comment) => {
    if (staleCommentIds.has(comment.id)) acc[comment.paragraphId] = (acc[comment.paragraphId] ?? 0) + 1
    return acc
  }, {}), [primaryComments, staleCommentIds])
  const duplicateParagraphIds = useMemo(() => {
    const openCounts = primaryComments.reduce<Record<string, number>>((acc, comment) => {
      if (comment.status === 'open') acc[comment.paragraphId] = (acc[comment.paragraphId] ?? 0) + 1
      return acc
    }, {})
    return new Set(Object.entries(openCounts).filter(([, count]) => count > 1).map(([id]) => id))
  }, [primaryComments])

  const visibleComments = useMemo(() => primaryComments.filter((comment) => {
    const paragraph = paragraphById.get(comment.paragraphId)
    if (commentFilter === 'open') return comment.status === 'open'
    if (commentFilter === 'stale') return isStaleComment(comment, paragraph)
    if (commentFilter === 'suggestion') return comment.type === 'suggestion' && comment.status === 'open'
    if (commentFilter === 'duplicate') return comment.status === 'open' && duplicateParagraphIds.has(comment.paragraphId)
    return true
  }).sort((a, b) => b.createdAt - a.createdAt), [commentFilter, primaryComments, paragraphById, duplicateParagraphIds])
  const openCount = comments.filter((comment) => comment.status === 'open').length
  const staleCount = staleCommentIds.size
  const latestRevision = paragraphs.reduce((max, paragraph) => Math.max(max, paragraph.revision), 0)

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
      const state = useReviewStore.getState()
      const index = state.paragraphs.findIndex((paragraph) => paragraph.id === state.selectedParagraphId)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        event.shiftKey ? state.redo() : state.undo()
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault(); state.redo()
      } else if (event.key.toLowerCase() === 'j') {
        event.preventDefault(); const next = state.paragraphs[Math.min(state.paragraphs.length - 1, index + 1)]; if (next) state.selectParagraph(next.id)
      } else if (event.key.toLowerCase() === 'k') {
        event.preventDefault(); const previous = state.paragraphs[Math.max(0, index - 1)]; if (previous) state.selectParagraph(previous.id)
      } else if (event.key.toLowerCase() === 't') {
        event.preventDefault(); state.setRevisionMode(!state.revisionMode)
      } else if (event.key.toLowerCase() === 'l' && state.role === 'editor') {
        event.preventDefault(); state.toggleLock(state.selectedParagraphId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const scrollToParagraph = (id: string) => {
    selectParagraph(id)
    document.getElementById(`paragraph-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const openComposer = (type: CommentType) => {
    const selectedText = window.getSelection()?.toString().trim()
    setQuote(selectedText && selected?.text.includes(selectedText) ? selectedText : selected?.text.slice(0, 64) ?? '')
    setSuggestion(type === 'suggestion' ? selected?.text ?? '' : '')
    setCommentType(type)
    setComposerOpen(true)
  }
  const submitComment = () => {
    if (!selected || !commentBody.trim()) { message.warning('请填写批注内容'); return }
    addComment({ paragraphId: selected.id, type: commentType, quote, body: commentBody.trim(), suggestion: commentType === 'suggestion' ? suggestion : undefined })
    setCommentBody(''); setSuggestion(''); setQuote(''); setComposerOpen(false)
    message.success(commentType === 'suggestion' ? '修改建议已提交' : '段落批注已添加')
  }
  const refreshQuote = (comment: Comment) => {
    const paragraph = paragraphById.get(comment.paragraphId)
    if (!paragraph) return
    const selectedText = window.getSelection()?.toString().trim()
    const nextQuote = selectedText && paragraph.text.includes(selectedText) ? selectedText : paragraph.text.slice(0, 90)
    refreshComment(comment.id, nextQuote)
    message.success('引用已刷新，意见已确认到当前修订')
  }
  const handleMockConflict = async () => {
    if (!selected) return
    const response = await submitRemotePatch(selected)
    addConflict({
      id: `conflict-${Date.now()}`, paragraphId: selected.id, localText: selected.text, remoteText: response.remoteText,
      localAuthor: roleMeta[role].label, remoteAuthor: response.remoteAuthor, detectedAt: Date.now(),
    })
    message.warning('模拟接口返回了同段落的远端修改，请处理冲突')
  }
  const handleCreateVersion = () => {
    createVersion(versionLabel)
    setVersionLabel('')
    message.success('当前版本已保存')
  }
  const comparedA = versions.find((version) => version.id === versionA)
  const comparedB = versions.find((version) => version.id === versionB)
  const comparedRows = comparedA && comparedB ? comparedA.paragraphs.map((paragraph, index) => ({ a: paragraph, b: comparedB.paragraphs[index] })) : []

  const renderMergedSource = (source: MergedCommentSource, paragraph: Paragraph) => (
    <div key={source.id} className="merged-source">
      <div className="merged-source-meta">
        <b>{source.author}</b>
        <Tag>{source.type === 'suggestion' ? '建议' : '批注'}</Tag>
        <Tag color={source.revision < paragraph.revision ? 'orange' : 'cyan'}>修订 #{source.revision}</Tag>
      </div>
      <button className="quote-line" onClick={() => scrollToParagraph(paragraph.id)}>“{source.quote}”</button>
      <p>{source.body}</p>
      {source.suggestion && <div className="suggestion-box"><small>建议改为</small><p>{source.suggestion}</p></div>}
      {source.replies.length > 0 && (
        <div className="replies">
          {source.replies.map((reply) => <div key={reply.id} className="reply"><b>{reply.author}</b><span>{reply.body}</span></div>)}
        </div>
      )}
    </div>
  )

  return (
    <div className="review-app">
      <header className="app-header">
        <div className="paper-identity">
          <div className="paper-mark">CR</div>
          <div><h1>学术论文协作审阅台</h1><p>Collaborative Research Review · MS-2026-0417</p></div>
        </div>
        <div className="role-switch">
          <Segmented block value={role} onChange={(value) => setRole(value as Role)} options={(Object.keys(roleMeta) as Role[]).map((item) => ({ label: <span>{roleIcon(item)} {roleMeta[item].label.replace('工作区', '')}</span>, value: item }))} />
        </div>
        <Space>
          <Badge dot={dirty}><Button icon={<SaveOutlined />} onClick={() => { save(); message.success('草稿已保存到浏览器') }}>保存</Button></Badge>
          <Button icon={<UndoOutlined />} disabled={!past.length} onClick={undo} />
          <Button icon={<RedoOutlined />} disabled={!future.length} onClick={redo} />
          <Button danger={conflicts.length > 0} icon={<SwapOutlined />} onClick={() => void handleMockConflict()}>模拟冲突</Button>
        </Space>
      </header>

      <div className="role-banner" style={{ '--role-color': roleMeta[role].color } as React.CSSProperties}>
        <span className="role-badge">{roleIcon(role)} {roleMeta[role].label}</span>
        <span>{roleMeta[role].description}</span>
        <span className="paper-state"><FileTextOutlined /> 当前最高段落修订 #{latestRevision}</span>
      </div>

      {legacyNotice && (
        <div className="legacy-notice">
          <Alert
            type="info" showIcon closable message="已为这份旧草稿自动建立版本快照"
            description="旧草稿打开时完成归档；批注、接受、拒绝和合并等处理状态在重开后仍保持原样。"
            onClose={dismissLegacyNotice}
          />
        </div>
      )}

      {conflicts.length > 0 && (
        <div className="conflict-stack">
          {conflicts.map((conflict) => (
            <Alert
              key={conflict.id} type="error" showIcon message={`段落冲突：${conflict.localAuthor} 与 ${conflict.remoteAuthor} 同时修改`}
              description={(
                <div className="conflict-content">
                  <div><b>本页版本</b><p>{conflict.localText}</p></div>
                  <div><b>模拟远端版本</b><p>{conflict.remoteText}</p></div>
                  <Space><Button size="small" onClick={() => resolveConflict(conflict.id, 'local')}>保留本页</Button><Button size="small" type="primary" onClick={() => resolveConflict(conflict.id, 'remote')}>采用远端</Button><Button size="small" type="text" onClick={() => dismissConflict(conflict.id)}>稍后处理</Button></Space>
                </div>
              )}
            />
          ))}
        </div>
      )}

      <main className="workspace">
        <aside className="toc-panel">
          <div className="panel-title"><MenuFoldOutlined /> 侧边目录</div>
          <nav>
            {sections.map((section) => (
              <div key={section} className="toc-section">
                <strong>{section}</strong>
                {paragraphs.filter((paragraph) => paragraph.section === section).map((paragraph) => (
                  <button key={paragraph.id} className={paragraph.id === selected?.id ? 'active' : ''} onClick={() => scrollToParagraph(paragraph.id)}>
                    <span>{paragraph.number}</span>
                    <span>{paragraph.text.slice(0, 24)}…</span>
                    {paragraph.status === 'locked' && <LockOutlined />}
                    {paragraph.revisionPending && <Badge status="warning" />}
                    {!!paragraphCommentCounts[paragraph.id] && <Badge count={paragraphCommentCounts[paragraph.id]} size="small" />}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="version-box">
            <div className="panel-title"><HistoryOutlined /> 版本</div>
            <Input value={versionLabel} onChange={(event) => setVersionLabel(event.target.value)} placeholder="新版本名称" onPressEnter={handleCreateVersion} />
            <Button block icon={<PlusOutlined />} onClick={handleCreateVersion}>保存当前版本</Button>
            <Button block icon={<DiffOutlined />} onClick={() => setVersionOpen(true)}>比较两个版本</Button>
          </div>
        </aside>

        <section className="document-panel">
          <div className="document-toolbar">
            <div><h2>大语言模型辅助下的开源维护协作研究</h2><p>作者：林晓、陈默、王远 · 最近保存 {formatDate(Date.now())}</p></div>
            <Space>
              <Checkbox checked={revisionMode} onChange={(event) => setRevisionMode(event.target.checked)}>修订模式</Checkbox>
              {staleCount > 0 && <Tag color="orange" icon={<SyncOutlined />}>{staleCount} 条待复核</Tag>}
              <Tag color={dirty ? 'gold' : 'green'}>{dirty ? '有未保存修改' : '已保存'}</Tag>
            </Space>
          </div>

          <div className="paper-sheet">
            <div className="paper-kicker">RESEARCH ARTICLE · CONFIDENTIAL REVIEW</div>
            {sections.map((section) => (
              <section key={section} className="paper-section">
                <h3>{section}</h3>
                {paragraphs.filter((paragraph) => paragraph.section === section).map((paragraph) => (
                  <article
                    id={`paragraph-${paragraph.id}`} key={paragraph.id} onMouseUp={() => setQuote(window.getSelection()?.toString().trim() ?? '')}
                    className={`paragraph-card ${paragraph.id === selected?.id ? 'selected' : ''} ${paragraph.highlighted ? 'highlighted' : ''} ${paragraph.status === 'locked' ? 'locked' : ''} ${paragraph.revisionPending ? 'pending-review' : ''}`}
                    onClick={() => selectParagraph(paragraph.id)}
                  >
                    <div className="paragraph-meta">
                      <span className="paragraph-no">{paragraph.number}</span>
                      <span>段落 {paragraph.number.replace('.', '')}</span>
                      <Tag color={paragraph.revisionPending ? 'orange' : 'default'}>修订 #{paragraph.revision}</Tag>
                      {paragraph.status === 'locked' && <Tag icon={<LockOutlined />} color="purple">已锁定</Tag>}
                      {paragraph.status === 'accepted' && <Tag icon={<CheckOutlined />} color="green">已确认</Tag>}
                      {paragraph.revisionPending && <Tag icon={<SyncOutlined />} color="orange">{paragraphStaleCounts[paragraph.id] ?? 1} 条待复核</Tag>}
                      {!!paragraphCommentCounts[paragraph.id] && <Tag icon={<MessageOutlined />}>{paragraphCommentCounts[paragraph.id]} 条意见</Tag>}
                    </div>
                    {revisionMode ? (
                      <div className="revision-grid">
                        <div><small>原稿</small><p>{paragraph.original}</p></div>
                        <div><small>当前修订 #{paragraph.revision}</small><p>{paragraph.text}</p></div>
                      </div>
                    ) : role === 'author' ? (
                      <Input.TextArea autoSize={{ minRows: 2, maxRows: 8 }} value={paragraph.text} readOnly={paragraph.status === 'locked'} onChange={(event) => updateParagraph(paragraph.id, event.target.value)} />
                    ) : (
                      <p className="paragraph-text">{paragraph.text}</p>
                    )}
                    <div className="paragraph-actions">
                      {role === 'reviewer' && <><Button size="small" icon={<CommentOutlined />} onClick={(event) => { event.stopPropagation(); selectParagraph(paragraph.id); openComposer('comment') }}>添加批注</Button><Button size="small" icon={<FileDoneOutlined />} onClick={(event) => { event.stopPropagation(); selectParagraph(paragraph.id); openComposer('suggestion') }}>提出建议</Button></>}
                      {role === 'editor' && <Button size="small" icon={paragraph.status === 'locked' ? <UnlockOutlined /> : <LockOutlined />} onClick={(event) => { event.stopPropagation(); toggleLock(paragraph.id) }}>{paragraph.status === 'locked' ? '解除锁定' : '锁定段落'}</Button>}
                      {role === 'author' && <span className="author-tip">修改正文后，对应旧意见将自动转入待复核</span>}
                    </div>
                  </article>
                ))}
              </section>
            ))}
          </div>
        </section>

        <aside className="comments-panel">
          <div className="comments-header">
            <div><h2><CommentOutlined /> 审阅意见 <Badge count={openCount} /></h2><p>每条意见保留提交时的段落版本；合并组只显示一条待处理项</p></div>
          </div>
          <div className="comment-filters">
            <Radio.Group value={commentFilter} onChange={(event) => setCommentFilter(event.target.value)} buttonStyle="solid" size="small">
              <Radio.Button value="all">全部</Radio.Button><Radio.Button value="open">待处理</Radio.Button><Radio.Button value="stale">待复核</Radio.Button><Radio.Button value="suggestion">建议</Radio.Button><Radio.Button value="duplicate">重复</Radio.Button>
            </Radio.Group>
          </div>
          <div className="comment-list">
            {visibleComments.map((comment) => {
              const paragraph = paragraphById.get(comment.paragraphId)
              const stale = isStaleComment(comment, paragraph)
              const versionState = commentVersionState(comment, paragraph)
              const sourceCount = comment.mergedFrom?.length ?? 0
              return (
                <Card key={comment.id} size="small" className={`comment-card ${comment.status} ${stale ? 'stale' : ''}`} title={<span>{comment.author} <Tag>{comment.type === 'suggestion' ? '修改建议' : '段落批注'}</Tag></span>} extra={<small>{formatDate(comment.createdAt)}</small>}>
                  <div className="comment-version-row">
                    <Tag color={versionState === 'stale' ? 'orange' : versionState === 'historical' ? 'default' : 'cyan'}>{versionState === 'stale' ? '待复核' : versionState === 'historical' ? '旧版本' : '当前版本'}</Tag>
                    <small>提交于：{revisionLabel(comment.paragraphId, comment.revision)} · #{comment.revision}</small>
                  </div>
                  <button className="quote-line" onClick={() => paragraph && scrollToParagraph(paragraph.id)}>“{comment.quote}” · 段落 {paragraph?.number}{paragraph ? ` · 当前 #${paragraph.revision}` : ''}</button>
                  <p className="comment-body">{comment.body}</p>
                  {comment.suggestion && <div className="suggestion-box"><small>建议改为</small><p>{comment.suggestion}</p></div>}
                  {stale && (
                    <Alert
                      className="stale-alert" type="warning" showIcon
                      message="正文已改动，审稿人需重新确认"
                      description={paragraph ? `当前为修订 #${paragraph.revision}，请刷新引用并确认；在确认前作者不能接受或拒绝。` : '对应段落已不可用。'}
                    />
                  )}
                  <div className="status-tags">
                    {comment.status === 'accepted' && <Tag color="green">已接受</Tag>}
                    {comment.status === 'rejected' && <Tag color="red">已拒绝</Tag>}
                    {comment.status === 'withdrawn' && <Tag>审稿人已撤回</Tag>}
                    {sourceCount > 0 && <Tag color="geekblue" icon={<BranchesOutlined />}>已合并 {sourceCount} 条重复意见</Tag>}
                    {comment.refreshedAt && <small>最近确认 {formatDate(comment.refreshedAt)}</small>}
                  </div>
                  {sourceCount > 0 && paragraph && (
                    <Collapse
                      ghost size="small"
                      items={[{ key: 'sources', label: `查看组内 ${sourceCount} 条原话与回复`, children: <div className="merged-list">{comment.mergedFrom!.map((source) => renderMergedSource(source, paragraph))}</div> }]}
                    />
                  )}
                  {comment.status !== 'withdrawn' && (
                    <>
                      <div className="replies">
                        {comment.replies.map((reply) => <div key={reply.id} className="reply"><b>{reply.author}</b><span>{reply.body}</span></div>)}
                      </div>
                      <div className="reply-box">
                        <Input size="small" value={replyDrafts[comment.id] ?? ''} onChange={(event) => setReplyDrafts((drafts) => ({ ...drafts, [comment.id]: event.target.value }))} placeholder="回复到这条待处理项…" onPressEnter={() => { const body = replyDrafts[comment.id]?.trim(); if (body) { replyComment(comment.id, body); setReplyDrafts((drafts) => ({ ...drafts, [comment.id]: '' })) } }} />
                        <Button size="small" type="text" icon={<SendOutlined />} onClick={() => { const body = replyDrafts[comment.id]?.trim(); if (body) { replyComment(comment.id, body); setReplyDrafts((drafts) => ({ ...drafts, [comment.id]: '' })) } }} />
                      </div>
                    </>
                  )}
                  {comment.status === 'open' && (
                    <div className="decision-row">
                      {role === 'reviewer' && stale && <Button type="primary" size="small" icon={<SyncOutlined />} onClick={() => refreshQuote(comment)}>刷新引用并确认</Button>}
                      {role === 'reviewer' && <Popconfirm title="撤回这条意见？" description="撤回后作者和编辑将不再处理，组内原话仍可在合并记录中查看。" onConfirm={() => { withdrawComment(comment.id); message.success('意见已撤回') }} okText="撤回" cancelText="取消"><Button size="small" icon={<StopOutlined />}>撤回意见</Button></Popconfirm>}
                      {role === 'author' && comment.type === 'suggestion' && (
                        stale ? (
                          <Tooltip title="只有对应当前段落修订的建议，作者才能接受或拒绝">
                            <span><Button type="primary" size="small" disabled icon={<CheckOutlined />}>接受修改</Button><Button danger size="small" disabled icon={<CloseOutlined />}>拒绝</Button></span>
                          </Tooltip>
                        ) : (
                          <><Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => resolveSuggestion(comment.id, true)}>接受修改</Button><Button danger size="small" icon={<CloseOutlined />} onClick={() => resolveSuggestion(comment.id, false)}>拒绝</Button></>
                        )
                      )}
                      {role === 'editor' && duplicateParagraphIds.has(comment.paragraphId) && (
                        <Popconfirm title="合并这一组重复意见？" description="只保留最早的一条待处理项，其他原话、建议和回复会保存在组内记录。" onConfirm={() => { mergeDuplicates(comment.paragraphId); message.success('重复意见已合并') }} okText="合并" cancelText="取消">
                          <Button size="small" type="dashed" icon={<BranchesOutlined />}>合并本组重复意见</Button>
                        </Popconfirm>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
            {!visibleComments.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前筛选下没有意见" />}
          </div>
          <div className="keyboard-hint"><span><kbd>J</kbd>/<kbd>K</kbd> 段落导航</span><span><kbd>T</kbd> 修订模式</span>{role === 'editor' && <span><kbd>L</kbd> 锁定</span>}<span><kbd>⌘Z</kbd> 撤销</span></div>
        </aside>
      </main>

      <Modal title={commentType === 'suggestion' ? '提出修改建议' : '添加段落批注'} open={composerOpen} onCancel={() => setComposerOpen(false)} onOk={submitComment} okText="提交" width={620}>
        <div className="composer">
          <label>引用原文（自动记录当前段落修订 #{selected?.revision ?? 1}）</label>
          <Input.TextArea value={quote} onChange={(event) => setQuote(event.target.value)} autoSize={{ minRows: 2, maxRows: 4 }} />
          <label>{commentType === 'suggestion' ? '建议改为' : '批注内容'}</label>
          {commentType === 'suggestion' && <Input.TextArea value={suggestion} onChange={(event) => setSuggestion(event.target.value)} autoSize={{ minRows: 3, maxRows: 7 }} />}
          <label>说明</label>
          <Input.TextArea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder="说明修改理由或希望作者关注的问题" autoSize={{ minRows: 2, maxRows: 5 }} />
        </div>
      </Modal>

      <Modal title="版本比较" open={versionOpen} onCancel={() => setVersionOpen(false)} footer={null} width={980}>
        <div className="compare-selectors">
          <Select value={versionA} onChange={setVersionA} options={versions.map((version) => ({ label: `${version.label}${version.source === 'legacy' ? '（旧草稿）' : ''} · ${formatDate(version.createdAt)}`, value: version.id }))} />
          <ArrowRightOutlined />
          <Select value={versionB} onChange={setVersionB} options={versions.map((version) => ({ label: `${version.label}${version.source === 'legacy' ? '（旧草稿）' : ''} · ${formatDate(version.createdAt)}`, value: version.id }))} />
        </div>
        <div className="version-table">
          <div className="version-head"><b>{comparedA?.label ?? '版本 A'}</b><b>{comparedB?.label ?? '版本 B'}</b></div>
          {comparedRows.map(({ a, b }) => (
            <div key={a.id} className={`version-row ${a.text !== b?.text || a.revision !== b?.revision ? 'changed' : ''}`}>
              <div><span>{a.number} · 修订 #{a.revision}</span>{a.text}</div><div><span>{b?.number ?? '—'}{b ? ` · 修订 #${b.revision}` : ''}</span>{b?.text ?? '段落已删除'}</div>
            </div>
          ))}
        </div>
      </Modal>

      <footer className="app-footer">
        <span>本地草稿自动持久化 · 打开旧草稿自动归档 · 处理状态刷新后保留</span>
        <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => { resetDemo(); message.success('已重置示例数据') }}>重置示例</Button>
      </footer>
    </div>
  )
}
