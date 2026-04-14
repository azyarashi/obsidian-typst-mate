use ecow::EcoVec;
use serde::Serialize;
use serde_wasm_bindgen::to_value;
use wasm_bindgen::JsValue;

use typst::{diag::SourceDiagnostic, ecow};

use crate::serde::diagnostic::Diagnostic;
use crate::world::WasmWorld;

use tsify::Tsify;

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct HtmlResult {
    pub html: String,
    pub diags: Vec<Diagnostic>,
}

pub fn htmlm(
    html: String,
    diags: EcoVec<SourceDiagnostic>,
    world: &WasmWorld,
) -> Result<JsValue, JsValue> {
    let result = HtmlResult {
        html,
        diags: diags
            .iter()
            .map(|d| Diagnostic::from_diag(d, world))
            .collect(),
    };
    Ok(to_value(&result)?)
}
