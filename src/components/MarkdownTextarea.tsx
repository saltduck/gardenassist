import { MarkdownView } from './MarkdownView'

export function MarkdownTextarea({
  value,
  onChange,
  rows = 2,
  placeholder,
  textareaClassName,
  previewClassName,
}: {
  value: string
  onChange: (next: string) => void
  rows?: number
  placeholder?: string
  textareaClassName?: string
  previewClassName?: string
}) {
  const showPreview = value.trim().length > 0

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={textareaClassName ?? 'w-full rounded border border-stone-300 px-2 py-1.5 text-sm'}
      />

      {showPreview && (
        <div className={previewClassName ?? 'mt-2 rounded border border-stone-200 bg-stone-50 p-3'}>
          <div className="text-xs text-stone-500 mb-1">Markdown 预览</div>
          <MarkdownView value={value} />
        </div>
      )}
    </div>
  )
}

