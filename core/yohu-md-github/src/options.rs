use yohu_md_convert::ConvertOptions;

/// GitHub 仓库 Markdown 文档选项。
#[derive(Debug, Clone, Default)]
pub struct GithubConvertOptions {
    pub title: String,
    pub update_time: Option<String>,
    pub source_url: String,
    pub owner: String,
    pub repo: String,
    pub git_ref: String,
    pub path: String,
}

impl GithubConvertOptions {
    pub fn to_inner(&self) -> ConvertOptions {
        ConvertOptions {
            title: self.title.clone(),
            update_time: self.update_time.clone(),
            source_url: self.source_url.clone(),
            image_map: Default::default(),
            device_types: Vec::new(),
            base_url: None,
        }
    }
}
