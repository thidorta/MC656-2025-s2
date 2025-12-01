"""
find_unused_imports.py - AST-based unused import detection
"""
import ast
import sys
from pathlib import Path
from typing import List, Set, Tuple


class ImportVisitor(ast.NodeVisitor):
    """Collects imports and name usage."""
    
    def __init__(self):
        self.imports: List[Tuple[str, int]] = []
        self.used_names: Set[str] = set()
        
    def visit_Import(self, node):
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name
            self.imports.append((name.split('.')[0], node.lineno))
        self.generic_visit(node)
    
    def visit_ImportFrom(self, node):
        for alias in node.names:
            if alias.name == '*':
                continue
            name = alias.asname if alias.asname else alias.name
            self.imports.append((name, node.lineno))
        self.generic_visit(node)
    
    def visit_Name(self, node):
        self.used_names.add(node.id)
        self.generic_visit(node)
    
    def visit_Attribute(self, node):
        if isinstance(node.value, ast.Name):
            self.used_names.add(node.value.id)
        self.generic_visit(node)


def find_unused_imports(file_path: Path) -> List[Tuple[str, int]]:
    """Returns list of (import_name, line_number) for unused imports."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read(), filename=str(file_path))
    except SyntaxError:
        return []
    
    visitor = ImportVisitor()
    visitor.visit(tree)
    
    unused = []
    for name, lineno in visitor.imports:
        if name not in visitor.used_names:
            unused.append((name, lineno))
    
    return unused


def scan_directory(directory: Path, fix: bool = False):
    """Scan all Python files in directory for unused imports."""
    print(f"Scanning {directory} for unused imports...\n")
    
    total_files = 0
    total_unused = 0
    
    for py_file in directory.rglob("*.py"):
        if '__pycache__' in str(py_file) or 'alembic/versions' in str(py_file):
            continue
        
        unused = find_unused_imports(py_file)
        if unused:
            total_files += 1
            total_unused += len(unused)
            print(f"\n{py_file}:")
            for name, lineno in unused:
                print(f"  Line {lineno}: {name}")
    
    print(f"\n{'='*60}")
    print(f"Total: {total_unused} unused imports in {total_files} files")
    
    if fix:
        print("\n--fix mode not implemented yet (requires code rewriting)")


if __name__ == "__main__":
    backend_dir = Path(__file__).resolve().parent.parent
    fix_mode = "--fix" in sys.argv
    scan_directory(backend_dir / "app", fix=fix_mode)
