use serde::Serialize;

use crate::typst::syntax::SyntaxKind::{LeftBrace, LeftBracket, LeftParen};

use crate::lexer::bracket::CharPos;
use crate::parser::bracket::BracketPair;

#[derive(Serialize)]
pub struct BracketPairSer {
    pub kind: String,

    pub depth: usize,

    pub open_offset: usize,
    pub open_pos: CharPos,

    pub close_offset: usize,
    pub close_pos: CharPos,
}

impl From<&BracketPair> for BracketPairSer {
    fn from(pair: &BracketPair) -> Self {
        BracketPairSer {
            kind: match pair.kind {
                LeftParen => "paren".into(),
                LeftBracket => "bracket".into(),
                LeftBrace => "brace".into(),
                _ => "unknown".into(),
            },

            depth: pair.depth,

            open_offset: pair.open.offset,
            open_pos: pair.open.pos,

            close_offset: pair.close.offset,
            close_pos: pair.close.pos,
        }
    }
}
