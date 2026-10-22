#!/usr/bin/env bash
# Sets up vim for Python + C on macOS. Run from the folder containing `vimrc`.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

# 1. Xcode Command Line Tools (clang, git, python3)
if ! xcode-select -p >/dev/null 2>&1; then
  xcode-select --install
  echo ">> Finish the Command Line Tools install, then run this script again."
  exit 1
fi

# 2. Homebrew
if ! command -v brew >/dev/null 2>&1; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
if [ -x /opt/homebrew/bin/brew ]; then BREW=/opt/homebrew/bin/brew; else BREW=/usr/local/bin/brew; fi
eval "$("$BREW" shellenv)"
grep -q 'brew shellenv' ~/.zprofile 2>/dev/null || echo "eval \"\$($BREW shellenv)\"" >> ~/.zprofile

# 3. Tools: brew vim (has clipboard + python3), fuzzy finder, ripgrep
brew install vim fzf ripgrep

# 4. vimrc (backs up the old one)
if [ -f ~/.vimrc ]; then cp ~/.vimrc ~/.vimrc.bak."$(date +%s)"; fi
cp "$here/vimrc" ~/.vimrc

# 5. vim-plug + plugins
curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
  https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
vim +PlugInstall +qall

echo
echo ">> Done. Open a new terminal (so brew vim is first in PATH), then:"
echo "   vim test.c   -> :LspInstallServer   (installs clangd)"
echo "   vim test.py  -> :LspInstallServer   (installs pylsp)"
