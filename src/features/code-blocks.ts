import hljs from "highlight.js/lib/common";
import type { Renderer } from "marked";
import { escapeHtml } from "../utils/html.js";
import { renderCopyIcon, renderWrapIcon } from "../utils/icons.js";

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
        label.textContent = 'コピーしました';
        button.setAttribute('aria-label', 'コードをコピーしました');
        setTimeout(() => {
          label.textContent = previous;
          button.setAttribute('aria-label', 'コードをコピー');
        }, 1600);
      } catch {
        button.setAttribute('aria-label', 'コードをコピーできませんでした');
      }
    }

    if (button.dataset.codeAction === 'wrap') {
      const wrapped = block.classList.toggle('is-wrapped');
      button.setAttribute('aria-pressed', String(wrapped));
      button.setAttribute('aria-label', wrapped ? '折り返しを解除' : '長い行を折り返す');
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
      <button type="button" class="code-tool" data-code-action="wrap" aria-label="長い行を折り返す" aria-pressed="false">${renderWrapIcon()}<span class="code-tool-label">折り返す</span></button>
      <button type="button" class="code-tool" data-code-action="copy" aria-label="コードをコピー">${renderCopyIcon()}<span class="code-tool-label">コピー</span></button>
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
