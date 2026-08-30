import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SeverityBadge } from '@/components/severity-badge'
import { History } from 'lucide-react'

type Doc = {
  id: number
  docType: string
  imageName: string | null
  imageHash: string | null
  riskScore: number
  riskLevel: string
  status: string
  extracted: unknown
  createdAt: Date
}

const DOC_LABELS: Record<string, string> = {
  passport: 'Passport',
  visa: 'Visa',
  national_id: 'National ID',
  driving_license: 'Driving License',
  permit: 'Permit',
}

export function DocumentHistory({ docs }: { docs: Doc[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-primary" /> Screening History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No documents screened yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Evidence hash</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => {
                  const name =
                    (d.extracted as { name?: string } | null)?.name ?? d.imageName ?? 'Unknown'
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {DOC_LABELS[d.docType] ?? d.docType}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {d.imageHash ? `${d.imageHash.slice(0, 12)}…` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{d.riskScore}</span>
                          <SeverityBadge level={d.riskLevel as never} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs capitalize text-muted-foreground">{d.status}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(d.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
