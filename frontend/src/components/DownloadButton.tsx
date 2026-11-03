import { Download, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { downloadFile, type QueryParams } from '@/lib/api'

interface DownloadButtonProps {
  path: string
  params?: QueryParams
  label: string
  disabled?: boolean
}

export function DownloadButton({ path, params, label, disabled }: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false)

  async function download() {
    setDownloading(true)
    try {
      await downloadFile(path, params)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not download the file.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button variant="outline" onClick={download} disabled={disabled || downloading}>
      {downloading ? <LoaderCircle className="animate-spin" /> : <Download />}
      {label}
    </Button>
  )
}
