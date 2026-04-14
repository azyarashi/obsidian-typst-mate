use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Version as TypstVersion;

#[derive(Serialize, Tsify)]
pub struct Version {
    pub version: String,
}

impl From<&TypstVersion> for Version {
    fn from(version: &TypstVersion) -> Self {
        let major = version.at(0).unwrap_or(-1);
        let minor = version.at(1).unwrap_or(-1);
        let patch = version.at(2).unwrap_or(-1);

        if major == -1 || minor == -1 || patch == -1 {
            Version {
                version: "Not valid version".to_string(),
            }
        } else {
            Version {
                version: format!("{}.{}.{}", major, minor, patch),
            }
        }
    }
}
