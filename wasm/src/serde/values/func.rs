use serde::Serialize;
use tsify::Tsify;

use crate::utils::resolve_docs;
use typst::foundations::{CastInfo, Func as TypstFunc, Repr};

// TODO: elem
#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct Func {
    name: Option<String>,
    repr: String,
    docs: String,
    params: Vec<Param>,
}

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct Param {
    name: String,
    docs: String,
    types: Vec<CastItem>,
    default: Option<String>,
    named: bool,
    positional: bool,
    required: bool,
    variadic: bool,
    settable: bool,
}

#[derive(Serialize, Tsify)]
#[serde(tag = "type", content = "value")]
#[serde(rename_all = "camelCase")]
pub enum CastItem {
    Any,
    Value(String),
    Type(String),
}

impl From<&TypstFunc> for Func {
    fn from(func: &TypstFunc) -> Self {
        Func {
            name: func.name().map(|n| n.to_string()),
            repr: func.repr().to_string(),
            docs: resolve_docs(&func.docs().unwrap_or_default()),
            params: func
                .params()
                .into_iter()
                .flatten()
                .map(|p| Param {
                    name: p.name.to_string(),
                    docs: resolve_docs(&p.docs),
                    types: cast_info_to_types(&p.input),
                    default: p.default.map(|f| f().repr().to_string()),
                    named: p.named,
                    positional: p.positional,
                    required: p.required,
                    variadic: p.variadic,
                    settable: p.settable,
                })
                .collect(),
        }
    }
}

fn cast_info_to_types(cast_info: &CastInfo) -> Vec<CastItem> {
    let mut items = Vec::new();
    match cast_info {
        CastInfo::Any => items.push(CastItem::Any),
        CastInfo::Value(v, _) => items.push(CastItem::Value(v.repr().to_string())),
        CastInfo::Type(t) => items.push(CastItem::Type(t.short_name().to_string())),
        CastInfo::Union(v) => {
            for sub in v {
                items.extend(cast_info_to_types(sub));
            }
        }
    }
    items
}
