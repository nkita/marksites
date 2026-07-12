import hljs from "highlight.js/lib/common";
import type { Renderer } from "marked";
import { escapeHtml } from "../utils/html.js";

export interface CodeBlocksFeature {
  renderScript(): string;
}

function renderCodeBlockScript(): string {
  return `<script>
(() => {
  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  };

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-code-action]');
    if (!button) return;
    const block = button.closest('.code-block');
    if (!block) return;

    if (button.dataset.codeAction === 'copy') {
      const code = block.querySelector('code');
      if (!code) return;
      try {
        await copyText(code.textContent);
        const label = button.querySelector('.code-tool-label');
        const previous = label.textContent;
        label.textContent = 'Copied';
        button.setAttribute('aria-label', 'Copied to clipboard');
        setTimeout(() => {
          label.textContent = previous;
          button.setAttribute('aria-label', 'Copy code');
        }, 1600);
      } catch {
        button.setAttribute('aria-label', 'Could not copy code');
      }
    }

    if (button.dataset.codeAction === 'wrap') {
      const wrapped = block.classList.toggle('is-wrapped');
      button.setAttribute('aria-pressed', String(wrapped));
      button.setAttribute('aria-label', wrapped ? 'Disable line wrapping' : 'Wrap long lines');
    }
  });
})();
</script>`;
}

function renderCodeBlock(
  code: string,
  language?: string,
  highlighted = false,
): string {
  const languageClass = `${highlighted ? "hljs " : ""}${
    language ? `language-${escapeHtml(language)}` : ""
  }`.trim();
  const languageLabel = language
    ? `<span class="code-language">${escapeHtml(language)}</span>`
    : "<span></span>";

  return `<div class="code-block">
  <div class="code-toolbar">
    ${languageLabel}
    <div class="code-tools">
      <button type="button" class="code-tool" data-code-action="wrap" aria-label="Wrap long lines" aria-pressed="false"><span class="code-tool-label">Wrap</span></button>
      <button type="button" class="code-tool" data-code-action="copy" aria-label="Copy code"><span class="code-tool-label">Copy</span></button>
    </div>
  </div>
  <pre><code${languageClass ? ` class="${languageClass}"` : ""}>${code}</code></pre>
</div>\n`;
}

export function createCodeBlocksFeature(
  renderer: Renderer,
  highlight: boolean,
): CodeBlocksFeature {
  let hasCodeBlocks = false;

  renderer.code = ({ text, lang }) => {
    hasCodeBlocks = true;
    const requestedLanguage = lang?.trim().split(/\s+/, 1)[0];

    if (highlight && requestedLanguage && hljs.getLanguage(requestedLanguage)) {
      const result = hljs.highlight(text, {
        language: requestedLanguage,
        ignoreIllegals: true,
      });
      return renderCodeBlock(result.value, requestedLanguage, true);
    }

    return renderCodeBlock(escapeHtml(text), requestedLanguage);
  };

  return {
    renderScript: () => (hasCodeBlocks ? renderCodeBlockScript() : ""),
  };
}
