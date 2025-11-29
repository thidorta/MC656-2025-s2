"""
find_dead_files.py - Import graph analysis to find dead modules
"""
import ast
import json
import sys
from pathlib import Path
from typing import Dict, List, Set


class ImportAnalyzer(ast.NodeVisitor):
    """Extracts imported module names from Python files."""
    
    def __init__(self, file_path: Path, root: Path):
        self.file_path = file_path
        self.root = root
        self.imports: Set[str] = set()
        
    def visit_Import(self, node):
        for alias in node.names:
            self.imports.add(alias.name.split('.')[0])
        self.generic_visit(node)
    
    def visit_ImportFrom(self, node):
        if node.module:
            self.imports.add(node.module.split('.')[0])
        self.generic_visit(node)


def build_import_graph(root: Path) -> Dict[str, Set[str]]:
    """Build dict mapping file -> set of imported modules."""
    graph = {}
    
    for py_file in root.rglob("*.py"):
        if '__pycache__' in str(py_file) or 'alembic/versions' in str(py_file):
            continue
        
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                tree = ast.parse(f.read(), filename=str(py_file))
        except SyntaxError:
            continue
        
        analyzer = ImportAnalyzer(py_file, root)
        analyzer.visit(tree)
        
        relative_path = str(py_file.relative_to(root)).replace('\\', '/')
        graph[relative_path] = analyzer.imports
    
    return graph


def find_dead_modules(root: Path, entry_points: List[str]) -> Set[str]:
    """Find modules not imported by any other module (except entry points)."""
    graph = build_import_graph(root)
    
    all_files = set(graph.keys())
    imported_modules = set()
    
    for imports in graph.values():
        imported_modules.update(imports)
    
    # Convert imported module names to file paths
    referenced_files = set()
    for module_name in imported_modules:
        # Try to match module name to file path
        for file_path in all_files:
            if module_name in file_path or file_path.startswith(f"app/{module_name}"):
                referenced_files.add(file_path)
    
    # Add entry points (always considered alive)
    for ep in entry_points:
        referenced_files.add(ep)
    
    dead_files = all_files - referenced_files
    return dead_files


def main():
    backend_dir = Path(__file__).resolve().parent.parent
    
    entry_points = [
        "main.py",
        "app/__init__.py",
        "app/api/routes.py",
    ]
    
    print("Building import graph...")
    graph = build_import_graph(backend_dir / "app")
    
    print(f"\nFound {len(graph)} Python files")
    
    # Find potentially dead files
    all_modules = set()
    for imports in graph.values():
        all_modules.update(imports)
    
    print(f"Unique imported modules: {len(all_modules)}")
    
    # Export graph as JSON
    if "--export" in sys.argv:
        output = {
            "files": list(graph.keys()),
            "graph": {k: list(v) for k, v in graph.items()},
            "all_imported_modules": list(all_modules)
        }
        with open("import_graph.json", "w") as f:
            json.dump(output, f, indent=2)
        print("\nExported to import_graph.json")
    
    # Delete mode
    if "--delete" in sys.argv:
        print("\n--delete mode not implemented (requires careful analysis)")


if __name__ == "__main__":
    main()
