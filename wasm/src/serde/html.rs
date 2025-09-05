use ecow::EcoVec;
use serde::Serialize;
use serde_wasm_bindgen::to_value;
use wasm_bindgen::JsValue;

use typst::{diag::SourceDiagnostic, ecow};

use crate::serde::diagnostic::SourceDiagnosticSer;

#[derive(Serialize)]
struct HtmlResultSer {
    svg: String,
    diags: Vec<SourceDiagnosticSer>,
}

pub fn html(svg: String, diags: EcoVec<SourceDiagnostic>) -> Result<JsValue, JsValue> {
    let result = HtmlResultSer {
        svg,
        diags: diags.iter().map(|d| d.into()).collect(),
    };
    Ok(to_value(&result)?)
}
