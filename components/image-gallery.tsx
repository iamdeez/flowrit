'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'

type GalleryImage = {
  url: string
  name: string
}

type Props = {
  images: GalleryImage[]
}

export function ImageGallery({ images }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const open = (i: number) => setLightboxIndex(i)
  const close = () => setLightboxIndex(null)

  const prev = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null))
  }, [images.length])

  const next = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null))
  }, [images.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIndex, prev, next])

  if (images.length === 0) return null

  return (
    <>
      {/* 갤러리 그리드 */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => open(i)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-[var(--flowrit-panel-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--flowrit-primary)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.name}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
              <ZoomIn className="h-5 w-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
            </div>
          </button>
        ))}
      </div>

      {/* 라이트박스 */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={close}
        >
          {/* 닫기 */}
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {/* 카운터 */}
          <p className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/80">
            {lightboxIndex + 1} / {images.length}
          </p>

          {/* 이전 */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:left-6"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* 이미지 */}
          <div
            className="mx-16 max-h-[90vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightboxIndex].url}
              alt={images[lightboxIndex].name}
              className="max-h-[82vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <p className="mt-3 text-center text-sm text-white/70">
              {images[lightboxIndex].name}
            </p>
          </div>

          {/* 다음 */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-6"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
      )}
    </>
  )
}
