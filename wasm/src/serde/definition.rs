use std::ops::Range;

use serde::Serialize;

use tsify::Tsify;
use typst::{
    World,
    foundations::Value,
    syntax::{self, VirtualRoot},
};
use typst_ide::{Definition, IdeWorld};

use crate::serde::values::ValueSer;

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum DefinitionSer {
    SpanWithValue(ValueSer),
    Std(ValueSer),
    Span {
        package: Option<String>,
        file: String,
        start: usize,
        end: usize,
    },
}

impl DefinitionSer {
    pub fn from_definition<W>(definition: &Definition, world: &W) -> Option<Self>
    where
        W: World + IdeWorld,
    {
        match definition {
            Definition::Span(span) => {
                let value = get_value_from_span(span, world);
                match value {
                    Some(value) => Some(DefinitionSer::SpanWithValue(ValueSer::from(&value))),
                    None => {
                        let source = world.source(span.id()?).ok()?;
                        let range = source.range(*span).unwrap_or(Range { start: 0, end: 0 });
                        let lines = source.lines();
                        let from = lines.byte_to_utf16(range.start).unwrap_or(0);
                        let to = lines.byte_to_utf16(range.end).unwrap_or(0);
                        let package = match source.id().root() {
                            VirtualRoot::Package(spec) => Some(format!(
                                "@{}/{}:{}",
                                spec.namespace, spec.name, spec.version
                            )),
                            _ => None,
                        };
                        Some(DefinitionSer::Span {
                            package,
                            file: source.id().vpath().get_without_slash().to_string(),
                            start: from,
                            end: to,
                        })
                    }
                }
            }
            Definition::Std(value) => Some(DefinitionSer::Std(ValueSer::from(value))),
        }
    }
}

fn get_value_from_span<W>(span: &syntax::Span, world: &W) -> Option<Value>
where
    W: World + IdeWorld,
{
    let source = world.source(span.id()?).ok()?;
    let value = typst_ide::analyze_expr(world, &source.find(*span)?)
        .first()?
        .0
        .clone();

    Some(value)
}
