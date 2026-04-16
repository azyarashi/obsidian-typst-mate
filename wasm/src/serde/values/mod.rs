use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Value as TypstValue;

pub mod angle;
pub mod args;
pub mod array;
pub mod bytes;
pub mod color;
pub mod content;
pub mod datetime;
pub mod decimal;
pub mod dict;
pub mod duration;
pub mod r#dyn;
pub mod fraction;
pub mod func;
pub mod gradient;
pub mod label;
pub mod length;
pub mod module;
pub mod ratio;
pub mod relative;
pub mod str;
pub mod styles;
pub mod symbol;
pub mod tiling;
pub mod type_;
pub mod version;

pub use angle::Angle;
pub use args::Args;
pub use array::Array;
pub use bytes::Bytes;
pub use color::Color;
pub use content::Content;
pub use datetime::Datetime;
pub use decimal::Decimal;
pub use dict::Dict;
pub use duration::DurationValue;
pub use r#dyn::Dyn;
pub use fraction::Fr;
pub use func::Func;
pub use gradient::Gradient;
pub use label::Label;
pub use length::Length;
pub use module::Module;
pub use ratio::Ratio;
pub use relative::Relative;
pub use str::Str;
pub use styles::Styles;
pub use symbol::Symbol;
pub use tiling::Tiling;
pub use type_::Type;
pub use version::Version;

#[derive(Serialize, Tsify)]
#[serde(tag = "type", content = "value")]
pub enum Value {
    None,
    Auto,
    Bool(bool),
    Int(i64),
    Float(f64),
    Length(Length),
    Angle(Angle),
    Ratio(Ratio),
    Relative(Relative),
    Fraction(Fr),
    Color(Color),
    Gradient(Gradient),
    Tiling(Tiling),
    Symbol(Symbol),
    Version(Version),
    Str(Str),
    Bytes(Bytes),
    Label(Label),
    Datetime(Datetime),
    Decimal(Decimal),
    Duration(DurationValue),
    Content(Content),
    Styles(Styles),
    Array(Array),
    Dict(Dict),
    Func(Func),
    Args(Args),
    Type(Type),
    Module(Module),
    Dyn(Dyn),
}

impl From<&TypstValue> for Value {
    fn from(value: &TypstValue) -> Self {
        match value {
            TypstValue::None => Value::None,
            TypstValue::Auto => Value::Auto,
            TypstValue::Bool(v) => Value::Bool(*v),
            TypstValue::Int(v) => Value::Int(*v),
            TypstValue::Float(v) => Value::Float(*v),
            TypstValue::Length(v) => Value::Length(Length::from(v)),
            TypstValue::Angle(v) => Value::Angle(Angle::from(v)),
            TypstValue::Ratio(v) => Value::Ratio(Ratio::from(v)),
            TypstValue::Relative(v) => Value::Relative(Relative::from(v)),
            TypstValue::Fraction(v) => Value::Fraction(Fr::from(v)),
            TypstValue::Color(v) => Value::Color(Color::from(v)),
            TypstValue::Gradient(v) => Value::Gradient(Gradient::from(v)),
            TypstValue::Tiling(v) => Value::Tiling(Tiling::from(v)),
            TypstValue::Symbol(v) => Value::Symbol(Symbol::from(v)),
            TypstValue::Version(v) => Value::Version(Version::from(v)),
            TypstValue::Str(v) => Value::Str(Str::from(v)),
            TypstValue::Bytes(v) => Value::Bytes(Bytes::from(v)),
            TypstValue::Label(v) => Value::Label(Label::from(v)),
            TypstValue::Datetime(v) => Value::Datetime(Datetime::from(v)),
            TypstValue::Decimal(v) => Value::Decimal(Decimal::from(v)),
            TypstValue::Duration(v) => Value::Duration(DurationValue::from(v)),
            TypstValue::Content(v) => Value::Content(Content::from(v)),
            TypstValue::Styles(v) => Value::Styles(Styles::from(v)),
            TypstValue::Array(v) => Value::Array(Array::from(v)),
            TypstValue::Dict(v) => Value::Dict(Dict::from(v)),
            TypstValue::Func(v) => Value::Func(Func::from(v)),
            TypstValue::Args(v) => Value::Args(Args::from(v)),
            TypstValue::Type(v) => Value::Type(Type::from(v)),
            TypstValue::Module(v) => Value::Module(Module::from(v)),
            TypstValue::Dyn(v) => Value::Dyn(Dyn::from(v)),
        }
    }
}
