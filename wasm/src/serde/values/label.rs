use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Label as TypstLabel;

#[derive(Serialize, Tsify)]
pub struct Label {
    pub name: String,
}

impl From<&TypstLabel> for Label {
    fn from(label: &TypstLabel) -> Self {
        Label {
            name: label.resolve().as_str().to_string(),
        }
    }
}
