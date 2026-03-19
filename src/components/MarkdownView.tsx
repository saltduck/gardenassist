import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownView({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 让 Markdown 的段落更贴合现有卡片排版
          p: ({ children }) => <p className="whitespace-pre-wrap my-0">{children}</p>,
          // 列表/块级元素默认样式足够；此处只做最基础的间距控制
          ul: ({ children }) => <ul className="list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5">{children}</ol>,
          li: ({ children }) => <li className="my-0.5">{children}</li>,
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  )
}

