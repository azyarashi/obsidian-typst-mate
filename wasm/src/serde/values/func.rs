use serde::Serialize;
use tsify::Tsify;

use typst::foundations::{CastInfo, Func, Repr};

fn cast_info_to_types(cast_info: &CastInfo) -> Vec<CastInfoSer> {
    match cast_info {
        CastInfo::Any => vec![CastInfoSer {
            kind: "any".to_string(),
            docs: "Any value is okay".to_string(),
        }],
        CastInfo::Value(value, docs) => {
            vec![CastInfoSer {
                kind: value.repr().to_string(),
                docs: docs.to_string(),
            }]
        }
        CastInfo::Type(typ) => {
            vec![CastInfoSer {
                kind: typ.repr().to_string(),
                docs: "Any value of this type".to_string(),
            }]
        }
        CastInfo::Union(alternatives) => alternatives.iter().flat_map(cast_info_to_types).collect(),
    }
}

#[derive(Serialize, Tsify)]
pub struct CastInfoSer {
    #[serde(rename = "type")]
    pub kind: String,
    pub docs: String,
}

#[derive(Serialize, Tsify)]
pub struct ParamSer {
    pub name: String,
    pub docs: String,
    pub params: Vec<CastInfoSer>,
}

#[derive(Serialize, Tsify)]
pub struct FuncSer {
    pub repr: String,
    pub docs: String,
    pub params: Option<Vec<ParamSer>>,
}

impl From<&Func> for FuncSer {
    fn from(func: &Func) -> Self {
        FuncSer {
            repr: func.repr().to_string(),
            docs: func.docs().unwrap_or("no_doc").to_string(),
            params: Some(
                func.params()
                    .map(|p| {
                        let (docs, params) = if let Some(native) = p.to_native() {
                            (native.docs, cast_info_to_types(&native.input))
                        } else {
                            ("no_doc", cast_info_to_types(&CastInfo::Any))
                        };

                        ParamSer {
                            name: p.name().unwrap_or("no_name").to_string(),
                            docs: docs.to_string(),
                            params,
                        }
                    })
                    .collect(),
            ),
        }
    }
}
