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
pub struct PngEOptions {
    pub ppi: f32,
    #[tsify(optional)]
    pub page_ranges: Option<String>,
}

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct PngEResult {
    #[tsify(type = "Uint8Array[]")]
    pub images: Vec<Vec<u8>>,
    pub diags: Vec<Diagnostic>,
}

pub fn pnge(
    images: Vec<Vec<u8>>,
    diags: EcoVec<SourceDiagnostic>,
    world: &WasmWorld,
) -> Result<JsValue, JsValue> {
    let result = PngEResult {
        images,
        diags: diags
            .iter()
            .map(|d| Diagnostic::from_diag(d, world))
            .collect(),
    };
    Ok(to_value(&result)?)
}
