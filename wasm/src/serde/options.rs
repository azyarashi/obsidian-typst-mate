use serde::Deserialize;
use tsify::Tsify;

#[derive(Deserialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct PdfOptionsSer {
    #[tsify(optional)]
    pub ident: Option<String>,
    #[tsify(optional)]
    pub timestamp: Option<i64>,
    #[tsify(optional)]
    pub offset: Option<i32>,
    #[tsify(optional)]
    pub page_ranges: Option<String>,
    #[tsify(type = "string[]")]
    pub standards: Vec<typst_pdf::PdfStandard>,
    pub tagged: bool,
}

#[derive(Deserialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct SvgOptionsSer {
    #[tsify(optional)]
    pub page_ranges: Option<String>,
}

#[derive(Deserialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct PngOptionsSer {
    pub ppi: f32,
    #[tsify(optional)]
    pub page_ranges: Option<String>,
}

#[derive(Deserialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct HtmlOptionsSer {
    #[tsify(optional)]
    pub extract_body: Option<bool>,
}

#[derive(Deserialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct FormatOptionsSer {
    pub tab_spaces: usize,
    pub max_width: usize,
    pub blank_lines_upper_bound: usize,
    pub collapse_markup_spaces: bool,
    pub reorder_import_items: bool,
    pub wrap_text: bool,
    #[tsify(optional)]
    pub range: Option<[usize; 2]>,
}
#[derive(serde::Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct FormatResultSer {
    pub content: String,
    pub range: [usize; 2],
}
