use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Version;

#[derive(Serialize, Tsify)]
pub struct VersionSer {
    version: String,
}

impl From<&Version> for VersionSer {
    fn from(version: &Version) -> Self {
        let major = version.at(0).unwrap_or(-1);
        let minor = version.at(1).unwrap_or(-1);
        let patch = version.at(2).unwrap_or(-1);

        if major == -1 || minor == -1 || patch == -1 {
            VersionSer {
                version: "Not valid version".to_string(),
            }
        } else {
            VersionSer {
                version: format!("{}.{}.{}", major, minor, patch),
            }
        }
    }
}
