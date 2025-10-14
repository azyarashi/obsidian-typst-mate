use serde::Serialize;
use tsify::Tsify;

use crate::typst::foundations::{CastInfo, Func, Repr};

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
    pub params: Option<Vec<ParamSer>>,
}

impl From<&Func> for FuncSer {
    fn from(func: &Func) -> Self {
        FuncSer {
            repr: func.repr().to_string(),
            params: func.params().map(|params| {
                params
                    .into_iter()
                    .map(|p| ParamSer {
                        name: p.name.to_string(),
                        docs: p.docs.into(),
                        params: cast_info_to_types(&p.input),
                    })
                    .collect()
            }),
        }
    }
}
