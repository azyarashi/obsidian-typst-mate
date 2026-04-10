use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Symbol;

#[derive(Serialize, Tsify)]
pub struct SymbolSer {
    char: String,
}

impl From<&Symbol> for SymbolSer {
    fn from(symbol: &Symbol) -> Self {
        SymbolSer {
            char: symbol.get().to_string(),
        }
    }
}
