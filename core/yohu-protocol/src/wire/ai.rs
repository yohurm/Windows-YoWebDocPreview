//! Agent 解析结果（IPC / CLI 同一 wire）。

use serde::{Deserialize, Serialize};

use super::DocMeta;

/// Agent 可消费的一篇文档：元信息 + 全文 + 大纲树 + 章节。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentDocument {
    pub meta: DocMeta,
    pub markdown: String,
    pub outline: Vec<OutlineNode>,
    pub sections: Vec<AgentSection>,
}

/// 大纲节点。扁平扫描结果的 `children` 为空；嵌套后才有子节点。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutlineNode {
    pub id: String,
    pub text: String,
    pub level: u8,
    #[serde(default)]
    pub children: Vec<OutlineNode>,
}

/// 按标题切出的一节。`id` 与扫描标题（含文首 h1）对齐。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSection {
    pub id: String,
    pub heading: String,
    pub level: u8,
    pub markdown: String,
    pub start_offset: usize,
    pub end_offset: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::wire::{DocRef, FetchChannel};

    fn meta() -> DocMeta {
        DocMeta {
            doc_ref: DocRef {
                source_id: "generic-web".into(),
                catalog: None,
                slug: "a".into(),
                url: "https://example.com/a".into(),
                git_ref: None,
            },
            title: "A".into(),
            update_time: None,
            source_url: "https://example.com/a".into(),
            channel: FetchChannel::GenericWeb,
            device_types: vec![],
            blob_kind: None,
        }
    }

    #[test]
    fn agent_document_roundtrip_camel_case() {
        let doc = AgentDocument {
            meta: meta(),
            markdown: "## Hi\n".into(),
            outline: vec![OutlineNode {
                id: "toc-heading-0".into(),
                text: "Hi".into(),
                level: 2,
                children: vec![],
            }],
            sections: vec![AgentSection {
                id: "toc-heading-0".into(),
                heading: "Hi".into(),
                level: 2,
                markdown: "## Hi\n".into(),
                start_offset: 0,
                end_offset: 6,
            }],
        };
        let json = serde_json::to_string(&doc).unwrap();
        assert!(json.contains("\"startOffset\""));
        assert!(json.contains("\"endOffset\""));
        assert!(json.contains("\"sourceUrl\""));
        let back: AgentDocument = serde_json::from_str(&json).unwrap();
        assert_eq!(back, doc);
    }
}
