// 知识库管理面板组件
import { useState, useEffect, useCallback } from 'react'
import { DatabaseOutlined, UploadOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons'
import type { KnowledgeDocument } from '../types'

interface KnowledgeBasePanelProps {
  onReturnChat: () => void
}

export function KnowledgeBasePanel({ onReturnChat }: KnowledgeBasePanelProps) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 加载文档列表
  const loadDocuments = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const result = await window.llamaDesktop.listDocuments()
      setDocuments(result.documents || [])
    } catch (error) {
      console.error('加载文档列表失败:', error)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // 定时刷新处理中的文档状态
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'processing')
    
    if (!hasProcessing) return
    
    // 如果有处理中的文档，每 2 秒刷新一次
    const interval = setInterval(() => {
      loadDocuments()
    }, 2000)
    
    return () => clearInterval(interval)
  }, [documents, loadDocuments])

  // 上传文档
  const handleUpload = async () => {
    try {
      const filePath = await window.llamaDesktop.pickFile({
        properties: ['openFile'],
        filters: [
          { name: '文档文件', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'md'] },
        ],
      })

      if (!filePath) return

      setUploading(true)
      const result = await window.llamaDesktop.uploadDocument(filePath)
      
      if (result.ok) {
        // 重新加载列表
        await loadDocuments()
      } else {
        alert(`上传失败: ${result.error}`)
      }
    } catch (error) {
      alert(`上传失败: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setUploading(false)
    }
  }

  // 删除文档
  const handleDelete = async (docId: string) => {
    if (!confirm('确定要删除这个文档吗？')) return

    try {
      const result = await window.llamaDesktop.deleteDocument(docId)
      if (result.ok) {
        await loadDocuments()
      } else {
        alert(`删除失败: ${result.error}`)
      }
    } catch (error) {
      alert(`删除失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return date.toLocaleDateString('zh-CN')
  }

  // 获取状态图标和文本
  const getStatusInfo = (status: KnowledgeDocument['status']) => {
    switch (status) {
      case 'ready':
        return { icon: '✅', text: '就绪', color: '#52c41a' }
      case 'processing':
        return { icon: '🔄', text: '处理中', color: '#1890ff' }
      case 'error':
        return { icon: '❌', text: '错误', color: '#ff4d4f' }
      default:
        return { icon: '⏳', text: '等待中', color: '#faad14' }
    }
  }

  return (
    <div className="terminal-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部区域（固定） */}
      <div style={{ flexShrink: 0 }}>
        {/* 顶部导航栏 */}
        <div style={{ 
          padding: '12px 16px', 
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DatabaseOutlined style={{ fontSize: 18, color: 'var(--green)' }} />
            <strong style={{ fontSize: 14 }}>知识库</strong>
          </div>
          <button 
            type="button" 
            onClick={onReturnChat}
            style={{
              background: 'none',
              border: '1px solid var(--line)',
              borderRadius: 6,
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--ink)',
            }}
          >
            返回聊天
          </button>
        </div>

        {/* 操作栏 */}
        <div style={{ 
          padding: '12px 16px', 
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          gap: 8,
        }}>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: uploading ? 'var(--muted)' : 'var(--green)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <UploadOutlined />
            {uploading ? '上传中...' : '上传文档'}
          </button>
          <button
            type="button"
            onClick={() => loadDocuments(true)}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: 'var(--surface-soft)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13,
            }}
          >
            {loading ? '加载中...' : '刷新'}
          </button>
        </div>

        {/* 统计信息 */}
        <div style={{ 
          padding: '12px 16px', 
          borderBottom: '1px solid var(--line)',
          fontSize: 12,
          color: 'var(--muted)',
        }}>
          共 {documents.length} 个文档，
          {documents.filter(d => d.status === 'ready').length} 个就绪，
          {documents.reduce((sum, d) => sum + (d.chunkCount || 0), 0)} 个文本块
        </div>
      </div>

      {/* 文档列表（可滚动） */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}>
        {documents.length === 0 ? (
          <div style={{ 
            padding: 40, 
            textAlign: 'center', 
            color: 'var(--muted)',
          }}>
            <DatabaseOutlined style={{ fontSize: 48, opacity: 0.3, marginBottom: 16 }} />
            <div style={{ fontSize: 14 }}>暂无文档</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>点击"上传文档"添加文件到知识库</div>
          </div>
        ) : (
          <div>
            {documents.map(doc => {
              const statusInfo = getStatusInfo(doc.status)
              return (
                <div
                  key={doc.id}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    background: 'var(--surface-soft)',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <FileTextOutlined style={{ 
                      fontSize: 20, 
                      color: 'var(--green)',
                      marginTop: 2,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 13, 
                        fontWeight: 500,
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {doc.name}
                      </div>
                      <div style={{ 
                        fontSize: 11, 
                        color: 'var(--muted)',
                        display: 'flex',
                        gap: 12,
                      }}>
                        <span>{formatSize(doc.size)}</span>
                        <span>{formatTime(doc.uploadedAt)}</span>
                        {doc.chunkCount && <span>{doc.chunkCount} 个文本块</span>}
                      </div>
                      {doc.status === 'error' && doc.errorMessage && (
                        <div style={{ 
                          fontSize: 11, 
                          color: '#ff4d4f', 
                          marginTop: 4,
                        }}>
                          错误: {doc.errorMessage}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        fontSize: 11, 
                        color: statusInfo.color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        {statusInfo.icon} {statusInfo.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--muted)',
                          padding: 4,
                          borderRadius: 4,
                        }}
                        title="删除文档"
                      >
                        <DeleteOutlined />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
