"use client";

import { useEffect, useRef, useState } from "react";
import LatestBlogEntry from "./latest-blog-entry";
import { ArrowRight, ArrowUpRight, ChevronDown, ChevronRight, Code2, Crown, FileCode2, FileText, Folder, FolderOpen, GitBranch, Menu, Terminal, X } from "lucide-react";

const githubUrl = "https://github.com/brielle-shepard";
const linkedinUrl = "https://www.linkedin.com/in/brielle-colette-shepard/";
type Project = { title: string; description: string; category: string; url: string };
const featuredProjects: Project[] = [];
type EditorTab = "config" | "readme";

function HexMark({ large = false }: { large?: boolean }) {
  return <svg className={large ? "hex-mark large" : "hex-mark"} viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3 57 17.5v29L32 61 7 46.5v-29Z" /><path className="hex-letter" d="M23 22h11c12 0 12 12 1 12H23m0-12v24h12c12 0 12-12 0-12" /><path className="hex-crown" d="m23 15 3 3 6-6 6 6 3-3" /></svg>;
}

function ProfileCode() {
  return <div className="code-lines" aria-label="Brie portfolio configuration">
    <div><span className="comment">// good systems start with good questions</span></div>
    <div><span className="keyword">const</span> <span className="variable">brie</span> = {"{"}</div>
    <div>  <span className="property">alias</span>: <span className="string">"Queen B(rie)"</span>,</div>
    <div>  <span className="property">home</span>: <span className="string">"Brie’s Lab"</span>,</div>
    <div>  <span className="property">focus</span>: [</div>
    <div>    <span className="string">"systems"</span>,</div>
    <div>    <span className="string">"automation"</span>,</div>
    <div>    <span className="string">"solving useful problems"</span></div>
    <div>  ],</div>
    <div>  <span className="property">approach</span>: <span className="string">"build → test → improve"</span></div>
    <div>{"}"};</div>
    <div><span className="control">export default</span> <span className="variable">brie</span>;</div>
  </div>;
}

type PageName = "home" | "projects" | "about" | "blog" | "studio";

