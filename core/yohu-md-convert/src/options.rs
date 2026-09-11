use std::collections::HashMap;

/// 通用转换选项。不含站点方言字段。
#[derive(Debug, Clone, Default)]
pub struct ConvertOptions {
    pub title: String,
    pub update_time: Option<String>,
    pub source_url: String,
    pub image_map: HashMap<String, String>,
    pub device_types: Vec<String>,
    /// 相对链接补全基准。None 时保留相对路径，不做站点特例。
    pub base_url: Option<String>,
}
