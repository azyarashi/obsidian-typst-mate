use serde::Serialize;
use tsify::Tsify;

use typst::syntax::package::PackageSpec;

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct PackageSpecSer {
    pub namespace: String,
    pub name: String,
    pub version: String,
}

impl From<&PackageSpec> for PackageSpecSer {
    fn from(spec: &PackageSpec) -> Self {
        PackageSpecSer {
            namespace: spec.namespace.to_string(),
            name: spec.name.to_string(),
            version: spec.version.to_string(),
        }
    }
}
