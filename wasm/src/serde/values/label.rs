use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Label;

#[derive(Serialize, Tsify)]
pub struct LabelSer {
    pub name: String,
}

impl From<&Label> for LabelSer {
    fn from(label: &Label) -> Self {
        LabelSer {
            name: label.resolve().as_str().to_string(),
        }
    }
}
