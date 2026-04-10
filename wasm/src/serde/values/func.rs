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
    pub types: Vec<CastInfoSer>,
    pub default: Option<String>,
    pub named: bool,
    pub positional: bool,
    pub required: bool,
    pub variadic: bool,
}

#[derive(Serialize, Tsify)]
pub struct FuncSer {
    pub name: String,
    pub repr: String,
    pub docs: String,
    pub params: Option<Vec<ParamSer>>,
}

impl From<&Func> for FuncSer {
    fn from(func: &Func) -> Self {
        FuncSer {
            name: func.name().unwrap_or("function").to_string(),
            repr: func.repr().to_string(),
            docs: func.docs().unwrap_or("no_doc").to_string(),
            params: func.params().map(|slice| {
                slice
                    .iter()
                    .map(|p| ParamSer {
                        name: p.name.to_string(),
                        docs: p.docs.to_string(),
                        types: cast_info_to_types(&p.input),
                        default: p.default.map(|f| f().repr().to_string()),
                        named: p.named,
                        positional: p.positional,
                        required: p.required,
                        variadic: p.variadic,
                    })
                    .collect()
            }),
        }
    }
}
