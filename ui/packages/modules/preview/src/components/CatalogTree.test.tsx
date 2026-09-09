import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@solidjs/testing-library";

import type { CatalogNode } from "@yohu/api";

import { CatalogTree } from "./CatalogTree";

describe("CatalogTree", () => {
  const sampleNodes: CatalogNode[] = [
    {
      id: "node-1",
      name: "快速入门",
      slug: undefined,
      isLeaf: false,
      children: [
        {
          id: "node-1-1",
          name: "创建项目",
          slug: "quick-start-create",
          isLeaf: true,
          children: [],
        },
      ],
    },
    {
      id: "node-2",
      name: "开发指南",
      slug: "guide-overview",
      isLeaf: false,
      children: [
        {
          id: "node-2-1",
          name: "架构设计",
          slug: "guide-arch",
          isLeaf: true,
          children: [],
        },
      ],
    },
  ];

  it("renders expanded groups and hides collapsed children", () => {
    const { container, unmount } = render(() => (
      <CatalogTree
        nodes={sampleNodes}
        activeSlug="quick-start-create"
        expandedKeys={new Set(["node-1"])}
        onToggleNode={vi.fn()}
        onSelectDoc={vi.fn()}
      />
    ));

    expect(screen.getByText("快速入门")).toBeTruthy();
    expect(screen.getByText("创建项目")).toBeTruthy();
    expect(screen.getByText("开发指南")).toBeTruthy();
    expect(screen.queryByText("架构设计")).toBeNull();
    expect(container.querySelector(".yo-tree__row.is-on")?.textContent).toContain("创建项目");
    unmount();
  });

  it("toggles a group from the chevron without opening a document", async () => {
    const onToggleNode = vi.fn();
    const onSelectDoc = vi.fn();
    const { container, unmount } = render(() => (
      <CatalogTree
        nodes={sampleNodes}
        activeSlug="quick-start-create"
        expandedKeys={new Set(["node-1"])}
        onToggleNode={onToggleNode}
        onSelectDoc={onSelectDoc}
      />
    ));

    const twist = container.querySelector(".yo-tree__twist") as HTMLButtonElement;
    expect(twist).toBeTruthy();
    await fireEvent.click(twist);
    expect(onToggleNode).toHaveBeenCalledWith("node-1");
    expect(onSelectDoc).not.toHaveBeenCalled();
    unmount();
  });

  it("opens a leaf document from the row label", async () => {
    const onSelectDoc = vi.fn();
    const { unmount } = render(() => (
      <CatalogTree
        nodes={sampleNodes}
        activeSlug="quick-start-create"
        expandedKeys={new Set(["node-1"])}
        onToggleNode={vi.fn()}
        onSelectDoc={onSelectDoc}
      />
    ));

    await fireEvent.click(screen.getByText("创建项目"));
    expect(onSelectDoc).toHaveBeenCalledWith("quick-start-create");
    unmount();
  });

  it("opens a group that has its own slug instead of toggling it", async () => {
    const onToggleNode = vi.fn();
    const onSelectDoc = vi.fn();
    const { unmount } = render(() => (
      <CatalogTree
        nodes={sampleNodes}
        expandedKeys={new Set()}
        onToggleNode={onToggleNode}
        onSelectDoc={onSelectDoc}
      />
    ));

    await fireEvent.click(screen.getByText("开发指南"));
    expect(onSelectDoc).toHaveBeenCalledWith("guide-overview");
    expect(onToggleNode).not.toHaveBeenCalled();
    unmount();
  });
});
