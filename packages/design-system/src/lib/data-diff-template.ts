/** Markup for <sierra-data-diff>; no DOM classes, so it renders on the server. */
import { html, nothing } from "lit-html";
import { formatDataValue, type DataChange } from "./data-values";

export interface DataDiffProps {
  label: string;
  changes: DataChange[];
  emptyMessage?: string;
}

// One line, no indentation: the values cell keeps whitespace (pre-wrap) for JSON.
const valuesTemplate = (c: DataChange) =>
  html`<span class="sr-only">${c.kind === "added" ? "Added: " : c.kind === "removed" ? "Removed: " : "Before: "}</span>${c.kind !== "added" ? html`<del class="ds-diff-before">${formatDataValue(c.before)}</del> ` : nothing}<span class="ds-diff-arrow" aria-hidden="true">${c.kind === "added" ? "+" : "→"}</span> ${c.kind === "changed" ? html`<span class="sr-only">After: </span>` : nothing}${c.kind === "removed" ? html`<span class="ds-diff-removed">removed</span>` : html`<ins class="ds-diff-after">${formatDataValue(c.after)}</ins>`}`;

export function dataDiffTemplate(p: DataDiffProps) {
  const n = p.changes.length;
  return html`<section class="ds-diff" aria-label=${p.label}>
    <div class="ds-diff-heading">
      <strong>${p.label}</strong>
      <span class="meta">${n} ${n === 1 ? "change" : "changes"}</span>
    </div>
    ${n
      ? html`<ol class="ds-diff-list">
          ${p.changes.map(
            (c) => html`<li data-kind=${c.kind}>
              <code class="ds-diff-field">${c.path || "(root)"}</code>
              <div class="ds-diff-values">${valuesTemplate(c)}</div>
            </li>`,
          )}
        </ol>`
      : html`<p class="ds-data-note">${p.emptyMessage ?? "No changes."}</p>`}
  </section>`;
}

