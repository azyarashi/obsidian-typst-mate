use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Type;

#[derive(Serialize, Tsify)]
pub struct TypeSer {
    title: String,
    docs: String,
}

impl From<&Type> for TypeSer {
    fn from(type_: &Type) -> Self {
        TypeSer {
            title: type_.title().to_string(),
            docs: type_.docs().to_string(),
        }
    }
}
