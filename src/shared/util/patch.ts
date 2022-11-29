import * as Diff from "diff";
import {FileEntry, SchematicContext, SchematicsException, Tree} from "@angular-devkit/schematics";

export function compareFiles(oldContent: Buffer, newContent: Buffer) : boolean {

    const changes = Diff.diffLines(oldContent.toString(), newContent.toString());
    let match = true;
    for(let c of changes) {
        if (c.added || c.removed) {
            match = false;
        }
    }

    return match;
}

export function createPatch(oldFile: FileEntry, newFile: FileEntry) : string {
    if (!oldFile.content)
        throw new SchematicsException(`Cannot read file ${oldFile.path} from the existing tree`);

    if (!newFile.content)
        throw new SchematicsException(`Cannot read generated file ${newFile.path}`);

    return Diff.createTwoFilesPatch(oldFile.path, newFile.path, oldFile.content.toString(), newFile.content.toString());
}

export function exist(tree: Tree, _context: SchematicContext, aPath: string) : boolean {
    let b = false;
    tree.getDir(aPath).visit(filePath => {
        if (filePath.endsWith(".patch")) {
            b = true;
            _context.logger.info(`\u001B[31mPATCH\u001B[0m ${filePath} needs to be resolved...`);
        }
    });
    return b;
}
