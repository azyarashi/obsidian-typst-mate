use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{Args, Repr};

use crate::serde::values::ValueSer;

#[derive(Serialize, Tsify)]
pub struct ArgSer {
    name: String,
    value: ValueSer,
    is_positional: bool,
}

#[derive(Serialize, Tsify)]
pub struct ArgsSer {
    repr: String,
    args: Vec<ArgSer>,
}

impl From<&Args> for ArgsSer {
    fn from(args: &Args) -> Self {
        ArgsSer {
            repr: args.repr().to_string(),
            args: args
                .items
                .iter()
                .map(|arg| ArgSer {
                    name: arg.name.as_ref().map(|s| s.to_string()).unwrap_or_default(),
                    value: (&arg.value.v).into(),
                    is_positional: arg.name.is_none(),
                })
                .collect(),
        }
    }
}
