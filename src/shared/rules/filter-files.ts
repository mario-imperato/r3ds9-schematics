import {FileEntry, forEach, Rule, SchematicContext, TEMPLATE_FILENAME_RE, Tree} from "@angular-devkit/schematics";
import {basename, PathFragment} from "@angular-devkit/core";
import {isSuffixInList} from "../util/fileUtil";

export type AcceptFilePredicate = (f: FileEntry) => boolean;

export function AcceptAllPredicate(_file: FileEntry) : boolean {
    return true;
}

export function ChainOfAcceptFilePredicate(...preds: AcceptFilePredicate[]) : AcceptFilePredicate {
    return (_file: FileEntry) : boolean => {
        for(let p of preds) {
            if (!p(_file))
                return false;
        }

        return true;
    }
}

export function AcceptAllButPredicate(_context: SchematicContext, _listOfSkipExts?: string) : AcceptFilePredicate {
    return (_file: FileEntry) : boolean => {

        /* Extension processing moved to function
        let ext = extname(_file.path);
        if (ext == ".template")
            ext = extname(_file.path.substr(0, _file.path.length - ".template".length) as Path);
         */

        if (isSuffixInList(_context, _file.path, _listOfSkipExts)) {
            return false;
        }
        return true;
    }
}


// pathName == '' /* || pathName == _options.layoutMode */
export function filterAndRenameTemplates(_tree: Tree, _context: SchematicContext, acceptPredicate: AcceptFilePredicate, _flatten: boolean = true) : Rule {

    return forEach((file: FileEntry) => {

        if (acceptPredicate(file)) {
            let fileName = (_flatten) ? basename(file.path) : file.path;
            if (fileName.endsWith('.template')) {
                fileName = fileName.replace(TEMPLATE_FILENAME_RE, '') as PathFragment;
            }

            _context.logger.debug(`including: ${file.path} -->  ${fileName}`);
            return {path: fileName, content: file.content};
        } else {
            _context.logger.debug(`skipping.... ${file.path}`);
        }

        return null;
    })
}
