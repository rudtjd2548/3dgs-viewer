type FilePickerProps = {
  onFile: (file: File) => void
}

export function FilePicker({ onFile }: FilePickerProps) {
  return (
    <label className="cursor-pointer rounded border border-neutral-600 px-4 py-2 text-sm text-neutral-200">
      PLY 파일 선택
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
