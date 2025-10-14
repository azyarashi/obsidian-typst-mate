use serde::Serialize;

use crate::typst::syntax::SyntaxKind;

use crate::utils::char_position::precompute_char_positions;

#[derive(Debug, Clone, Copy, Serialize)]
pub struct CharPos {
    pub line: usize,
    pub ch: usize,
}

#[derive(Debug, Clone)]
pub struct BracketToken {
    pub kind: SyntaxKind,
    pub open: bool,
    pub offset: usize,
    pub pos: CharPos,
}

pub fn bracket_lexer(src: &str) -> Vec<BracketToken> {
    let positions = precompute_char_positions(src);

    let mut ret = Vec::new();
    let mut chars = src.char_indices().peekable();
    let mut in_str = false;
    let mut str_escape = false;
    let mut in_line_comment = false;
    let mut in_block_comment = 0usize;

    while let Some((i, c)) = chars.next() {
        // 文字列内
        if in_str {
            if str_escape {
                str_escape = false;
                continue;
            }
            match c {
                '"' => in_str = false,
                '\\' => str_escape = true,
                _ => {}
            }
            continue;
        }
        // 行コメント
        if in_line_comment {
            if c == '\n' {
                in_line_comment = false;
            }
            continue;
        }
        // ブロックコメント
        if in_block_comment > 0 {
            if c == '*' {
                if let Some((_, '/')) = chars.peek() {
                    chars.next();
                    in_block_comment -= 1;
                }
            } else if c == '/' {
                if let Some((_, '*')) = chars.peek() {
                    chars.next();
                    in_block_comment += 1;
                }
            }
            continue;
        }
        // コメント開始
        if c == '/' {
            if let Some((_, next)) = chars.peek() {
                if *next == '/' {
                    chars.next();
                    in_line_comment = true;
                    continue;
                } else if *next == '*' {
                    chars.next();
                    in_block_comment += 1;
                    continue;
                }
            }
        }
        // 文字列開始
        if c == '"' {
            in_str = true;
            continue;
        }
        // 括弧判定
        let kind = match c {
            '(' => Some(SyntaxKind::LeftParen),
            ')' => Some(SyntaxKind::RightParen),
            '[' => Some(SyntaxKind::LeftBracket),
            ']' => Some(SyntaxKind::RightBracket),
            '{' => Some(SyntaxKind::LeftBrace),
            '}' => Some(SyntaxKind::RightBrace),
            _ => None,
        };

        if let Some(kind) = kind {
            let open = matches!(
                kind,
                SyntaxKind::LeftParen | SyntaxKind::LeftBracket | SyntaxKind::LeftBrace
            );

            let pos_info = &positions[i];
            ret.push(BracketToken {
                kind,
                open,
                offset: pos_info.offset,
                pos: CharPos {
                    line: pos_info.line,
                    ch: pos_info.ch,
                },
            });
        }
    }
    ret
}
