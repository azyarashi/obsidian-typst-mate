use serde::Serialize;
use tsify::Tsify;

use crate::typst::foundations::Module;

// TODO
#[derive(Serialize, Tsify)]
pub struct ModuleSer {
    pub name: String,
    pub exports_count: usize,
}

impl From<&Module> for ModuleSer {
    fn from(module: &Module) -> Self {
        let name = module.name().map(|n| n.to_string()).unwrap_or_default();
        let exports_count = module.scope().iter().count();

        ModuleSer {
            name: name,
            exports_count,
        }
    }
}
