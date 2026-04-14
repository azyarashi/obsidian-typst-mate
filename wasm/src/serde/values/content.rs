use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{Content as TypstContent, Repr};

#[derive(Serialize, Tsify)]
pub struct Content {
    pub repr: String,
}

impl From<&TypstContent> for Content {
    fn from(content: &TypstContent) -> Self {
        Content {
            repr: content.repr().to_string(),
        }
    }
}
