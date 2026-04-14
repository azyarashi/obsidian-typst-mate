use serde::Serialize;
use tsify::Tsify;
use typst::syntax::package::PackageSpec as TypstPackageSpec;

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct PackageSpec {
    pub namespace: String,
    pub name: String,
    pub version: String,
}

impl From<&TypstPackageSpec> for PackageSpec {
    fn from(spec: &TypstPackageSpec) -> Self {
        PackageSpec {
            namespace: spec.namespace.to_string(),
            name: spec.name.to_string(),
            version: spec.version.to_string(),
        }
    }
}
