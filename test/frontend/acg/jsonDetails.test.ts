import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AcgJsonDetails } from "../../../src/pages/acg/AcgJsonDetails";

it("does not serialize collapsed evidence and retains a native keyboard disclosure", () => {
  const value = { toJSON() { throw new Error("Collapsed evidence must not be serialized."); } };
  const html = renderToStaticMarkup(createElement(AcgJsonDetails, { summary: "Complete evidence", value }));
  expect(html).toBe('<details class="acg-advanced"><summary>Complete evidence</summary></details>');
});
