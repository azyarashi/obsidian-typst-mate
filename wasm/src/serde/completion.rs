use serde::Serialize;
use tsify::Tsify;
use typst_ide::{Completion as TypstCompletion, CompletionKind as TypstCompletionKind};

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct CompletionResult {
    pub from: usize,
    pub completions: Vec<Completion>,
}

#[derive(Debug, Clone, Copy, Serialize, Tsify, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CompletionKind {
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

impl From<TypstCompletionKind> for CompletionKind {
    fn from(kind: TypstCompletionKind) -> Self {
        match kind {
            TypstCompletionKind::Syntax => Self::Syntax,
            TypstCompletionKind::Func => Self::Func,
            TypstCompletionKind::Type => Self::Type,
            TypstCompletionKind::Param => Self::Param,
            TypstCompletionKind::Constant => Self::Constant,
            TypstCompletionKind::Path => Self::Path,
            TypstCompletionKind::Package => Self::Package,
            TypstCompletionKind::Label => Self::Label,
            TypstCompletionKind::Font => Self::Font,
            TypstCompletionKind::Symbol(_) => Self::Symbol,
        }
    }
}

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct Completion {
    pub kind: CompletionKind,
    pub label: String,
    pub detail: Option<String>,
    pub symbol: Option<String>,
    pub apply: Option<String>,
}

impl Completion {
    pub fn from_completion(c: TypstCompletion) -> Self {
        let kind = CompletionKind::from(c.kind.clone());
        let symbol = match &c.kind {
            TypstCompletionKind::Symbol(s) => Some(s.to_string()),
            _ => None,
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
