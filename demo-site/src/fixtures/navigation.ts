/** Fixture for the navigation tests: records page mounts and cleanups. */
import { definePage, installNavigation, urlState } from "@sierragridteam/design-system/lib/app";
import { param } from "@sierragridteam/design-system/lib/url-state";

const w = window as unknown as { navLog: string[]; tabs?: ReturnType<typeof makeState> };
const makeState = (signal: AbortSignal) => urlState({ tab: param.oneOf(["a", "b"] as const, "a") }, { signal });
w.navLog ??= [];
installNavigation();

definePage("/client-router", ({ root, signal }) => {
  w.navLog.push("mount:first");
  signal.addEventListener("abort", () => w.navLog.push("leave:first"));
  const tabs = (w.tabs = makeState(signal));
  const out = root.querySelector<HTMLElement>("#tab");
  const show = () => out && (out.textContent = tabs.get().tab);
  show();
  tabs.subscribe(show, { signal });
});

definePage("/client-router/next", ({ signal }) => {
  w.navLog.push("mount:next");
  signal.addEventListener("abort", () => w.navLog.push("leave:next"));
});
