use ecow::EcoVec;
use serde::Serialize;

use serde_wasm_bindgen::to_value;
use wasm_bindgen::JsValue;

use typst::{diag::SourceDiagnostic, ecow};

use crate::serde::diagnostic::SourceDiagnosticSer;
use crate::world::WasmWorld;

#[derive(Serialize)]
struct PdfrSer {
    pdf: Vec<u8>,
    diags: Vec<SourceDiagnosticSer>,
}

pub fn pdfr(
    pdf: Vec<u8>,
    diags: EcoVec<SourceDiagnostic>,
    world: &WasmWorld,
) -> Result<JsValue, JsValue> {
    let result = PdfrSer {
        pdf,
        diags: diags
            .iter()
            .map(|d| SourceDiagnosticSer::from_diag(d, world))
            .collect(),
    };
    Ok(to_value(&result)?)
}
