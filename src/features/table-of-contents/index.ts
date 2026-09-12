import GithubSlugger from "github-slugger";
import type { Renderer } from "marked";
import { escapeHtml, plainTextFromHtml } from "../../utils/html.js";

interface TableOfContentsItem {
  depth: number;
  id: string;
  text: string;
}

interface TableOfContentsNode extends TableOfContentsItem {
  children: TableOfContentsNode[];
}

interface TableOfContentsConfig {
  enabled: boolean;
  title: string;
  minDepth: number;
  maxDepth: number;
}

export interface TableOfContentsFeature {
  render(): { markup: string; script: string; title: string };
}

function buildTableOfContentsTree(
  items: TableOfContentsItem[],
): TableOfContentsNode[] {
  const roots: TableOfContentsNode[] = [];
  const ancestors: TableOfContentsNode[] = [];

  for (const item of items) {
    const node = { ...item, children: [] };
    while (ancestors.length && ancestors.at(-1)!.depth >= item.depth) {
      ancestors.pop();
    }
    (ancestors.at(-1)?.children ?? roots).push(node);
    ancestors.push(node);
  }

  return roots;
}

function renderTableOfContentsNodes(
  nodes: TableOfContentsNode[],
  nested = false,
): string {
  const content = nodes
    .map((node) => {
      const children = node.children.length
        ? `\n${renderTableOfContentsNodes(node.children, true)}\n`
        : "";
      return `<li><a href="#${escapeHtml(node.id)}">${escapeHtml(node.text)}</a>${children}</li>`;
    })
    .join("\n");

  return `${nested ? '<ul class="toc-children">' : "<ul>"}\n${content}\n</ul>`;
}

function renderTableOfContents(
  items: TableOfContentsItem[],
  title: string,
): string {
  if (items.length === 0) return "";

  const escapedTitle = escapeHtml(title);

  return `<nav class="table-of-contents sidebar-panel" id="sidebar-panel-toc" role="tabpanel" aria-labelledby="sidebar-tab-toc" aria-label="${escapedTitle}">
  <div class="toc-panel">
    ${renderTableOfContentsNodes(buildTableOfContentsTree(items))}
  </div>
</nav>
`;
}

function renderTableOfContentsScript(): string {
  return `<script>
(() => {
  const navigation = document.querySelector('.table-of-contents');
  if (!navigation) return;

  const panel = navigation.querySelector('.toc-panel');
  const links = [...panel.querySelectorAll('a[href^="#"]')];
  const entries = links.map((link) => ({ link, id: link.getAttribute('href').slice(1) }));
  if (entries.length === 0) return;

  const headingFor = (entry) => document.getElementById((document.body.dataset.documentView === 'diff' ? 'diff-' : document.body.dataset.documentView === 'markdown' ? 'markdown-source-' : '') + entry.id);

  let scheduled = false;
  let currentLink = null;
  let currentIndex = 0;
  let keyboardIndex = null;
  const update = () => {
    scheduled = false;
    const marker = Math.min(160, window.innerHeight * 0.25);
    const available = entries.map(entry => ({ ...entry, heading: headingFor(entry) })).filter(entry => entry.heading);
    if (available.length === 0) return;
    const keyboardEntry = keyboardIndex === null ? null : entries[keyboardIndex];
    let active = available.find(entry => entry.link === keyboardEntry?.link) ?? available[0];

    if (!keyboardEntry) {
      const atDocumentEnd = Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2;
      if (atDocumentEnd) {
        active = available.at(-1);
      } else {
        for (const entry of available) {
          if (entry.heading.getBoundingClientRect().top > marker) break;
          active = entry;
        }
      }
    }

    for (const entry of entries) {
      if (entry.link === active.link) entry.link.setAttribute('aria-current', 'location');
      else entry.link.removeAttribute('aria-current');
    }
    if (!navigation.hidden && active.link !== currentLink) {
      const navigationRect = navigation.getBoundingClientRect();
      const activeRect = active.link.getBoundingClientRect();
      const outside = activeRect.top < navigationRect.top + 12 || activeRect.bottom > navigationRect.bottom - 12;
      if (outside) {
        navigation.scrollTop += activeRect.top - navigationRect.top - navigation.clientHeight / 2 + activeRect.height / 2;
      }
    }
    currentLink = active.link;
    if (keyboardIndex === null) currentIndex = entries.findIndex(entry => entry.link === active.link);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };

  const navigateTo = (entry) => {
    const heading = headingFor(entry);
    if (!heading) return false;
    const targetIndex = entries.indexOf(entry);
    if (targetIndex === 0) window.scrollTo({ top: 0 });
    else heading.scrollIntoView();
    history.replaceState(null, '', '#' + entry.id);
    currentIndex = targetIndex;
    keyboardIndex = targetIndex;
    schedule();
    return true;
  };

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  const releaseKeyboardNavigation = () => { keyboardIndex = null; };
  addEventListener('wheel', releaseKeyboardNavigation, { passive: true });
  addEventListener('touchstart', releaseKeyboardNavigation, { passive: true });
  addEventListener('pointerdown', releaseKeyboardNavigation, { passive: true });
  for (const entry of entries) entry.link.addEventListener('click', event => {
    const heading = headingFor(entry);
    if (!heading || !['diff', 'markdown'].includes(document.body.dataset.documentView)) return;
    event.preventDefault();
    navigateTo(entry);
  });
  addEventListener('keydown', event => {
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    const key = event.key.toLowerCase();
    if (key !== 'j' && key !== 'k') {
      releaseKeyboardNavigation();
      return;
    }
    const targetIndex = currentIndex + (key === 'j' ? 1 : -1);
    const entry = entries[targetIndex];
    if (!entry) return;
    event.preventDefault();
    navigateTo(entry);
  });
  new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['data-document-view'] });
  update();
})();
</script>`;
}

export function createTableOfContentsFeature(
  renderer: Renderer,
  config: TableOfContentsConfig,
): TableOfContentsFeature {
  const items: TableOfContentsItem[] = [];
  const slugger = new GithubSlugger();

  renderer.heading = ({ tokens, depth }) => {
    const renderedText = renderer.parser.parseInline(tokens);
    const plainText = plainTextFromHtml(renderedText);
    const id = slugger.slug(plainText);

    if (
      config.enabled &&
      depth >= config.minDepth &&
      depth <= config.maxDepth
    ) {
      items.push({ depth, id, text: plainText });
    }

    return `<h${depth} id="${escapeHtml(id)}">${renderedText}</h${depth}>\n`;
  };

  return {
    render() {
      const markup = config.enabled
        ? renderTableOfContents(items, config.title)
        : "";
      return {
        markup,
        script: markup ? renderTableOfContentsScript() : "",
        title: config.title,
      };
    },
  };
}
