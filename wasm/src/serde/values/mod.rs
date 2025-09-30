use serde::Serialize;
use tsify::Tsify;

use typst::foundations::Value;

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
pub mod dynamic;
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

pub use angle::AngleSer;
pub use args::ArgsSer;
pub use array::ArraySer;
pub use bytes::BytesSer;
pub use color::ColorSer;
pub use content::ContentSer;
pub use datetime::DatetimeSer;
pub use decimal::DecimalSer;
pub use dict::DictSer;
pub use duration::DurationSer;
pub use dynamic::DynamicSer;
pub use fraction::FrSer;
pub use func::FuncSer;
pub use gradient::GradientSer;
pub use label::LabelSer;
pub use length::LengthSer;
pub use module::ModuleSer;
pub use ratio::RatioSer;
pub use relative::RelativeSer;
pub use str::StrSer;
pub use styles::StylesSer;
pub use symbol::SymbolSer;
pub use tiling::TilingSer;
pub use type_::TypeSer;
pub use version::VersionSer;

#[derive(Serialize, Tsify)]
#[serde(tag = "type", content = "value")]
pub enum ValueSer {
    None,
    Auto,
    Bool(bool),
    Int(i64),
    Float(f64),
    Length(LengthSer),
    Angle(AngleSer),
    Ratio(RatioSer),
    Relative(RelativeSer),
    Fraction(FrSer),
    Color(ColorSer),
    Gradient(GradientSer),
    Tiling(TilingSer),
    Symbol(SymbolSer),
    Version(VersionSer),
    Str(StrSer),
    Bytes(BytesSer),
    Label(LabelSer),
    Datetime(DatetimeSer),
    Decimal(DecimalSer),
    Duration(DurationSer),
    Content(ContentSer),
    Styles(StylesSer),
    Array(ArraySer),
    Dict(DictSer),
    Func(FuncSer),
    Args(ArgsSer),
    Type(TypeSer),
    Module(ModuleSer),
    Dyn(DynamicSer),
}

impl From<&Value> for ValueSer {
    fn from(value: &Value) -> Self {
        match value {
            Value::None => ValueSer::None,
            Value::Auto => ValueSer::Auto,
            Value::Bool(v) => ValueSer::Bool(*v),
            Value::Int(v) => ValueSer::Int(*v),
            Value::Float(v) => ValueSer::Float(*v),
            Value::Length(v) => ValueSer::Length(LengthSer::from(v)),
            Value::Angle(v) => ValueSer::Angle(AngleSer::from(v)),
            Value::Ratio(v) => ValueSer::Ratio(RatioSer::from(v)),
            Value::Relative(v) => ValueSer::Relative(RelativeSer::from(v)),
            Value::Fraction(v) => ValueSer::Fraction(FrSer::from(v)),
            Value::Color(v) => ValueSer::Color(ColorSer::from(v)),
            Value::Gradient(v) => ValueSer::Gradient(GradientSer::from(v)),
            Value::Tiling(v) => ValueSer::Tiling(TilingSer::from(v)),
            Value::Symbol(v) => ValueSer::Symbol(SymbolSer::from(v)),
            Value::Version(v) => ValueSer::Version(VersionSer::from(v)),
            Value::Str(v) => ValueSer::Str(StrSer::from(v)),
            Value::Bytes(v) => ValueSer::Bytes(BytesSer::from(v)),
            Value::Label(v) => ValueSer::Label(LabelSer::from(v)),
            Value::Datetime(v) => ValueSer::Datetime(DatetimeSer::from(v)),
            Value::Decimal(v) => ValueSer::Decimal(DecimalSer::from(v)),
            Value::Duration(v) => ValueSer::Duration(DurationSer::from(v)),
            Value::Content(v) => ValueSer::Content(ContentSer::from(v)),
            Value::Styles(v) => ValueSer::Styles(StylesSer::from(v)),
            Value::Array(v) => ValueSer::Array(ArraySer::from(v)),
            Value::Dict(v) => ValueSer::Dict(DictSer::from(v)),
            Value::Func(v) => ValueSer::Func(FuncSer::from(v)),
            Value::Args(v) => ValueSer::Args(ArgsSer::from(v)),
            Value::Type(v) => ValueSer::Type(TypeSer::from(v)),
            Value::Module(v) => ValueSer::Module(ModuleSer::from(v)),
            Value::Dyn(v) => ValueSer::Dyn(DynamicSer::from(v)),
        }
    }
}
