import { render } from "solid-js/web";

import { App, registerModule } from "@yohu/workbench";
import { descriptor as preview } from "@yohu/module-preview";
import "@yohu/ui/theme.css";

// 唯一组合点（ADR-W12）：shell → workbench + modules。
// 业务定位收口：通用在线文档预览工具，仅保留实时在线预览模块
registerModule(preview);

render(() => <App />, document.getElementById("root")!);
