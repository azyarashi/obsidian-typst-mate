use serde::Serialize;
use tsify::Tsify;
use typst::foundations::Repr;

use typst::foundations::Symbol as TypstSymbol;

#[derive(Serialize, Tsify)]
pub struct Symbol_ {
    repr: String,
    char: String,
}

impl From<&TypstSymbol> for Symbol_ {
    fn from(symbol: &TypstSymbol) -> Self {
        Symbol_ {
            repr: symbol.repr().to_string(),
            // TODO
            char: symbol.get().to_string(),
        }
    }
}
