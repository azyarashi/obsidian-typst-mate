use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Dynamic;

#[derive(Serialize, Tsify)]
pub struct Dyn {
    pub repr: String,
}

impl From<&Dynamic> for Dyn {
    fn from(v: &Dynamic) -> Self {
        Dyn {
            repr: format!("{:?}", v),
        }
    }
}
