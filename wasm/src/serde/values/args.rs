use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{Args as TypstArgs, Repr};

use crate::serde::values::Value;

#[derive(Serialize, Tsify)]
pub struct Arg {
    name: String,
    value: Value,
    is_positional: bool,
}

#[derive(Serialize, Tsify)]
pub struct Args {
    pub repr: String,
    args: Vec<Arg>,
}

impl From<&TypstArgs> for Args {
    fn from(args: &TypstArgs) -> Self {
        Args {
            repr: args.repr().to_string(),
            args: args
                .items
                .iter()
                .map(|arg| Arg {
                    name: arg.name.as_ref().map(|s| s.to_string()).unwrap_or_default(),
                    value: (&arg.value.v).into(),
                    is_positional: arg.name.is_none(),
                })
                .collect(),
        }
    }
}
