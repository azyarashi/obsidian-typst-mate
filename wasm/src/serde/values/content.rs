use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{Content, Repr};

// TODO
#[derive(Serialize, Tsify)]
pub struct ContentSer {
    pub repr: String,
}

impl From<&Content> for ContentSer {
    fn from(content: &Content) -> Self {
        ContentSer {
            repr: content.repr().to_string(),
        }
    }
}
