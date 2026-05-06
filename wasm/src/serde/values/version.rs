use serde::Serialize;
use tsify::Tsify;
use typst::foundations::Repr;

use typst::foundations::Version as TypstVersion;

#[derive(Serialize, Tsify)]
pub struct Version {
    pub repr: String,
}

impl From<&TypstVersion> for Version {
    fn from(version: &TypstVersion) -> Self {
        Version {
            repr: version.repr().to_string(),
        }
    }
}
