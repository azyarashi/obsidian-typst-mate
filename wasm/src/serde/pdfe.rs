use ecow::EcoVec;
use serde::{Deserialize, Serialize};

use serde_wasm_bindgen::to_value;
use wasm_bindgen::JsValue;

use typst::{diag::SourceDiagnostic, ecow};

use crate::serde::diagnostic::Diagnostic;
use crate::world::WasmWorld;

use tsify::Tsify;

#[derive(Deserialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct PdfOptions {
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

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct PdfExportResult {
    #[tsify(type = "Uint8Array")]
    pub pdf: Vec<u8>,
    pub diags: Vec<Diagnostic>,
}

pub fn pdfe(
    pdf: Vec<u8>,
    diags: EcoVec<SourceDiagnostic>,
    world: &WasmWorld,
) -> Result<JsValue, JsValue> {
    let result = PdfExportResult {
        pdf,
        diags: diags
            .iter()
            .map(|d| Diagnostic::from_diag(d, world))
            .collect(),
    };
    Ok(to_value(&result)?)
}