export default function SiteWorkspace({ screen, children }: { screen: PageName; children?: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const active = screen;
  const [editorTab, setEditorTab] = useState<EditorTab>("config");
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<{ command: string; response: string }[]>([]);
  const terminalOutput = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const configTab = useRef<HTMLButtonElement>(null);
  const readmeTab = useRef<HTMLButtonElement>(null);

  useEffect(() => { if (terminalOutput.current) terminalOutput.current.scrollTop = terminalOutput.current.scrollHeight; }, [history]);
  function editorKeys(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next: EditorTab = event.key === "Home" ? "config" : event.key === "End" ? "readme" : editorTab === "config" ? "readme" : "config";
    setEditorTab(next);
    (next === "config" ? configTab : readmeTab).current?.focus();
  }
  function runCommand(event: React.FormEvent) {
    event.preventDefault();
    const text = command.trim();
    if (!text) return;
    const cmd = text.toLowerCase();
    setCommand("");
    if (cmd === "clear") { setHistory([]); return; }
    let response = "Command not found. Type help to see the available commands.";
    if (cmd === "help") response = "whoami · projects · stack · status · clear";
    else if (["whoami", "about", "hello"].includes(cmd)) response = "Brie. IT support specialist, systems thinker, and the builder behind Brie’s Lab.";
    else if (["projects", "ls"].includes(cmd)) {
      response = "Project index: awaiting the first featured build.";
      window.location.assign("/projects");
    } else if (cmd === "stack") response = "Exploring: PowerShell · Python · Windows · Azure · Microsoft 365.";
    else if (cmd === "status") response = "Portfolio mode. This terminal is a local interactive demo.";
    else if (cmd === "queen") response = "Queen B(rie). All curiosity. No royal technical debt.";
    setHistory(previous => [...previous, { command: text, response }].slice(-8));
  }
  return <div className="site">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="titlebar">
      <a className="brand" href="/" aria-label="Brie’s Lab home"><HexMark /><span>Brie’s <span className="brand-accent">Lab</span><span className="brand-path"> / portfolio</span></span></a>
      <a className="title-github" href={githubUrl} target="_blank" rel="noreferrer"><GitBranch size={14} /> GitHub <ArrowUpRight size={13} /></a>
      <button className="menu-toggle" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="file-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
    </header>
    <div className="workspace">
      <nav id="file-navigation" className={`file-navigation ${menuOpen ? "open" : ""}`} aria-label="Portfolio navigation">
        <a className={active === "home" ? "selected" : ""} aria-current={active === "home" ? "page" : undefined} href="/"><FileCode2 size={16} /><span>home.tsx</span><span className="tab-dot" /></a>
        <a className={active === "about" ? "selected" : ""} aria-current={active === "about" ? "page" : undefined} href="/about"><FileText size={16} /><span>about.md</span></a>
        <a className={active === "projects" ? "selected" : ""} aria-current={active === "projects" ? "page" : undefined} href="/projects"><Folder size={16} /><span>projects</span></a>
        <a className={active === "blog" || active === "studio" ? "selected" : ""} aria-current={active === "blog" || active === "studio" ? "page" : undefined} href="/blog"><FileText size={16} /><span>blog.md</span></a>
        <span className="workspace-label"><span className="status-dot" /> PERSONAL WORKSPACE</span>
      </nav>
      <div className="workspace-body">
        <aside className="project-explorer" aria-label="Project explorer">
          <div className="panel-label"><ChevronDown size={13} /> EXPLORER</div>
          <a className="explorer-root" href="/projects" aria-current={active === "projects" ? "page" : undefined}><FolderOpen size={15} /> brie-lab / projects</a>
          <a className="explorer-readme" href="/" aria-current={active === "home" ? "page" : undefined}><FileText size={14} /> README.md</a>
          <div className="explorer-note"><span className="comment">// a place for the work</span><p>Build notes.<br />Working code.<br />Lessons learned.</p></div>
          <div className="explorer-count"><span>FEATURED PROJECTS</span><b>{String(featuredProjects.length).padStart(2,"0")}</b></div>
          <LatestBlogEntry />
        </aside>
        <main id="main" className="workspace-main">
        {screen === "home" && <section className="hero" id="home" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><Crown size={15} /> QUEEN B(RIE) / SYSTEMS ENGINEERING PORTFOLIO</div>
            <h1 id="hero-title">Practice<br /><span>problems.</span><br />Real-world<br /><span className="outline-word">skills.</span></h1>
            <p>Hey, I’m Brielle. I’m a problem solver and troubleshooter, and I use this space to sharpen my skills through hypothetical challenges. Welcome to the home of my projects.</p>
            <div className="hero-actions"><a className="button primary" href="/projects">Explore my projects <ArrowRight size={16} /></a><a className="text-link" href="/about">Meet the builder <ArrowUpRight size={15} /></a></div>
            <div className="hero-footnote"><span>01</span> Identify the problem.<ChevronRight size={13} /><span>02</span> Make it work.</div>
          </div>
          <div className="editor" aria-label="Interactive profile editor">
            <div className="editor-title"><span><Code2 size={13} /> BRIE’S LAB / WORKBENCH</span><span className="editor-decoration" aria-hidden="true">— <span>□</span> ×</span></div>
            <div className="editor-tabs" role="tablist" aria-label="Profile files">
              <button id="config-tab" ref={configTab} role="tab" aria-selected={editorTab === "config"} aria-controls="editor-panel" tabIndex={editorTab === "config" ? 0 : -1} onClick={() => setEditorTab("config")} onKeyDown={editorKeys}><span className="ts-icon">TS</span> brie.config.ts</button>
              <button id="readme-tab" ref={readmeTab} role="tab" aria-selected={editorTab === "readme"} aria-controls="editor-panel" tabIndex={editorTab === "readme" ? 0 : -1} onClick={() => setEditorTab("readme")} onKeyDown={editorKeys}><FileText size={13} /> README.md</button>
            </div>
            <div className="editor-breadcrumb">portfolio <ChevronRight size={11} /> {editorTab === "config" ? "brie.config.ts" : "README.md"}</div>
            <div role="tabpanel" id="editor-panel" aria-labelledby={editorTab === "config" ? "config-tab" : "readme-tab"} tabIndex={0} className="editor-code">
              {editorTab === "config" ? <ProfileCode /> : <div className="readme-view"><h3><span>#</span> Hey, I’m Brielle.</h3><p>I work in IT support. I like asking better questions, following the evidence, and making technology easier for people.</p><p><span className="comment">## Brie’s Lab</span><br />Useful tools, systems experiments, and the process behind the build.</p><p><span className="comment">## Find the work</span><br /><a href="/projects">Explore the project index →</a></p></div>}
            </div>
            <div className="terminal-heading"><button aria-expanded={terminalOpen} aria-controls="terminal-content" onClick={() => setTerminalOpen(!terminalOpen)}><Terminal size={12} /> TERMINAL <ChevronDown size={12} className={terminalOpen ? "" : "rotate"} /></button><span>interactive demo</span></div>
            {terminalOpen && <div id="terminal-content" className="terminal-content">
              <div ref={terminalOutput} className="terminal-output" aria-live="polite" aria-relevant="additions"><p className="terminal-intro">Type <button onClick={() => { setCommand("help"); input.current?.focus(); }}>help</button> to look around.</p>{history.map((item,index) => <div className="terminal-entry" key={index}><p><b>PS brie:\lab&gt;</b> {item.command}</p><p>{item.response}</p></div>)}</div>
              <form onSubmit={runCommand} className="terminal-input"><label htmlFor="terminal-command">PS brie:\lab&gt;</label><input id="terminal-command" aria-label="Terminal command" ref={input} value={command} onChange={event => setCommand(event.target.value)} maxLength={120} placeholder="help" autoComplete="off" spellCheck={false} /><button type="submit" aria-label="Run command"><ArrowRight size={15} /></button></form>
            </div>}
            <div className="editor-status"><span><GitBranch size={11} /> main</span><span>{editorTab === "config" ? "TypeScript" : "Markdown"}<span className="status-separator">UTF-8</span></span></div>
          </div>
          <div className="hero-registration" aria-hidden="true">B / 01</div>
        </section>}
        {screen === "projects" && <section className="project-view" id="projects" aria-labelledby="projects-title">
          <div className="section-heading"><div><p className="eyebrow">PROJECT INDEX</p><h1 className="page-title" id="projects-title">Projects</h1></div><a className="text-link" href="/">Back to README <ArrowUpRight size={15} /></a></div>
            <div className="project-index" id="project-index">
              <div className="panel-label"><FileText size={13} /> projects / README.md <span>PROJECT LOG</span></div>
              {featuredProjects.length ? <div className="project-grid">{featuredProjects.map(project => <a className="project-card" key={project.title} href={project.url} target="_blank" rel="noreferrer"><p className="eyebrow">{project.category}</p><h3>{project.title}<ArrowUpRight size={20} /></h3><p>{project.description}</p></a>)}</div> : <div className="project-empty"><div className="empty-icon" aria-hidden="true"><FolderOpen size={39} /><span>+</span></div><div><p className="tag"><span className="status-dot" /> FIRST FEATURE COMING SOON</p><h3>Ready for the next build.</h3><p>The first project write-up will land here with the problem, the approach, the result, and what I’d improve next.</p><a className="text-link yellow-link" href={githubUrl} target="_blank" rel="noreferrer">Find me on GitHub <ArrowUpRight size={15} /></a></div></div>}
            </div>
        </section>}
        {screen === "about" && <section className="about-page" aria-labelledby="about-title">
          <div className="panel-label"><FileText size={14} /> brie-lab / about.md</div>
          <div className="about-page-layout">
          <div className="about-page-content">
            <p className="eyebrow">ABOUT THE BUILDER</p>
            <h1 className="page-title" id="about-title">I’m Brielle.<br /><span>I like figuring things out.</span></h1>
            <p>I’m an IT and technical support professional who enjoys helping people and figuring out how things work. I bring a mix of technical troubleshooting, customer service, and organizational skills, with an emphasis on clear communication and understanding the problem before jumping to a solution.</p>
            <p>I learn quickly, adapt to new environments, and like looking beyond the quick fix. Brie’s Lab is where I put that curiosity into practice: exploring systems, working through hypothetical challenges, and documenting what I learn.</p>
            <p>The goal is simple: keep sharpening my skills and make technology work better for the people who use it.</p>
            <div className="focus-label">// currently exploring</div>
            <div className="technology-tags"><span>PowerShell</span><span>Python</span><span>Windows</span><span>Azure</span><span>Microsoft 365</span></div>
            <div className="about-social-links"><a className="text-link yellow-link" href={githubUrl} target="_blank" rel="noopener noreferrer">Find me on GitHub <ArrowUpRight size={15} /></a><a className="text-link yellow-link" href={linkedinUrl} target="_blank" rel="noopener noreferrer">Connect on LinkedIn <ArrowUpRight size={15} /></a></div>
          </div>
          <div className="about-portrait"><img src="/images/brielle-profile.jpg" alt="Brielle smiling in a yellow sweater" width={460} height={460} decoding="async" /></div>
          </div>
        </section>}
        {children}
        </main>
      </div>
    </div>
    <div className="statusbar"><span><GitBranch size={12} /> main <span className="status-divider">/</span> portfolio</span><span><span className="status-dot" /> BRIE’S LAB <span className="status-divider">|</span> UTF-8</span></div>
  </div>;
}

