/**
 * <sierra-data-diff>: field-by-field changes between two records.
 *
 *   const diff = createDataDiff({ label: "Revision 3", changes: [] });
 *   diff.compare(previous, current);        // or diff.changes = diffValues(a, b)
 */
import { diffValues, type DataChange, type DataValue } from "./data-values";
import { dataDiffTemplate, type DataDiffProps } from "./data-diff-template";

export { dataDiffTemplate, type DataDiffProps };
import { defineElement, SierraElement } from "./element";

export class SierraDataDiff extends SierraElement<DataDiffProps> {
  protected template(p: DataDiffProps) {
    return dataDiffTemplate(p);
  }
  get changes() {
    return this.props.changes;
  }
  set changes(changes: DataChange[]) {
    this.update({ changes });
  }
  /** Show the changes from `before` to `after`. */
  compare(before: DataValue, after: DataValue) {
    this.changes = diffValues(before, after);
  }
}

export const defineDataDiff = () => defineElement("sierra-data-diff", SierraDataDiff);

export function createDataDiff(props: DataDiffProps): SierraDataDiff {
  defineDataDiff();
  const el = document.createElement("sierra-data-diff") as SierraDataDiff;
  el.props = props;
  return el;
}
