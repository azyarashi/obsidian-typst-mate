use serde::{Deserialize, Serialize};
use tsify::Tsify;

#[derive(Deserialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct FormatOptions {
    pub tab_spaces: usize,
    pub max_width: usize,
    pub blank_lines_upper_bound: usize,
    pub collapse_markup_spaces: bool,
    pub reorder_import_items: bool,
    pub wrap_text: bool,
    #[tsify(optional)]
    pub range: Option<[usize; 2]>,
}

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct FormatResult {
    pub content: String,
    pub range: [usize; 2],
}
