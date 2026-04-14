use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Type as TypstType;

#[derive(Serialize, Tsify)]
pub struct Type {
    pub title: String,
    pub docs: String,
}

impl From<&TypstType> for Type {
    fn from(type_: &TypstType) -> Self {
        Type {
            title: type_.title().to_string(),
            docs: type_.docs().to_string(),
        }
    }
}
