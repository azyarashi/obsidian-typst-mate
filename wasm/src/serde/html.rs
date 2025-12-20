use serde::Serialize;
use serde_wasm_bindgen::to_value;
use wasm_bindgen::JsValue;

use typst::{diag::SourceDiagnostic, ecow::EcoVec};

use crate::serde::diagnostic::SourceDiagnosticSer;
use crate::world::WasmWorld;

#[derive(Serialize)]
struct HtmlResultSer {
    html: String,
    diags: Vec<SourceDiagnosticSer>,
}

fn extract_body(html: &str) -> Option<&str> {
    let (_, rest) = html.split_once("<body")?;
    let (_, rest) = rest.split_once('>')?;
    let (body, _) = rest.split_once("</body>")?;
    Some(body)
}

pub fn html(
    html: String,
    diags: EcoVec<SourceDiagnostic>,
    world: &WasmWorld,
) -> Result<JsValue, JsValue> {
    let result = HtmlResultSer {
        html: extract_body(&html).unwrap_or("error").to_string(),
        diags: diags
            .iter()
            .map(|d| SourceDiagnosticSer::from_diag(d, world))
            .collect(),
    };
    Ok(to_value(&result)?)
}
