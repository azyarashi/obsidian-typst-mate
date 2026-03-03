use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfOptionsSer {
    pub ident: Option<String>,
    pub timestamp: Option<i64>,
    pub offset: Option<i32>,
    pub page_ranges: Option<String>,
    pub standards: Vec<typst_pdf::PdfStandard>,
    pub tagged: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SvgOptionsSer {
    pub page_ranges: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PngOptionsSer {
    pub ppi: f32,
    pub page_ranges: Option<String>,
}
