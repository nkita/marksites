import GithubSlugger from "github-slugger";
import type { Renderer } from "marked";
import { escapeHtml, plainTextFromHtml } from "../../utils/html.js";

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
  render(): { markup: string; script: string; title: string };
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

  return `<nav class="table-of-contents sidebar-panel" id="sidebar-panel-toc" role="tabpanel" aria-labelledby="sidebar-tab-toc" aria-label="${escapedTitle}">
  <div class="toc-panel">
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

  const panel = navigation.querySelector('.toc-panel');
  const links = [...panel.querySelectorAll('a[href^="#"]')];
  const entries = links.map((link) => ({ link, id: link.getAttribute('href').slice(1) }));
  if (entries.length === 0) return;

  const headingFor = (entry) => document.getElementById((document.body.dataset.documentView === 'diff' ? 'diff-' : '') + entry.id);

  let scheduled = false;
  let currentLink = null;
  const update = () => {
    scheduled = false;
    const marker = Math.min(160, window.innerHeight * 0.25);
    const available = entries.map(entry => ({ ...entry, heading: headingFor(entry) })).filter(entry => entry.heading);
    if (available.length === 0) return;
    let active = available[0];

    for (const entry of available) {
      if (entry.heading.getBoundingClientRect().top > marker) break;
      active = entry;
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
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  for (const entry of entries) entry.link.addEventListener('click', event => {
    const heading = headingFor(entry);
    if (!heading || document.body.dataset.documentView !== 'diff') return;
    event.preventDefault();
    heading.scrollIntoView();
    history.replaceState(null, '', '#diff-' + entry.id);
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
        ? renderTableOfContents(items, config.title, config.minDepth)
        : "";
      return {
        markup,
        script: markup ? renderTableOfContentsScript() : "",
        title: config.title,
      };
    },
  };
}
