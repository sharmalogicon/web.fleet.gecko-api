'use client'
import type { AccidentImage } from '@/types/accident-report'

interface Props {
  images: AccidentImage[]
}

export function AccidentImagesSection({ images }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {images.length > 0
            ? `${images.length} photo${images.length !== 1 ? 's' : ''} on record`
            : 'No photos on record'}
        </p>
        <div className="relative group">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-gray-50 text-gray-400 opacity-50 cursor-not-allowed"
            aria-disabled="true"
          >
            Upload Photos
          </button>
          <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-10">
            <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
              Upload available in full API mode
            </div>
          </div>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-400">No photos on record</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.imageID} className="flex flex-col gap-1">
              <div className="h-32 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                <div className="text-gray-300 text-4xl select-none">&#128247;</div>
              </div>
              <p className="text-xs text-gray-500 truncate" title={img.filename}>
                {img.filename}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(img.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
