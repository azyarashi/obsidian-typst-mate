use serde::Serialize;
use tsify::Tsify;

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase", tag = "type", content = "value")]
pub enum TooltipSer {
    Text(String),
    Code(String),
}

impl From<typst_ide::Tooltip> for TooltipSer {
    fn from(tooltip: typst_ide::Tooltip) -> Self {
        match tooltip {
            typst_ide::Tooltip::Text(text) => TooltipSer::Text(text.to_string()),
            typst_ide::Tooltip::Code(code) => TooltipSer::Code(code.to_string()),
        }
    }
}
