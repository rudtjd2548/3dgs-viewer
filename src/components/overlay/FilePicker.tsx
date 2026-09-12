type FilePickerProps = {
  onFile: (file: File) => void
  compact?: boolean
}

export function FilePicker({ onFile, compact = false }: FilePickerProps) {
  return (
    <label className={compact
      ? 'cursor-pointer rounded border border-neutral-600 bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300'
      : 'cursor-pointer rounded border border-neutral-600 px-4 py-2 text-sm text-neutral-200'
    }>
      {compact ? 'PLY 열기' : 'PLY 파일 선택'}
      <input
        type="file"
        accept=".ply"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </label>
  )
}
