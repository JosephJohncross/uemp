import { LoaderCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  destructive?: boolean
  /** Ask for a comment; when required the confirm button stays disabled until one is typed. */
  comment?: { label: string; required?: boolean }
  onConfirm: (comment: string) => Promise<unknown>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  comment,
  onConfirm,
}: ConfirmDialogProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function confirm() {
    setSubmitting(true)
    try {
      await onConfirm(text.trim())
      setText('')
      onOpenChange(false)
    } catch {
      // The mutation hook has already shown the error; keep the dialog open to retry.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {comment && (
          <div className="space-y-2">
            <Label htmlFor="confirm-comment">{comment.label}</Label>
            <Textarea
              id="confirm-comment"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            disabled={submitting || (comment?.required && !text.trim())}
            onClick={confirm}
          >
            {submitting && <LoaderCircle className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
