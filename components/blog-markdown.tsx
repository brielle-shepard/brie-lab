import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function BlogMarkdown({ body }: { body: string }) {
  return <div className="blog-prose"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
    h1: ({ children }) => <h2>{children}</h2>,
    a: ({ href, children }) => <a href={href} rel="noopener noreferrer" target={href?.startsWith("#") ? undefined : "_blank"}>{children}</a>,
    img: ({ src, alt }) => typeof src === "string" && /^https:\/\//.test(src) ? <img src={src} alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer" /> : <span>{alt}</span>,
    table: ({ children }) => <div className="blog-table"><table>{children}</table></div>,
  }}>{body}</Markdown></div>;
}
