import {Rule, SchematicContext, SchematicsException, Tree} from "@angular-devkit/schematics";
import * as patch from "../util/patch";
import {Path} from "@angular-devkit/core";
import {isSuffixInList} from "../util/fileUtil";

export interface ConflictOptionsSchema {
    /**
     * The policy to adopt when generated files will overwrite current ones. Possible options: BAK, OVERWRITE, KEEP.
     */
    onConflict: "KEEP" | "BAK" | "OVERWRITE" | "NEW";
    /**
     * The list of extensions in the form of .<ext> that requires OVERWRITE as policy
     */
    onConflictOverwriteFileTypes?: string;
    /**
     * The list of extensions in the form of .<ext> that requires BAK as policy
     */
    onConflictBakFileTypes?: string;
    /**
     * The list of extensions in the form of .<ext> that requires NEW as policy
     */
    onConflictNewFileTypes?: string;
    /**
     * The list of extensions in the form of .<ext> that requires KEEP as policy
     */
    onConflictKeepFileTypes?: string;
    /**
     * A patch file can be created in case of conflicts
     */
    generatePatch?: boolean;
    /**
     * The list of extensions in the form of .<ext> thaat do not create a patch file
     */
    noPatch4FileTypes?: string;
}

export function handleConflicts(_currentTree: Tree, _context: SchematicContext, _options: ConflictOptionsSchema): Rule {
    return (tree: Tree) => {

        let numberOfFiles = 0;
        let numberOfConflicts = 0;
        let numberOfPatchFiles = 0;
        tree.getDir('/').visit(filePath => {

            numberOfFiles++;

            if (filePath.includes('node_modules') || filePath.includes('.git')) {
                return;
            }

            if (_currentTree.exists(filePath)) {

                const currentFile_Content = _currentTree.read(filePath);
                const newFile_Content = tree.read(filePath);
                if (!currentFile_Content)
                    throw new SchematicsException(`Cannot read file ${filePath} from the existing tree`);

                if (!newFile_Content)
                    throw new SchematicsException(`Cannot read generated file ${filePath}`);

                const filesMatch = patch.compareFiles(currentFile_Content, newFile_Content);

                if (!filesMatch) {

                    numberOfConflicts++;

                    let policy = resolveOnConflictMode(
                        _context,
                        filePath, _options.onConflict,
                        _options.onConflictOverwriteFileTypes,
                        _options.onConflictBakFileTypes,
                        _options.onConflictNewFileTypes,
                        _options.onConflictKeepFileTypes);

                    let newFile_Name : Path = filePath;
                    let currentFile_Name : Path = filePath;
                    switch (policy) {
                        case 'BAK':
                            _context.logger.info(`\u001B[33mBAK\u001B[0m ${filePath}.bak`);
                            currentFile_Name = (filePath + '.bak') as Path;
                            tree.create(currentFile_Name, currentFile_Content.toString());
                            break;
                        case 'OVERWRITE':
                            currentFile_Name = (filePath + '.null') as Path;
                            // Do nothing in this case...
                            break;
                        case 'KEEP':
                            _context.logger.info(`\u001B[36mKEEP\u001B[0m ${filePath}`);
                            newFile_Name = (filePath + '.null') as Path;
                            tree.delete(filePath);
                            break;
                        case 'NEW':
                            _context.logger.info(`\u001B[35mNEW\u001B[0m ${filePath}.new` );
                            newFile_Name = (filePath + '.new') as Path;
                            tree.rename(filePath, newFile_Name);
                            break;
                        default:
                            _context.logger.error(`${filePath} unrecognised conflict resolution mode: ${_options.onConflict}`);
                    }

                    if (_options.generatePatch && !isSuffixInList(_context, filePath, _options.noPatch4FileTypes)) {
                        _context.logger.info(`\u001B[31mPATCH\u001B[0m ${filePath}.patch`);
                        numberOfPatchFiles++;
                        tree.create(filePath + '.patch',patch.createPatch(
                            { path: currentFile_Name, content: currentFile_Content },
                            { path: newFile_Name, content: newFile_Content },
                        ));
                    }

                }

            } else {
                _context.logger.info(`${filePath} DOESN't exist... will be created`);
            }

            return;
        });

        if (numberOfConflicts) {
            _context.logger.info(`\u001B[31mCONFLICTS #${numberOfConflicts}\u001B[0m - files processed #${numberOfFiles} - patch files #${numberOfPatchFiles}`);
        } else {
            _context.logger.info(`\u001B[32mNO-CONFLICTS\u001B[0m - files processed #${numberOfFiles}`);
        }

        return tree;
    }
}

function resolveOnConflictMode(
    _context: SchematicContext,
    aPath: Path, defaultMode: string,
    overWriteExtensions: string | undefined,
    bakExtensions: string | undefined,
    newExtensions: string | undefined,
    keepExtensions: string | undefined) : string {

    let resultMode = "";

    if (resultMode == "" && isSuffixInList(_context, aPath, overWriteExtensions)) {
        resultMode = "OVERWRITE";
    }

    if (resultMode == "" && isSuffixInList(_context, aPath, bakExtensions)) {
        resultMode = "BAK";
    }

    if (resultMode == "" && isSuffixInList(_context, aPath, newExtensions)) {
        resultMode = "NEW";
    }

    if (resultMode == "" && isSuffixInList(_context, aPath, keepExtensions)) {
        resultMode = "KEEP";
    }

    resultMode = resultMode != "" ? resultMode : defaultMode;
    _context.logger.info(`path ${aPath} resolved to ${resultMode}`);
    return resultMode;
}

