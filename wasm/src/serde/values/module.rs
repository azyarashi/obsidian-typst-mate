use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{Module as TypstModule, Repr};

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct Module {
    pub repr: String,
    pub name: String,
    pub exports: Vec<String>,
    pub exports_count: usize,
}

impl From<&TypstModule> for Module {
    fn from(module: &TypstModule) -> Self {
        let exports: Vec<String> = module.scope().iter().map(|(n, _)| n.to_string()).collect();
        Module {
            repr: module.repr().to_string(),
            name: module.name().map(|n| n.to_string()).unwrap_or_default(),
            exports_count: exports.len(),
            exports,
        }
    }
}
