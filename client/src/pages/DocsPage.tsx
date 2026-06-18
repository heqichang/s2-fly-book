import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DocSidebar from '../components/Doc/DocSidebar'
import DocEditor from '../components/Doc/DocEditor'
import DocList from '../components/Doc/DocList'
import CreateDocModal from '../components/Doc/CreateDocModal'
import CreateFolderModal from '../components/Doc/CreateFolderModal'
import type { Document, DocFolder } from '../types'

type DocViewType = 'recent' | 'favorite' | 'team'

function DocsPage() {
  const { id: docId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [viewType, setViewType] = useState<DocViewType>('recent')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [listKey, setListKey] = useState(0)

  const [showCreateDocModal, setShowCreateDocModal] = useState(false)
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)

  const handleSelectDocument = useCallback((documentId: string) => {
    navigate(`/docs/${documentId}`)
  }, [navigate])

  const handleSelectTeam = useCallback((teamId: string) => {
    setViewType('team')
    setSelectedTeamId(teamId)
    setSelectedFolderId(null)
  }, [])

  const handleSelectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId)
  }, [])

  const handleViewChange = useCallback((view: DocViewType) => {
    setViewType(view)
    if (view !== 'team') {
      setSelectedTeamId(null)
      setSelectedFolderId(null)
    }
  }, [])

  const handleBackToList = useCallback(() => {
    navigate('/docs')
  }, [navigate])

  const handleCreateDoc = useCallback(() => {
    if (viewType === 'team' && selectedTeamId) {
      setShowCreateDocModal(true)
    }
  }, [viewType, selectedTeamId])

  const handleCreateFolder = useCallback(() => {
    if (viewType === 'team' && selectedTeamId) {
      setShowCreateFolderModal(true)
    }
  }, [viewType, selectedTeamId])

  const handleDocCreated = useCallback((doc: Document) => {
    setShowCreateDocModal(false)
    setListKey((prev) => prev + 1)
    navigate(`/docs/${doc.id}`)
  }, [navigate])

  const handleFolderCreated = useCallback((_folder: DocFolder) => {
    setShowCreateFolderModal(false)
    setListKey((prev) => prev + 1)
  }, [])

  if (docId) {
    return (
      <div className="h-full flex flex-col bg-white">
        <DocEditor documentId={docId} onBack={handleBackToList} />
      </div>
    )
  }

  return (
    <div className="h-full flex bg-white overflow-hidden">
      <div className="w-[280px] bg-[#f5f6f7] flex flex-col flex-shrink-0 border-r border-gray-100">
        <DocSidebar
          viewType={viewType}
          selectedTeamId={selectedTeamId}
          onSelectView={handleViewChange}
          onSelectTeam={handleSelectTeam}
          onCreateDoc={handleCreateDoc}
          onCreateFolder={handleCreateFolder}
        />
      </div>
      <main className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
        <DocList
          key={listKey}
          viewType={viewType}
          teamId={selectedTeamId}
          folderId={selectedFolderId}
          onOpenDocument={handleSelectDocument}
          onSelectFolder={handleSelectFolder}
          onCreateDoc={handleCreateDoc}
          onCreateFolder={handleCreateFolder}
        />
      </main>

      {selectedTeamId && (
        <>
          <CreateDocModal
            visible={showCreateDocModal}
            onClose={() => setShowCreateDocModal(false)}
            onCreated={handleDocCreated}
            teamId={selectedTeamId}
            folderId={selectedFolderId || undefined}
          />
          <CreateFolderModal
            visible={showCreateFolderModal}
            onClose={() => setShowCreateFolderModal(false)}
            onCreated={handleFolderCreated}
            teamId={selectedTeamId}
            parentId={selectedFolderId || undefined}
          />
        </>
      )}
    </div>
  )
}

export default DocsPage
