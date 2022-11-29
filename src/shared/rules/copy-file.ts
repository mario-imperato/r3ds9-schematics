import {Rule, SchematicContext, Tree} from "@angular-devkit/schematics";
import {basename, join, Path} from "@angular-devkit/core";

export function copyFile(fromPath: Path, toPath: Path) : Rule {
    return (_tree: Tree, _context: SchematicContext) => {
       _tree.create(join(toPath, basename(fromPath)), 'mundo');
    }
}
