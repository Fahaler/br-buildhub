"use client"

import { useId, useRef, useState } from 'react'

type Props = {
  label: string
  preview: string
  onSelect: (file: File) => void
  onRemove: () => void
  disabled?: boolean
}

/** Поле для одного фото: выбор файла, перетаскивание, превью и удаление. */
export default function ImageSlot({ label, preview, onSelect, onRemove, disabled }: Props) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file && file.type.startsWith('image/')) onSelect(file)
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-gray-300">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true) }}
        onDragLeave={(e) => {
          // Игнорируем переходы между дочерними элементами — иначе рамка мигает
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (!disabled) handleFiles(e.dataTransfer.files)
        }}
        className={`overflow-hidden rounded-lg border bg-gray-800 transition ${dragOver ? 'border-blue-500 bg-gray-800/70' : 'border-gray-700'}`}
      >
        {preview ? (
          <img src={preview} alt={label} className="max-h-72 w-full bg-gray-950 object-contain" />
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex h-32 w-full flex-col items-center justify-center gap-1 text-sm text-gray-400 hover:text-gray-200"
          >
            <span>Перетащите фото сюда или нажмите</span>
            <span className="text-xs text-gray-500">Можно вставить через Ctrl+V</span>
          </button>
        )}
        <div className="flex gap-2 border-t border-gray-700 p-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:bg-gray-600"
          >
            {preview ? 'Заменить' : 'Выбрать файл'}
          </button>
          {preview && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRemove}
              className="rounded-md border border-gray-600 px-3 py-2 text-sm font-medium text-gray-300 transition hover:border-red-500 hover:text-red-400 disabled:opacity-50"
            >
              Убрать
            </button>
          )}
        </div>
      </div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}
