'use client'

import { useState } from 'react'
import { Camera, Upload, X } from 'lucide-react'

interface GalleryImage {
  imageID: number
  filename: string
  url: string
  uploadedAt?: string
}

interface ImageGalleryProps {
  images: GalleryImage[]
  onUpload?: () => void
  uploadDisabled?: boolean
  uploadDisabledReason?: string
  emptyMessage?: string
}

export function ImageGallery({
  images,
  onUpload,
  uploadDisabled,
  uploadDisabledReason,
  emptyMessage,
}: ImageGalleryProps) {
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null)

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
            Upload Photos
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
            <div
              key={img.imageID}
              className="cursor-pointer"
              onClick={() => setLightbox(img)}
            >
              <div className="aspect-square bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-blue-400">
                <Camera className="w-8 h-8 text-gray-300" />
              </div>
              <p className="mt-1 text-xs text-gray-500 truncate">{img.filename}</p>
              {img.uploadedAt && (
                <p className="text-xs text-gray-400">{img.uploadedAt}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <p className="font-medium text-gray-900 truncate">{lightbox.filename}</p>
              <button
                onClick={() => setLightbox(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
              <Camera className="w-16 h-16 text-gray-300" />
            </div>
            {lightbox.uploadedAt && (
              <p className="mt-2 text-xs text-gray-400">
                Uploaded: {lightbox.uploadedAt}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
