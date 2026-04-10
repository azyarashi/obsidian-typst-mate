use serde::Serialize;
use tsify::Tsify;
use typst_ide::{Completion, CompletionKind};

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct CompletionResultSer {
    pub from: usize,
    pub completions: Vec<CompletionSer>,
}

#[derive(Debug, Clone, Copy, Serialize, Tsify, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CompletionKindSer {
    Func,
    Type,
    Param,
    Constant,
    Path,
    Package,
    Label,
    Font,
    Symbol,
    Syntax,
}

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct CompletionSer {
    pub kind: CompletionKindSer,
    pub label: String,

    pub detail: Option<String>,
    pub symbol: Option<String>,
    pub apply: Option<String>,
}

impl CompletionSer {
    pub fn from_completion(c: Completion) -> Self {
        let (kind, symbol) = match &c.kind {
            CompletionKind::Syntax => (CompletionKindSer::Syntax, None),
            CompletionKind::Func => (CompletionKindSer::Func, None),
            CompletionKind::Type => (CompletionKindSer::Type, None),
            CompletionKind::Param => (CompletionKindSer::Param, None),
            CompletionKind::Constant => (CompletionKindSer::Constant, None),
            CompletionKind::Path => (CompletionKindSer::Path, None),
            CompletionKind::Package => (CompletionKindSer::Package, None),
            CompletionKind::Label => (CompletionKindSer::Label, None),
            CompletionKind::Font => (CompletionKindSer::Font, None),
            CompletionKind::Symbol(s) => (CompletionKindSer::Symbol, Some(s.to_string())),
        };

        Self {
            kind,
            symbol,
            label: c.label.to_string(),
            apply: c.apply.map(|s| s.to_string()),
            detail: c.detail.map(|s| s.to_string()),
        }
    }
}
