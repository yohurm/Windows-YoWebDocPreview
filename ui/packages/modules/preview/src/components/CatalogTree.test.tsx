import { describe, expect, it, vi } from "vitest";
import { render, fireEvent, screen } from "@solidjs/testing-library";
import { CatalogTree } from "./CatalogTree";
import type { CatalogNode } from "@yohu/api";

describe("CatalogTree Component", () => {
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

  it("renders catalog tree and respects expandedKeys", () => {
    const onToggleNode = vi.fn();
    const onSelectDoc = vi.fn();

    const { unmount } = render(() => (
      <CatalogTree
        nodes={sampleNodes}
        activeSlug="quick-start-create"
        expandedKeys={new Set(["node-1"])}
        onToggleNode={onToggleNode}
        onSelectDoc={onSelectDoc}
      />
    ));

    // "快速入门" 和 其子节点 "创建项目" 应该被渲染
    expect(screen.getByText("快速入门")).toBeTruthy();
    expect(screen.getByText("创建项目")).toBeTruthy();

    // "开发指南" 渲染，但因为未在 expandedKeys，其子节点 "架构设计" 不展示
    expect(screen.getByText("开发指南")).toBeTruthy();
    expect(screen.queryByText("架构设计")).toBeNull();

    unmount();
  });

  it("triggers onToggleNode when clicking arrow", async () => {
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

    const arrow = container.querySelector(".yo-catalog-arrow") as HTMLElement;
    expect(arrow).toBeTruthy();
    await fireEvent.click(arrow);

    expect(onToggleNode).toHaveBeenCalledWith("node-1");
    // 箭头点击不触发文档跳转
    expect(onSelectDoc).not.toHaveBeenCalled();

    unmount();
  });

  it("triggers onSelectDoc when clicking row with slug", async () => {
    const onToggleNode = vi.fn();
    const onSelectDoc = vi.fn();

    const { unmount } = render(() => (
      <CatalogTree
        nodes={sampleNodes}
        activeSlug="quick-start-create"
        expandedKeys={new Set(["node-1"])}
        onToggleNode={onToggleNode}
        onSelectDoc={onSelectDoc}
      />
    ));

    const item = screen.getByText("创建项目");
    await fireEvent.click(item);

    expect(onSelectDoc).toHaveBeenCalledWith("quick-start-create");

    unmount();
  });
});
