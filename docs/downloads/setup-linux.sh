#!/usr/bin/env bash
# Copies vimrc-linux to ~/.vimrc. Installs NOTHING: no dnf, no sudo, no network.
# Then reports which optional tools this machine already has.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

if [ -f ~/.vimrc ]; then
  cp ~/.vimrc ~/.vimrc.bak."$(date +%s)"
  echo "Backed up old ~/.vimrc"
fi
cp "$here/vimrc-linux" ~/.vimrc
mkdir -p ~/.vim/undo
echo "Installed ~/.vimrc"
echo

ok()  { printf '  [x] %s\n' "$1"; }
no()  { printf '  [ ] %-14s - %s\n' "$1" "$2"; }
has() { command -v "$1" >/dev/null 2>&1; }

echo "Vim:"
if has vim; then
  v="$(vim --version)"
  ok "$(echo "$v" | head -1)"
  for f in syntax python3 clipboard; do
    if echo "$v" | grep -q "+$f"; then ok "+$f"; else
      case $f in
        syntax)    no "+$f" "no highlighting (this is vim-minimal; ask IT for vim-enhanced)";;
        python3)   no "+$f" "no Python omni-completion after '.' (Tab completion still works)";;
        clipboard) no "+$f" "no system clipboard; use 'vimx' if installed, or Ctrl-Shift-V";;
      esac
    fi
  done
else
  no "vim" "only vi (vim-minimal) found: no highlighting/plugins; ask IT for vim-enhanced"
fi

echo
echo "Tools (all optional):"
has gcc     && ok "gcc            - error check on save, Space r" || no "gcc" "no C checking/running"
has python3 && ok "python3        - run, syntax check"            || no "python3" "no Python running"
if has autopep8 || python3 -c 'import autopep8' 2>/dev/null; then
  ok "autopep8       - format on save"
else no "autopep8" "Python won't be auto-formatted"; fi
if has pyflakes || has flake8; then ok "pyflakes/flake8 - unused imports, undefined names"
else no "pyflakes/flake8" "only syntax errors are checked"; fi
has clang-format && ok "clang-format   - Space f in C"      || no "clang-format" "Space f falls back to vim's = indent"
has ctags        && ok "ctags          - Space T, Ctrl-]"   || no "ctags" "no go-to-definition across files"
has rg           && ok "ripgrep        - fast Space /"      || no "rg" "Space / uses grep (fine)"
