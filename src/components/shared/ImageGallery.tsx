'use client'

import { useState } from 'react'
import { Camera, FileText, Trash2, Upload, X } from 'lucide-react'

interface GalleryImage {
  imageID: number | string
  filename: string
  /** An image URL (e.g. a blob: URL). The mock pages pass '/placeholder.jpg' and get the camera icon. */
  url: string
  uploadedAt?: string
  /** A small label on the tile (e.g. the photo stage). */
  badge?: string
  caption?: string
  /** A non-image file (PDF): a file tile that opens it. */
  isFile?: boolean
}

interface ImageGalleryProps {
  images: GalleryImage[]
  onUpload?: () => void
  uploadDisabled?: boolean
  uploadDisabledReason?: string
  emptyMessage?: string
  /** Shows a remove icon on each tile. */
  onRemove?: (image: GalleryImage) => void
  removeLabel?: string
  uploadLabel?: string
}

const isRealImage = (url: string) => !!url && !url.endsWith('/placeholder.jpg')

export function ImageGallery({
  images,
  onUpload,
  uploadDisabled,
  uploadDisabledReason,
  emptyMessage,
  onRemove,
  removeLabel = 'Remove',
  uploadLabel = 'Upload Photos',
}: ImageGalleryProps) {
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null)

  const open = (img: GalleryImage) => {
    if (img.isFile) window.open(img.url, '_blank', 'noopener')
    else setLightbox(img)
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          {images.length} photo{images.length !== 1 ? 's' : ''}
        </span>
        {onUpload && (
          <button
            type="button"
            onClick={onUpload}
            disabled={uploadDisabled}
            title={uploadDisabledReason}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {uploadLabel}
          </button>
        )}
      </div>

      {/* Grid or empty state */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Camera className="w-12 h-12 mb-2" />
          <p>{emptyMessage ?? 'No photos on record'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.imageID} className="cursor-pointer relative group" onClick={() => open(img)}>
              <div className="aspect-square bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-blue-400">
                {img.isFile ? (
                  <FileText className="w-10 h-10 text-gray-400" />
                ) : isRealImage(img.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={img.caption ?? img.filename} className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-300" />
                )}
              </div>
              {img.badge && (
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">{img.badge}</span>
              )}
              {onRemove && (
                <button
                  type="button"
                  title={removeLabel}
                  aria-label={`${removeLabel} ${img.filename}`}
                  onClick={(e) => { e.stopPropagation(); onRemove(img) }}
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-white/90 text-red-500 hover:bg-white shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <p className="mt-1 text-xs text-gray-500 truncate">{img.caption || img.filename}</p>
              {img.uploadedAt && <p className="text-xs text-gray-400">{img.uploadedAt}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="bg-white rounded-lg max-w-3xl w-full p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <p className="font-medium text-gray-900 truncate">{lightbox.caption || lightbox.filename}</p>
              <button onClick={() => setLightbox(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-gray-100 rounded flex items-center justify-center min-h-48">
              {isRealImage(lightbox.url)
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={lightbox.url} alt={lightbox.caption ?? lightbox.filename} className="max-h-[70vh] w-auto" />
                : <Camera className="w-16 h-16 text-gray-300" />}
            </div>
            {lightbox.uploadedAt && <p className="mt-2 text-xs text-gray-400">Uploaded: {lightbox.uploadedAt}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
