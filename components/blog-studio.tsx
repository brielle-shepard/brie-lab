"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, List, ListOrdered, Code2, Link2, Quote, Plus, LockKeyhole, Save, ArrowUpRight, Send } from "lucide-react";
import BlogMarkdown from "./blog-markdown";
import { type BlogPost, formatPostDate, BLOG_UPDATED_EVENT } from "../lib/blog-types";

type Format = "heading" | "subheading" | "bold" | "italic" | "list" | "numbered" | "quote" | "code" | "link";
const signature = (title: string, body: string) => JSON.stringify([title, body]);
function entryId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function BlogStudio({ initialPosts }: { initialPosts: BlogPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [current, setCurrent] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [baseline, setBaseline] = useState(signature("", ""));
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pendingId = useRef<string | null>(null);
  const bodyInput = useRef<HTMLTextAreaElement>(null);
  const dirty = signature(title, body) !== baseline;

  function loadEntry(post: BlogPost | null) {
    setCurrent(post);
    setTitle(post?.title ?? "");
    setBody(post?.body ?? "");
    setBaseline(signature(post?.title ?? "", post?.body ?? ""));
    setError(""); setMessage(""); setMode("write"); pendingId.current = null;
  }
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("edit");
    const post = initialPosts.find(item => item.id === id);
    if (post) loadEntry(post);
    // Read the entry selection once; later selections are managed inside the studio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!dirty && !busy) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty, busy]);

  function selectEntry(post: BlogPost | null) {
    if (busy || (dirty && !window.confirm("Discard your unsaved changes? Save this entry first if you want to keep them."))) return;
    loadEntry(post);
  }
  function format(kind: Format) {
    const input = bodyInput.current;
    if (!input) return;
    const start = input.selectionStart, end = input.selectionEnd;
    const selected = body.slice(start, end);
    let insert = "", selectStart = start, selectLength = 0;
    if (["bold", "italic", "link", "code"].includes(kind)) {
      const sample = selected || (kind === "link" ? "link text" : kind === "code" ? "your code here" : "text");
      const prefix = kind === "bold" ? "**" : kind === "italic" ? "*" : kind === "link" ? "[" : "\n```\n";
      const suffix = kind === "bold" ? "**" : kind === "italic" ? "*" : kind === "link" ? "](https://example.com)" : "\n```\n";
      insert = prefix + sample + suffix;
      selectStart += prefix.length; selectLength = sample.length;
    } else {
      const lineStart = body.lastIndexOf("\n", start - 1) + 1;
      const prefixes = { heading: "## ", subheading: "### ", list: "- ", numbered: "1. ", quote: "> " };
      const prefix = prefixes[kind as keyof typeof prefixes];
      const sample = body.slice(lineStart, end) || (kind === "heading" || kind === "subheading" ? "Heading" : "text");
      insert = sample.split("\n").map((line, index) => (kind === "numbered" ? `${index + 1}. ` : prefix) + line).join("\n");
      setBody(body.slice(0, lineStart) + insert + body.slice(end));
      requestAnimationFrame(() => { input.focus(); input.setSelectionRange(lineStart + prefix.length, lineStart + insert.length); });
      return;
    }
    setBody(body.slice(0, start) + insert + body.slice(end));
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(selectStart, selectStart + selectLength); });
  }
  async function save(status: "draft" | "published") {
    if (busy) return;
    if (!title.trim()) { setError("Give your entry a title first."); return; }
    if (status === "published" && !body.trim()) { setError("Add some entry text before publishing."); return; }
    if (current?.status === "published" && status === "draft" && !window.confirm("Move this entry back to drafts? It will disappear from the Blog until you publish it again.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      pendingId.current ??= entryId();
      const response = await fetch(current ? `/api/blog/posts/${current.id}` : "/api/blog/posts", {
        method: current ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current?.id ?? pendingId.current, title, body, status, version: current?.version }),
      });
      const data = await response.json() as { post?: BlogPost; error?: string };
      if (!response.ok || !data.post) throw new Error(data.error || "Your entry could not be saved. Your text is still here; please try again.");
      const post = data.post;
      setCurrent(post); setTitle(post.title); setBody(post.body);
      setBaseline(signature(post.title, post.body));
      setPosts(previous => [post, ...previous.filter(item => item.id !== post.id)]);
      pendingId.current = null;
      setMessage(status === "published" ? "Published. Your entry is on the Blog." : "Draft saved. Only you can see it.");
      window.dispatchEvent(new Event(BLOG_UPDATED_EVENT));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save. Your text is still here; try again.");
    } finally { setBusy(false); }
  }

  return <section className="studio-page" aria-labelledby="studio-heading">
    <header className="section-heading"><div><p className="eyebrow"><LockKeyhole size={13} /> PRIVATE / BRIE ONLY</p><h1 className="page-title" id="studio-heading">Writing studio</h1><p className="blog-subtitle">A place to turn your notes into entries.</p></div><a className="text-link" href="/blog">Back to Blog <ArrowUpRight size={14} /></a></header>
    <div className="studio-layout">
      <aside className="entry-library" aria-label="Your entries">
        <button className="button secondary new-entry" onClick={() => selectEntry(null)} disabled={busy}><Plus size={15} /> New entry</button>
        <p className="studio-label">YOUR ENTRIES <span>{posts.length.toString().padStart(2, "0")}</span></p>
        {posts.length ? <div className="entry-list">{posts.map(post => <button key={post.id} className={`entry-choice ${current?.id === post.id ? "active" : ""}`} onClick={() => selectEntry(post)} disabled={busy} aria-pressed={current?.id === post.id}><span>{post.title}</span><small className={post.status === "published" ? "published-label" : "draft-label"}>{post.status === "published" ? "Published" : "Draft"}</small></button>)}</div> : <p className="library-empty">Your saved drafts and published entries will live here.</p>}
      </aside>
      <div className="entry-composer">
        <div className="composer-heading"><span>{current ? current.status === "published" ? "PUBLISHED ENTRY" : "DRAFT" : "NEW ENTRY"}</span><span>{busy ? "Saving…" : dirty ? "Unsaved changes" : current ? "Saved" : "Not saved yet"}</span></div>
        <label className="field-label" htmlFor="entry-title">Title</label>
        <input id="entry-title" className="entry-title-input" value={title} onChange={event => setTitle(event.target.value)} placeholder="Give this entry a name" maxLength={160} disabled={busy} />
        <p className="entry-date">{current?.publishedAt ? `First published ${formatPostDate(current.publishedAt)}` : "Date added automatically when you publish."}</p>
        <div className="compose-modes" aria-label="Editor view"><button type="button" aria-pressed={mode === "write"} onClick={() => setMode("write")}>Write</button><button type="button" aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>Preview</button><span>Styled to match Brie’s Lab</span></div>
        {mode === "write" ? <div className="writing-surface">
          <div className="format-toolbar" role="toolbar" aria-label="Text formatting">
            <button title="Heading" aria-label="Insert heading" disabled={busy} onClick={() => format("heading")}>H2</button><button title="Subheading" aria-label="Insert subheading" disabled={busy} onClick={() => format("subheading")}>H3</button>
            <button title="Bold" aria-label="Bold text" disabled={busy} onClick={() => format("bold")}><Bold size={16} /></button><button title="Italic" aria-label="Italic text" disabled={busy} onClick={() => format("italic")}><Italic size={16} /></button>
            <button title="Bulleted list" aria-label="Insert bulleted list" disabled={busy} onClick={() => format("list")}><List size={17} /></button><button title="Numbered list" aria-label="Insert numbered list" disabled={busy} onClick={() => format("numbered")}><ListOrdered size={17} /></button>
            <button title="Quote" aria-label="Insert quote" disabled={busy} onClick={() => format("quote")}><Quote size={16} /></button><button title="Code block" aria-label="Insert code block" disabled={busy} onClick={() => format("code")}><Code2 size={17} /></button><button title="Link" aria-label="Insert link" disabled={busy} onClick={() => format("link")}><Link2 size={16} /></button>
          </div>
          <label className="sr-only" htmlFor="entry-body">Entry body</label><textarea id="entry-body" ref={bodyInput} value={body} onChange={event => setBody(event.target.value)} maxLength={50000} placeholder="Start with a thought, a discovery, or something you figured out…" disabled={busy} aria-describedby="format-help" />
          <p id="format-help" className="format-help">Select text, then use the toolbar. Preview shows the finished formatting.</p>
        </div> : <div className="entry-preview"><p className="preview-label">PREVIEW · UNSAVED CHANGES INCLUDED</p><h2 className="preview-title">{title || "Your entry title"}</h2>{body.trim() ? <BlogMarkdown body={body} /> : <p className="preview-placeholder">Your formatted entry will appear here.</p>}</div>}
        <div className="save-feedback" aria-live="polite">{error ? <p className="save-error" role="alert">{error}</p> : message ? <p className="save-success">{message} {current?.status === "published" && <a href={`/blog/${current.id}`}>View entry ↗</a>}</p> : <p>Drafts stay private. Publishing adds the entry to your Blog.</p>}</div>
        <div className="composer-actions"><button className="button secondary" disabled={busy} onClick={() => save("draft")}><Save size={15} />{current?.status === "published" ? "Move to drafts" : "Save draft"}</button><button className="button primary" disabled={busy} onClick={() => save("published")}><Send size={15} />{busy ? "Saving…" : current?.status === "published" ? "Save changes" : "Publish entry"}</button></div>
      </div>
    </div>
  </section>;
}
