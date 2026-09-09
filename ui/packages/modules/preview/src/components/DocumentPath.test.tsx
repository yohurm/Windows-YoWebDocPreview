import { render, screen } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";

import { DocumentPath } from "./DocumentPath";

describe("DocumentPath", () => {
  it("renders the shared crumb list with a chevron, not a slash", () => {
    const { unmount } = render(() => (
      <DocumentPath crumbs={["指南", "基础入门", "ArkTS语言介绍"]} />
    ));

    expect(screen.getByText("指南")).toBeTruthy();
    expect(screen.getByText("基础入门")).toBeTruthy();
    expect(screen.getByText("ArkTS语言介绍")).toBeTruthy();
    expect(screen.getAllByText("›")).toHaveLength(2);
    expect(screen.queryByText("/")).toBeNull();
    unmount();
  });
});
