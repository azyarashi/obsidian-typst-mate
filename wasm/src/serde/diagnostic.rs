use std::ops::Range;

use serde::Serialize;
use tsify::Tsify;

use typst::{
    World, WorldExt,
    diag::{Severity, SourceDiagnostic as TypstDiagnostic},
};

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct Trace {
    pub span: Range<usize>,
    pub point: String,
}

#[derive(Serialize, Tsify)]
#[serde(rename_all = "lowercase")]
pub enum DiagnosticSeverity {
    Error,
    Warning,
}

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    pub severity: DiagnosticSeverity,
    pub from: usize,
    pub to: usize,
    pub message: String,
    pub trace: Vec<Trace>,
    pub hints: Vec<String>,
}

impl Diagnostic {
    pub fn from_diag<W>(diag: &TypstDiagnostic, world: &W) -> Self
    where
        W: World,
    {
        let (from, to) = match diag.span.id().and_then(|id| world.source(id).ok()) {
            Some(source) => {
                let range = world.range(diag.span).unwrap_or(0..0);
                let lines = source.lines();
                let from = lines.byte_to_utf16(range.start).unwrap_or(0);
                let to = lines.byte_to_utf16(range.end).unwrap_or(0);
                (from, to)
            }
            None => (0, 0),
        };

        Diagnostic {
            severity: match diag.severity {
                Severity::Error => DiagnosticSeverity::Error,
                Severity::Warning => DiagnosticSeverity::Warning,
            },
            from,
            to,
            message: diag.message.as_str().to_string(),
            trace: diag
                .trace
                .iter()
                .map(|t| Trace {
                    span: world.range(t.span).unwrap_or(Range { start: 0, end: 0 }),
                    point: t.v.to_string(),
                })
                .collect(),
            hints: diag.hints.iter().map(|h| h.as_str().to_string()).collect(),
        }
    }
}
