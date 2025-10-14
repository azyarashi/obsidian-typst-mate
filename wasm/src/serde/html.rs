use ecow::EcoVec;
use serde::Serialize;
use serde_wasm_bindgen::to_value;
use wasm_bindgen::JsValue;

use crate::typst::{diag::SourceDiagnostic, ecow};

use crate::serde::diagnostic::SourceDiagnosticSer;
use crate::world::WasmWorld;

#[derive(Serialize)]
struct HtmlResultSer {
    html: String,
    diags: Vec<SourceDiagnosticSer>,
}

pub fn html(
    html: String,
    diags: EcoVec<SourceDiagnostic>,
    world: &WasmWorld,
) -> Result<JsValue, JsValue> {
    let result = HtmlResultSer {
        html,
        diags: diags
            .iter()
            .map(|d| SourceDiagnosticSer::from_diag(d, world))
            .collect(),
    };
    Ok(to_value(&result)?)
}
