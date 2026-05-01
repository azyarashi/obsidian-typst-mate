use crate::utils::resolve_docs;
use serde::Serialize;
use tsify::Tsify;

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase", tag = "type", content = "value")]
pub enum Tooltip {
    Text(String),
    Code(String),
}

impl From<typst_ide::Tooltip> for Tooltip {
    fn from(tooltip: typst_ide::Tooltip) -> Self {
        match tooltip {
            typst_ide::Tooltip::Text(text) => Tooltip::Text(resolve_docs(&text)),
            typst_ide::Tooltip::Code(code) => Tooltip::Code(code.to_string()),
        }
    }
}
