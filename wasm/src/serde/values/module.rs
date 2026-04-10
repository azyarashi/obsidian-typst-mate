use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{Module, Repr};

// TODO
#[derive(Serialize, Tsify)]
pub struct ModuleSer {
    pub name: String,
    pub exports: Vec<String>,
    pub exports_count: usize,
}

impl From<&Module> for ModuleSer {
    fn from(module: &Module) -> Self {
        let name = module.name().map(|n| n.to_string()).unwrap_or_default();
        let exports = module
            .scope()
            .iter()
            .map(|(_, v)| v.read().repr().to_string())
            .collect();
        let exports_count = module.scope().iter().count();

        ModuleSer {
            name,
            exports,
            exports_count,
        }
    }
}
