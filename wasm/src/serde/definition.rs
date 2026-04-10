use crate::serde::jump::JumpSer;
use crate::serde::values::ValueSer;
use serde::Serialize;
use tsify::Tsify;
use typst::World;

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct DefinitionSer {
    pub value: DefinitionValueSer,
    pub origin: OriginSer,
}

#[derive(Serialize, Tsify)]
#[serde(untagged)]
pub enum DefinitionValueSer {
    Span(DefinitionSpanSer),
    Value(ValueSer),
}

#[derive(Serialize, Tsify)]
#[serde(tag = "type", content = "value")]
#[serde(rename_all = "camelCase")]
pub enum OriginSer {
    BuiltIn,
    Package { name: String, path: String },
    User { this: bool, path: String },
}

#[derive(Serialize, Tsify)]
#[serde(tag = "type", content = "value")]
pub enum DefinitionSpanSer {
    #[serde(rename = "span")]
    Span(JumpSer),
}

impl DefinitionSer {
    pub fn from_definition<W>(def: typst_ide::Definition, world: &W) -> Option<Self>
    where
        W: World,
    {
        match def {
            typst_ide::Definition::Span(span) => {
                let id = span.id()?;
                let range = span.range()?;
                let jump = JumpSer::from_jump(&typst_ide::Jump::File(id, range.start), world);

                let origin = if let Some(package) = id.package() {
                    OriginSer::Package {
                        name: package.to_string(),
                        path: id.vpath().as_rootless_path().to_string_lossy().to_string(),
                    }
                } else {
                    OriginSer::User {
                        this: id == world.main(),
                        path: id.vpath().as_rootless_path().to_string_lossy().to_string(),
                    }
                };

                Some(Self {
                    value: DefinitionValueSer::Span(DefinitionSpanSer::Span(jump)),
                    origin,
                })
            }
            typst_ide::Definition::Std(value) => Some(Self {
                value: DefinitionValueSer::Value(ValueSer::from(&value)),
                origin: OriginSer::BuiltIn,
            }),
        }
    }
}
