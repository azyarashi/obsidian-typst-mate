use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{Args as TypstArgs, Repr};

#[derive(Serialize, Tsify)]
pub struct Args {
    repr: String,
    args: Vec<Arg>,
}

#[derive(Serialize, Tsify)]
pub struct Arg {
    name: Option<String>,
    docs: Option<String>,
    repr: String,
}

impl From<&TypstArgs> for Args {
    fn from(args: &TypstArgs) -> Self {
        Args {
            repr: args.repr().to_string(),
            args: args
                .items
                .iter()
                .map(|arg| Arg {
                    name: arg.name.as_ref().map(|n| n.to_string()),
                    repr: arg.repr().to_string(),
                    docs: arg.value.v.docs().map(|d| d.to_string()),
                })
                .collect(),
        }
    }
}
