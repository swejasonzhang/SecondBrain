import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Shared markdown renderer for note previews and chat answers.
 * Memoized so that, while a new answer streams in, already-rendered messages
 * aren't re-parsed on every token — the markdown re-renders only when its own
 * text changes.
 */
export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-brain">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
});
