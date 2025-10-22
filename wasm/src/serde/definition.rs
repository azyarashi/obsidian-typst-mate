use std::ops::Range;

use serde::Serialize;
use tsify::Tsify;
use wasm_bindgen::prelude::wasm_bindgen;

use crate::typst::{World, WorldExt};
use crate::typst_ide::Definition;

use crate::serde::values::ValueSer;

#[derive(Serialize, Tsify)]
#[serde(tag = "kind", content = "content")]
pub enum DefinitionSer {
    Span(SpanSer),
    Std(ValueSer),
}

#[derive(Serialize, Tsify)]
pub struct SpanSer {
    pub content: String,
    pub start: usize,
    pub end: usize,
}

impl DefinitionSer {
    pub fn from_def_with_world<W>(def: &Definition, world: &W) -> Self
    where
        W: World,
    {
        match def {
            Definition::Std(value) => DefinitionSer::Std(ValueSer::from(value)),
            Definition::Span(span) => {
                let source = world.source(span.id().unwrap()).unwrap();
                let content = source.text().to_string();

                let range = world.range(*span).unwrap_or(Range { start: 0, end: 0 });

                #[cfg(feature = "legacy")]
                let (start, end) = {
                    let start = source.byte_to_utf16(range.start).unwrap_or(0);
                    let end = source.byte_to_utf16(range.end).unwrap_or(0);
                    (start, end)
                };

                #[cfg(feature = "latest")]
                let (start, end) = {
                    let lines = source.lines();
                    let start = lines.byte_to_utf16(range.start).unwrap_or(0);
                    let end = lines.byte_to_utf16(range.end).unwrap_or(0);
                    (start, end)
                };

                DefinitionSer::Span(SpanSer {
                    content,
                    start,
                    end,
                })
            }
        }
    }
}
