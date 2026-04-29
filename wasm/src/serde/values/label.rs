use serde::Serialize;
use typst::foundations::Repr;
use tsify::Tsify;

use typst::foundations::Label as TypstLabel;

#[derive(Serialize, Tsify)]
pub struct Label {
    pub repr: String,
    pub name: String,
}

impl From<&TypstLabel> for Label {
    fn from(label: &TypstLabel) -> Self {
        Label {
            repr: label.repr().to_string(),
            name: label.resolve().as_str().to_string(),
        }
    }
}
