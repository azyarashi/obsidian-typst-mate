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
pub struct SvgEOptions {
    #[tsify(optional)]
    pub page_ranges: Option<String>,
}

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct SvgEResult {
    pub svgs: Vec<String>,
    pub diags: Vec<Diagnostic>,
}

pub fn svge(
    svgs: Vec<String>,
    diags: EcoVec<SourceDiagnostic>,
    world: &WasmWorld,
) -> Result<JsValue, JsValue> {
    let result = SvgEResult {
        svgs,
        diags: diags
            .iter()
            .map(|d| Diagnostic::from_diag(d, world))
            .collect(),
    };
    Ok(to_value(&result)?)
}
