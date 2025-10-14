use serde::Serialize;

use crate::typst::syntax::package::PackageSpec;

#[derive(Serialize)]
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
