import { PageHeader } from '@/components/page-header'
import { ScreeningPanel } from '@/components/documents/screening-panel'
import { DocumentHistory } from '@/components/documents/document-history'
import { getDocuments } from '@/app/(app)/actions/documents'
import { FileScan } from 'lucide-react'

export default async function DocumentsPage() {
  const docs = await getDocuments()

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileScan className="size-5" />}
        title="Document Screening"
        description="AI-powered OCR extraction, validation, tampering detection, and face verification for identity and travel documents."
      />
      <ScreeningPanel />
      <DocumentHistory docs={docs} />
    </div>
  )
}
