'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { addCamera, deleteCamera, setCameraStatus } from '@/app/(app)/actions/cameras'
import { ingestEvent } from '@/app/(app)/actions/surveillance'
import { toast } from 'sonner'
import { Lock, MapPin, Plus, Trash2, Video, VideoOff, TriangleAlert } from 'lucide-react'

type CameraRow = {
  id: number
  name: string
  location: string
  lat: string | null
  lng: string | null
  status: string
  rtspHint: string | null
  lastHeartbeat: Date | string | null
}

export function CamerasManager({
  initialCameras,
  canManage,
}: {
  initialCameras: CameraRow[]
  canManage: boolean
}) {
  const [cameras, setCameras] = useState(initialCameras)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', location: '', lat: '', lng: '', rtspUrl: '' })
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!form.name || !form.location) {
      toast.error('Name and location are required')
      return
    }
    startTransition(async () => {
      try {
        const { id } = await addCamera(form)
        setCameras((prev) => [
          {
            id,
            name: form.name,
            location: form.location,
            lat: form.lat || null,
            lng: form.lng || null,
            status: 'online',
            rtspHint: form.rtspUrl ? 'rtsp://••••••@••••' : null,
            lastHeartbeat: new Date().toISOString(),
          },
          ...prev,
        ])
        setForm({ name: '', location: '', lat: '', lng: '', rtspUrl: '' })
        setOpen(false)
        toast.success('Camera registered (RTSP credentials encrypted at rest)')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add camera')
      }
    })
  }

  function toggleStatus(cam: CameraRow, status: 'online' | 'offline' | 'tamper') {
    startTransition(async () => {
      try {
        await setCameraStatus(cam.id, status)
        setCameras((prev) =>
          prev.map((c) => (c.id === cam.id ? { ...c, status } : c)),
        )
        // Offline / tamper transitions raise real surveillance events.
        if (status === 'offline' || status === 'tamper') {
          await ingestEvent({
            cameraId: cam.id,
            cameraName: cam.name,
            location: cam.location,
            eventType: status === 'offline' ? 'CAMERA_OFFLINE' : 'CAMERA_TAMPER',
          })
          toast.warning(`${cam.name}: ${status === 'offline' ? 'offline' : 'tampering'} alert raised`)
        } else {
          toast.success(`${cam.name} back online`)
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update status')
      }
    })
  }

  function remove(id: number) {
    startTransition(async () => {
      try {
        await deleteCamera(id)
        setCameras((prev) => prev.filter((c) => c.id !== id))
        toast.success('Camera removed')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove camera')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="size-4" /> Register camera
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register camera</DialogTitle>
                <DialogDescription>
                  RTSP credentials are encrypted with AES-256-GCM before being stored and are never
                  returned to the browser.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cam-name">Name</Label>
                  <Input
                    id="cam-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Gate Cam 01"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cam-loc">Location</Label>
                  <Input
                    id="cam-loc"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="North Checkpoint - Lane 2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cam-lat">Latitude</Label>
                    <Input
                      id="cam-lat"
                      value={form.lat}
                      onChange={(e) => setForm({ ...form, lat: e.target.value })}
                      placeholder="28.61"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cam-lng">Longitude</Label>
                    <Input
                      id="cam-lng"
                      value={form.lng}
                      onChange={(e) => setForm({ ...form, lng: e.target.value })}
                      placeholder="77.20"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cam-rtsp" className="flex items-center gap-1.5">
                    <Lock className="size-3.5 text-primary" /> RTSP URL (encrypted)
                  </Label>
                  <Input
                    id="cam-rtsp"
                    value={form.rtspUrl}
                    onChange={(e) => setForm({ ...form, rtspUrl: e.target.value })}
                    placeholder="rtsp://user:pass@192.168.1.50:554/stream"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button disabled={pending} onClick={submit}>
                  Register
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cameras.length === 0 && (
          <Card className="col-span-full flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Video className="size-8 opacity-40" />
            <p className="text-sm">
              No cameras registered yet.{canManage ? ' Register one to get started.' : ''}
            </p>
          </Card>
        )}
        {cameras.map((cam) => (
          <Card key={cam.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{cam.name}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {cam.location}
                </span>
              </div>
              <StatusBadge status={cam.status} />
            </div>
            {cam.rtspHint && (
              <div className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1.5 font-mono text-xs text-muted-foreground">
                <Lock className="size-3 text-primary" />
                {cam.rtspHint}
              </div>
            )}
            {canManage && (
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || cam.status === 'online'}
                  onClick={() => toggleStatus(cam, 'online')}
                >
                  <Video className="size-3.5" /> Online
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || cam.status === 'offline'}
                  onClick={() => toggleStatus(cam, 'offline')}
                >
                  <VideoOff className="size-3.5" /> Offline
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending || cam.status === 'tamper'}
                  onClick={() => toggleStatus(cam, 'tamper')}
                >
                  <TriangleAlert className="size-3.5" /> Tamper
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={pending}
                  onClick={() => remove(cam.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'online')
    return (
      <Badge className="gap-1 bg-[var(--sev-low)] text-black hover:bg-[var(--sev-low)]">
        <span className="size-1.5 rounded-full bg-black/70" /> Online
      </Badge>
    )
  if (status === 'tamper')
    return (
      <Badge className="gap-1 bg-[var(--sev-critical)] text-white hover:bg-[var(--sev-critical)]">
        Tamper
      </Badge>
    )
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      Offline
    </Badge>
  )
}
