'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { RiskMeter } from '@/components/risk-meter'
import { SeverityBadge } from '@/components/severity-badge'
import { screenAndSaveDocument } from '@/app/(app)/actions/documents'
import type { DocType, ScreeningResult } from '@/lib/ai/document-screening'
import { Upload, ScanLine, UserCheck, FileWarning, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'visa', label: 'Visa' },
  { value: 'national_id', label: 'National ID' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'permit', label: 'Permit / Travel Authorization' },
]

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the selected file'))
    reader.readAsDataURL(file)
  })
}

export function ScreeningPanel() {
  const router = useRouter()
  const [docType, setDocType] = useState<DocType>('passport')
  const [docImage, setDocImage] = useState<{ name: string; url: string } | null>(null)
  const [selfie, setSelfie] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ScreeningResult | null>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const selfieInputRef = useRef<HTMLInputElement>(null)

  async function onDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await readAsDataUrl(file)
      setDocImage({ name: file.name, url })
      setResult(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read the file')
    }
  }

  async function onSelfieChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setSelfie(await readAsDataUrl(file))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read the file')
    }
  }

  async function run() {
    if (!docImage) {
      toast.error('Upload a document image first')
      return
    }
    setRunning(true)
    setResult(null)
    try {
      const saved = await screenAndSaveDocument({
        docType,
        imageName: docImage.name,
        imageDataUrl: docImage.url,
        selfieDataUrl: selfie ?? undefined,
      })
      setResult({
        extracted: saved.extracted as ScreeningResult['extracted'],
        validation: saved.validation as ScreeningResult['validation'],
        tampering: saved.tampering as ScreeningResult['tampering'],
        faceMatch: saved.faceMatch as ScreeningResult['faceMatch'],
        riskScore: saved.riskScore,
        riskLevel: saved.riskLevel as ScreeningResult['riskLevel'],
      })
      toast.success('Screening complete and recorded to audit ledger')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Screening failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="size-4 text-primary" /> New Screening
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Document type</Label>
            <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Document image</Label>
            <input
              ref={docInputRef}
              type="file"
              accept="image/*"
              onChange={onDocChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {docImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={docImage.url || '/placeholder.svg'}
                  alt="Document preview"
                  className="max-h-40 rounded object-contain"
                />
              ) : (
                <>
                  <Upload className="size-5" />
                  Click to upload document
                </>
              )}
            </button>
            {docImage ? (
              <p className="truncate text-xs text-muted-foreground">{docImage.name}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <UserCheck className="size-3.5" /> Live selfie{' '}
              <span className="text-muted-foreground">(optional, for face match)</span>
            </Label>
            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              onChange={onSelfieChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selfieInputRef.current?.click()}
            >
              {selfie ? 'Selfie attached' : 'Attach selfie'}
            </Button>
          </div>

          <Button onClick={run} disabled={running || !docImage} className="w-full">
            {running ? 'Analyzing document...' : 'Run AI Screening'}
          </Button>
          {running ? <Progress value={66} className="h-1" /> : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!result ? (
          <Card className="flex h-full min-h-64 items-center justify-center">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <FileWarning className="size-8 opacity-40" />
              Upload a document and run screening to see the OCR extraction, validation, tampering
              analysis, and risk score.
            </CardContent>
          </Card>
        ) : (
          <ResultView result={result} />
        )}
      </div>
    </div>
  )
}

function ResultView({ result }: { result: ScreeningResult }) {
  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <RiskMeter score={result.riskScore} level={result.riskLevel} />
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommendation</p>
            <p className="mt-1 text-sm font-medium">
              {result.riskLevel === 'critical' || result.riskLevel === 'high'
                ? 'Refer for secondary inspection'
                : result.riskLevel === 'medium'
                  ? 'Manual review advised'
                  : 'Clear for processing'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ScanLine className="size-4 text-primary" /> Module 1 — OCR Extraction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {Object.entries(result.extracted).map(([k, v]) =>
              v ? (
                <div key={k} className="min-w-0">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {k.replace(/([A-Z])/g, ' $1')}
                  </dt>
                  <dd className="truncate font-mono text-foreground">{String(v)}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Module 2 — Validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {result.validation.checks.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {c.passed ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--sev-low)]" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <span className={c.passed ? 'text-muted-foreground' : 'text-foreground'}>
                {c.label}
                {c.detail ? <span className="text-muted-foreground"> — {c.detail}</span> : null}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Module 3 — Tampering Detection</span>
            <SeverityBadge level={result.tampering.severity} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {result.tampering.signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tampering signals detected.</p>
          ) : (
            result.tampering.signals.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <FileWarning className="mt-0.5 size-4 shrink-0 text-[var(--sev-high)]" />
                <span>
                  <span className="font-medium">{s.type}</span>
                  <span className="text-muted-foreground"> — {s.detail}</span>
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Module 4 — Face Verification</CardTitle>
        </CardHeader>
        <CardContent>
          {result.faceMatch.performed ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Match confidence</span>
              <span className="font-mono font-medium">
                {result.faceMatch.matchConfidence}% — {result.faceMatch.verdict}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No selfie provided — face verification skipped.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
