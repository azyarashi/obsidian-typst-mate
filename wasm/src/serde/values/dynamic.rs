use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{Dynamic, Repr};

// TODO
#[derive(Serialize, Tsify)]
pub struct DynamicSer {
    pub repr: String,
}

impl From<&Dynamic> for DynamicSer {
    fn from(dynamic: &Dynamic) -> Self {
        DynamicSer {
            repr: dynamic.repr().to_string(),
        }
    }
}
