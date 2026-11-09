/**
 * <sierra-copy>: copies its `value`; the copy icon turns into a tick and
 * "Copied." is announced. Build one with `copyButton()` from lib/ui.
 */
import { defineElement } from "./element";

export class SierraCopy extends HTMLElement {
  controller?: AbortController;
  timer?: ReturnType<typeof setTimeout>;
  get value() {
    return this.dataset.value ?? "";
  }
  set value(value: string) {
    this.dataset.value = value;
  }
  connectedCallback() {
    this.controller?.abort();
    this.controller = new AbortController();
    const { signal } = this.controller;
    const button = this.querySelector<HTMLButtonElement>("button")!;
    const icon = this.querySelector<HTMLElement>("[data-copy-icon]")!;
    const check = this.querySelector<HTMLElement>("[data-copy-check]")!;
    const status = this.querySelector<HTMLElement>("[role=status]")!;
    const originalTitle = button.title;
    button.addEventListener(
      "click",
      async () => {
        clearTimeout(this.timer);
        icon.hidden = false;
        check.hidden = true;
        status.className = "sr-only";
        status.textContent = "";
        button.disabled = true;
        try {
          await navigator.clipboard.writeText(this.dataset.value ?? "");
          if (signal.aborted) return;
          icon.hidden = true;
          check.hidden = false;
          status.textContent = "Copied.";
          button.title = "Copied";
          this.timer = setTimeout(() => {
            icon.hidden = false;
            check.hidden = true;
            button.title = originalTitle;
            status.textContent = "";
          }, 1800);
        } catch {
          if (signal.aborted) return;
          status.className = "ds-copy-error";
          status.textContent =
            "Could not copy. Select the text to copy manually.";
          button.title = originalTitle;
        } finally {
          if (!signal.aborted) button.disabled = false;
        }
      },
      { signal },
    );
  }
  disconnectedCallback() {
    this.controller?.abort();
    clearTimeout(this.timer);
  }
}

export const defineCopy = () => defineElement("sierra-copy", SierraCopy);
