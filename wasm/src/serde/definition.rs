use crate::serde::jump::Jump;
use crate::serde::values::Value;
use serde::Serialize;
use tsify::Tsify;
use typst::World;

#[derive(Serialize, Tsify)]
#[serde(rename_all = "camelCase")]
pub struct Definition {
    pub value: DefinitionValue,
    pub origin: Origin,
}

#[derive(Serialize, Tsify)]
#[serde(untagged)]
pub enum DefinitionValue {
    Span(DefinitionSpan),
    Value(Value),
}

#[derive(Serialize, Tsify)]
#[serde(tag = "type", content = "value")]
#[serde(rename_all = "camelCase")]
pub enum Origin {
    BuiltIn,
    Package { name: String, path: String },
    User { this: bool, path: String },
}

#[derive(Serialize, Tsify)]
#[serde(tag = "type", content = "value")]
pub enum DefinitionSpan {
    #[serde(rename = "span")]
    Span(Jump),
}

impl Definition {
    pub fn from_definition<W>(def: typst_ide::Definition, world: &W) -> Option<Self>
    where
        W: World,
    {
        match def {
            typst_ide::Definition::Span(span) => {
                let id = span.id()?;
                let range = span.range()?;
                let jump = Jump::from_jump(&typst_ide::Jump::File(id, range.start), world);

                let origin = if let Some(package) = id.package() {
                    Origin::Package {
                        name: package.to_string(),
                        path: id.vpath().as_rootless_path().to_string_lossy().to_string(),
                    }
                } else {
                    Origin::User {
                        this: id == world.main(),
                        path: id.vpath().as_rootless_path().to_string_lossy().to_string(),
                    }
                };

                Some(Self {
                    value: DefinitionValue::Span(DefinitionSpan::Span(jump)),
                    origin,
                })
            }
            typst_ide::Definition::Std(value) => Some(Self {
                value: DefinitionValue::Value(Value::from(&value)),
                origin: Origin::BuiltIn,
            }),
        }
    }
}
