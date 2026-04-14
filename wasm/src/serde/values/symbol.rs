use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Symbol as TypstSymbol;

#[derive(Serialize, Tsify)]
pub struct Symbol {
    char: String,
}

impl From<&TypstSymbol> for Symbol {
    fn from(symbol: &TypstSymbol) -> Self {
        Symbol {
            char: symbol.get().to_string(),
        }
    }
}
