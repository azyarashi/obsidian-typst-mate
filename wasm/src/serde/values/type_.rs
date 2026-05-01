use serde::Serialize;
use tsify::Tsify;
use typst::foundations::Repr;

use crate::utils::resolve_docs;
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
            docs: resolve_docs(&type_.docs()),
        }
    }
}
