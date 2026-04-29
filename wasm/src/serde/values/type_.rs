use serde::Serialize;
use typst::foundations::Repr;
use tsify::Tsify;

use typst::foundations::Type as TypstType;

#[derive(Serialize, Tsify)]
pub struct Type {
    pub repr: String,
    pub title: String,
    pub docs: String,
}

impl From<&TypstType> for Type {
    fn from(type_: &TypstType) -> Self {
        Type {
            repr: type_.repr().to_string(),
            title: type_.title().to_string(),
            docs: type_.docs().to_string(),
        }
    }
}
