import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownReply({ children }: { children: string }) {
  return (
    <div className="mt-1 break-words text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2 whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => <h1 className="mb-2 mt-4 text-lg font-bold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-4 text-base font-bold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-bold">{children}</h3>,
          blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-brand pl-3 text-muted">{children}</blockquote>,
          code: ({ children, className }) => className
            ? <code className="my-2 block overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs">{children}</code>
            : <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">{children}</code>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-2">
              {children}
            </a>
          ),
          hr: () => <hr className="my-3 border-border" />,
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-border bg-background px-2 py-1 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
