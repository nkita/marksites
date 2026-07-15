import GithubSlugger from "github-slugger";
import type { Renderer } from "marked";
import { escapeHtml, plainTextFromHtml } from "../utils/html.js";

interface TableOfContentsItem {
  depth: number;
  id: string;
  text: string;
}

interface TableOfContentsConfig {
  enabled: boolean;
  title: string;
  minDepth: number;
  maxDepth: number;
}

export interface TableOfContentsFeature {
  render(): { markup: string; script: string };
}

function renderTableOfContents(
  items: TableOfContentsItem[],
  title: string,
  minDepth: number,
): string {
  if (items.length === 0) return "";

  const links = items
    .map(
      ({ depth, id, text }) =>
        `    <li style="--toc-level: ${depth - minDepth}"><a href="#${escapeHtml(id)}">${escapeHtml(text)}</a></li>`,
    )
    .join("\n");
  const escapedTitle = escapeHtml(title);

  return `<nav class="table-of-contents" aria-label="${escapedTitle}">
  <div class="toc-header">
    <h2>
      <button type="button" class="toc-toggle" aria-expanded="true" aria-controls="table-of-contents-list" aria-label="Hide table of contents" title="Hide table of contents">
        <span>${escapedTitle}</span>
        <svg class="panel-toggle-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
      </button>
    </h2>
  </div>
  <div class="toc-panel" id="table-of-contents-list">
    <ul>
${links}
    </ul>
  </div>
</nav>
`;
}

function renderTableOfContentsScript(): string {
  return `<script>
(() => {
  const navigation = document.querySelector('.table-of-contents');
  if (!navigation) return;

  const toggle = navigation.querySelector('.toc-toggle');
  const panel = navigation.querySelector('.toc-panel');
  const compactLayout = matchMedia('(max-width: 900px)');
  const setExpanded = (expanded) => {
    toggle.setAttribute('aria-expanded', String(expanded));
    const label = expanded ? 'Hide table of contents' : 'Show table of contents';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    panel.hidden = !expanded;
  };
  const syncLayout = () => setExpanded(!compactLayout.matches);

  toggle.addEventListener('click', () => {
    setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
  });
  compactLayout.addEventListener('change', syncLayout);
  syncLayout();

  const links = [...panel.querySelectorAll('a[href^="#"]')];
  for (const link of links) {
    link.addEventListener('click', () => {
      if (compactLayout.matches) setExpanded(false);
    });
  }
  const entries = links
    .map((link) => ({ link, heading: document.getElementById(link.getAttribute('href').slice(1)) }))
    .filter((entry) => entry.heading);
  if (entries.length === 0) return;

  let scheduled = false;
  const update = () => {
    scheduled = false;
    const marker = Math.min(160, window.innerHeight * 0.25);
    let active = entries[0];

    for (const entry of entries) {
      if (entry.heading.getBoundingClientRect().top > marker) break;
      active = entry;
    }

    for (const entry of entries) {
      if (entry === active) entry.link.setAttribute('aria-current', 'location');
      else entry.link.removeAttribute('aria-current');
    }
    const navigationRect = navigation.getBoundingClientRect();
    const activeRect = active.link.getBoundingClientRect();
    if (!panel.hidden && (activeRect.top < navigationRect.top || activeRect.bottom > navigationRect.bottom)) {
      navigation.scrollTop += activeRect.top - navigationRect.top - navigation.clientHeight / 2;
    }
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
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
        ? renderTableOfContents(items, config.title, config.minDepth)
        : "";
      return {
        markup,
        script: markup ? renderTableOfContentsScript() : "",
      };
    },
  };
}
