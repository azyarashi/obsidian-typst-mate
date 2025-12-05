use std::ops::Range;

use serde::Serialize;

use typst::{
    World, WorldExt,
    diag::{Severity, SourceDiagnostic},
};

#[derive(Serialize)]
pub struct TraceSer {
    span: Range<usize>,
    point: String,
}

#[derive(Serialize)]
pub struct SourceDiagnosticSer {
    pub severity: String,
    pub from: usize,
    pub to: usize,
    pub message: String,
    pub trace: Vec<TraceSer>,
    pub hints: Vec<String>,
}

impl SourceDiagnosticSer {
    pub fn from_diag<W>(diag: &SourceDiagnostic, world: &W) -> Self
    where
        W: World,
    {
        let source = world.source(diag.span.id().unwrap()).unwrap();
        let range = world.range(diag.span).unwrap_or(Range { start: 0, end: 0 });
        let lines = source.lines();
        let from = lines.byte_to_utf16(range.start).unwrap_or(0);
        let to = lines.byte_to_utf16(range.end).unwrap_or(0);

        SourceDiagnosticSer {
            severity: match diag.severity {
                Severity::Error => "error".to_string(),
                Severity::Warning => "warning".to_string(),
            },
            from,
            to,
            message: diag.message.as_str().to_string(),
            trace: diag
                .trace
                .iter()
                .map(|t| TraceSer {
                    span: world.range(t.span).unwrap_or(Range { start: 0, end: 0 }),
                    point: t.v.to_string(),
                })
                .collect(),
            hints: diag.hints.iter().map(|h| h.as_str().to_string()).collect(),
        }
    }
}
