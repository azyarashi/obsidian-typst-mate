use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{Args, Repr};

// TODO
#[derive(Serialize, Tsify)]
pub struct ArgsSer {
    repr: String,
}

impl From<&Args> for ArgsSer {
    fn from(args: &Args) -> Self {
        ArgsSer {
            repr: args.repr().to_string(),
        }
    }
}
