use serde::Serialize;
use typst::foundations::Repr;
use tsify::Tsify;

use typst::foundations::Symbol as TypstSymbol;

#[derive(Serialize, Tsify)]
pub struct Symbol {
    pub repr: String,
    char: String,
}

impl From<&TypstSymbol> for Symbol {
    fn from(symbol: &TypstSymbol) -> Self {
        Symbol {
            repr: symbol.repr().to_string(),
            char: symbol.get().to_string(),
        }
    }
}
