use crate::typst::syntax::SyntaxKind;

use crate::lexer::bracket::BracketToken;

#[derive(Debug, Clone)]
pub struct BracketPair {
    pub kind: SyntaxKind,
    pub depth: usize,
    pub open: BracketToken,
    pub close: BracketToken,
}

pub fn paren_parse(tokens: &[BracketToken]) -> Vec<BracketPair> {
    let mut stack = Vec::new();
    let mut pairs = Vec::new();

    for token in tokens {
        if token.open {
            stack.push((token, stack.len()));
        } else {
            let expected = match token.kind {
                SyntaxKind::RightParen => SyntaxKind::LeftParen,
                SyntaxKind::RightBrace => SyntaxKind::LeftBrace,
                SyntaxKind::RightBracket => SyntaxKind::LeftBracket,
                _ => continue,
            };
            if let Some(pos) = stack.iter().rposition(|(t, _)| t.kind == expected) {
                let (open, depth) = stack.remove(pos);
                pairs.push(BracketPair {
                    kind: open.kind,
                    depth,
                    open: open.clone(),
                    close: token.clone(),
                });
            }
            // else: 未開き括弧
        }
    }
    // stack の残り: 未閉じ括弧

    pairs
}
