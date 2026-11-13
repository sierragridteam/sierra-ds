/** Markup for <sierra-data-diff>; no DOM classes, so it renders on the server. */
import { html, nothing } from "lit-html";
import { formatDataValue, type DataChange } from "./data-values";

export interface DataDiffProps {
  /** Short heading, e.g. "Update 3 · Mon 9 Nov, 09:59 PT". */
  label: string;
  changes: DataChange[];
  emptyMessage?: string;
  /** Show "N changes" beside the label (default true). */
  count?: boolean;
}

const short = (value: string) => (/^[0-9a-f]{12,}$/i.test(value) ? value.slice(0, 6) : value);
const isList = (value: unknown): value is (string | number)[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string" || typeof item === "number");
const pill = (value: string | number, kind: "added" | "removed") =>
  html`<li data-kind=${kind}><span class="sr-only">${kind === "added" ? "Added " : "Removed "}</span><code title=${String(value)}>${short(String(value))}</code></li>`;

/** A list that changed membership (gateways, tags): which entries joined or left. */
function listChange(before: (string | number)[], after: (string | number)[]) {
  const left = new Set(before.map(String)), right = new Set(after.map(String));
  const removed = before.filter((v) => !right.has(String(v)));
  const added = after.filter((v) => !left.has(String(v)));
  const kept = after.length - added.length;
  return html`<ul class="ds-id-pills ds-id-pills--diff">${removed.map((v) => pill(v, "removed"))}${added.map((v) => pill(v, "added"))}</ul>${kept ? html`<span class="ds-diff-kept">${kept} unchanged</span>` : nothing}`;
}

// One line, no indentation: the values cell keeps whitespace (pre-wrap) for JSON.
const valuesTemplate = (c: DataChange) =>
  html`<span class="sr-only">${c.kind === "added" ? "Added: " : c.kind === "removed" ? "Removed: " : "Before: "}</span>${c.kind !== "added" ? html`<del class="ds-diff-before">${formatDataValue(c.before)}</del> ` : nothing}<span class="ds-diff-arrow" aria-hidden="true">${c.kind === "added" ? "+" : "→"}</span> ${c.kind === "changed" ? html`<span class="sr-only">After: </span>` : nothing}${c.kind === "removed" ? html`<span class="ds-diff-removed">removed</span>` : html`<ins class="ds-diff-after">${formatDataValue(c.after)}</ins>`}`;

/** Lists render as pills: a membership change, or the whole list added or removed. */
const listValues = (c: DataChange) =>
  c.kind === "changed" && isList(c.before) && isList(c.after)
    ? listChange(c.before, c.after)
    : c.kind === "added" && isList(c.after)
      ? listChange([], c.after)
      : c.kind === "removed" && isList(c.before)
        ? listChange(c.before, [])
        : undefined;

export function dataDiffTemplate(p: DataDiffProps) {
  const n = p.changes.length;
  return html`<section class="ds-diff" aria-label=${p.label}>
    <div class="ds-diff-heading">
      <span class="ds-diff-label">${p.label}</span>
      ${p.count === false ? nothing : html`<span class="meta">${n} ${n === 1 ? "change" : "changes"}</span>`}
    </div>
    ${n
      ? html`<ol class="ds-diff-list">
          ${p.changes.map(
            (c) => html`<li data-kind=${c.kind}>
              <code class="ds-diff-field">${c.path || "(root)"}</code>
              <div class="ds-diff-values">${listValues(c) ?? valuesTemplate(c)}</div>
            </li>`,
          )}
        </ol>`
      : html`<p class="ds-data-note">${p.emptyMessage ?? "No changes."}</p>`}
  </section>`;
}

