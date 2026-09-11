use std::collections::HashMap;

use yohu_md_convert::ConvertOptions;

/// 华为开发者文档转换选项。`catalog` 只服务本方言。
#[derive(Debug, Clone, Default)]
pub struct HuaweiConvertOptions {
    pub title: String,
    pub update_time: Option<String>,
    pub source_url: String,
    pub catalog: Option<String>,
    pub image_map: HashMap<String, String>,
    pub device_types: Vec<String>,
}

impl HuaweiConvertOptions {
    pub fn to_inner(&self) -> ConvertOptions {
        ConvertOptions {
            title: self.title.clone(),
            update_time: self.update_time.clone(),
            source_url: self.source_url.clone(),
            image_map: self.image_map.clone(),
            device_types: self.device_types.clone(),
            base_url: None,
        }
    }
}
