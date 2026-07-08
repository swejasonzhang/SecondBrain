import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Shared markdown renderer for note previews and chat answers. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-brain">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
